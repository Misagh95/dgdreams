"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useConfig, useSwitchChain } from "wagmi";
import { encodeDeployData, isAddress, type Abi, type AbiParameter } from "viem";
import { Rocket, ExternalLink, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { mainnetNetworks, testnetNetworks, NIKBASE_CONTRACTS } from "@/config/chains";

type Artifact = {
  name: string;
  title: string;
  blurb: string;
  tag: string;
  abi: Abi;
  bytecode: `0x${string}`;
  constructorInputs: AbiParameter[];
  runtimeBytes: number;
};

const ALL_NETWORKS = [...mainnetNetworks, ...testnetNetworks];
const NAMES = ["NikBase", "SoulboundStreak", "Game2048", "LitePrediction"];
const card = { background: "var(--bg-card)", border: "1px solid var(--border-default)" } as const;
const inputStyle = { background: "var(--bg-subtle)", border: "1px solid var(--border-default)", color: "var(--text-primary)" };

export default function DeployPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const wagmiConfig = useConfig();

  const [selectedName, setSelectedName] = useState("NikBase");
  const [artifacts, setArtifacts] = useState<Record<string, Artifact>>({});
  const [targetChain, setTargetChain] = useState(0);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ hash: string; chainId: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        NAMES.map(async (n) => {
          try {
            const res = await fetch(`/contracts/${n}.json`);
            return res.ok ? ([n, (await res.json()) as Artifact] as const) : null;
          } catch {
            return null;
          }
        })
      );
      if (!alive) return;
      const map: Record<string, Artifact> = {};
      for (const e of entries) if (e) map[e[0]] = e[1];
      setArtifacts(map);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const contract = artifacts[selectedName];
  const net = ALL_NETWORKS.find((n) => n.id === targetChain);

  useEffect(() => {
    if (chainId && ALL_NETWORKS.some((n) => n.id === chainId)) setTargetChain(chainId);
    else if (!targetChain) setTargetChain(ALL_NETWORKS[0]?.id ?? 1);
  }, [chainId, targetChain]);

  // prefill addresses so the common case needs no typing
  useEffect(() => {
    if (!contract) return;
    const next: Record<string, string> = {};
    for (const input of contract.constructorInputs) {
      const key = input.name || "";
      next[key] =
        input.type === "address"
          ? input.name === "nikBaseAddress"
            ? NIKBASE_CONTRACTS[targetChain] || address || ""
            : address || ""
          : "";
    }
    setArgs(next);
    setError(null);
    setSent(null);
  }, [contract, address, targetChain]); // eslint-disable-line react-hooks/exhaustive-deps

  const argsValid = useMemo(() => {
    if (!contract) return false;
    return contract.constructorInputs.every((input) => {
      const v = (args[input.name || ""] || "").trim();
      return v && (input.type !== "address" || isAddress(v));
    });
  }, [contract, args]);

  const deploy = useCallback(async () => {
    if (!contract || !net || !address) return;
    setBusy(true);
    setError(null);
    setSent(null);
    try {
      if (chainId !== net.id) await switchChainAsync({ chainId: net.id });

      const values = contract.constructorInputs.map(
        (input) => (args[input.name || ""] || "").trim()
      ) as unknown[];

      const data = encodeDeployData({
        abi: contract.abi,
        bytecode: contract.bytecode,
        args: values,
      });

      const conn = wagmiConfig.state.current
        ? wagmiConfig.state.connections.get(wagmiConfig.state.current)
        : undefined;
      const provider = (await conn?.connector?.getProvider()) as
        | { request: (a: { method: string; params?: readonly unknown[] }) => Promise<unknown> }
        | undefined;
      if (!provider?.request) throw new Error("No wallet provider available");

      // no `to` field => contract creation
      const hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: address, data }],
      })) as `0x${string}`;

      setSent({ hash, chainId: net.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/user rejected|denied/i.test(msg) ? "You rejected the transaction." : msg.slice(0, 160));
    } finally {
      setBusy(false);
    }
  }, [contract, net, address, chainId, switchChainAsync, wagmiConfig, args]);

  return (
    <DashboardLayout title="Deploy" subtitle="// put a contract on-chain from your own wallet">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Pick a contract and a network. <strong>Your wallet pays the gas</strong> — the app
          never holds keys and never deploys on your behalf.
        </p>

        {Object.keys(artifacts).length === 0 && (
          <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>
            Loading contracts… if this stays empty run: forge build &amp;&amp; node scripts/export-deployable.mjs
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {Object.values(artifacts).map((a) => {
            const on = a.name === selectedName;
            return (
              <button
                key={a.name}
                onClick={() => setSelectedName(a.name)}
                className="text-left rounded-2xl p-4 transition-all"
                style={{
                  background: on ? "var(--bg-strong)" : "var(--bg-card)",
                  border: `1px solid ${on ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "var(--border-default)"}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-bright)" }}>
                    {a.title}
                  </span>
                  <span
                    className="text-[9px] font-mono px-2 py-0.5 rounded-md"
                    style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}
                  >
                    {a.tag}
                  </span>
                </div>
                <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  {a.blurb}
                </p>
                <p className="text-[10px] font-mono mt-2" style={{ color: "var(--text-quaternary)" }}>
                  {(a.runtimeBytes / 1024).toFixed(1)}KB runtime
                  {a.constructorInputs.length > 0 && ` · ${a.constructorInputs.length} ctor args`}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl p-4" style={card}>
          <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-quaternary)" }}>
            Network
          </label>
          <div className="flex flex-wrap gap-2 mt-3">
            {ALL_NETWORKS.map((n) => {
              const on = n.id === targetChain;
              return (
                <button
                  key={n.id}
                  onClick={() => setTargetChain(n.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                  style={{
                    background: on ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg-subtle)",
                    border: `1px solid ${on ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "var(--border-default)"}`,
                    color: on ? "var(--accent)" : "var(--text-tertiary)",
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: n.color, boxShadow: `0 0 6px ${n.color}` }} />
                  {n.name}
                </button>
              );
            })}
          </div>
          {net?.isTestnet && (
            <p className="text-[10px] font-mono mt-2" style={{ color: "#FFC24B" }}>
              Testnet — the safe place to try first.
            </p>
          )}
        </div>

        {contract && contract.constructorInputs.length > 0 && (
          <div className="rounded-2xl p-4 space-y-3" style={card}>
            <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-quaternary)" }}>
              Constructor
            </label>
            {contract.constructorInputs.map((input) => {
              const key = input.name || "";
              const val = args[key] || "";
              const bad = val.trim() !== "" && input.type === "address" && !isAddress(val);
              return (
                <div key={key}>
                  <label className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                    {key} <span style={{ color: "var(--text-quaternary)" }}>({input.type})</span>
                  </label>
                  <input
                    value={val}
                    onChange={(e) => setArgs((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={input.type === "address" ? "0x…" : input.type}
                    spellCheck={false}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    style={{
                      ...inputStyle,
                      border: `1px solid ${bad ? "#ff4444" : "var(--border-default)"}`,
                    }}
                  />
                  {input.name === "nikBaseAddress" && (
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-quaternary)" }}>
                      Prefilled with the NikBase this app uses on {net?.name}. Deploy NikBase first
                      if it is empty.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={deploy}
            disabled={!isConnected || busy || !contract || !argsValid}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {busy ? "Deploying…" : `Deploy ${contract?.name ?? ""} to ${net?.name ?? ""}`}
          </button>
          {!isConnected && (
            <span className="text-[11px] font-mono" style={{ color: "var(--text-quaternary)" }}>
              Connect a wallet first
            </span>
          )}
          {isConnected && contract && contract.constructorInputs.length > 0 && !argsValid && (
            <span className="text-[11px] font-mono" style={{ color: "#FFC24B" }}>
              Every constructor field needs a valid value
            </span>
          )}
        </div>

        {error && (
          <div
            className="flex items-start gap-2 rounded-xl p-3"
            style={{ background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.25)" }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#ff6b6b" }} />
            <span className="text-xs" style={{ color: "#ffb3b3" }}>
              {error}
            </span>
          </div>
        )}

        {sent && (
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{ ...card, border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)" }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: "var(--success)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-bright)" }}>
                Deployment transaction sent
              </span>
            </div>
            <p className="text-[11px] font-mono break-all" style={{ color: "var(--text-tertiary)" }}>
              tx {sent.hash}
            </p>
            <a
              href={`${ALL_NETWORKS.find((n) => n.id === sent.chainId)?.blockExplorers.default.url}/tx/${sent.hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono"
              style={{ color: "var(--accent)" }}
            >
              View on explorer <ExternalLink className="w-3 h-3" />
            </a>
            <p className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
              The contract address appears in the explorer once the tx is mined.
            </p>
          </div>
        )}

        <details className="rounded-2xl p-4" style={card}>
          <summary className="text-[11px] font-mono cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
            How this works / safety notes
          </summary>
          <ul className="text-[11px] mt-3 space-y-1.5" style={{ color: "var(--text-tertiary)" }}>
            <li>• The bytecode here is the compiled output of this repo&apos;s contracts.</li>
            <li>• Deployment is a plain contract-creation transaction sent by your own wallet.</li>
            <li>• Gas is set by the network you pick — check the cost before signing on a mainnet.</li>
            <li>• The app never sees or stores your private key.</li>
            <li>• After deploying, paste the address into the config to point the app at it.</li>
          </ul>
        </details>
      </div>
    </DashboardLayout>
  );
}
