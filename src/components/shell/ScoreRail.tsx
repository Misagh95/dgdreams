"use client";

import { useAccount } from "wagmi";
import { Flame, Sparkles, TrendingUp } from "lucide-react";

import SessionLog from "@/components/SessionLog";
import { useRitual } from "@/hooks/useRitual";
import { TOTAL_MISSION_POINTS } from "@/lib/ritual";

/**
 * ScoreRail — the narrow right column.
 *
 * The score, and a small feed of what just happened. It answers one
 * question ("how am I doing?") and then gets out of the way.
 */
export default function ScoreRail() {
  const { isConnected } = useAccount();
  const { streak, totalActions, doneCount, allDone, missions } = useRitual();
  const pointsToday = missions
    .filter((m) => m.done)
    .reduce((sum, m) => sum + m.points, 0);

  const rows = [
    { label: "Streak", value: isConnected ? `${streak}d` : "—", icon: Flame },
    {
      label: "Today",
      value: isConnected ? `${doneCount}/3` : "—",
      icon: TrendingUp,
    },
    {
      label: "Actions",
      value: isConnected ? `${totalActions}` : "—",
      icon: Sparkles,
    },
  ];

  return (
    <aside
      className="hidden xl:flex w-[260px] shrink-0 flex-col gap-4 sticky top-0 h-screen py-6 pr-6"
      aria-label="Score"
    >
      <div
        className="rounded-[20px] p-5"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
        }}
      >
        <p className="kicker mb-4">Score</p>
        <div className="space-y-3">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="flex items-center gap-2.5">
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  strokeWidth={1.75}
                  style={{ color: "var(--text-faint)" }}
                />
                <span
                  className="text-[14px] flex-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {row.label}
                </span>
                <span
                  className="text-[14px] font-mono font-medium tabular-nums"
                  style={{ color: "var(--text-bright)" }}
                >
                  {row.value}
                </span>
              </div>
            );
          })}
        </div>

        <div
          className="mt-4 pt-4"
          style={{ borderTop: "1px solid var(--border-default)" }}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              Points today
            </span>
            <span
              className="text-[14px] font-mono font-medium tabular-nums"
              style={{ color: "var(--text-bright)" }}
            >
              {isConnected ? pointsToday : 0}
              <span style={{ color: "var(--text-faint)" }}>
                /{TOTAL_MISSION_POINTS}
              </span>
            </span>
          </div>
          <div className="mt-2 progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${
                  isConnected ? (doneCount / 3) * 100 : 0
                }%`,
              }}
            />
          </div>
          {isConnected && allDone ? (
            <p
              className="mt-2 text-[12px] font-medium"
              style={{ color: "var(--accent-text)" }}
            >
              Today is done. See you tomorrow.
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="rounded-[20px] p-5"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
        }}
      >
        <p className="kicker mb-4">Activity</p>
        <SessionLog limit={7} />
      </div>
    </aside>
  );
}
