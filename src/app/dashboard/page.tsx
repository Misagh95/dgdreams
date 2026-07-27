"use client";

import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Flame,
  Zap,
  Send,
  Eye,
  Globe,
  Circle,
  Activity,
  Wallet,
  BarChart3,
  Trophy,
  Gamepad2,
  Sparkles,
  TrendingUp,
  Star,
  Target,
  Shield,
  ChevronRight,
  Clock,
  Server,
  Signal,
  Layers,
  Hexagon,
  Medal,
  Lock,
  Unlock,
  Infinity,
  Award,
  Gem,
  Rocket,
  Crown,
  Swords,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const networks = [
  { name: "Ethereum", short: "ETH", color: "#627eea", logo: "/logos/ethereum.png", active: true, gas: "12 gwei", block: "21.4M", status: "operational" },
  { name: "Base", short: "BASE", color: "#0052ff", logo: "/logos/base.svg", active: true, gas: "0.05 gwei", block: "18.2M", status: "operational" },
  { name: "HyperEVM", short: "HYPE", color: "#FF6B6B", logo: "/logos/hyperliquid.png", active: true, gas: "0.1 gwei", block: "3.8M", status: "operational" },
  { name: "Ink", short: "INK", color: "#0052ff", logo: "/logos/ink.svg", active: false, gas: "\u2014", block: "\u2014", status: "maintenance" },
  { name: "Tempo", short: "TMP", color: "#00D4AA", logo: "/logos/tempo.png", active: true, gas: "0.2 gwei", block: "1.2M", status: "operational" },
  { name: "Robinhood", short: "RH", color: "#00C805", logo: "/logos/robinhood.png", active: false, gas: "\u2014", block: "\u2014", status: "coming-soon" },
  { name: "Linea", short: "L2", color: "#FF6B6B", logo: "/logos/linea.svg", active: true, gas: "0.08 gwei", block: "5.6M", status: "operational" },
  { name: "Scroll", short: "SCR", color: "#FFE15A", logo: "/logos/scroll.svg", active: true, gas: "0.12 gwei", block: "7.1M", status: "operational" },
  { name: "GenLayer", short: "GEN", color: "#110FFF", logo: "/logos/genlayer.svg", active: true, gas: "0.01 gwei", block: "1.2M", status: "operational" },
];

const badges = [
  { icon: "🔥", label: "7-Day Streak", color: "#ff6b00", desc: "Complete tasks 7 days in a row", unlocked: false },
  { icon: "💎", label: "Diamond Hands", color: "#00ccff", desc: "Hold assets across 3+ chains", unlocked: false },
  { icon: "🚀", label: "Early Adopter", color: "#00ff88", desc: "Join during testnet phase", unlocked: false },
  { icon: "🌐", label: "Multi-Chain", color: "#8b5cf6", desc: "Active on 5+ networks", unlocked: false },
  { icon: "⭐", label: "Legend", color: "#ffaa00", desc: "Reach level 50", unlocked: false },
  { icon: "🛡️", label: "Guardian", color: "#627eea", desc: "Complete 100 missions", unlocked: false },
];

const alphaFeed = [
  { time: "2h ago", text: "LiteVM testnet v2.3 deployed \u2014 lower gas, faster finality on all chains", type: "update" },
  { time: "4h ago", text: "2048 on-chain scoring now live on Base, Polygon, and Arbitrum", type: "announcement" },
  { time: "6h ago", text: "New Ink mainnet RPC endpoints available \u2014 latency reduced by 40%", type: "update" },
  { time: "12h ago", text: "Daily tasks refresh: complete all 9 for 500 bonus points this week", type: "event" },
  { time: "1d ago", text: "DGDreams v2.1 UI update \u2014 new themes, glass panels, and achievements", type: "announcement" },
  { time: "2d ago", text: "Base Sepolia faucet integrated \u2014 claim test ETH directly from dashboard", type: "feature" },
  { time: "3d ago", text: "Community call #12 recap: roadmap Q3 2025 discussed", type: "event" },
];

const weeklyActivityData = [
  { day: "Mon", count: 12, date: "Jul 21" },
  { day: "Tue", count: 28, date: "Jul 22" },
  { day: "Wed", count: 8, date: "Jul 23" },
  { day: "Thu", count: 42, date: "Jul 24" },
  { day: "Fri", count: 19, date: "Jul 25" },
  { day: "Sat", count: 35, date: "Jul 26" },
  { day: "Sun", count: 0, date: "Jul 27" },
];

function ActivityLineChart({ data }: { data: typeof weeklyActivityData }) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const width = 340;
  const height = 120;
  const padding = { top: 8, right: 8, bottom: 24, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - (d.count / maxVal) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
        <filter id="glowLine">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <motion.path
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        d={areaPath}
        fill="url(#areaGrad)"
      />
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 6px var(--accent))" }}
      />
      {points.map((p, i) => (
        <motion.g key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 + i * 0.08, type: "spring" }}
        >
          <circle cx={p.x} cy={p.y} r="3.5" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="2" style={{ filter: "drop-shadow(0 0 8px var(--accent))" }} />
          <text x={p.x} y={padding.top + chartH + 16} textAnchor="middle" fill="var(--text-faint)" fontSize="8" fontFamily="monospace">
            {p.day}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

function ChainCard({ chain }: { chain: (typeof networks)[number] }) {
  const statusColors: Record<string, string> = {
    operational: "var(--success)",
    maintenance: "var(--warning)",
    "coming-soon": "var(--text-faint)",
  };
  const statusLabels: Record<string, string> = {
    operational: "Live",
    maintenance: "Maint.",
    "coming-soon": "Soon",
  };
  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3 transition-all duration-300"
      style={{
        background: chain.active ? "var(--bg-card)" : "var(--bg-subtle)",
        border: `1px solid ${chain.active ? "var(--border-default)" : "var(--border-subtle)"}`,
        opacity: chain.active ? 1 : 0.45,
        filter: chain.active ? "none" : "grayscale(0.6)",
      }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center relative flex-shrink-0"
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
            style={{
              background: `color-mix(in srgb, ${statusColors[chain.status]} 12%, transparent)`,
            }}>
            <div className="w-1.5 h-1.5 rounded-full"
              style={{
                background: statusColors[chain.status],
                boxShadow: `0 0 4px ${statusColors[chain.status]}`,
              }} />
            <span className="text-[8px] font-mono font-semibold" style={{ color: statusColors[chain.status] }}>
              {statusLabels[chain.status]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>
            Gas: <span style={{ color: "var(--text-tertiary)" }}>{chain.gas}</span>
          </span>
          {chain.active && (
            <>
              <span className="text-[7px]" style={{ color: "var(--text-faint)" }}>|</span>
              <span className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>
                Block <span style={{ color: "var(--text-tertiary)" }}>#{chain.block}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected, chainId } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [feedExpanded, setFeedExpanded] = useState(false);

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
              <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono">
                <span style={{ color: "var(--text-faint)" }}>|</span>
                <Signal className="w-3 h-3" style={{ color: "var(--text-quaternary)" }} />
                <span style={{ color: "var(--text-tertiary)" }}>
                  Latency: <span style={{ color: "var(--accent)" }}>24ms</span>
                </span>
                <span style={{ color: "var(--text-faint)" }}>|</span>
                <Server className="w-3 h-3" style={{ color: "var(--text-quaternary)" }} />
                <span style={{ color: "var(--text-tertiary)" }}>
                  Block <span style={{ color: "var(--text-bright)" }}>#21,412,887</span>
                </span>
                <span style={{ color: "var(--text-faint)" }}>|</span>
                <Layers className="w-3 h-3" style={{ color: "var(--text-quaternary)" }} />
                <span style={{ color: "var(--text-tertiary)" }}>
                  Peers: <span style={{ color: "var(--text-bright)" }}>142</span>
                </span>
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
                      {networks.filter((n) => n.active).length}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>/ {networks.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {networks.filter((n) => n.active).map((n) => (
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
              {networks.filter((n) => n.active).length} active
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

        {/* ─────── 4. QUICK ACTIONS ─────── */}
        <motion.div {...fadeUp} transition={{ delay: 0.12 }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-quaternary)" }}>
              Quick Actions
            </span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, var(--border-default), transparent)" }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { icon: Wallet, label: "Connect Wallet", sub: "Link your wallet", color: "var(--accent)", href: "/profile" },
              { icon: Send, label: "Send Assets", sub: "Transfer tokens", color: "var(--success)", href: "#" },
              { icon: Eye, label: "View Activity", sub: "Transaction history", color: "var(--warning)", href: "/activity" },
              { icon: Globe, label: "Browse Tasks", sub: "Daily missions", color: "#8b5cf6", href: "/tasks" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="glass-panel glass-panel-hover p-4 rounded-xl cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: "var(--bg-glow)", border: "1px solid var(--border-default)" }}>
                      <Icon className="w-4.5 h-4.5" style={{ color: action.color }} />
                    </div>
                    <div className="font-semibold text-sm" style={{ color: "var(--text-bright)" }}>{action.label}</div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>{action.sub}</div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* ─────── MIDDLE ROW: Weekly Chart + Achievements ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* ─────── 5. INTERACTIVE WEEKLY ACTIVITY CHART ─────── */}
          <motion.div {...fadeUp} transition={{ delay: 0.16 }} className="lg:col-span-3">
            <div className="glass-panel rounded-2xl h-full">
              <div className="flex items-center justify-between p-4 sm:p-5"
                style={{ borderBottom: "1px solid var(--border-default)" }}>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="font-semibold text-sm" style={{ color: "var(--text-bright)" }}>Weekly Activity</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-cyan text-[9px]">7-day</span>
                  <span className="text-xs font-mono font-bold" style={{ color: "var(--accent)" }}>
                    {weeklyActivityData.reduce((a, b) => a + b.count, 0)} actions
                  </span>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <ActivityLineChart data={weeklyActivityData} />
                <div className="mt-3 pt-3.5 flex items-center justify-between text-xs"
                  style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
                      <span className="font-mono" style={{ color: "var(--text-tertiary)" }}>This week</span>
                    </div>
                    <span className="font-bold font-mono" style={{ color: "var(--accent)" }}>
                      {weeklyActivityData.reduce((a, b) => a + b.count, 0)} actions
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" style={{ color: "var(--text-faint)" }} />
                    <span className="font-mono" style={{ color: "var(--text-faint)" }}>vs last week: —</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─────── 6. 3D-STYLE ACHIEVEMENTS & BADGES ─────── */}
          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="lg:col-span-2">
            <div className="glass-panel rounded-2xl h-full">
              <div className="flex items-center justify-between p-4 sm:p-5"
                style={{ borderBottom: "1px solid var(--border-default)" }}>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" style={{ color: "var(--warning)" }} />
                  <span className="font-semibold text-sm" style={{ color: "var(--text-bright)" }}>Achievements</span>
                </div>
                <span className="badge-amber text-[9px]">
                  {badges.filter((b) => b.unlocked).length}/{badges.length}
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-3 gap-2.5">
                  {badges.map((badge, i) => (
                    <motion.div
                      key={badge.label}
                      initial={{ opacity: 0, scale: 0.8, rotateY: 30 }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      transition={{ delay: 0.25 + i * 0.05, type: "spring", stiffness: 120 }}
                      whileHover={{
                        scale: 1.08,
                        y: -4,
                        transition: { type: "spring", stiffness: 200 },
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl p-3 cursor-pointer text-center relative group"
                      style={{
                        background: badge.unlocked
                          ? `color-mix(in srgb, ${badge.color} 10%, transparent)`
                          : "var(--bg-subtle)",
                        border: badge.unlocked
                          ? `1px solid color-mix(in srgb, ${badge.color} 25%, transparent)`
                          : "1px solid var(--border-default)",
                        opacity: badge.unlocked ? 1 : 0.45,
                        filter: badge.unlocked ? "none" : "grayscale(0.7)",
                        transformStyle: "preserve-3d",
                        perspective: "400px",
                      }}
                      title={badge.label}
                    >
                      {!badge.unlocked && (
                        <div className="absolute top-1.5 right-1.5">
                          <Lock className="w-2.5 h-2.5" style={{ color: "var(--text-faint)" }} />
                        </div>
                      )}
                      {badge.unlocked && (
                        <div className="absolute top-1.5 right-1.5">
                          <Unlock className="w-2.5 h-2.5" style={{ color: badge.color }} />
                        </div>
                      )}
                      <motion.span
                        className="text-2xl leading-none mt-1"
                        whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.3 }}
                      >
                        {badge.icon}
                      </motion.span>
                      <span className="text-[9px] text-center leading-tight font-semibold font-mono"
                        style={{ color: badge.unlocked ? badge.color : "var(--text-quaternary)" }}>
                        {badge.label}
                      </span>
                      <span className="text-[7px] font-mono leading-tight hidden group-hover:block"
                        style={{ color: "var(--text-faint)" }}>
                        {badge.desc}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

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

          {/* ─────── 6b. ALPHA FEED / NEWS FEED ─────── */}
          <motion.div {...fadeUp} transition={{ delay: 0.32 }} className="lg:col-span-1">
            <div className="glass-panel rounded-2xl h-full flex flex-col">
              <div className="flex items-center justify-between p-4 sm:p-5"
                style={{ borderBottom: "1px solid var(--border-default)" }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="font-semibold text-sm" style={{ color: "var(--text-bright)" }}>Alpha Feed</span>
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: 999999 }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--success)" }}
                  />
                </div>
                <span className="badge-green text-[9px]">Live</span>
              </div>
              <div
                className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 scrollbar-thin"
                style={{ maxHeight: feedExpanded ? "400px" : "300px" }}
              >
                <AnimatePresence>
                  {alphaFeed.map((item, i) => {
                    const typeColors: Record<string, string> = {
                      update: "var(--accent)",
                      announcement: "var(--warning)",
                      event: "#8b5cf6",
                      feature: "var(--success)",
                    };
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl transition-colors"
                        style={{ background: "var(--bg-subtle)" }}
                        whileHover={{ background: "var(--bg-glow)" }}
                      >
                        <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                          style={{
                            background: typeColors[item.type] || "var(--accent)",
                            boxShadow: `0 0 6px ${typeColors[item.type] || "var(--accent)"}`,
                          }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            {item.text}
                          </p>
                          <span className="text-[8px] font-mono mt-1 block" style={{ color: "var(--text-faint)" }}>
                            {item.time}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <div className="p-3 sm:p-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <button
                  onClick={() => setFeedExpanded(!feedExpanded)}
                  className="w-full text-[9px] font-mono py-1.5 rounded-lg transition-colors"
                  style={{
                    background: "var(--bg-subtle)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {feedExpanded ? "Show less \u2191" : "Show all 7 updates \u2193"}
                </button>
              </div>
            </div>
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
