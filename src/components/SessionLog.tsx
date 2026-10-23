"use client";

import { useEffect, useState } from "react";

export interface LogEntry {
  time: string;
  type: "info" | "success" | "error" | "warning";
  msg: string;
}

const logStore: LogEntry[] = [];
const listeners = new Set<() => void>();

export function pushLog(type: LogEntry["type"], msg: string) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
  logStore.push({ time, type, msg });
  if (logStore.length > 200) logStore.shift();
  listeners.forEach((fn) => fn());
}

/** Subscribe to the activity feed. */
export function useLogEntries(): LogEntry[] {
  const [, setTick] = useState(0);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    const fn = () => {
      setTick((t) => t + 1);
      setEntries([...logStore].reverse());
    };
    fn();
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  return entries;
}

const DOT_COLOR: Record<LogEntry["type"], string> = {
  info: "var(--text-faint)",
  success: "var(--success)",
  error: "var(--danger)",
  warning: "var(--warning)",
};

/**
 * The activity feed.
 *
 * A quiet list of what just happened, newest first. No colour-coded
 * terminal chrome — a small dot carries the status.
 */
export default function SessionLog({
  limit = 8,
  showClear = true,
}: {
  limit?: number;
  showClear?: boolean;
}) {
  const entries = useLogEntries();
  const shown = entries.slice(0, limit);

  return (
    <div className="flex flex-col gap-2">
      {showClear && entries.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            logStore.length = 0;
            listeners.forEach((fn) => fn());
          }}
          className="self-start text-[12px] transition-colors hover:opacity-70"
          style={{ color: "var(--text-faint)" }}
        >
          Clear
        </button>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
          Nothing yet. Connect a wallet to start.
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((entry, i) => (
            <li key={`${entry.time}-${i}`} className="flex items-start gap-2">
              <span
                className="mt-[6px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: DOT_COLOR[entry.type] }}
                aria-hidden
              />
              <span className="min-w-0">
                <span
                  className="block text-[12px] leading-snug"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {entry.msg}
                </span>
                <span
                  className="block text-[12px] mt-0.5"
                  style={{ color: "var(--text-faint)" }}
                >
                  {entry.time}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
