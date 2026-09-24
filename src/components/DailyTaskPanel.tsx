"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWriteContract, useConfig } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { encodeFunctionData } from "viem";
import type { NetworkConfig } from "@/config/chains";
import { parseTxError, getExplorerUrl, getNativeSymbol, shortenHash } from "@/utils/transactions";
import { genLayerWriteTask, isGenLayer, GENLAYER_CONTRACT } from "@/lib/genlayer/tasks";

const NIKBASE_ABI = [
  { inputs: [], name: "dailyCheckIn", outputs: [{ name: "newStreak", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "gm", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "gn", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;

export const CONTRACTS: Record<number, `0x${string}` | ""> = {
  8453: "0xbB123f450822A42AeDa8e71aF3534d7dc84627F7",
  999: "0xdbeE9eA39FedD197D224EA7520A20b4434635A6a",
  130: "0xC288b68022e752d97E4395ECbA61C2079CE692Ad",
  4217: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  4663: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  1: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  11155111: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  84532: "0xdbeE9eA39FedD197D224EA7520A20b4434635A6a",
  91342: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  4441: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
   5042002: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
   1913: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
   57073: "0x68bb9775B11551310D7A37Aae52e6505A0E1e733",
   5042: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
};

type ActionId = "checkIn" | "gm" | "gn";

type NikBaseFunction = "dailyCheckIn" | "gm" | "gn";

interface TaskStep {
  id: ActionId;
  label: string;
  method: NikBaseFunction;
  args: unknown[];
}

const DAILY_TASKS: TaskStep[] = [
  { id: "checkIn", label: "Daily Check-In", method: "dailyCheckIn", args: [] },
  { id: "gm", label: "GM", method: "gm", args: [] },
  { id: "gn", label: "GN", method: "gn", args: [] },
];

type TaskStatus = "pending" | "signing" | "confirmed" | "failed" | "skipped";

interface TaskProgress {
  status: TaskStatus;
  txHash?: string;
  error?: string;
}

interface DailyTaskPanelProps {
  network: NetworkConfig;
  address: `0x${string}`;
  contractAddress: `0x${string}`;
  onClose: () => void;
  onComplete: () => void;
  onTaskComplete?: (taskId: string) => void;
  onTaskStart?: (taskId: string) => void;
  onTaskFailed?: (taskId: string) => void;
  autoStart?: boolean;
  /** Run only this single task instead of the full 3-task sequence */
  only?: ActionId;
}

export default function DailyTaskPanel({
  network,
  address,
  contractAddress,
  onClose,
  onComplete,
  onTaskComplete,
  onTaskStart,
  onTaskFailed,
  autoStart,
  only,
}: DailyTaskPanelProps) {
  const taskList = only
    ? DAILY_TASKS.filter((t) => t.id === only)
    : DAILY_TASKS;
  const [tasks, setTasks] = useState<TaskProgress[]>(() =>
    taskList.map(() => ({ status: "pending" }))
  );
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const isCancelled = useRef(false);
  const wagmiConfig = useConfig();
  const { writeContractAsync } = useWriteContract();

  const completedCount = tasks.filter((t) => t.status === "confirmed").length;
  const failedCount = tasks.filter((t) => t.status === "failed").length;

  const execute = useCallback(async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    isCancelled.current = false;

    const startIdx = tasks.findIndex((t) => t.status === "pending");
    if (startIdx === -1) {
      setIsExecuting(false);
      return;
    }

    const onGenLayer = isGenLayer(network.id);

    for (let i = startIdx; i < taskList.length; i++) {
      if (isCancelled.current) break;

      setCurrentIndex(i);
      setTasks((prev) =>
        prev.map((t, idx) =>
          idx === i ? { ...t, status: "signing" as TaskStatus } : t
        )
      );
      onTaskStart?.(taskList[i].id);

      const step = taskList[i];
      const actualArgs = step.args;
      try {
        if (onGenLayer) {
          const { hash } = await genLayerWriteTask(
            address,
            step.method as any,
            actualArgs
          );
          setTasks((prev) =>
            prev.map((t, idx) => (idx === i ? { ...t, txHash: hash } : t))
          );
        } else {
          // Chaingreets-style send: hand a MINIMAL tx to the wallet provider.
          // No site-side gas/fee estimation — a flaky RPC must never block the
          // wallet popup or the send. The wallet estimates gas + fees itself.
          const pubClient = getPublicClient(wagmiConfig, { chainId: network.id });
          const data = encodeFunctionData({
            abi: NIKBASE_ABI,
            functionName: step.method,
            args: actualArgs as [],
          });

          const state = wagmiConfig.state;
          const conn = state.current ? state.connections.get(state.current) : undefined;
          const rawProvider = (conn?.connector
            ? await conn.connector.getProvider()
            : undefined) as
            | { request: (a: { method: string; params?: readonly unknown[] }) => Promise<unknown> }
            | undefined;

          let hash: `0x${string}`;
          if (rawProvider?.request) {
            hash = (await rawProvider.request({
              method: "eth_sendTransaction",
              params: [{ from: address, to: contractAddress, data }],
            })) as `0x${string}`;
          } else {
            // Fallback: wagmi path (still wallet-side estimation).
            hash = await writeContractAsync({
              chainId: network.id,
              address: contractAddress,
              abi: NIKBASE_ABI,
              functionName: step.method,
              args: actualArgs as any,
            });
          }

          setTasks((prev) =>
            prev.map((t, idx) => (idx === i ? { ...t, txHash: hash } : t))
          );

          // Receipt poll (2s × 60): pinned site RPC first, wallet provider as
          // fallback — same strategy ChainGreets uses.
          let receipt: { status?: string } | null = null;
          for (let p = 0; p < 60 && !isCancelled.current; p++) {
            await new Promise((r) => setTimeout(r, 2000));
            try {
              const r = await pubClient?.getTransactionReceipt({ hash });
              if (r) { receipt = r as { status?: string }; break; }
            } catch { /* not mined yet or site RPC hiccup — try provider */ }
            try {
              const r = (await rawProvider?.request({
                method: "eth_getTransactionReceipt",
                params: [hash],
              })) as { status?: string } | null;
              if (r) { receipt = r; break; }
            } catch { /* keep polling */ }
          }
          if (!receipt) {
            if (isCancelled.current) break;
            throw new Error("Confirmation timed out — check the explorer link above");
          }

          if (receipt.status === "reverted" || receipt.status === "0x0") {
            setTasks((prev) =>
              prev.map((t, idx) =>
                idx === i
                  ? { ...t, status: "failed" as TaskStatus, error: "Transaction reverted" }
                  : t
              )
            );
            onTaskFailed?.(taskList[i].id);
            break;
          }
        }

        setTasks((prev) =>
          prev.map((t, idx) =>
            idx === i ? { ...t, status: "confirmed" as TaskStatus } : t
          )
        );
        onTaskComplete?.(taskList[i].id);
      } catch (err: any) {
        const msg = parseTxError(err);
        if (msg.toLowerCase().includes("rejected")) {
          setTasks((prev) =>
            prev.map((t, idx) =>
              idx === i
                ? { ...t, status: "pending" as TaskStatus, error: "Rejected - can resume" }
                : t
            )
          );
        } else {
          setTasks((prev) =>
            prev.map((t, idx) =>
              idx === i
                ? { ...t, status: "failed" as TaskStatus, error: msg }
                : t
            )
          );
          onTaskFailed?.(taskList[i].id);
        }
        break;
      }
    }

    setIsExecuting(false);
    setCurrentIndex(null);
    const allDone = tasks.every((t) => t.status === "confirmed");
    if (allDone) onComplete();
  }, [contractAddress, writeContractAsync, tasks, isExecuting, onComplete, wagmiConfig, network.id, address]);

  const executeRef = useRef<() => Promise<void>>(undefined);
  executeRef.current = execute;

  useEffect(() => {
    if (autoStart) {
      const t = setTimeout(() => {
        executeRef.current?.();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [autoStart]);

  const handleCancel = () => {
    if (isExecuting) {
      isCancelled.current = true;
    } else {
      onClose();
    }
  };

  const progress = taskList.length ? completedCount / taskList.length : 0;

  return (
    <>
      <div className="cosmos-overlay" onClick={handleCancel} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="launch-console pointer-events-auto max-h-[88vh] flex flex-col">

          {/* ── سرستون ── */}
          <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6">
            <div className="orbit">
              <div
                className="w-11 h-11 rounded-full grid place-items-center overflow-hidden"
                style={{ background: `color-mix(in srgb, ${network.color} 22%, transparent)` }}
              >
                <img src={network.logo} alt="" width={26} height={26} style={{ objectFit: "contain" }} />
              </div>
            </div>

            <div className="text-center">
              <p className="stat-label mb-1">
                {only ? "single mission" : "launch sequence"}
              </p>
              <h2 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-bright)" }}>
                {network.name}
              </h2>
              <a
                href={getExplorerUrl(network, contractAddress, "address")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-tertiary)" }}
              >
                <span className="status-dot" style={{ color: "var(--success)" }} />
                {shortenHash(contractAddress)}
              </a>
            </div>

            {/* شمارنده‌ی بزرگ */}
            <div className="flex items-baseline gap-1 mt-1">
              <span className="stat-value" style={{ fontSize: "2rem" }}>{completedCount}</span>
              <span className="text-sm" style={{ color: "var(--text-faint)" }}>/ {taskList.length}</span>
            </div>
            <div className="progress-bar w-40">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          {/* ── مراحل ── */}
          <div className="px-6 pb-2 overflow-y-auto">
            <div className="spine">
              <div
                className="spine-fill"
                style={{ height: `calc(${progress} * (100% - 28px))` }}
              />
              {taskList.map((step, i) => {
                const st = tasks[i];
                const active = currentIndex === i;
                return (
                  <div
                    key={step.id}
                    className="relative py-3.5"
                    style={{ opacity: st.status === "pending" && !active ? 0.45 : 1, transition: "opacity .4s" }}
                  >
                    <div className="node" data-state={st.status} style={{ top: "1.15rem" }}>
                      {st.status === "confirmed" && "✓"}
                      {st.status === "failed" && "✕"}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="text-sm font-medium tracking-tight"
                        style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}
                      >
                        {step.label}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                        {st.status === "signing" ? "broadcasting" : st.status}
                      </span>
                    </div>

                    {st.txHash && (
                      <a
                        href={getExplorerUrl(network, st.txHash, "tx")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-block font-mono text-[10px] hover:underline"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {shortenHash(st.txHash)} ↗
                      </a>
                    )}
                    {st.error && (
                      <p className="mt-1.5 text-[11px] leading-snug" style={{ color: "var(--danger)" }}>
                        {st.error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── نوار فرمان ── */}
          <div
            className="flex items-center gap-3 px-6 py-5 mt-2"
            style={{ borderTop: "1px solid var(--border-default)" }}
          >
            <button onClick={handleCancel} className="btn-ghost flex-1 justify-center">
              {isExecuting ? "Abort" : "Close"}
            </button>
            <button
              onClick={execute}
              disabled={isExecuting || completedCount === taskList.length}
              className="btn-primary flex-1 justify-center"
            >
              {completedCount === taskList.length
                ? "Sequence complete"
                : isExecuting
                ? "Running…"
                : failedCount > 0
                ? "Retry"
                : "Initiate"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
