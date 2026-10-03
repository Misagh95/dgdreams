/**
 * 5-in-1 runner: GM + GN + Simple + Token + NFT on a single network.
 *
 * Design mirrors the reference implementation:
 *   - steps run strictly one after another, each waiting for its own receipt
 *   - a failed step does NOT abort the run; it is marked failed and the rest
 *     continue, so one bad network state never costs the user the other four
 *   - missions already done today are skipped without touching the wallet
 *   - deploys are raw contract-creation transactions, so no factory contract
 *     is needed on any network
 *   - the caller owns the UI; this module only reports progress
 */
import {
  createPublicClient,
  encodeDeployData,
  encodeFunctionData,
  fallback,
  http,
  isAddress,
  type Abi,
} from "viem";

export type StepStatus = "pending" | "signing" | "done" | "already" | "failed" | "skipped";
export type StepKind = "mission" | "deploy";

export interface SequenceStepDef {
  id: string;
  label: string;
  kind: StepKind;
  /** mission: which NikBase call; deploy: raw creation bytecode */
  method?: "dailyCheckIn" | "gm" | "gn";
  artifact?: { abi: Abi; bytecode: `0x${string}`; constructorInputs: unknown[] };
  /** set to false when this step cannot run on the selected network */
  available?: boolean;
}

export interface StepResult {
  id: string;
  label: string;
  status: StepStatus;
  hash?: `0x${string}`;
  address?: `0x${string}`;
  explorerUrl?: string;
  error?: string;
}

/** marks a mission as done so a re-run never re-sends it */
export interface DoneMarker {
  isDone: (id: string) => boolean;
  mark: (id: string) => void;
}

export type Provider = {
  request: (a: { method: string; params?: readonly unknown[] }) => Promise<unknown>;
};

export interface RunOptions {
  steps: SequenceStepDef[];
  account: `0x${string}`;
  chainId: number;
  /** NikBase address on this chain, needed for the mission calls */
  contractAddress?: `0x${string}`;
  rpcUrls: string[];
  /** EIP-1193 provider from the active connector */
  getProvider: () => Promise<Provider | undefined>;
  /** switch network first; resolves to the resulting chain id */
  switchChain?: (chainId: number) => Promise<number | undefined>;
  explorerUrl?: string;
  done?: DoneMarker;
  onUpdate: (results: StepResult[], currentIndex: number | null) => void;
  signal?: { aborted: boolean };
}

const SCHEDULE = [150, 300, 500, 750, 1000, 1000, 1500, 1500, 2000];

/** Minimal ABI: the three NikBase calls. */
const MISSION_ABI = [
  { type: "function", name: "dailyCheckIn", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "gm", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "gn", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const satisfies Abi;

type Pub = ReturnType<typeof createPublicClient>;

/** Wait for a receipt: immediate check, then backoff, plus a new-block signal. */
async function waitForReceipt(
  hash: `0x${string}`,
  pub: Pub,
  provider: Provider | undefined
): Promise<{ status?: string; contractAddress?: `0x${string}` } | null> {
  let lastBlock = (await pub.getBlockNumber().catch(() => 0n)) ?? 0n;
  for (let p = 0; p < 90; p++) {
    if (p > 0) {
      await new Promise((r) => setTimeout(r, SCHEDULE[Math.min(p - 1, SCHEDULE.length - 1)]));
    }
    try {
      const r = await pub.getTransactionReceipt({ hash });
      if (r) return r as { status?: string; contractAddress?: `0x${string}` };
    } catch {
      /* not mined yet */
    }
    try {
      const r = (await provider?.request({
        method: "eth_getTransactionReceipt",
        params: [hash],
      })) as { status?: string } | null;
      if (r) return r;
    } catch {
      /* keep polling */
    }
    try {
      const bn = await pub.getBlockNumber();
      if (bn > lastBlock) {
        lastBlock = bn;
        const r2 = await pub.getTransactionReceipt({ hash }).catch(() => null);
        if (r2) return r2 as { status?: string; contractAddress?: `0x${string}` };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

export async function runSequence(opts: RunOptions): Promise<StepResult[]> {
  const {
    steps, account, contractAddress, rpcUrls, getProvider,
    switchChain, explorerUrl, done, onUpdate, signal,
  } = opts;

  const results: StepResult[] = steps.map((s) => ({
    id: s.id,
    label: s.label,
    status: "pending",
  }));
  const publish = (i: number | null) => onUpdate(results.map((r) => ({ ...r })), i);

  if (switchChain) await switchChain(opts.chainId);

  const provider = await getProvider();
  if (!provider?.request) {
    return results.map((r) => ({ ...r, status: "failed", error: "No wallet provider" }));
  }

  const pub = createPublicClient({
    transport: fallback(rpcUrls.map((u) => http(u, { batch: true, timeout: 10_000 }))),
  });

  for (let i = 0; i < steps.length; i++) {
    if (signal?.aborted) break;
    const step = steps[i];
    results[i].status = "signing";
    publish(i);

    if (step.available === false) {
      results[i].status = "skipped";
      results[i].error = "Not available on this network";
      publish(i);
      continue;
    }

    // a mission already done today needs no transaction at all
    if (step.kind === "mission" && done?.isDone(step.id)) {
      results[i].status = "already";
      publish(i);
      continue;
    }

    try {
      let hash: `0x${string}`;

      if (step.kind === "mission") {
        if (!contractAddress || !isAddress(contractAddress) || !step.method) {
          results[i].status = "skipped";
          results[i].error = "No contract on this network";
          publish(i);
          continue;
        }
        const data = encodeFunctionData({
          abi: MISSION_ABI,
          functionName: step.method,
          args: [],
        });
        hash = (await provider.request({
          method: "eth_sendTransaction",
          params: [{ from: account, to: contractAddress, data }],
        })) as `0x${string}`;
      } else {
        const art = step.artifact!;
        const data = encodeDeployData({
          abi: art.abi,
          bytecode: art.bytecode,
          args: art.constructorInputs as never,
        });
        // contract creation: no `to`
        hash = (await provider.request({
          method: "eth_sendTransaction",
          params: [{ from: account, data }],
        })) as `0x${string}`;
      }

      const receipt = await waitForReceipt(hash, pub, provider);
      const link = explorerUrl ? `${explorerUrl}/tx/${hash}` : undefined;

      if (!receipt) {
        results[i] = { ...results[i], status: "failed", hash, error: "Confirmation timed out", explorerUrl: link };
        publish(i);
        continue;
      }
      if (receipt.status === "reverted" || receipt.status === "0x0") {
        results[i] = { ...results[i], status: "failed", hash, error: "Transaction reverted", explorerUrl: link };
        publish(i);
        continue;
      }

      if (step.kind === "deploy" && receipt.contractAddress) {
        results[i].address = receipt.contractAddress;
      }
      results[i].status = "done";
      results[i].hash = hash;
      results[i].explorerUrl = link;
      if (step.kind === "mission") done?.mark(step.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const rejected = /user rejected|denied/i.test(msg);
      results[i].status = rejected ? "skipped" : "failed";
      results[i].error = rejected ? "Rejected in wallet" : msg.slice(0, 120);
    }
    publish(i);
  }

  publish(null);
  return results.map((r) => ({ ...r }));
}
