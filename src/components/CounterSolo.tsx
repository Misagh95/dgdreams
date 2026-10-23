"use client";

import { useCallback, useMemo, useState } from "react";
import { useConfig, useReadContract, useSwitchChain } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { isAddress, toHex } from "viem";
import { CheckCircle2, Hash, Loader2, Plus, TriangleAlert } from "lucide-react";

import { NIKBASE_CONTRACTS, allChains, type NetworkConfig } from "@/config/chains";
import { runSequence, type StepResult } from "@/lib/sequence";
import { canStillRunTask } from "@/lib/preflight";
import { useUtcDay } from "@/hooks/useUtcDay";
import { getExplorerUrl, parseTxError, shortenHash } from "@/utils/transactions";

/** NikBase allows REPEAT_3 counter increments per wallet per UTC day. */
const DAILY_LIMIT = 3;

const NIKBASE_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getActionCounts",
    outputs: [
      { name: "actCount", type: "uint256" },
      { name: "dose", type: "uint256" },
      { name: "mood", type: "uint256" },
      { name: "sanitize", type: "uint256" },
      { name: "counter", type: "uint256" },
      { name: "spin", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface CounterSoloProps {
  /** the wallet's connected network — the default target */
  network?: NetworkConfig;
  isConnected: boolean;
  account?: `0x${string}`;
  onConnect: () => void;
}

/**
 * CounterSolo — the counter transaction on its own.
 *
 * The 6-in-1 runner always sends Check-In + GM + GN together. This card is the
 * single-action counterpart: one `incrementCounter()` call, on its own, on any
 * network that has a NikBase. NikBase caps it at 3 per UTC day, so the card
 * shows today's count and refuses a 4th call before the wallet does.
 */
export default function CounterSolo({
  network,
  isConnected,
  account,
  onConnect,
}: CounterSoloProps) {
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<StepResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The wallet's own chain, but only when it can actually take a counter tx.
  const connectedTarget = useMemo(
    () => (network && NIKBASE_CONTRACTS[network.id] ? network : undefined),
    [network]
  );

  /** The hero owns the network; this card follows it. */
  const target = connectedTarget;

  const nikBase = target ? NIKBASE_CONTRACTS[target.id] : undefined;
  const validatedAccount = account && isAddress(account) ? account : undefined;
  // only read on a chain the wagmi config knows about
  const targetChainId = target && allChains.some((c) => c.id === target.id)
    ? target.id
    : undefined;

  const { data: counts, refetch: refetchCounts } = useReadContract({
    address: nikBase && isAddress(nikBase) ? nikBase : undefined,
    abi: NIKBASE_ABI,
    functionName: "getActionCounts",
    args: validatedAccount ? [validatedAccount] : undefined,
    chainId: targetChainId,
    query: {
      enabled: !!nikBase && !!validatedAccount && !!targetChainId,
      refetchInterval: 30_000,
    },
  });

  /** index 4 of getActionCounts() is today's counter count */
  const counterToday = counts ? Number(counts[4]) : 0;
  const remaining = Math.max(DAILY_LIMIT - counterToday, 0);
  const atLimit = counterToday >= DAILY_LIMIT;

  // the per-day counters roll over at 00:00 UTC, so today's count is stale
  // the moment the day flips
  const { countdown } = useUtcDay(
    useCallback(() => {
      refetchCounts();
      setResult(null);
      setError(null);
    }, [refetchCounts])
  );

  const handleIncrement = useCallback(async () => {
    if (!isConnected) {
      onConnect();
      return;
    }
    if (!target || !nikBase || !validatedAccount || running) return;

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const pub = getPublicClient(wagmiConfig, { chainId: target.id });

      // ── PREFLIGHT ────────────────────────────────────────────────────
      // The counter is capped at 3 per UTC day. A 4th call reverts with
      // LimitReached(), and the wallet would only show "Simulation Failed
      // (execution revert)" — so ask the chain first and say it in words.
      if (pub) {
        const runnable = await canStillRunTask(pub, {
          account: validatedAccount,
          contract: nikBase,
          method: "incrementCounter",
        });
        if (!runnable) {
          setError(
            `Daily limit reached — NikBase allows ${DAILY_LIMIT} counter increments per UTC day.`
          );
          return;
        }
      }

      // ── LEGACY GAS CHAINS ────────────────────────────────────────────
      // Arbitrum Orbit style sequencers reject a transaction without an
      // explicit gasPrice, and reject it again when the wallet's local nonce
      // has drifted from the sequencer's expected message index.
      let txExtra: Record<string, unknown> | undefined;
      if (target.requiresLegacyGas && pub) {
        txExtra = {};
        if (target.legacyGasPrice) txExtra.gasPrice = target.legacyGasPrice;
        try {
          const nonce = await pub.getTransactionCount({
            address: validatedAccount,
            blockTag: "pending",
          });
          if (nonce !== undefined) txExtra.nonce = toHex(nonce);
        } catch {
          /* nonce fetch failed — let the wallet decide */
        }
      }

      // ── SEND ─────────────────────────────────────────────────────────
      const out = await runSequence({
        steps: [
          { id: "counter", label: "Counter", kind: "mission", method: "incrementCounter" },
        ],
        account: validatedAccount,
        chainId: target.id,
        contractAddress: nikBase,
        rpcUrls: target.rpcUrls.default.http,
        explorerUrl: target.blockExplorers.default.url,
        getProvider: async () => {
          const state = wagmiConfig.state;
          const conn = state.current ? state.connections.get(state.current) : undefined;
          return conn?.connector
            ? ((await conn.connector.getProvider()) as never)
            : undefined;
        },
        switchChain: async (chainIdTo) => {
          const res = await switchChainAsync({ chainId: chainIdTo });
          return (res as { chainId?: number } | undefined)?.chainId;
        },
        ...(txExtra ? { txExtra } : {}),
        onUpdate: (res) => setResult(res[0] ?? null),
      });

      const r = out[0];
      if (r?.status === "done") {
        refetchCounts();
      } else if (r?.status === "skipped" && /rejected/i.test(r.error ?? "")) {
        /* the user declined in the wallet — not an error */
      } else if (r?.error) {
        setError(r.error);
      }
    } catch (err) {
      setError(parseTxError(err));
    } finally {
      setRunning(false);
    }
  }, [
    isConnected,
    onConnect,
    target,
    nikBase,
    validatedAccount,
    running,
    wagmiConfig,
    switchChainAsync,
    refetchCounts,
  ]);

  const busy = running;
  const canIncrement =
    isConnected && !!validatedAccount && !!nikBase && !atLimit && !busy;

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
            <Hash className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="text-[16px] font-semibold" style={{ color: "var(--text-bright)" }}>
              Counter
            </h3>
            <p className="text-[14px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
              One increment on {target?.name ?? "your network"}, up to {DAILY_LIMIT} a day.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleIncrement}
            disabled={isConnected && (!canIncrement || busy)}
            className="btn-ghost min-w-[132px]"
            title={
              !isConnected
                ? "Connect your wallet"
                : atLimit
                ? "Daily limit reached"
                : "Send one counter transaction"
            }
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {busy
              ? "Sending…"
              : !isConnected
              ? "Connect wallet"
              : atLimit
              ? "Limit reached"
              : "Increment counter"}
          </button>
        </div>
      </div>

      {/* today's count + reset */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-[3px] flex-1 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(counterToday, DAILY_LIMIT) / DAILY_LIMIT * 100}%`,
              background: "var(--accent)",
            }}
          />
        </div>
        <span className="text-[12px] flex-shrink-0" style={{ color: "var(--text-faint)" }}>
          {counterToday}/{DAILY_LIMIT} today
        </span>
        <span className="text-[12px] flex-shrink-0" style={{ color: "var(--text-faint)" }}>
          resets in <span className="font-mono tabular-nums">{countdown}</span>
        </span>
      </div>

      {/* last transaction */}
      {result && result.status === "done" && (
        <div
          className="mt-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{
            background: "var(--bg-subtle)",
            border: "1px solid color-mix(in srgb, var(--success) 26%, transparent)",
          }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--success)" }} />
          <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            Counter incremented
          </span>
          <span className="flex-1" />
          {result.hash && (
            <a
              href={target ? getExplorerUrl(target, result.hash, "tx") : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-mono hover:underline"
              style={{ color: "var(--accent-text)" }}
            >
              {shortenHash(result.hash)} ↗
            </a>
          )}
        </div>
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
          <span className="text-[12px] leading-snug" style={{ color: "var(--danger)" }}>
            {error}
          </span>
        </div>
      )}

      {network && !connectedTarget && (
        <p className="text-[12px] mt-3" style={{ color: "var(--warning)" }}>
          No NikBase contract on {network.name} — pick another network above.
        </p>
      )}

      <p className="text-[12px] mt-3" style={{ color: "var(--text-quaternary)" }}>
        One transaction, one signature — you pay network gas. NikBase counts it as one
        of the 15 daily actions and resets at 00:00 UTC.
      </p>
    </div>
  );
}
