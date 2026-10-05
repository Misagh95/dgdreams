"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfig, useSwitchChain } from "wagmi";
import { isAddress } from "viem";
import { Rocket, CheckCircle2, XCircle, SkipForward, Loader2, ExternalLink, Zap } from "lucide-react";
import { runSequence, type SequenceStepDef, type StepResult, type StepStatus } from "@/lib/sequence";
import NetworkSelect from "@/components/NetworkSelect";
import { NetworkTile } from "@/components/NetworkTile";
import { useUtcDay } from "@/hooks/useUtcDay";
import {
  NIKBASE_CONTRACTS,
  mainnetNetworks,
  testnetNetworks,
  type NetworkConfig,
} from "@/config/chains";

/** every EVM network the 5-in-1 runner may target, for its own picker */
const ALL_NETWORKS: NetworkConfig[] = [...mainnetNetworks, ...testnetNetworks];

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
 * The constructor's own execution is not modelled — it is a rounding error
 * next to the code deposit — so this is a lower bound, and close enough to
 * compare options. Shown in the UI because "what will this cost me" is the
 * first question anyone asks before clicking a button that spends their money.
 * Ground truth for these numbers: scripts/measure-deploy-cost.mjs.
 */
function estimateDeployGas(artifact: DeployArtifact | undefined): number {
  const bytecode = artifact?.bytecode;
  if (!bytecode || bytecode.length < 3) return 0;
  const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  const zeros = (hex.match(/00/g) || []).length;
  const calldataGas = (hex.length / 2 - zeros) * 16 + zeros * 4;
  // runtimeBytes is exact when the exporter recorded it, otherwise fall back to
  // the (smaller) init code as a rough stand-in
  const runtimeBytes = artifact?.runtimeBytes ?? Math.round(hex.length / 2 / 1.6);
  return 21_000 + runtimeBytes * 200 + calldataGas;
}

const STATUS_STYLE: Record<StepStatus, { color: string; icon: typeof CheckCircle2 }> = {
  pending: { color: "var(--text-quaternary)", icon: SkipForward },
  signing: { color: "var(--accent)", icon: Loader2 },
  done: { color: "var(--success)", icon: CheckCircle2 },
  already: { color: "var(--accent)", icon: CheckCircle2 },
  failed: { color: "#ff6b6b", icon: XCircle },
  skipped: { color: "var(--text-quaternary)", icon: SkipForward },
};

/**
 * Deployed addresses, kept per chain so a second run reuses them instead of
 * paying for the same contract again. The runner re-checks the code on chain
 * before trusting a stored address, so a stale entry can never silently
 * satisfy a step.
 */
const STORE_KEY = "dgdreams-deployments-v1";
type DeployMap = Record<string, string>;

function readStore(): DeployMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as DeployMap;
  } catch {
    return {};
  }
}

function writeStore(map: DeployMap) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    /* private mode / quota */
  }
}

export default function FiveInOne(props: FiveInOneProps) {
  const { network, isConnected, account, onConnect, doneTaskIds, onFinished } = props;
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchChain();

  const [artifacts, setArtifacts] = useState<Record<string, DeployArtifact>>({});
  const [results, setResults] = useState<StepResult[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [redeploy, setRedeploy] = useState(false);
  const [deployed, setDeployed] = useState<DeployMap>({});
  /** network chosen inside this card; null = follow the connected wallet chain */
  const [pickedNetworkId, setPickedNetworkId] = useState<number | null>(null);
  const abort = useRef({ aborted: false });
  const locallyDone = useRef<Set<string>>(new Set());

  // GM/GN are once per UTC day, so the "already done" markers we collected in
  // this session stop being true the moment the UTC day rolls over.
  useUtcDay(useCallback(() => {
    locallyDone.current = new Set();
    setResults([]);
  }, []));

  /** addresses already deployed on this network, from the local store */
  const refreshFromStore = useCallback((chainId: number) => {
    const store = readStore();
    const out: DeployMap = {};
    for (const a of ARTIFACTS) {
      const v = store[`${chainId}:${a.key}`];
      if (v) out[a.key] = v;
    }
    return out;
  }, []);

  const target: NetworkConfig | undefined = pickedNetworkId
    ? (ALL_NETWORKS.find((n) => n.id === pickedNetworkId) ?? network)
    : network;

  /** list shown in the card's own picker; always contains the current target */
  const networkOptions = useMemo(() => {
    const base = [...mainnetNetworks, ...testnetNetworks];
    if (target && !base.some((n) => n.id === target.id)) base.push(target);
    return base;
  }, [target]);

  // show what is already deployed whenever the network changes
  useEffect(() => {
    setResults([]);
    setRedeploy(false);
    setDeployed(target ? refreshFromStore(target.id) : {});
  }, [target?.id, refreshFromStore]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const isDone = useCallback(
    (id: string) => locallyDone.current.has(id) || !!doneTaskIds?.has(id),
    [doneTaskIds]
  );

  const start = useCallback(async () => {
    if (!target || !account || running) return;
    setRunning(true);
    abort.current = { aborted: false };
    setResults([]);
    setCurrent(null);

    const store = readStore();
    const steps: SequenceStepDef[] = [
      { id: "gm", label: "GM", kind: "mission", method: "gm", available: !!nikBase },
      { id: "gn", label: "GN", kind: "mission", method: "gn", available: !!nikBase },
      ...ARTIFACTS.map((a) => {
        const key = `${target.id}:${a.key}`;
        const cached = redeploy ? undefined : store[key];
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
        done: { isDone, mark: (id) => locallyDone.current.add(id) },
        onUpdate: (res, i) => {
          setResults(res);
          setCurrent(i);
        },
        signal: abort.current,
      });

      // remember freshly deployed addresses so the next run reuses them
      const next = readStore();
      let changed = false;
      for (const r of out) {
        if (r.address) {
          next[`${target.id}:${r.id}`] = r.address;
          changed = true;
        }
      }
      if (changed) writeStore(next);
      setDeployed(refreshFromStore(target.id));
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

  // What a fresh run would cost: the three deployments plus two cheap mission
  // calls. Contracts already deployed on this network are free, which is the
  // whole point of the cached-address reuse.
  const deployGas = ARTIFACTS.reduce(
    (sum, a) => sum + (deployed[a.key] ? 0 : estimateDeployGas(artifacts[a.key])),
    0
  );
  const MISSION_GAS_EACH = 30_000;
  const estimatedGas = deployGas + 2 * MISSION_GAS_EACH;
  const reusedCount = ARTIFACTS.filter((a) => deployed[a.key]).length;

  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--bg-card)) 0%, color-mix(in srgb, #4F46E5 6%, var(--bg-subtle)) 100%)",
        border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)",
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "color-mix(in srgb, var(--accent) 16%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 34%, transparent)",
              color: "var(--accent)",
            }}
          >
            <Zap className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-bright)" }}>
              5-in-1
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              GM + GN + Simple + Token + NFT on {target?.name ?? "your network"}, one click
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <NetworkSelect
            networks={networkOptions}
            value={target?.id ?? 0}
            onChange={(id) => setPickedNetworkId(id)}
            placeholder="Select network"
            disabled={running}
          />
          <button
            onClick={isConnected ? start : onConnect}
            disabled={isConnected && (!canRun || running)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#000" }}
          >

          {running ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Rocket className="w-3.5 h-3.5" />
          )}
          {running
            ? `Step ${(current ?? 0) + 1}/5...`
            : isConnected
              ? "Run all 5"
              : "Connect wallet"}
          </button>
        </div>
      </div>

      {/* Network grid ? this card owns network choice now, so the grid lives here.
          Selecting a tile sets the chain the runner deploys to and sends GM/GN
          to, replacing the small dropdown above for anything but a quick pick. */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span
            className="text-[10px] font-mono uppercase tracking-[0.2em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Pick a network
          </span>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
            {networkOptions.length} networks
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {networkOptions.map((n) => (
            <NetworkTile
              key={n.id}
              network={n}
              isSelected={target?.id === n.id}
              isDisabled={running || !isConnected}
              hasContract={!!NIKBASE_CONTRACTS[n.id]}
              onSelect={() => setPickedNetworkId(n.id)}
            />
          ))}
        </div>
      </div>

      {blockedByArtifacts && (
        <p className="text-[11px] mt-3" style={{ color: "#FFC24B" }}>
          Could not load the deploy artifacts ({missingArtifacts.join(", ")}) - the run
          is unavailable until they can be fetched.
        </p>
      )}

      {isConnected && !nikBase && (
        <p className="text-[11px] mt-3" style={{ color: "#FFC24B" }}>
          No NikBase contract on {target?.name ?? "this network"} - the two missions would be skipped.
        </p>
      )}

      {Object.keys(deployed).length > 0 && (
        <div className="mt-3 space-y-1">
          {ARTIFACTS.filter((a) => deployed[a.key]).map((a) => (
            <div
              key={a.key}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: "var(--bg-subtle)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)" }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
              <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>
                {a.label}
              </span>
              <span className="flex-1" />
              <a
                href={`${target?.blockExplorers.default.url}/address/${deployed[a.key]}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-mono truncate max-w-[130px]"
                style={{ color: "var(--accent)" }}
              >
                {deployed[a.key].slice(0, 10)}...
              </a>
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={redeploy}
              onChange={(e) => setRedeploy(e.target.checked)}
              className="accent-[var(--accent)]"
              style={{ width: 12, height: 12 }}
            />
            <span className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
              Redeploy even though an address is saved (costs another deployment)
            </span>
          </label>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="h-[3px] flex-1 rounded-full overflow-hidden"
              style={{ background: "rgba(160,155,190,0.15)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(doneCount / 5) * 100}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--success))",
                }}
              />
            </div>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
              {doneCount}/5
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {results.map((r, i) => {
              const st = STATUS_STYLE[r.status];
              const Icon = st.icon;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{ background: "var(--bg-subtle)", border: `1px solid ${st.color}33` }}
                >
                  <Icon
                    className={`w-3.5 h-3.5 flex-shrink-0 ${r.status === "signing" ? "animate-spin" : ""}`}
                    style={{ color: st.color }}
                  />
                  <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>
                    {i + 1}. {r.label}
                  </span>
                  <span className="flex-1" />
                  {r.address && (
                    <a
                      href={`${target?.blockExplorers.default.url}/address/${r.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono truncate max-w-[120px]"
                      style={{ color: "var(--accent)" }}
                    >
                      {r.address.slice(0, 8)}...
                    </a>
                  )}
                  {r.explorerUrl && !r.address && (
                    <a
                      href={r.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--text-quaternary)" }}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {r.error && (
                    <span className="text-[10px] font-mono" style={{ color: "#ff9a9a" }}>
                      {r.error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[10px] font-mono mt-3" style={{ color: "var(--text-quaternary)" }}>
        5 separate transactions, one after another - your wallet signs each one. Gas is charged per
        step, and a failed step does not stop the rest.
      </p>

      {loaded && estimatedGas > 0 && (
        <div
          className="flex items-center justify-between gap-3 mt-2 px-2.5 py-1.5 rounded-lg"
          style={{
            background: "var(--bg-subtle)",
            border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
          }}
        >
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            {reusedCount > 0
              ? `${reusedCount}/3 already deployed here - next run costs almost nothing`
              : "Estimated gas for this run"}
          </span>
          <span className="text-[11px] font-mono" style={{ color: "var(--accent)" }}>
            ~{estimatedGas.toLocaleString("en-US")}
          </span>
        </div>
      )}
    </div>
  );
}
