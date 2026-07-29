"use client";

import { useAccount } from "wagmi";
import { motion } from "framer-motion";
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

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const networks = [
  { name: "Ethereum", short: "ETH", color: "#627eea", logo: "/logos/ethereum.png", status: "operational" },
  { name: "Base", short: "BASE", color: "#0052ff", logo: "/logos/base.svg", status: "operational" },
  { name: "HyperEVM", short: "HYPE", color: "#FF6B6B", logo: "/logos/hyperliquid.png", status: "operational" },
  { name: "Unichain", short: "UNI", color: "#FF007A", logo: "/logos/unichain.png", status: "operational" },
  { name: "Tempo", short: "TMP", color: "#00D4AA", logo: "/logos/tempo.png", status: "operational" },
  { name: "Ink", short: "INK", color: "#0052ff", logo: "/logos/ink.svg", status: "maintenance" },
  { name: "Robinhood", short: "RH", color: "#00C805", logo: "/logos/robinhood.png", status: "coming-soon" },
  { name: "GenLayer", short: "GEN", color: "#110FFF", logo: "/logos/genlayer.svg", status: "operational" },
];



function ChainCard({ chain }: { chain: (typeof networks)[number] }) {
  const color = chain.status === "operational" ? "var(--success)" : chain.status === "maintenance" ? "var(--warning)" : "var(--text-faint)";
  const label = chain.status === "operational" ? "Live" : chain.status === "maintenance" ? "Maint." : "Soon";
  const dim = chain.status !== "operational";
  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3 transition-all duration-300"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        opacity: dim ? 0.45 : 1,
        filter: dim ? "grayscale(0.6)" : "none",
      }}
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
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected, chainId } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <DashboardLayout title="Mission Control" subtitle="// daily on-chain activity terminal">
      <div className="max-w-full space-y-4 sm:space-y-5">

        {/* ─────── 1. FLOATING GLASS HEADER ─────── */}
        <motion.div {...fadeUp}>
          <div
            className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
          >
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 0% 50%, var(--accent) 0%, transparent 60%), radial-gradient(ellipse at 100% 50%, var(--warning) 0%, transparent 60%)",
              }} />
            <div className="flex items-center gap-3 sm:gap-5 flex-wrap relative">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.4, 1], scale: [1, 0.85, 1] }}
                  transition={{ duration: 2, repeat: 999999, ease: "easeInOut" }}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: "var(--success)",
                    boxShadow: "0 0 12px var(--success), 0 0 24px color-mix(in srgb, var(--success) 40%, transparent)",
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
                <Link href="/profile">
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 0 24px color-mix(in srgb, var(--accent) 40%, transparent)" }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                    style={{
                      background: "var(--theme-gradient)",
                      color: "#fff",
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Connect Wallet</span>
                  </motion.button>
                </Link>
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
        <motion.div {...fadeUp} transition={{ delay: 0.04 }}>
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
                <div className="rounded-xl p-4" style={{ background: "var(--bg-subtle)" }}>
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
                </div>

                {/* Total Points */}
                <div className="rounded-xl p-4" style={{ background: "var(--bg-subtle)" }}>
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
                </div>

                {/* Tasks Progress */}
                <div className="rounded-xl p-4" style={{ background: "var(--bg-subtle)" }}>
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
                </div>

                {/* Active Chains */}
                <div className="rounded-xl p-4" style={{ background: "var(--bg-subtle)" }}>
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
                      <div key={n.short}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                        style={{
                          background: `color-mix(in srgb, ${n.color} 12%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${n.color} 25%, transparent)`,
                        }}>
                        <Image src={n.logo} alt={n.name} width={10} height={10}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                        <span className="text-[8px] font-mono font-semibold" style={{ color: n.color }}>{n.short}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
              <motion.div key={chain.short}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + networks.indexOf(chain) * 0.04 }}>
                <ChainCard chain={chain} />
              </motion.div>
            ))}
          </div>
        </motion.div>





        {/* ─────── BOTTOM ROW: Daily Missions + 2048 Game + Alpha Feed ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ─────── DAILY MISSIONS ─────── */}
          <motion.div {...fadeUp} transition={{ delay: 0.24 }} className="lg:col-span-1">
            <div className="glass-panel rounded-2xl overflow-hidden h-full">
              <div className="flex items-center justify-between p-4 sm:p-5"
                style={{ borderBottom: "1px solid var(--border-default)" }}>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="font-semibold text-sm" style={{ color: "var(--text-bright)" }}>Daily Missions</span>
                  <span className="badge-cyan text-[9px]">0/9</span>
                </div>
              </div>
              <div className="p-5 flex flex-col items-center justify-center py-10 sm:py-12">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: 999999, ease: "easeInOut" }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "var(--bg-glow)", border: "1px solid var(--border-default)" }}>
                  <Swords className="w-7 h-7" style={{ color: "var(--accent)", opacity: 0.3 }} />
                </motion.div>
                <p className="text-sm font-mono" style={{ color: "var(--text-tertiary)" }}>No missions available</p>
                <p className="text-xs font-mono mt-1.5" style={{ color: "var(--text-quaternary)" }}>
                  Connect wallet to enable daily tasks
                </p>
                <Link href="/tasks">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="btn-primary mt-5 text-xs py-2.5 px-6 flex items-center gap-2"
                  >
                    <span>Go to Tasks</span>
                    <ChevronRight className="w-3 h-3" />
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ─────── 7. 2048 ON-CHAIN MINI-GAME CARD ─────── */}
          <motion.div {...fadeUp} transition={{ delay: 0.28 }} className="lg:col-span-1">
            <Link href="/2048">
              <motion.div
                whileHover={{ scale: 1.01, y: -3 }}
                whileTap={{ scale: 0.99 }}
                className="rounded-2xl p-5 sm:p-6 cursor-pointer h-full relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--bg-card)) 0%, color-mix(in srgb, #4F46E5 6%, var(--bg-subtle)) 100%)",
                  border: "1px solid var(--border-default)",
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
                  animate={{ rotate: [0, 1, -1, 0] }}
                  transition={{ duration: 4, repeat: 999999, ease: "easeInOut" }}
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black mb-3"
                      style={{
                        background: "var(--theme-gradient)",
                        boxShadow: "0 0 32px color-mix(in srgb, var(--accent) 20%, transparent)",
                      }}>
                      2048
                    </motion.div>
                    <p className="text-xs text-center font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Play & earn on-chain scores
                    </p>
                    <p className="text-[10px] font-mono mt-2" style={{ color: "var(--text-quaternary)" }}>
                      High score: <span style={{ color: "var(--accent)" }}>0</span> &middot; 12 networks
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
                animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
                transition={{ duration: 2, repeat: 999999 }}
                className="w-2 h-2 rounded-full"
                style={{
                  background: "var(--success)",
                  boxShadow: "0 0 8px var(--success)",
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
