"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
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
    action: "Check in",
    color: MINT,
  },
  {
    id: "checkIn",
    abbr: "CHECK",
    title: "Check the network",
    desc: "Confirm your wallet is active and ready.",
    reward: "+15 pts",
    action: "Check now",
    color: LAVENDER,
  },
  {
    id: "gn",
    abbr: "GN",
    title: "Say GN on-chain",
    desc: "Close the day with one final on-chain action.",
    reward: "+25 pts",
    action: "Check in",
    color: ROSE,
  },
];

/* ───────── NetworkCrystalCube ───────── */

const CUBE_SIZE = 150;
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
    <div className="relative flex items-center justify-center" style={{ width: 340, height: 340 }}>
      <motion.div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{ width: 300, height: 300 }}
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
        animate={reduced ? undefined : { y: [-6, 6, -6] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
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
            />
          ))}

          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `translateZ(${HALF + 2}px)` }}
          >
            <AnimatePresence mode="wait">
              {isConnected && logo ? (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <Image
                    src={logo}
                    alt={network?.name || "network"}
                    width={64}
                    height={64}
                    style={{ filter: `drop-shadow(0 0 18px ${color}88)`, objectFit: "contain" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
                  />
                </motion.div>
              ) : (
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
  loading,
  disabled,
  onAction,
}: {
  mission: Mission;
  completed: boolean;
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
        className="rounded-2xl h-full flex flex-col p-5 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015) 55%, rgba(255,255,255,0.035))",
          border: `1px solid ${completed ? `${c}22` : "rgba(160,155,190,0.18)"}`,
          boxShadow: completed
            ? "0 12px 32px -14px rgba(0,0,0,0.55)"
            : `0 16px 40px -16px rgba(0,0,0,0.6), 0 2px 10px -4px ${c}22`,
          opacity: completed ? 0.72 : 1,
          transition: "opacity 0.4s ease, border-color 0.3s ease",
        }}
        aria-label={`${mission.title} — ${mission.reward}${completed ? " — completed" : ""}`}
      >
        <div
          aria-hidden
          className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)" }}
        />

        <div className="flex items-center justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(150deg, ${c}26, ${c}0d)`,
              border: `1px solid ${c}33`,
              boxShadow: completed ? "none" : `0 4px 14px -4px ${c}44`,
            }}
          >
            {completed ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="text-sm font-semibold tracking-wide" style={{ color: c }} aria-hidden>
                {mission.abbr.slice(0, 2)}
              </span>
            )}
          </div>
          <span
            aria-label={completed ? "completed" : "pending"}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: completed ? c : `${c}66`,
              boxShadow: completed ? `0 0 8px ${c}` : "none",
            }}
          />
        </div>

        <div
          className="text-2xl font-semibold tracking-[0.18em] mb-1"
          style={{ color: completed ? "#A29CB2" : IVORY, transition: "color 0.3s ease" }}
        >
          {mission.abbr}
        </div>

        <h3 className="text-sm font-semibold mb-1" style={{ color: completed ? "#A29CB2" : IVORY }}>
          {mission.title}
        </h3>
        <p className="text-xs leading-relaxed mb-4" style={{ color: "#A29CB2" }}>
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
            <div className="dg-shimmer h-8 w-24 rounded-lg" role="status" aria-label="loading" />
          ) : (
            <button
              onClick={onAction}
              disabled={disabled || completed}
              aria-label={`${mission.action} — ${mission.title}`}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed"
              style={
                completed
                  ? { background: "rgba(255,255,255,0.04)", color: "#A29CB2", border: "1px solid rgba(160,155,190,0.15)" }
                  : disabled
                  ? { background: "rgba(255,255,255,0.04)", color: "rgba(242,237,228,0.35)", border: "1px solid rgba(160,155,190,0.12)" }
                  : { background: `${c}14`, color: c, border: `1px solid ${c}3d` }
              }
            >
              {completed ? "Completed" : mission.action}
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
  isConnected,
  loading,
  completedCount,
  completedTaskIds,
  onConnect,
  onMission,
  contextText,
}: {
  network?: NetworkConfig;
  isConnected: boolean;
  loading: boolean;
  completedCount: number;
  completedTaskIds: Set<string>;
  onConnect: () => void;
  onMission: (id: MissionId) => void;
  contextText: string;
}) {
  const allDone = completedCount >= 3;
  const isDone = (id: MissionId) => allDone || completedTaskIds.has(id);
  const accent = network?.color || "#8B8FA8";

  return (
    <div
      className="rounded-3xl relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.008))",
        border: "1px solid rgba(150,145,180,0.14)",
        boxShadow: "0 30px 80px -40px rgba(0,0,0,0.8)",
      }}
    >
      <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-6 p-8 sm:p-12">
        {/* Left — crystal cube */}
        <div className="lg:w-[40%] flex flex-col items-center gap-2">
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
                <span className="text-base font-semibold" style={{ color: IVORY }}>
                  {isConnected ? network?.name || `Chain #${network?.id}` : "No network"}
                </span>
              </div>
              <p className="text-xs mt-1 font-mono" style={{ color: "#A29CB2" }}>
                {isConnected ? `Connected · Chain ${network?.id}` : "Wallet not connected"}
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
                <p className="text-[11px] mt-2 max-w-[240px] mx-auto" style={{ color: "#A29CB2" }}>
                  {contextText}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right — mission cards */}
        <div className="lg:w-[60%] w-full">
          {/* MissionProgress */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "#A29CB2" }}>
              Daily missions
            </span>
            <span className="text-[10px] font-mono" style={{ color: allDone ? MINT : "#A29CB2" }}>
              {completedCount}/3{allDone ? " · day complete" : ""}
            </span>
          </div>
          <div
            className="h-[3px] rounded-full mb-6 overflow-hidden"
            style={{ background: "rgba(160,155,190,0.12)" }}
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

          <div className="flex flex-col gap-4">
            {MISSIONS.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                completed={isDone(m.id)}
                loading={loading}
                disabled={!isConnected}
                onAction={() => onMission(m.id)}
              />
            ))}
          </div>

          {!isConnected && (
            <p className="text-center text-xs mt-5" style={{ color: "#A29CB2" }}>
              Connect wallet to activate your mission deck
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
