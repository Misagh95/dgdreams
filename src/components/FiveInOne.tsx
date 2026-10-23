"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig, useSwitchChain } from "wagmi";
import { isAddress } from "viem";
import {
  Rocket,
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
  ExternalLink,
  Zap,
} from "lucide-react";
import { runSequence, type SequenceStepDef, type StepResult, type StepStatus } from "@/lib/sequence";
import { DeployedContractActions } from "@/components/DeployedContractActions";
import { useUtcDay } from "@/hooks/useUtcDay";
import {
  deploymentCacheKey,
  deployedAddressesFor,
  readDeployStore,
  writeDeployStore,
} from "@/lib/deployStore";
import { NIKBASE_CONTRACTS, type NetworkConfig } from "@/config/chains";

type DeployArtifact = NonNullable<SequenceStepDef["artifact"]> & {
  /** recorded by the exporter so the UI can price a deployment up front */
  runtimeBytes?: number;
};

interface FiveInOneProps {
  network?: NetworkConfig;
  isConnected: boolean;
  account?: `0x${string}`;
  onConnect: () => void;
  /** task ids already completed today, so a re-run skips them */
  doneTaskIds?: Set<string>;
  /** called when the run finishes, so the page can refresh its counters */
  onFinished?: (results: StepResult[]) => void;
}

/**
 * The three deploys, in order: Simple, Token, NFT.
 *
 * These point at the OneClick.sol editions rather than the full-featured
 * SimpleToken / SimpleNft / LitePrediction contracts. Deployment gas is charged
 * at 200 per byte of runtime code plus 16 per non-zero calldata byte, so the
 * full versions cost ~2.7M gas to deploy while these cost ~0.86M — the
 * difference between "too expensive to try" and "one click".
 */
const ARTIFACTS = [
  { key: "DGDemo", label: "Simple", args: ["gm"] },
  {
    key: "DGLiteToken",
    label: "Token",
    args: ["Demo Token", "DEMO", (1_000_000n * 10n ** 18n).toString()],
  },
  {
    key: "DGLiteNft",
    label: "NFT",
    args: ["Demo Collection", "DEMO"],
  },
];

/**
 * Approximate deployment cost per artifact, in gas:
 *   21,000 intrinsic + 200 per byte of runtime code (the code deposit)
 *   + 16 per non-zero calldata byte (4 per zero byte) on the init code.
 *
 * Init-code calldata includes the constructor arguments appended to the
 * creation bytecode, so the estimate must count those bytes too: a user
 * string like "Demo Token" adds hundreds of bytes (~16 gas each). The
 * constructor's own execution is not modelled — it is a rounding error
 * next to the code deposit — so this is a lower bound, and close enough to
 * compare options. Shown in the UI because "what will this cost me" is the
 * first question anyone asks before clicking a button that spends their money.
 * Ground truth for these numbers: scripts/measure-deploy-cost.mjs.
 */
function estimateDeployGas(artifact: DeployArtifact | undefined, ctorArgs: unknown[] = []): number {
  const bytecode = artifact?.bytecode;
  if (!bytecode || bytecode.length < 3) return 0;
  const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  let payloadBytes = hex.length / 2;
  for (const a of ctorArgs) {
    if (typeof a === "string") {
      // ABI-encoded as 32-byte offset + 32-byte length + padded string
      payloadBytes += 64 + Math.ceil(a.length / 32) * 32;
    } else {
      // numbers / bigints / bools / addresses: one 32-byte word
      payloadBytes += 32;
    }
  }
  const calldataGas = payloadBytes * 16; // worst case: all non-zero (upper bound)
  // runtimeBytes is exact when the exporter recorded it, otherwise fall back to
  // the (smaller) init code as a rough stand-in
  const runtimeBytes = artifact?.runtimeBytes ?? Math.round(hex.length / 2 / 1.6);
  return 21_000 + runtimeBytes * 200 + calldataGas;
}

const STATUS_STYLE: Record<StepStatus, { color: string; icon: typeof CheckCircle2 }> = {
  pending: { color: "var(--text-faint)", icon: SkipForward },
  signing: { color: "var(--accent-text)", icon: Loader2 },
  done: { color: "var(--success)", icon: CheckCircle2 },
  already: { color: "var(--text-tertiary)", icon: CheckCircle2 },
  failed: { color: "var(--danger)", icon: XCircle },
  skipped: { color: "var(--text-faint)", icon: SkipForward },
};

/**
 * The six-in-one run.
 *
 * Three missions and three deploys in one press. The card used to own a
 * twenty-tile network grid and a dropdown on top of it — the same chain list
 * the page header already showed — so the user had to answer "which network?"
 * three times. Now the hero owns that answer and this card just runs.
 *
 * Deployed addresses are kept per chain AND per wallet so a second run reuses
 * them instead of paying for the same contract again. Shape + access live in
 * `@/lib/deployStore` (v2 keys are `<chainId>:<wallet>:<artifact>` and each
 * entry records its deployer; legacy v1 keys are never read back). The runner
 * re-checks the code on chain before trusting a stored address, so a stale
 * entry can never silently satisfy a step.
 */
export default function FiveInOne(props: FiveInOneProps) {
  const { network, isConnected, account, onConnect, doneTaskIds, onFinished } = props;
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchChain();

  const [artifacts, setArtifacts] = useState<Record<string, DeployArtifact>>({});
  const [results, setResults] = useState<StepResult[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [redeploy, setRedeploy] = useState(false);
  /** addresses THIS wallet deployed (per chain), for display + default reuse */
  const [deployed, setDeployed] = useState<Record<string, string>>({});
  const abort = useRef({ aborted: false });
  const locallyDone = useRef<Set<string>>(new Set());

  /** The one network, chosen in the hero. This card never picks its own. */
  const target: NetworkConfig | undefined = network;

  // GM/GN/Check-In are once per UTC day, so the "already done" markers we collected in
  // this session stop being true the moment the UTC day rolls over.
  useUtcDay(
    useCallback(() => {
      locallyDone.current = new Set();
      setResults([]);
    }, [])
  );

  // Session memory is per-network: switching the runner's target network must
  // not inherit the previous network's "already done" markers.
  const lastTargetId = useRef<number | undefined>(undefined);
  if (lastTargetId.current !== target?.id) {
    lastTargetId.current = target?.id;
    locallyDone.current = new Set();
    setResults([]);
  }

  /** addresses THIS wallet already deployed on this network, from the local store */
  const refreshFromStore = useCallback((chainId: number, wallet?: string) => {
    if (!wallet) return {};
    return deployedAddressesFor(
      chainId,
      wallet,
      ARTIFACTS.map((a) => a.key)
    );
  }, []);

  // show what THIS wallet already deployed whenever the network (or wallet) changes
  useEffect(() => {
    setResults([]);
    setRedeploy(false);
    setDeployed(target ? refreshFromStore(target.id, account) : {});
  }, [target?.id, account, refreshFromStore]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      const map: Record<string, DeployArtifact> = {};
      for (const a of ARTIFACTS) {
        try {
          const res = await fetch(`/contracts/${a.key}.json`);
          if (res.ok) map[a.key] = (await res.json()) as DeployArtifact;
        } catch {
          /* artifact unavailable */
        }
      }
      setArtifacts(map);
    })();
  }, []);

  const nikBase = target ? NIKBASE_CONTRACTS[target.id] : undefined;
  /**
   * Per-network mission memory. The page-level probe runs against the
   * active chain, and the parent hands over chain-qualified ids
   * ("<chainId>:<taskId>") so a bare id can never match here.
   */
  const isDone = useCallback(
    (id: string) =>
      locallyDone.current.has(`${target?.id ?? "?"}:${id}`) ||
      (target ? !!doneTaskIds?.has(`${target.id}:${id}`) : false),
    [doneTaskIds, target]
  );

  const start = useCallback(async () => {
    if (!target || !account || running) return;
    setRunning(true);
    abort.current = { aborted: false };
    setResults([]);
    setCurrent(null);

    const store = readDeployStore();
    const steps: SequenceStepDef[] = [
      { id: "checkIn", label: "Check-In", kind: "mission", method: "dailyCheckIn", available: !!nikBase },
      { id: "gm", label: "GM", kind: "mission", method: "gm", available: !!nikBase },
      { id: "gn", label: "GN", kind: "mission", method: "gn", available: !!nikBase },
      ...ARTIFACTS.map((a) => {
        const key = deploymentCacheKey(target.id, account, a.key);
        const entry = redeploy ? undefined : store[key];
        // Only THIS wallet's own entry counts: an address stored by another
        // wallet on this browser must not mark the step as already deployed.
        const cached =
          entry && entry.deployer.toLowerCase() === account.toLowerCase()
            ? entry.address
            : undefined;
        return {
          id: a.key,
          label: a.label,
          kind: "deploy" as const,
          artifact: artifacts[a.key]
            ? { ...artifacts[a.key], constructorInputs: a.args }
            : undefined,
          available: !!artifacts[a.key],
          ...(cached && isAddress(cached) ? { cachedAddress: cached as `0x${string}` } : {}),
        };
      }),
    ];

    try {
      const out = await runSequence({
        steps,
        account,
        chainId: target.id,
        contractAddress: nikBase,
        rpcUrls: target.rpcUrls.default.http,
        explorerUrl: target.blockExplorers.default.url,
        getProvider: async () => {
          const state = wagmiConfig.state;
          const conn = state.current ? state.connections.get(state.current) : undefined;
          return conn?.connector ? ((await conn.connector.getProvider()) as never) : undefined;
        },
        switchChain: async (chainIdTo) => {
          const res = await switchChainAsync({ chainId: chainIdTo });
          return (res as { chainId?: number } | undefined)?.chainId;
        },
        // Session memory is per-network: a mission done on chain A must not
        // mark the same mission on chain B as done in this run.
        done: { isDone, mark: (id) => locallyDone.current.add(`${target.id}:${id}`) },
        onUpdate: (res, i) => {
          setResults(res);
          setCurrent(i);
        },
        signal: abort.current,
      });

      // remember freshly deployed addresses so the next run reuses them —
      // keyed by chain + wallet, with the deployer recorded
      const next = readDeployStore();
      let changed = false;
      for (const r of out) {
        if (r.address) {
          next[deploymentCacheKey(target.id, account, r.id)] = {
            address: r.address,
            deployer: account,
            ...(r.hash ? { txHash: r.hash } : {}),
          };
          changed = true;
        }
      }
      if (changed) writeDeployStore(next);
      setDeployed(refreshFromStore(target.id, account));
      onFinished?.(out);
    } finally {
      setRunning(false);
      setCurrent(null);
    }
  }, [target, account, running, artifacts, nikBase, wagmiConfig, switchChainAsync, isDone, onFinished, redeploy, refreshFromStore]);

  const doneCount = results.filter((r) => r.status === "done" || r.status === "already").length;
  const loaded = Object.keys(artifacts).length === ARTIFACTS.length;
  // Show why the run is blocked instead of leaving a dead button. A failed
  // artifact fetch used to disable the button with no explanation, which reads
  // as "the feature is broken" rather than "a CDN file is missing".
  const missingArtifacts = ARTIFACTS.filter((a) => !artifacts[a.key]).map((a) => a.key);
  const blockedByArtifacts = missingArtifacts.length > 0;
  const canRun = isConnected && !!target && !!nikBase && !running && loaded;

  // What a fresh run would cost: the three deployments plus three cheap mission
  // calls. Contracts already deployed on this network are free, which is the
  // whole point of the cached-address reuse.
  const deployGas = ARTIFACTS.reduce(
    (sum, a) => sum + (deployed[a.key] ? 0 : estimateDeployGas(artifacts[a.key], a.args)),
    0
  );
  const MISSION_GAS_EACH = 30_000;
  const estimatedGas = deployGas + 3 * MISSION_GAS_EACH;
  const reusedCount = ARTIFACTS.filter((a) => deployed[a.key]).length;

  return (
    <div
      className="rounded-[20px] p-5 sm:p-6"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span
            className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
          >
            <Zap className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="text-[16px] font-semibold" style={{ color: "var(--text-bright)" }}>
              Run all six
            </h3>
            <p className="text-[14px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Three missions and three deploys on {target?.name ?? "your network"}.
            </p>
          </div>
        </div>

        <button
          onClick={isConnected ? start : onConnect}
          disabled={isConnected && (!canRun || running)}
          className="btn-ghost min-w-[152px]"
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          {running
            ? `Step ${(current ?? 0) + 1} of 6`
            : isConnected
              ? "Run all six"
              : "Connect wallet"}
        </button>
      </div>

      {blockedByArtifacts && (
        <p className="text-[14px] mt-4" style={{ color: "var(--warning)" }}>
          The deploy artifacts ({missingArtifacts.join(", ")}) could not be loaded, so
          the run is unavailable for now.
        </p>
      )}

      {isConnected && !nikBase && (
        <p className="text-[14px] mt-4" style={{ color: "var(--warning)" }}>
          No NikBase contract on {target?.name ?? "this network"} — the three missions
          would be skipped.
        </p>
      )}

      {Object.keys(deployed).length > 0 && (
        <div className="mt-5">
          <p className="kicker mb-2">Already deployed here</p>
          <div className="space-y-1">
            {ARTIFACTS.filter((a) => deployed[a.key]).map((a) => (
              <div
                key={a.key}
                className="flex items-center gap-2 px-3 py-2 rounded-[12px]"
                style={{ background: "var(--bg-subtle)" }}
              >
                <CheckCircle2
                  className="w-4 h-4 flex-shrink-0"
                  strokeWidth={1.75}
                  style={{ color: "var(--text-tertiary)" }}
                />
                <span className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                  {a.label}
                </span>
                <span className="flex-1" />
                <a
                  href={`${target?.blockExplorers.default.url}/address/${deployed[a.key]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] font-mono truncate max-w-[140px] hover:underline"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {deployed[a.key].slice(0, 10)}…
                </a>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none mt-3">
            <input
              type="checkbox"
              checked={redeploy}
              onChange={(e) => setRedeploy(e.target.checked)}
              className="accent-[var(--accent-text)]"
              style={{ width: 14, height: 14 }}
            />
            <span className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
              Redeploy anyway (costs another deployment)
            </span>
          </label>
        </div>
      )}

      {isConnected && account && (
        <DeployedContractActions target={target} account={account} deployed={deployed} />
      )}

      {results.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="progress-bar flex-1">
              <div
                className="progress-fill"
                style={{ width: `${(doneCount / 6) * 100}%` }}
              />
            </div>
            <span
              className="text-[12px] tabular-nums"
              style={{ color: "var(--text-tertiary)" }}
            >
              {doneCount}/6
            </span>
          </div>

          <div className="flex flex-col gap-1">
            {results.map((r, i) => {
              const st = STATUS_STYLE[r.status];
              const Icon = st.icon;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[12px]"
                  style={{ background: "var(--bg-subtle)" }}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${r.status === "signing" ? "animate-spin" : ""}`}
                    strokeWidth={1.75}
                    style={{ color: st.color }}
                  />
                  <span className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                    {i + 1}. {r.label}
                  </span>
                  <span className="flex-1" />
                  {r.address && (
                    <a
                      href={`${target?.blockExplorers.default.url}/address/${r.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] font-mono truncate max-w-[130px] hover:underline"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {r.address.slice(0, 8)}…
                    </a>
                  )}
                  {r.explorerUrl && !r.address && (
                    <a
                      href={r.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <ExternalLink className="w-4 h-4" strokeWidth={1.75} />
                    </a>
                  )}
                  {r.error && (
                    <span className="text-[12px]" style={{ color: "var(--danger)" }}>
                      {r.error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[14px] mt-4 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
        Six separate transactions, signed one after another. A failed step does not stop
        the rest.
      </p>

      {loaded && estimatedGas > 0 && (
        <div
          className="flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-[12px]"
          style={{ background: "var(--bg-subtle)" }}
        >
          <span className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
            {reusedCount > 0
              ? `${reusedCount}/3 already deployed — this run costs almost nothing`
              : "Estimated gas"}
          </span>
          <span
            className="text-[14px] font-medium tabular-nums"
            style={{ color: "var(--text-secondary)" }}
          >
            ~{estimatedGas.toLocaleString("en-US")}
          </span>
        </div>
      )}
    </div>
  );
}
