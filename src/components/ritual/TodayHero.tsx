"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { AnimatePresence, m,  useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Loader2, Wallet } from "lucide-react";

import ProgressRing from "@/components/ui/ProgressRing";
import WeekDots from "@/components/ui/WeekDots";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { NetworkChip } from "@/components/ritual/NetworkPicker";
import { useRitual } from "@/hooks/useRitual";
import { useUtcDay } from "@/hooks/useUtcDay";
import { readWeekLog, type MissionId } from "@/lib/ritual";
import { getExplorerUrl } from "@/utils/transactions";

/** "Tuesday, 22 October" — the day, spelled out. */
function formatToday(now: Date): string {
  return now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** "Good evening" — a greeting, not a status line. */
function greeting(now: Date): string {
  const hour = now.getUTCHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface TodayHeroProps {
  /** "full" is the page-height hero, "compact" is the smaller variant */
  variant?: "full" | "compact";
}

/**
 * TodayHero — the one card the whole product is built around.
 *
 * Date, the streak in a ring, the week strip, one segmented control for the
 * three missions, one lime button. Everything else on the page is a
 * consequence of what happens here.
 */
export default function TodayHero({ variant = "full" }: TodayHeroProps) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const reduced = useReducedMotion();
  const {
    network,
    missions,
    doneCount,
    allDone,
    streak,
    totalActions,
    busy,
    error,
    lastHash,
    runMission,
  } = useRitual();

  const [selected, setSelected] = useState<MissionId>("gm");
  const [weekLog, setWeekLog] = useState<Record<string, true>>({});
  const { countdown } = useUtcDay();

  // The week strip is a local record; refresh it whenever a mission lands.
  useEffect(() => {
    setWeekLog(readWeekLog());
  }, [doneCount]);

  const today = useMemo(() => new Date(), []);
  const active = missions.find((m) => m.id === selected) ?? missions[0];
  const activeDone = active?.done ?? false;

  const onRun = () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    void runMission(selected);
  };

  const ringMax = 7;
  const ringValue = Math.min(streak, ringMax);
  const full = variant === "full";

  return (
    <section
      className={`rounded-[24px] overflow-hidden ${
        full ? "lg:min-h-[52vh]" : ""
      }`}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-md)",
      }}
      aria-label="Today"
    >
      <div className="p-5 sm:p-7 lg:p-9 h-full flex flex-col">
        {/* ── date row ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="kicker">{greeting(today)}</p>
            <h1
              className="mt-1 text-[20px] sm:text-[32px] font-bold"
              style={{ color: "var(--text-bright)" }}
            >
              {formatToday(today)}
            </h1>
          </div>
          <NetworkChip />
        </div>

        {/* ── the number and the three missions ── */}
        <div className="mt-6 lg:mt-8 flex flex-col sm:flex-row sm:items-center gap-6 lg:gap-10">
          <ProgressRing
            value={ringValue}
            max={ringMax}
            size={full ? 168 : 132}
            stroke={8}
            caption="day streak"
          >
            <m.span
              className="font-mono font-medium leading-none tabular-nums"
              style={{
                fontSize: full ? 72 : 48,
                letterSpacing: "-0.05em",
                color: "var(--text-bright)",
              }}
              initial={reduced ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              {isConnected ? streak : "—"}
            </m.span>
          </ProgressRing>

          <div className="min-w-0 flex-1 w-full">
            <SegmentedControl
              options={missions.map((m) => ({
                value: m.id,
                label: m.label,
                state: m.done ? "done" : "idle",
              }))}
              value={selected}
              onChange={setSelected}
              ariaLabel="Choose a mission"
            />
            <p
              className="mt-3 text-[14px] leading-relaxed max-w-md"
              style={{ color: "var(--text-secondary)" }}
            >
              {isConnected
                ? activeDone
                  ? `${active.label} is already on chain today. Pick another one, or enjoy the streak.`
                  : `${active.blurb} — one transaction, ${active.points} points.`
                : "Connect a wallet to run today's missions and start a streak."}
            </p>

            <div
              className="mt-5 flex items-center gap-6 text-[14px] flex-wrap"
              style={{ color: "var(--text-tertiary)" }}
            >
              <span>
                Today{" "}
                <span className="font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {doneCount}/3
                </span>
              </span>
              <span>
                Actions{" "}
                <span className="font-mono font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {isConnected ? totalActions : 0}
                </span>
              </span>
              <span>
                Resets in{" "}
                <span className="font-mono font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {countdown}
                </span>
              </span>
            </div>

            <div className="mt-6">
              <WeekDots completed={weekLog} />
            </div>
          </div>
        </div>

        {/* ── one error line, one button ── */}
        <div className="mt-auto pt-7 flex items-end justify-between gap-6 flex-wrap">
          <AnimatePresence>
            {error ? (
              <m.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[14px] max-w-sm"
                style={{ color: "var(--danger)" }}
              >
                {error}
              </m.p>
            ) : (
              <p
                className="text-[14px] max-w-sm"
                style={{ color: "var(--text-faint)" }}
              >
                {isConnected
                  ? allDone
                    ? "Today is done. See you tomorrow."
                    : "Three transactions. Once a day. That's the whole habit."
                  : "No account, no email. Just a wallet."}
              </p>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4">
            {lastHash && network ? (
              <a
                href={getExplorerUrl(network, lastHash, "tx")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-mono hover:underline"
                style={{ color: "var(--text-faint)" }}
              >
                last tx ↗
              </a>
            ) : null}

            <button
              type="button"
              onClick={onRun}
              disabled={isConnected && (allDone || busy !== null)}
              className="btn-primary min-w-[172px]"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending
                </>
              ) : !isConnected ? (
                <>
                  <Wallet className="w-4 h-4" />
                  Connect wallet
                </>
              ) : allDone ? (
                <>
                  <Check className="w-4 h-4" />
                  All done
                </>
              ) : activeDone ? (
                <>
                  <Check className="w-4 h-4" />
                  {active.label} done
                </>
              ) : (
                <>
                  Run {active.label}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
