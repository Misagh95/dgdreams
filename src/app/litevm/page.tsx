"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Trophy, Star, Shield, Users, Flame, Target, Activity } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAccount, useReadContract, useReadContracts, useSwitchChain } from "wagmi";
import { liteforgeChain } from "@/config/chains";

const LITVM_CHAIN_ID = 4441;

const GAME2048_ABI = [
  { inputs: [], name: "playCount", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "highScore", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const NIKBASE_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserData",
    outputs: [
      { name: "streak", type: "uint256" },
      { name: "totalCI", type: "uint256" },
      { name: "totalAct", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const GAME_ADDR = "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff" as const;
const NIK_ADDR = "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B" as const;

const POINTS_PER_ACTION = 10;
const POINTS_PER_STREAK_DAY = 5;
const POINTS_PER_GAME_PLAY = 50;

function calculatePoints(
  streak: number,
  totalAct: number,
  playCount: number,
  highScore: number
): { total: number; breakdown: { label: string; points: number; icon: string }[] } {
  const actions = totalAct * POINTS_PER_ACTION;
  const streakPts = streak * POINTS_PER_STREAK_DAY;
  const gamePlays = playCount * POINTS_PER_GAME_PLAY;
  const scoreBonus = Math.floor(highScore / 100);
  const total = actions + streakPts + gamePlays + scoreBonus;

  return {
    total,
    breakdown: [
      { label: "Task Actions", points: actions, icon: "⚡" },
      { label: "Streak Bonus", points: streakPts, icon: "🔥" },
      { label: "Game Plays", points: gamePlays, icon: "🎮" },
      { label: "Score Bonus", points: scoreBonus, icon: "🏆" },
    ],
  };
}

export default function LitevmPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [switching, setSwitching] = useState(false);

  const onLiteVM = isConnected && chainId === LITVM_CHAIN_ID;

  const gameReads = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address: GAME_ADDR,
        abi: GAME2048_ABI,
        functionName: "playCount",
        args: [],
        chainId: LITVM_CHAIN_ID,
      } as const,
      {
        address: GAME_ADDR,
        abi: GAME2048_ABI,
        functionName: "highScore",
        args: [],
        chainId: LITVM_CHAIN_ID,
      } as const,
    ],
    query: { enabled: !!address },
  });

  const userData = useReadContract({
    address: NIK_ADDR,
    abi: NIKBASE_ABI,
    functionName: "getUserData",
    args: address ? [address] : undefined,
    chainId: LITVM_CHAIN_ID,
    query: { enabled: !!address },
  });

  const playCount = gameReads.data?.[0] ? Number(gameReads.data[0]) : 0;
  const highScore = gameReads.data?.[1] ? Number(gameReads.data[1]) : 0;
  const streak = userData.data?.[0] ? Number(userData.data[0]) : 0;
  const totalCI = userData.data?.[1] ? Number(userData.data[1]) : 0;
  const totalAct = userData.data?.[2] ? Number(userData.data[2]) : 0;

  const points = calculatePoints(streak, totalAct, playCount, highScore);

  const handleSwitch = async () => {
    if (!switchChainAsync) return;
    setSwitching(true);
    try {
      await switchChainAsync({ chainId: LITVM_CHAIN_ID });
    } catch {
      // user rejected
    } finally {
      setSwitching(false);
    }
  };

  const isLoading = gameReads.isLoading || userData.isLoading;

  // Auto-sync stats to DB when data loads
  useEffect(() => {
    if (!address || !isConnected || !onLiteVM || isLoading) return;
    if (gameReads.isLoading || userData.isLoading) return;
    const timeout = setTimeout(async () => {
      try {
        await fetch("/api/litevm/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            playCount,
            highScore,
            streak,
            totalCi: totalCI,
            totalAct,
            totalPoints: points.total,
          }),
        });
      } catch { /* silent */ }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [address, isConnected, onLiteVM, isLoading, playCount, highScore, streak, totalCI, totalAct, points.total]);

  return (
    <DashboardLayout title="LiteVM Point System" subtitle="// rewards & activity">
      <div className="max-w-full space-y-6">
        {/* Connection Banner */}
        <div
          className="glass-panel rounded-xl p-4 flex items-center justify-between flex-wrap gap-3"
          style={{
            border: `1px solid ${
              onLiteVM ? "rgba(0,255,136,0.2)" : "rgba(255,212,0,0.2)"
            }`,
          }}
        >
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#FFD700]" />
            <div>
              <h3 className="text-sm font-semibold text-[#e2e8f0]">
                LitVM Liteforge
              </h3>
              <p className="text-[10px] font-mono text-[#64748b]">
                Chain ID: {LITVM_CHAIN_ID}
                {isConnected && ` • ${address?.slice(0, 6)}...${address?.slice(-4)}`}
              </p>
            </div>
          </div>
          {isConnected && !onLiteVM && (
            <button
              onClick={handleSwitch}
              disabled={switching}
              className="btn-primary px-4 py-2 text-xs"
            >
              {switching ? "Switching..." : "Switch to LiteVM"}
            </button>
          )}
          {onLiteVM && (
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 font-mono">
              Connected
            </span>
          )}
          {!isConnected && (
            <span className="text-[10px] font-mono text-[#64748b]">
              Connect wallet to view stats
            </span>
          )}
        </div>

        {/* Points Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-6 text-center relative overflow-hidden"
          style={{
            border: "1px solid rgba(255,215,0,0.2)",
            boxShadow: "0 0 60px rgba(255,215,0,0.05)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, #FFD700 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="w-4 h-4 text-[#FFD700]" />
              <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-widest">
                Total Points
              </span>
            </div>
            <div className="text-5xl font-black gradient-text-cyan mb-2">
              {isLoading ? (
                <span className="text-[#334155] animate-pulse">...</span>
              ) : (
                points.total.toLocaleString()
              )}
            </div>
            <p className="text-xs text-[#64748b] font-mono">
              {isLoading
                ? "Loading..."
                : `From ${totalAct} actions, ${streak}-day streak, ${playCount} game plays`}
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Streak", value: streak, icon: Flame, color: "#ff6b6b" },
            { label: "Actions", value: totalAct, icon: Activity, color: "#00d4ff" },
            { label: "Check-ins", value: totalCI, icon: Target, color: "#00ff88" },
            { label: "Games Played", value: playCount, icon: Trophy, color: "#ffaa00" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-panel rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                  <span className="text-[10px] font-mono text-[#475569] uppercase tracking-widest">
                    {stat.label}
                  </span>
                </div>
                <div className="text-xl font-black" style={{ color: stat.color }}>
                  {isLoading ? (
                    <span className="animate-pulse">—</span>
                  ) : (
                    stat.value.toLocaleString()
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Points Breakdown */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-[#00d4ff]" />
              <span className="text-sm font-semibold text-[#e2e8f0]">
                Points Breakdown
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {points.breakdown.map((b) => {
                const pct =
                  points.total > 0
                    ? Math.round((b.points / points.total) * 100)
                    : 0;
                return (
                  <div key={b.label} className="p-3 rounded-lg" style={{ background: "rgba(6,13,26,0.8)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{b.icon}</span>
                        <span className="text-xs text-[#94a3b8]">
                          {b.label}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#ffaa00]">
                        +{b.points.toLocaleString()}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(26,58,92,0.4)" }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background:
                            "linear-gradient(90deg, #FFD700, #ffaa00)",
                        }}
                      />
                    </div>
                    <div className="text-[9px] font-mono text-[#475569] mt-1 text-right">
                      {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contract Info */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-[#00d4ff]" />
              <span className="text-sm font-semibold text-[#e2e8f0]">
                Contracts
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {[
                {
                  name: "Game2048",
                  addr: GAME_ADDR,
                  desc: "recordPlay scores, track play count & high score",
                  color: "#FFD700",
                },
                {
                  name: "NikBase",
                  addr: NIK_ADDR,
                  desc: "Daily tasks: check-in, streak, actions",
                  color: "#00d4ff",
                },
              ].map((c) => (
                <div
                  key={c.name}
                  className="p-3 rounded-lg"
                  style={{ background: "rgba(6,13,26,0.8)", border: `1px solid ${c.color}15` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#e2e8f0]">
                      {c.name}
                    </span>
                    <span className="text-[9px] font-mono text-[#475569]">
                      {c.addr.slice(0, 10)}...{c.addr.slice(-6)}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748b]">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent High Score */}
        {highScore > 0 && (
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-[#ffaa00]" />
              <span className="text-sm font-semibold text-[#e2e8f0]">
                Game Achievements
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-3 rounded-lg text-center"
                style={{ background: "rgba(6,13,26,0.8)" }}
              >
                <div className="text-[9px] font-mono text-[#475569] uppercase mb-1">
                  High Score
                </div>
                <div className="text-lg font-black text-[#ffaa00]">
                  {highScore.toLocaleString()}
                </div>
              </div>
              <div
                className="p-3 rounded-lg text-center"
                style={{ background: "rgba(6,13,26,0.8)" }}
              >
                <div className="text-[9px] font-mono text-[#475569] uppercase mb-1">
                  Games Played
                </div>
                <div className="text-lg font-black text-[#00d4ff]">
                  {playCount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
