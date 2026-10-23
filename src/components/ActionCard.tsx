"use client";

import { useCallback, useState } from "react";
import { useConfig, useSwitchChain } from "wagmi";
import { isAddress } from "viem";
import { CheckCircle2, Hash, Loader2, Plus, SkipForward, TriangleAlert, Zap } from "lucide-react";

import { NIKBASE_CONTRACTS, type NetworkConfig } from "@/config/chains";
import { runSequence, type NikBaseMethod, type StepResult, type StepKind, type SequenceStepDef } from "@/lib/sequence";
import { canStillRunTask } from "@/lib/preflight";
import { getExplorerUrl, parseTxError, shortenHash } from "@/utils/transactions";

export interface ActionCardProps {
  network?: NetworkConfig;
  isConnected: boolean;
  account?: `0x${string}`;
  onConnect: () => void;
  taskId: string;
  method?: NikBaseMethod;
  label: string;
  kind: StepKind;
  /** deploy step only: the compiled contract to create */
  artifact?: SequenceStepDef["artifact"];
  /** deploy step only: an address this wallet deployed earlier, so the runner can reuse it without paying twice */
  cachedAddress?: `0x${string}`;
  busy?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onFinished?: (result: StepResult) => void;
  disabled?: boolean;
}

export default function ActionCard({
  network,
  isConnected,
  account,
  onConnect,
  taskId,
  method,
  label,
  kind,
  artifact,
  cachedAddress,
  busy: externalBusy,
  onBusyChange,
  onFinished,
  disabled,
}: ActionCardProps) {
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<StepResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = externalBusy ?? running;
  const setBusy = useCallback(
    (v: boolean) => {
      setRunning(v);
      onBusyChange?.(v);
    },
    [onBusyChange]
  );

  const nikBase = network ? NIKBASE_CONTRACTS[network.id] : undefined;
  const validatedAccount = account && isAddress(account) ? account : undefined;
  const canRun = isConnected && !!validatedAccount && !!nikBase && !busy && !disabled;

  const handleRun = useCallback(async () => {
    if (!canRun) {
      if (!isConnected) onConnect();
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);

    if (kind === "deploy" && !artifact) {
      setError("Contract artifact not loaded — try again in a moment.");
      setRunning(false);
      return;
    }

    try {
      let txExtra: Record<string, unknown> | undefined;
      let pub: { getTransactionCount: (args: { address: `0x${string}`; blockTag: string | number }) => Promise<number | undefined> } | undefined;
      try {
        const { getPublicClient } = await import("@wagmi/core");
        const pc = getPublicClient(wagmiConfig, { chainId: network!.id });
        if (pc && typeof pc.getTransactionCount === "function") {
          pub = pc as never;
        }
      } catch {
        /* no public client available */
      }

      if (kind === "mission") {
        if (pub) {
          const runnable = await canStillRunTask(pub as never, {
            account: validatedAccount!,
            contract: nikBase!,
            method: method!,
          });
          if (!runnable) {
            setError(
              method === "incrementCounter"
                ? "Daily limit reached — NikBase allows 3 counter increments per UTC day."
                : `Already done today — ${label} counts once per UTC day.`
            );
            setRunning(false);
            return;
          }
        }
        if (network && network.requiresLegacyGas && pub) {
          txExtra = {};
          if (network.legacyGasPrice) txExtra.gasPrice = network.legacyGasPrice;
          try {
            const nonce = await pub.getTransactionCount({ address: validatedAccount!, blockTag: "pending" });
            if (nonce !== undefined) {
              const hex = nonce.toString(16).padStart(64, "0");
              txExtra.nonce = `0x${hex}`;
            }
          } catch {
            /* ignore */
          }
        }
      }

      const step: Parameters<typeof runSequence>[0]["steps"][0] = {
        id: taskId,
        label,
        kind,
        method: method ?? undefined,
        ...(artifact ? { artifact } : {}),
        ...(cachedAddress ? { cachedAddress } : {}),
      };

      const out = await runSequence({
        steps: [step],
        account: validatedAccount!,
        chainId: network!.id,
        contractAddress: nikBase!,
        rpcUrls: network!.rpcUrls.default.http,
        explorerUrl: network!.blockExplorers.default.url,
        getProvider: async () => {
          const state = wagmiConfig.state;
          const conn = state.current ? state.connections.get(state.current) : undefined;
          return conn?.connector ? ((await conn.connector.getProvider()) as never) : undefined;
        },
        switchChain: async (chainIdTo) => {
          const res = await switchChainAsync({ chainId: chainIdTo });
          return (res as { chainId?: number } | undefined)?.chainId;
        },
        ...(txExtra ? { txExtra } : {}),
        onUpdate: (res) => {
          const r = res[0] ?? null;
          if (r) setResult(r as StepResult);
          if (r?.status === "done" || r?.status === "failed" || r?.status === "skipped") {
            setRunning(false);
          }
        },
      });

      const r = out[0] ?? null;
      if (r?.status === "done") {
        onFinished?.(r as StepResult);
      } else if (r?.status === "skipped" && /rejected/i.test(r.error ?? "")) {
        /* user declined — not an error */
      } else if (r?.error) {
        setError(r.error);
        setRunning(false);
      }
    } catch (err) {
      setError(parseTxError(err));
      setRunning(false);
    } finally {
      if (running) setRunning(false);
    }
  }, [
    canRun, isConnected, onConnect, network, nikBase, validatedAccount,
    taskId, label, kind, method, artifact, cachedAddress, running, wagmiConfig, switchChainAsync, onFinished,
  ]);

  const Icon = kind === "deploy" ? Zap : Plus;

  return (
    <div
      className="rounded-[20px] p-5 sm:p-6"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      {kind === "deploy" && (
        <div className="flex items-start gap-3 mb-3">
          <span className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
            <Zap className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="text-[16px] font-semibold" style={{ color: "var(--text-bright)" }}>{label}</h3>
            <p className="text-[14px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Deploy a contract on {network?.name ?? "your network"}, one step at a time.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleRun}
          disabled={!canRun}
          className="btn-ghost min-w-[132px]"
          title={
            !isConnected
              ? "Connect your wallet"
              : !nikBase
              ? `No NikBase contract on ${network?.name ?? "this network"}`
              : kind === "deploy"
              ? "Deploy this contract"
              : "Send one transaction"
          }
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
          {busy
            ? "Sending…"
            : !isConnected
            ? "Connect wallet"
            : !nikBase
            ? "Pick another network"
            : `Run ${label}`}
        </button>
        {result?.status === "done" ? (
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--success)" }} />
        ) : result?.status === "failed" ? (
          <TriangleAlert className="w-4 h-4 flex-shrink-0" style={{ color: "var(--danger)" }} />
        ) : null}
      </div>

      {result?.hash && (
        <a
          href={network ? getExplorerUrl(network, result.hash, "tx") : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-mono hover:underline mt-2 inline-block"
          style={{ color: "var(--accent-text)" }}
        >
          {shortenHash(result.hash)} ↗
        </a>
      )}

      {error && (
        <div
          className="mt-3 flex items-start gap-2 px-2.5 py-1.5 rounded-lg"
          style={{
            background: "var(--bg-subtle)",
            border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
          }}
        >
          <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" style={{ color: "var(--danger)" }} />
          <span className="text-[12px] leading-snug" style={{ color: "var(--danger)" }}>{error}</span>
        </div>
      )}

      {network && !nikBase && (
        <p className="text-[12px] mt-3" style={{ color: "var(--warning)" }}>
          No NikBase contract on {network.name} — pick another network above.
        </p>
      )}

      <p className="text-[12px] mt-3" style={{ color: "var(--text-quaternary)" }}>
        {kind === "deploy"
          ? "This deploys a contract to the selected network. One transaction, one signature — you pay network gas."
          : "One transaction, one signature — you pay network gas."}
      </p>
    </div>
  );
}
