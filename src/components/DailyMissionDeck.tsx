"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Zap } from "lucide-react";
import type { NetworkConfig } from "@/config/chains";

/* ─────────────────────────────────────────────
   Daily Mission Deck — premium glass/crystal UI
   ───────────────────────────────────────────── */

const MINT = "#A9E5C5";
const LAVENDER = "#C9BFF2";
const ROSE = "#E8B4C6";
const IVORY = "#F2EDE4";

type MissionId = "gm" | "checkIn" | "gn";

interface Mission {
  id: MissionId;
  abbr: string;
  title: string;
  desc: string;
  reward: string;
  action: string;
  color: string;
}

export const MISSIONS: Mission[] = [
  {
    id: "gm",
    abbr: "GM",
    title: "Say GM on-chain",
    desc: "Make your first move on the active network.",
    reward: "+25 pts",
    action: "Execute GM",
    color: MINT,
  },
  {
    id: "checkIn",
    abbr: "CHECK",
    title: "Check the network",
    desc: "Confirm your wallet is active and ready.",
    reward: "+15 pts",
    action: "Execute Check",
    color: LAVENDER,
  },
  {
    id: "gn",
    abbr: "GN",
    title: "Say GN on-chain",
    desc: "Close the day with one final on-chain action.",
    reward: "+25 pts",
    action: "Execute GN",
    color: ROSE,
  },
];

/* ───────── NetworkCrystalCube ───────── */

const CUBE_SIZE = 84;
const HALF = CUBE_SIZE / 2;

const FACES = [
  `rotateY(0deg) translateZ(${HALF}px)`,
  `rotateY(90deg) translateZ(${HALF}px)`,
  `rotateY(180deg) translateZ(${HALF}px)`,
  `rotateY(-90deg) translateZ(${HALF}px)`,
  `rotateX(90deg) translateZ(${HALF}px)`,
  `rotateX(-90deg) translateZ(${HALF}px)`,
];

export function NetworkCrystalCube({
  network,
  isConnected,
}: {
  network?: NetworkConfig;
  isConnected: boolean;
}) {
  const reduced = useReducedMotion();
  const color = network?.color || "#8B8FA8";
  const logo = network?.logo || "";
  const key = network ? `${network.id}` : "none";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 210, height: 210 }}>
      <motion.div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{ width: 180, height: 180 }}
        animate={{ background: `radial-gradient(circle, ${color}26, transparent 65%)` }}
        transition={{ duration: 0.5 }}
      />

      {!reduced && (
        <>
          <div aria-hidden className="dg-ring dg-ring-a" style={{ borderColor: `${color}2e` }} />
          <div aria-hidden className="dg-ring dg-ring-b" style={{ borderColor: `${color}1c` }} />
        </>
      )}

      <motion.div
        style={{ perspective: 1100 }}
      >
        <div
          className="dg-cube-spin"
          style={{ width: CUBE_SIZE, height: CUBE_SIZE, position: "relative", transformStyle: "preserve-3d" }}
        >
          {FACES.map((t, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-2xl"
              style={{
                transform: t,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.07))",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -10px 24px rgba(0,0,0,0.28)",
                backdropFilter: "blur(2px)",
              }}
            >
              {/* Chain logo on every side face (i < 4) so it stays visible while rotating */}
              {i < 4 && isConnected && logo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src={logo}
                    alt={network?.name || "network"}
                    width={40}
                    height={40}
                    style={{ filter: `drop-shadow(0 0 12px ${color}88)`, objectFit: "contain" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
                  />
                </div>
              )}
            </div>
          ))}

          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `translateZ(${HALF + 2}px)` }}
          >
            <AnimatePresence mode="wait">
              {!isConnected && (
                <motion.div
                  key="neutral"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 0.55, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.45 }}
                >
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-label="No network connected">
                    <path d="M28 6 50 28 28 50 6 28Z" stroke={IVORY} strokeWidth="1.4" opacity="0.7" />
                    <path d="M28 14 42 28 28 42 14 28Z" stroke={IVORY} strokeWidth="1" opacity="0.45" />
                    <circle cx="28" cy="28" r="3" fill={IVORY} opacity="0.6" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* soft dynamic shadow */}
      <motion.div
        aria-hidden
        className="absolute rounded-full"
        style={{
          bottom: 18,
          width: 150,
          height: 22,
          background: `radial-gradient(ellipse, ${color}40, transparent 70%)`,
          filter: "blur(6px)",
        }}
        animate={reduced ? undefined : { scaleX: [1, 0.82, 1], opacity: [0.65, 0.4, 0.65] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ───────── MissionCard ───────── */

function MissionCard({
  mission,
  completed,
  pending,
  loading,
  disabled,
  onAction,
}: {
  mission: Mission;
  completed: boolean;
  pending?: boolean;
  loading: boolean;
  disabled: boolean;
  onAction: () => void;
}) {
  const reduced = useReducedMotion();
  const c = mission.color;

  return (
    <motion.div
      whileHover={!reduced && !disabled && !loading ? { y: -5, rotateX: 1.2, rotateY: -1 } : undefined}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ perspective: 800 }}
      className="h-full"
    >
      <div
        onClick={completed ? undefined : onAction}
        role="button"
        tabIndex={completed ? -1 : 0}
        onKeyDown={(e) => {
          if (!completed && e.key === "Enter") onAction();
        }}
        className={`rounded-xl h-full flex flex-col p-3 relative overflow-hidden ${completed ? "" : "cursor-pointer"}`}
        style={{
          background: "var(--bg-card)",
          border: `1px solid ${completed ? `${c}44` : "var(--border-default)"}`,
          boxShadow: completed
            ? "var(--shadow-sm)"
            : `var(--shadow-md), 0 2px 10px -4px ${c}22`,
          opacity: completed ? 0.72 : 1,
          transition: "opacity 0.4s ease, border-color 0.3s ease",
        }}
        aria-label={`${mission.title} — ${mission.reward}${completed ? " — completed" : ""}`}
      >
        <div
          aria-hidden
          className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--border-strong), transparent)" }}
        />

        <div className="flex items-center justify-between mb-4">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(150deg, ${c}26, ${c}0d)`,
              border: `1px solid ${c}33`,
              boxShadow: completed || pending ? "none" : `0 4px 14px -4px ${c}44`,
            }}
          >
            {completed ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : pending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4m-8-10H0m24 0h-4m-2.93-5.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83" />
                </svg>
              </motion.div>
            ) : (
              <span className="text-sm font-semibold tracking-wide" style={{ color: c }} aria-hidden>
                {mission.abbr.slice(0, 2)}
              </span>
            )}
          </div>
          <span
            aria-label={completed ? "completed" : pending ? "in progress" : "pending"}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: completed ? c : pending ? c : `${c}66`,
              boxShadow: completed ? `0 0 8px ${c}` : pending ? `0 0 8px ${c}` : "none",
              animation: pending ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
        </div>

        <div
          className="text-base font-semibold tracking-[0.18em] mb-0.5"
          style={{ color: completed ? "var(--text-tertiary)" : "var(--text-bright)", transition: "color 0.3s ease" }}
        >
          {mission.abbr}
        </div>

        <h3 className="text-xs font-semibold mb-0.5" style={{ color: completed ? "var(--text-tertiary)" : "var(--text-bright)" }}>
          {mission.title}
        </h3>
        <p className="text-[10px] leading-snug mb-3" style={{ color: "var(--text-secondary)" }}>
          {mission.desc}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3">
          <span
            className="text-[10px] font-mono px-2 py-1 rounded-md"
            style={{ background: `${c}12`, color: c, border: `1px solid ${c}1f` }}
          >
            {mission.reward}
          </span>

          {loading ? (
            <div className="dg-shimmer h-8 w-28 rounded-lg" role="status" aria-label="loading" />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!completed && !pending) onAction();
              }}
              disabled={completed || pending}
              aria-label={completed ? `${mission.title} — completed` : pending ? `${mission.title} — processing` : `${mission.action} — ${mission.title}`}
              className="px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-200 hover:brightness-115 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              style={
                completed
                  ? { background: "var(--bg-subtle)", color: "var(--text-tertiary)", border: "1px solid var(--border-default)" }
                  : pending
                  ? { background: `color-mix(in srgb, ${c} 30%, transparent)`, color: c, border: `1px solid ${c}44`, animation: "pulse 2s ease-in-out infinite" }
                  : disabled
                  ? { background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "1px solid var(--border-strong)" }
                  : { background: `color-mix(in srgb, ${c} 75%, transparent)`, color: "var(--accent-contrast)", border: `1px solid ${c}`, boxShadow: `0 6px 18px -8px ${c}` }
              }
            >
              <Zap className="w-3.5 h-3.5" />
              {completed ? "Completed" : pending ? "Processing..." : disabled ? "Connect wallet" : mission.action}
            </button>
          )}
        </div>

        {completed && (
          <div
            aria-hidden
            className="absolute bottom-0 inset-x-0 h-[2px]"
            style={{ background: `linear-gradient(90deg, transparent, ${c}66, transparent)` }}
          />
        )}
      </div>
    </motion.div>
  );
}

/* ───────── DailyMissionDeck ───────── */

export default function DailyMissionDeck({
  network,
  chainId,
  isConnected,
  loading,
  completedCount,
  completedTaskIds,
  pendingTaskIds,
  onConnect,
  onMission,
  contextText,
  notice,
}: {
  network?: NetworkConfig;
  /** Wallet chain id — used when the chain isn't in the supported list */
  chainId?: number;
  isConnected: boolean;
  loading: boolean;
  completedCount: number;
  completedTaskIds: Set<string>;
  pendingTaskIds?: Set<string>;
  onConnect: () => void;
  onMission: (id: MissionId) => void;
  contextText: string;
  /** Optional warning line, e.g. wallet sitting on an unsupported chain */
  notice?: string;
}) {
  const allDone = completedCount >= 3;
  const isDone = (id: MissionId) => allDone || completedTaskIds.has(id);
  const isPending = (id: MissionId) => pendingTaskIds?.has(id) ?? false;
  const accent = network?.color || "#8B8FA8";

  return (
    <div
      className="rounded-3xl relative overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div className="flex flex-col items-center p-4 sm:p-6">
        {/* Top — small cube + status, centered */}
        <div className="flex flex-col items-center gap-1">
          <NetworkCrystalCube network={network} isConnected={isConnected} />

          {/* ActiveNetworkStatus */}
          <AnimatePresence mode="wait">
            <motion.div
              key={network ? network.id : "disconnected"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="text-center -mt-4"
            >
              <div className="flex items-center justify-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: isConnected ? accent : "rgba(162,156,178,0.5)",
                    boxShadow: isConnected ? `0 0 8px ${accent}` : "none",
                  }}
                  aria-hidden
                />
                <span className="text-base font-semibold" style={{ color: "var(--text-bright)" }}>
                  {isConnected
                    ? network?.name || `Chain #${chainId ?? "?"}`
                    : "No network"}
                </span>
              </div>
              <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-tertiary)" }}>
                {isConnected
                  ? network
                    ? `Connected · Chain ${network.id}`
                    : `Connected · unsupported chain ${chainId ?? "?"}`
                  : "Wallet not connected"}
              </p>
              {!isConnected && (
                <button
                  onClick={onConnect}
                  className="mt-4 px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2"
                  style={{ background: `${MINT}16`, color: MINT, border: `1px solid ${MINT}3a` }}
                  aria-label="Connect wallet"
                >
                  Connect wallet
                </button>
              )}
              {isConnected && (
                <p className="text-[11px] mt-2 max-w-[240px] mx-auto" style={{ color: "var(--text-tertiary)" }}>
                  {contextText}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mission cards — 3 small cards side by side under the cube */}
        <div className="w-full mt-2">
          {/* MissionProgress */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--text-tertiary)" }}>
              Daily missions
            </span>
            <motion.span
              key={completedCount}
              initial={{ scale: 1.2, color: MINT }}
              animate={{ scale: 1, color: allDone ? MINT : "var(--text-tertiary)" }}
              transition={{ duration: 0.3 }}
              className="text-[10px] font-mono"
            >
              {completedCount}/3{allDone ? " · day complete" : ""}
            </motion.span>
          </div>
          <div
            className="h-[3px] rounded-full mb-3 overflow-hidden"
            style={{ background: "color-mix(in srgb, var(--text-tertiary) 12%, transparent)" }}
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={3}
            aria-label="Daily missions progress"
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${LAVENDER}, ${MINT})` }}
              initial={false}
              animate={{ width: `${(completedCount / 3) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>

          {notice && (
            <p
              className="text-[11px] leading-relaxed mb-3 px-3 py-2 rounded-xl"
              style={{
                background: "rgba(255,170,0,0.10)",
                border: "1px solid rgba(255,170,0,0.28)",
                color: "#FFC24B",
              }}
            >
              {notice}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MISSIONS.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                completed={isDone(m.id)}
                pending={isPending(m.id)}
                loading={loading}
                disabled={!isConnected}
                onAction={() => onMission(m.id)}
              />
            ))}
          </div>

          {!isConnected && (
            <p className="text-center text-xs mt-3" style={{ color: "var(--text-tertiary)" }}>
              Connect wallet to activate your mission deck
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
