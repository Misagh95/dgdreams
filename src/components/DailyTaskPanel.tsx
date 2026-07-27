"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWriteContract, useConfig } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { NetworkConfig } from "@/config/chains";
import { cn } from "@/utils/cn";
import { parseTxError, getExplorerUrl, getNativeSymbol, shortenHash } from "@/utils/transactions";
import { genLayerWriteTask, isGenLayer, GENLAYER_CONTRACT } from "@/lib/genlayer/tasks";

const NIKBASE_ABI = [
  { inputs: [], name: "dailyCheckIn", outputs: [{ name: "newStreak", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "reception", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "gm", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "gn", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "takeDose", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_mood", type: "string" }], name: "moodCheck", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "sanitizeWallet", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "incrementCounter", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "luckySpin", outputs: [{ name: "result", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
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
  4221: GENLAYER_CONTRACT,
};

type ActionId = "checkIn" | "reception" | "gm" | "gn" | "dose" | "mood" | "sanitize" | "counter" | "spin";

type NikBaseFunction = "dailyCheckIn" | "reception" | "gm" | "gn" | "takeDose" | "moodCheck" | "sanitizeWallet" | "incrementCounter" | "luckySpin";

interface TaskStep {
  id: ActionId;
  label: string;
  method: NikBaseFunction;
  args: unknown[];
}

const DAILY_TASKS: TaskStep[] = [
  { id: "checkIn", label: "Daily Check-In", method: "dailyCheckIn", args: [] },
  { id: "reception", label: "Reception", method: "reception", args: [] },
  { id: "gm", label: "GM", method: "gm", args: [] },
  { id: "gn", label: "GN", method: "gn", args: [] },
  { id: "dose", label: "Take Dose", method: "takeDose", args: [] },
  { id: "mood", label: "Mood Check", method: "moodCheck", args: ["happy"] },
  { id: "sanitize", label: "Sanitize Wallet", method: "sanitizeWallet", args: [] },
  { id: "counter", label: "Counter", method: "incrementCounter", args: [] },
  { id: "spin", label: "Lucky Spin", method: "luckySpin", args: [] },
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
  autoStart?: boolean;
}

export default function DailyTaskPanel({
  network,
  address,
  contractAddress,
  onClose,
  onComplete,
  autoStart,
}: DailyTaskPanelProps) {
  const [tasks, setTasks] = useState<TaskProgress[]>(() =>
    DAILY_TASKS.map(() => ({ status: "pending" }))
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

    for (let i = startIdx; i < DAILY_TASKS.length; i++) {
      if (isCancelled.current) break;

      setCurrentIndex(i);
      setTasks((prev) =>
        prev.map((t, idx) =>
          idx === i ? { ...t, status: "signing" as TaskStatus } : t
        )
      );

      const step = DAILY_TASKS[i];
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
          const pubClient = getPublicClient(wagmiConfig);
          let gasOptions: Record<string, bigint> = {};
          try {
            if (!pubClient) throw new Error("No public client");
            const gp = await pubClient.getGasPrice();
            const boosted = (gp * 150n) / 100n;
            try {
              const maxPriority = await pubClient!.estimateMaxPriorityFeePerGas();
              gasOptions = {
                maxFeePerGas: boosted + maxPriority,
                maxPriorityFeePerGas: (maxPriority * 150n) / 100n,
              };
            } catch {
              gasOptions = { gasPrice: boosted };
            }
          } catch {}

          const hash = await writeContractAsync({
            address: contractAddress,
            abi: NIKBASE_ABI,
            functionName: step.method,
            args: actualArgs as any,
            ...gasOptions,
          });

          setTasks((prev) =>
            prev.map((t, idx) => (idx === i ? { ...t, txHash: hash } : t))
          );

          const receipt = await waitForTransactionReceipt(wagmiConfig, {
            hash,
            timeout: 120_000,
          });

          if (receipt.status === "reverted") {
            setTasks((prev) =>
              prev.map((t, idx) =>
                idx === i
                  ? { ...t, status: "failed" as TaskStatus, error: "Transaction reverted" }
                  : t
              )
            );
            break;
          }
        }

        setTasks((prev) =>
          prev.map((t, idx) =>
            idx === i ? { ...t, status: "confirmed" as TaskStatus } : t
          )
        );
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

  const StatusIcon = ({ status }: { status: TaskStatus }) => {
    switch (status) {
      case "confirmed":
        return <span style={{ color: "var(--success)" }}>&#10003;</span>;
      case "failed":
        return <span style={{ color: "var(--danger)" }}>&#10007;</span>;
      case "signing":
        return (
          <span style={{ color: "var(--accent)" }} className="animate-pulse">
            &#9670;
          </span>
        );
      default:
        return <span style={{ color: "var(--text-faint)" }}>&#9675;</span>;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={handleCancel}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-xl shadow-xl max-h-[85vh] flex flex-col"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div
            className="flex items-center justify-between p-5 pb-3"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold" style={{ color: "var(--text-bright)" }}>
                  {network.name}
                </h2>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                Daily Tasks &middot; {completedCount}/9
              </p>
              <a
                href={getExplorerUrl(network, contractAddress, "address")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] hover:underline mt-0.5 font-mono transition-colors"
                style={{ color: "var(--text-quaternary)" }}
              >
                <svg className="w-3 h-3" style={{ color: "var(--success)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                <span>{shortenHash(contractAddress)}</span>
              </a>
            </div>
            <div className="flex items-center gap-3">
              {failedCount > 0 && !isExecuting && (
                <button
                  onClick={execute}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all duration-200"
                  style={{ background: "var(--accent)" }}
                >
                  Resume
                </button>
              )}
              {completedCount === 0 && !isExecuting && tasks[0]?.status === "pending" && (
                <button
                  onClick={execute}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all duration-200"
                  style={{ background: "var(--accent)" }}
                >
                  Start
                </button>
              )}
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                style={{
                  background: "var(--bg-strong)",
                  color: "var(--text-secondary)",
                }}
              >
                {isExecuting ? "Cancel" : "Close"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1">
            {DAILY_TASKS.map((step, i) => {
              const p = tasks[i];
              const isActive = i === currentIndex;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 my-0.5 transition-all duration-200",
                    isActive && p.status === "signing"
                      ? "border"
                      : "",
                    p.status === "confirmed" ? "opacity-60" : "",
                    p.status === "failed" ? "opacity-80" : ""
                  )}
                  style={{
                    ...(isActive && p.status === "signing"
                      ? {
                          background: "var(--accent-muted)",
                          borderColor: "var(--border-default)",
                        }
                      : {}),
                    ...(p.status === "failed"
                      ? { background: "color-mix(in srgb, var(--danger) 5%, transparent)" }
                      : {}),
                  }}
                >
                  <div className="w-5 text-center text-sm">
                    <StatusIcon status={p.status} />
                  </div>
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      p.status === "confirmed"
                        ? "text-[var(--text-tertiary)]"
                        : isActive
                        ? "font-medium"
                        : "text-[var(--text-secondary)]"
                    )}
                    style={isActive && p.status === "signing" ? { color: "var(--text-bright)" } : {}}
                  >
                    {step.label}
                  </span>
                  {p.status === "signing" && (
                    <span className="text-xs" style={{ color: "var(--accent)" }}>
                      Waiting for signature...
                    </span>
                  )}
                  {p.status === "confirmed" && p.txHash && (
                    <a
                      href={getExplorerUrl(network, p.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline underline-offset-2 transition-colors"
                      style={{ color: "var(--text-quaternary)" }}
                    >
                      {shortenHash(p.txHash)}
                    </a>
                  )}
                  {p.status === "failed" && p.error && (
                    <span
                      className="text-xs max-w-[200px] truncate"
                      style={{ color: "var(--danger)" }}
                      title={p.error}
                    >
                      {p.error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {completedCount === DAILY_TASKS.length && (
            <div
              className="p-5 pt-3"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <div
                className="px-4 py-3 rounded-lg text-sm text-center"
                style={{
                  background: "color-mix(in srgb, var(--success) 10%, transparent)",
                  color: "var(--success)",
                }}
              >
                All 9 tasks completed
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
