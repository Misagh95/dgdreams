"use client";

import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { motion, useReducedMotion } from "framer-motion";
import usePerfMode from "@/hooks/usePerfMode";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Flame,
  Zap,
  Globe,
  Target,
  Gamepad2,
  TrendingUp,
  Star,
  ChevronRight,
  Award,
  Swords,
  Medal,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { TaskCard3D, DAILY_MISSIONS } from "@/components/TaskCard3D";
import { getNetworkConfig, dashboardNetworks } from "@/config/chains";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const networks = dashboardNetworks;



function ChainCard({ chain }: { chain: (typeof networks)[number] }) {
  const color = chain.status === "operational" ? "var(--success)" : chain.status === "maintenance" ? "var(--warning)" : "var(--text-faint)";
  const label = chain.status === "operational" ? "Live" : chain.status === "maintenance" ? "Maint." : "Soon";
  const dim = chain.status !== "operational";
  return (
    <motion.div
      className="rounded-xl p-3 flex items-center gap-3"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        opacity: dim ? 0.45 : 1,
        filter: dim ? "grayscale(0.6)" : "none",
      }}
      whileHover={!dim ? {
        scale: 1.05,
        boxShadow: `0 4px 20px -4px color-mix(in srgb, ${chain.color} 35%, transparent)`,
        borderColor: `color-mix(in srgb, ${chain.color} 30%, transparent)`,
      } : undefined}
      whileTap={!dim ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: `color-mix(in srgb, ${chain.color} 15%, transparent)`,
          border: `1px solid color-mix(in srgb, ${chain.color} 30%, transparent)`,
        }}>
        <Image src={chain.logo} alt={chain.name} width={18} height={18}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold truncate" style={{ color: "var(--text-bright)" }}>{chain.name}</span>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
            style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
            <div className="w-1.5 h-1.5 rounded-full"
              style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
            <span className="text-[8px] font-mono font-semibold" style={{ color }}>{label}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────── 3D NETWORK CUBE ─────── */

const CUBE_SIZE = 120;
const CUBE_HALF = CUBE_SIZE / 2;

const CUBE_FACES = [
  `rotateY(0deg) translateZ(${CUBE_HALF}px)`,
  `rotateY(90deg) translateZ(${CUBE_HALF}px)`,
  `rotateY(180deg) translateZ(${CUBE_HALF}px)`,
  `rotateY(-90deg) translateZ(${CUBE_HALF}px)`,
  `rotateX(90deg) translateZ(${CUBE_HALF}px)`,
  `rotateX(-90deg) translateZ(${CUBE_HALF}px)`,
];

function NetworkCube({ logo, color, name }: { logo: string; color: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="dg-cube-float" style={{ perspective: "900px" }}>
        <div
          className="dg-cube-spin"
          style={{
            width: CUBE_SIZE,
            height: CUBE_SIZE,
            position: "relative",
            transformStyle: "preserve-3d",
          }}
        >
          {CUBE_FACES.map((transform, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-xl flex items-center justify-center"
              style={{
                transform,
                background: `color-mix(in srgb, ${color} 10%, var(--bg-card))`,
                border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
                boxShadow: `inset 0 0 30px color-mix(in srgb, ${color} 15%, transparent)`,
              }}
            >
              <Image
                src={logo}
                alt={name}
                width={48}
                height={48}
                style={{ filter: `drop-shadow(0 0 8px color-mix(in srgb, ${color} 60%, transparent))` }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ))}
        </div>
      </div>
      <div
        className="rounded-full"
        style={{
          width: 90,
          height: 14,
          background: `radial-gradient(ellipse, color-mix(in srgb, ${color} 45%, transparent), transparent 70%)`,
          filter: "blur(4px)",
          marginTop: -6,
        }}
      />
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
        <span className="text-[10px] font-mono font-semibold" style={{ color: "var(--text-tertiary)" }}>
          {name}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected, chainId } = useAccount();
  // The connect CTA used to link to /profile, which owned the wallet button.
  // Now that page is gone, so it opens the RainbowKit modal directly.
  const { openConnectModal } = useConnectModal();
  const [mounted, setMounted] = useState(false);
  // The dashboard runs three infinite ambient animations. Users who ask for
  // reduced motion should get a static dashboard, not a cheaper animation.
  // Performance mode does the same, for anyone who prefers the CPU back.
  const [perfLow] = usePerfMode();
  const reduced = useReducedMotion() || perfLow;

  const connectedNetwork = chainId ? getNetworkConfig(chainId) : undefined;
  const cubeLogo = connectedNetwork?.logo || "/logo.svg";
  const cubeColor = connectedNetwork?.color || "#00F2FE";
  const cubeName = connectedNetwork?.name || (isConnected ? `Chain #${chainId}` : "DGDreams");

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <DashboardLayout title="Mission Control" subtitle="// daily on-chain activity terminal">
      <div className="max-w-full space-y-4 sm:space-y-5">

        {/* ─────── 0. PAGE HEADER ─────── */}
        <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="kicker mb-1.5">Mission control</p>
            <h1 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text-bright)" }}>
              {isConnected ? "Welcome back" : "Start your streak"}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {isConnected
                ? "Run today's missions to keep your streak alive."
                : "Connect a wallet to run your daily on-chain tasks."}
            </p>
          </div>
          {!isConnected && (
            <button
              onClick={() => openConnectModal?.()}
              className="btn-primary text-sm px-5 py-2.5 self-start sm:self-auto"
            >
              <Zap className="w-4 h-4" />
              Connect wallet
            </button>
          )}
        </motion.div>

        {/* ─────── 1. FLOATING GLASS HEADER ─────── */}
        <motion.div 
          {...fadeUp}
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div
            className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 0% 50%, var(--accent) 0%, transparent 60%), radial-gradient(ellipse at 100% 50%, var(--warning) 0%, transparent 60%)",
              }} />
            <div className="flex items-center gap-3 sm:gap-5 flex-wrap relative">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={reduced ? undefined : { opacity: [1, 0.4, 1], scale: [1, 0.85, 1] }}
                  transition={{ duration: 2, repeat: 999999, ease: "easeInOut" }}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: "var(--success)",
                    boxShadow: "0 0 12px var(--success), 0 0 24px color-mix(in srgb, var(--success) 40%, transparent)",
                    // Own compositor layer: the glow no longer repaints the
                    // header behind it on every frame.
                    willChange: "opacity, transform",
                  }}
                />
                <span className="text-xs font-mono font-semibold tracking-wide" style={{ color: "var(--success)" }}>
                  SYSTEM ONLINE
                </span>
              </div>
              <div className="hidden sm:block text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                Connected · {networks.length} chains
              </div>
            </div>
            <div className="flex items-center gap-2.5 relative">
              {!isConnected ? (
                <motion.button
                  onClick={() => openConnectModal?.()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{
                    background: "var(--theme-gradient)",
                    color: "#fff",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    willChange: "transform",
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Connect Wallet</span>
                </motion.button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-mono"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-default)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
                  <span style={{ color: "var(--text-tertiary)" }}>
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ─────── 2. MISSION CONTROL CARD (Airdrop Hub) ─────── */}
        <motion.div 
          {...fadeUp} 
          transition={{ delay: 0.04 }}
          whileHover={{ scale: 1.005 }}
        >
          <div
            className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 6%, var(--bg-card)) 0%, var(--bg-card) 50%, color-mix(in srgb, var(--warning) 4%, var(--bg-card)) 100%)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-[-40px] right-[-40px] w-48 h-48 opacity-[0.04] rounded-full"
                style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
              <div className="absolute bottom-[-20px] left-[-20px] w-36 h-36 opacity-[0.03] rounded-full"
                style={{ background: "radial-gradient(circle, var(--warning) 0%, transparent 70%)" }} />
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--theme-gradient)", opacity: 0.9 }}>
                  <Award className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-bright)" }}>Mission Control</span>
                  <span className="text-[9px] font-mono ml-2 px-1.5 py-0.5 rounded-full"
                    style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                    Airdrop Hub
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Streak */}
                <motion.div 
                  className="rounded-xl p-4 stat-card" 
                  style={{ background: "var(--bg-subtle)" }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 8px 30px -8px color-mix(in srgb, var(--warning) 40%, transparent)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame className="w-3.5 h-3.5" style={{ color: "var(--warning)" }} />
                    <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
                      Daily Streak
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black leading-none" style={{ color: "var(--warning)", textShadow: "0 0 30px color-mix(in srgb, var(--warning) 30%, transparent)" }}>
                      0
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>/ 7 days</span>
                  </div>
                  <div className="mt-2.5 progress-bar" style={{ height: "5px" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "0%" }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        background: "linear-gradient(90deg, var(--warning), var(--danger))",
                        boxShadow: "0 0 8px var(--warning)",
                      }} />
                  </div>
                  <div className="text-[9px] font-mono mt-1.5" style={{ color: "var(--text-faint)" }}>
                    0/30 for Monthly Badge
                  </div>
                </motion.div>

                {/* Total Points */}
                <motion.div 
                  className="rounded-xl p-4 stat-card" 
                  style={{ background: "var(--bg-subtle)" }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 8px 30px -8px color-mix(in srgb, var(--accent) 40%, transparent)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                    <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
                      Total Points
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black leading-none" style={{ color: "var(--accent)", textShadow: "0 0 30px color-mix(in srgb, var(--accent) 25%, transparent)" }}>
                      0
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>pts</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                      style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)" }}>
                      <TrendingUp className="w-2.5 h-2.5" style={{ color: "var(--success)" }} />
                      <span className="text-[9px] font-mono" style={{ color: "var(--success)" }}>+0 today</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                      style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}>
                      <Zap className="w-2.5 h-2.5" style={{ color: "var(--accent)" }} />
                      <span className="text-[9px] font-mono" style={{ color: "var(--accent)" }}>0 pts earn</span>
                    </div>
                  </div>
                </motion.div>

                {/* Tasks Progress */}
                <motion.div 
                  className="rounded-xl p-4 stat-card" 
                  style={{ background: "var(--bg-subtle)" }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 8px 30px -8px color-mix(in srgb, #8b5cf6 40%, transparent)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                    <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
                      Today&apos;s Tasks
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black leading-none" style={{ color: "#8b5cf6", textShadow: "0 0 30px color-mix(in srgb, #8b5cf6 25%, transparent)" }}>
                      0
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>/ 9</span>
                  </div>
                  <div className="mt-2.5 progress-bar" style={{ height: "5px" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "0%" }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: "var(--theme-gradient)" }} />
                  </div>
                  <div className="text-[9px] font-mono mt-1.5" style={{ color: "var(--text-faint)" }}>
                    0/375 pts earned
                  </div>
                </motion.div>

                {/* Active Chains */}
                <motion.div 
                  className="rounded-xl p-4 stat-card" 
                  style={{ background: "var(--bg-subtle)" }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 8px 30px -8px color-mix(in srgb, var(--success) 40%, transparent)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Globe className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
                    <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
                      Active Chains
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black leading-none" style={{ color: "var(--success)", textShadow: "0 0 30px color-mix(in srgb, var(--success) 25%, transparent)" }}>
                      {networks.filter((n) => n.status === "operational").length}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>/ {networks.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {networks.filter((n) => n.status === "operational").map((n) => (
                      <div key={n.shortName || n.name}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                        style={{
                          background: `color-mix(in srgb, ${n.color} 12%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${n.color} 25%, transparent)`,
                        }}>
                        <Image src={n.logo} alt={n.name} width={10} height={10}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                        <span className="text-[8px] font-mono font-semibold" style={{ color: n.color }}>{n.shortName || n.name}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─────── 3. MULTI-CHAIN ACTIVITY TRACKER ─────── */}
        <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-quaternary)" }}>
              Multi-Chain Activity
            </span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, var(--border-default), transparent)" }} />
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
              style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
              {networks.filter((n) => n.status === "operational").length} active
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {networks.map((chain) => (
              <motion.div key={chain.shortName || chain.name}
                initial={reduced ? undefined : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + networks.indexOf(chain) * 0.04 }}>
                <ChainCard chain={chain} />
              </motion.div>
            ))}
          </div>
        </motion.div>





        {/* ─────── BOTTOM ROW: Daily Missions + 2048 Game + Alpha Feed ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ─────── DAILY MISSIONS — 3D network cube + 3D task cards ─────── */}
          <motion.div {...fadeUp} transition={{ delay: 0.24 }} className="lg:col-span-1">
            <div className="glass-panel rounded-2xl overflow-hidden h-full">
              <div className="flex items-center justify-between p-4 sm:p-5"
                style={{ borderBottom: "1px solid var(--border-default)" }}>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="font-semibold text-sm" style={{ color: "var(--text-bright)" }}>Daily Missions</span>
                  <span className="badge-cyan text-[9px]">0/3</span>
                </div>
              </div>
              <div className="p-5 flex flex-col items-center gap-5">
                {/* 3D cube — logo follows the connected wallet network */}
                <div className="py-2">
                  <NetworkCube logo={cubeLogo} color={cubeColor} name={cubeName} />
                </div>

                {/* 3D task cards */}
                <div className="w-full space-y-3">
                  {DAILY_MISSIONS.map((m) => (
                    <TaskCard3D
                      key={m.id}
                      title={m.title}
                      desc={m.desc}
                      icon={m.icon}
                      color={m.color}
                      href={`/tasks?mission=${m.id}`}
                      cta={`Run ${m.title}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─────── 7. 2048 ON-CHAIN MINI-GAME CARD ─────── */}
          <motion.div {...fadeUp} transition={{ delay: 0.28 }} className="lg:col-span-1">
            <Link href="/2048">
              <motion.div
                whileHover={reduced ? undefined : { scale: 1.01, y: -3 }}
                whileTap={reduced ? undefined : { scale: 0.99 }}
                className="rounded-2xl p-5 sm:p-6 cursor-pointer h-full relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--bg-card)) 0%, color-mix(in srgb, #4F46E5 6%, var(--bg-subtle)) 100%)",
                  border: "1px solid var(--border-default)",
                  willChange: "transform",
                }}
              >
                <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.04] pointer-events-none"
                  style={{ background: "radial-gradient(circle at top right, var(--accent), transparent 60%)" }} />
                <div className="absolute bottom-0 left-0 w-32 h-32 opacity-[0.025] pointer-events-none"
                  style={{ background: "radial-gradient(circle at bottom left, #4F46E5, transparent 60%)" }} />

                <div className="relative flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: "var(--theme-gradient)" }}>
                      <Gamepad2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-sm" style={{ color: "var(--text-bright)" }}>2048 Game</span>
                      <span className="badge-cyan text-[9px] ml-2">On-chain</span>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center py-4">
                    <motion.div
                      animate={reduced ? undefined : { opacity: [1, 0.82, 1] }}
                      transition={{ duration: 4, repeat: 999999, ease: "easeInOut" }}
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black mb-3"
                      style={{
                        background: "var(--theme-gradient)",
                        boxShadow: "0 0 32px color-mix(in srgb, var(--accent) 20%, transparent)",
                        // Opacity pulses on the compositor; rotating this box
                        // re-rasterised the 32px glow every frame for a ±1deg
                        // wobble nobody could see.
                        willChange: "opacity",
                      }}>
                      2048
                    </motion.div>
                    <p className="text-xs text-center font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Play & earn on-chain scores
                    </p>
                    <p className="text-[10px] font-mono mt-2" style={{ color: "var(--text-quaternary)" }}>
                      High score: <span style={{ color: "var(--accent)" }}>0</span> &middot; 14 networks
                    </p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                        style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)" }}>
                        <span className="text-[8px] font-mono" style={{ color: "var(--success)" }}>Play Now</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                        style={{ background: "color-mix(in srgb, var(--warning) 12%, transparent)" }}>
                        <Medal className="w-2.5 h-2.5" style={{ color: "var(--warning)" }} />
                        <span className="text-[8px] font-mono" style={{ color: "var(--warning)" }}>Leaderboard</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>


        </div>

        {/* ─────── TERMINAL STATUS BAR ─────── */}
        <motion.div {...fadeUp} transition={{ delay: 0.36 }}>
          <div
            className="rounded-2xl px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-5 flex-wrap font-mono text-[10px] sm:text-xs"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={reduced ? undefined : { opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
                transition={{ duration: 2, repeat: 999999 }}
                className="w-2 h-2 rounded-full"
                style={{
                  background: "var(--success)",
                  boxShadow: "0 0 8px var(--success)",
                  willChange: "opacity, transform",
                }}
              />
              <span style={{ color: "var(--success)", fontWeight: 600 }}>SYSTEM ONLINE</span>
            </div>
            <span className="hidden sm:inline" style={{ color: "var(--text-faint)" }}>|</span>
            <span className="hidden sm:inline" style={{ color: "var(--text-tertiary)" }}>
              Wallet:{" "}
              <span style={{ color: isConnected ? "var(--accent)" : "var(--text-quaternary)" }}>
                {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : "Not connected"}
              </span>
            </span>
            <span className="hidden sm:inline" style={{ color: "var(--text-faint)" }}>|</span>
            <span style={{ color: "var(--text-tertiary)" }}>
              Network:{" "}
              <span style={{ color: isConnected ? "var(--accent)" : "var(--text-faint)" }}>
                {isConnected && chainId ? `Chain #${chainId}` : "disconnected"}
              </span>
            </span>
            <span style={{ color: "var(--text-faint)" }}>|</span>
            <span style={{ color: "var(--text-quaternary)" }}>
              DGDreams <span style={{ color: "var(--text-tertiary)" }}>v2.1</span>
            </span>
          </div>
        </motion.div>

      </div>
    </DashboardLayout>
  );
}
