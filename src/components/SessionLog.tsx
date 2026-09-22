"use client";

import { useState, useRef, useEffect } from "react";

export interface LogEntry {
  time: string;
  type: "info" | "success" | "error" | "warning";
  msg: string;
}

const logStore: LogEntry[] = [];
const listeners = new Set<() => void>();

export function pushLog(type: LogEntry["type"], msg: string) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  logStore.push({ time, type, msg });
  if (logStore.length > 200) logStore.shift();
  listeners.forEach((fn) => fn());
}

export default function SessionLog() {
  const [, setTick] = useState(0);
  const paneRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"session" | "history">("session");

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (paneRef.current) {
      paneRef.current.scrollTop = paneRef.current.scrollHeight;
    }
  }, [logStore.length, tab]);

  const logs = tab === "session" ? logStore : [];

  return (
    <div className="log-panel">
      <div className="log-head">
        <div className="log-tabs">
          <button
            className={`log-tab ${tab === "session" ? "active" : ""}`}
            onClick={() => setTab("session")}
          >
            Session
          </button>
          <button
            className={`log-tab ${tab === "history" ? "active" : ""}`}
            onClick={() => setTab("history")}
          >
            History <span className="log-days">7d</span>
          </button>
        </div>
        <button
          className="log-clr"
          onClick={() => {
            logStore.length = 0;
            setTick((t) => t + 1);
          }}
        >
          clear
        </button>
      </div>
      <div ref={paneRef} className="tx-log-pane active-pane">
        {logs.length === 0 ? (
          <div className="le">
            <span className="lt">&mdash;</span>
            <span className="lk info">INFO</span>
            <span className="lm">No logs yet. Connect your wallet.</span>
          </div>
        ) : (
          logs.map((entry, i) => (
            <div key={i} className="le">
              <span className="lt">{entry.time}</span>
              <span className={`lk ${entry.type}`}>{entry.type.toUpperCase()}</span>
              <span className="lm">{entry.msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
