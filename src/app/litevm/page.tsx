"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, Trophy, Star, Shield, Users, Flame, Target, Activity, BarChart3, Gamepad2, ListChecks, Timer } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAccount, useReadContract, useReadContracts, useSwitchChain, useWriteContract, useConfig } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { LITE_PREDICTION_ADDR, LITE_PREDICTION_ABI } from "@/lib/litevm-prediction";
import { liteforgeChain } from "@/config/chains";
import { shortenAddress } from "@/lib/utils";

const LITVM_CHAIN_ID = 4441;
const GAME2048_ABI = [
  { inputs: [], name: "playCount", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "highScore", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;
const NIKBASE_ABI = [{
  inputs: [{ name: "user", type: "address" }],
  name: "getUserData",
  outputs: [
    { name: "streak", type: "uint256" },
    { name: "totalCI", type: "uint256" },
    { name: "totalAct", type: "uint256" },
  ],
  stateMutability: "view", type: "function",
}] as const;

const GAME_ADDR = "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff" as const;
const NIK_ADDR = "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B" as const;

const POINTS_PER_ACTION = 10;
const POINTS_PER_STREAK_DAY = 5;
const POINTS_PER_GAME_PLAY = 50;
const POINTS_PER_PRED = 20;

function calculatePoints(streak: number, totalAct: number, playCount: number, highScore: number, totalPred: number) {
  const actions = totalAct * POINTS_PER_ACTION;
  const streakPts = streak * POINTS_PER_STREAK_DAY;
  const gamePlays = playCount * POINTS_PER_GAME_PLAY;
  const scoreBonus = Math.floor(highScore / 100);
  const predPts = totalPred * POINTS_PER_PRED;
  const total = actions + streakPts + gamePlays + scoreBonus + predPts;
  return { total, breakdown: [
    { label: "Task Actions", points: actions, icon: "⚡" },
    { label: "Streak Bonus", points: streakPts, icon: "🔥" },
    { label: "Game Plays", points: gamePlays, icon: "🎮" },
    { label: "Score Bonus", points: scoreBonus, icon: "🏆" },
    { label: "Predictions", points: predPts, icon: "🎲" },
  ]};
}

interface Tournament {
  id: number; name: string; gameType: string; entryFee: number; prizePool: number;
  maxPlayers: number; status: string; startsAt: string; endsAt: string; createdBy: string;
}
interface Entry {
  id: number; walletAddress: string; score: number; bestTile: number;
  rank: number | null; prize: number;
}

function PredictionTab({ address, isConnected, chainId, onLiteVM }: { address: `0x${string}` | undefined; isConnected: boolean; chainId: number | undefined; onLiteVM: boolean }) {
  const { writeContractAsync } = useWriteContract();
  const wagmiConfig = useConfig();

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [dailyPrices, setDailyPrices] = useState<any>({});
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const { data: activeMarkets, refetch: refetchMarkets } = useReadContract({
    address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
    functionName: "getActiveMarkets", args: [], chainId: 4441,
    query: { enabled: !!address },
  });

  useEffect(() => {
    fetch("/api/predictions").then(r => r.json()).then(d => {
      setSuggestions(d.suggestions || []);
      setDailyPrices(d.prices || {});
    }).catch(() => {});
  }, []);

  const doWrite = async (fn: () => Promise<any>, msg: string) => {
    if (!address) return;
    if (!onLiteVM) { setActionMsg("Switch to LiteVM first"); return; }
    setActionMsg(null);
    try { await fn(); setActionMsg(msg); refetchMarkets(); } catch (e: any) { setActionMsg(e.message); }
  };

  const createMarket = async (question: string, resolvesAt: number) => {
    if (!writeContractAsync) return;
    await writeContractAsync({
      address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
      functionName: "createMarket", args: [question, BigInt(resolvesAt)],
      chainId: 4441,
    });
  };

  const predictMarket = async (id: bigint, outcome: boolean, amount: string) => {
    if (!writeContractAsync) return;
    await writeContractAsync({
      address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
      functionName: "predict", args: [id, outcome],
      value: BigInt(amount),
      chainId: 4441,
    });
  };

  const resolveMarket = async (id: bigint, outcome: boolean) => {
    if (!writeContractAsync) return;
    await writeContractAsync({
      address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
      functionName: "resolveMarket", args: [id, outcome],
      chainId: 4441,
    });
  };

  if (!isConnected) {
    return <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>Connect wallet to view predictions</p>;
  }

  return (
    <div className="space-y-4">
      {/* Daily suggestion */}
      {suggestions.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>Daily Predictions</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: "color-mix(in srgb, #10B981 15%, transparent)", color: "#10B981" }}>CoinGecko</span>
          </div>
          {dailyPrices.btc && <p className="text-[10px] font-mono mb-3" style={{ color: "var(--text-quaternary)" }}>BTC: ${dailyPrices.btc.toLocaleString()} &middot; ETH: ${dailyPrices.eth?.toLocaleString()} &middot; SOL: ${dailyPrices.sol?.toLocaleString()}</p>}
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div>
                  <p className="text-[11px] font-mono" style={{ color: "var(--text-primary)" }}>{s.question}</p>
                  <p className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-quaternary)" }}>Resolves at {new Date(s.resolvesAt * 1000).toLocaleTimeString()}</p>
                </div>
                <button onClick={() => doWrite(() => createMarket(s.question, s.resolvesAt), "Market created!")} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#F59E0B", color: "#000", border: "none", whiteSpace: "nowrap" }}>
                  Create Market
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active markets */}
      <div>
        <p className="text-[10px] font-mono mb-2" style={{ color: "var(--text-quaternary)" }}>Active Markets</p>
        {!activeMarkets || (activeMarkets as any[])?.length === 0 ? (
          <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>No active markets</p>
        ) : (
          <div className="space-y-2">
            {(activeMarkets as any[])?.map((m: any) => {
              const poolTotal = Number(m.yesPool) + Number(m.noPool);
              const yesPct = poolTotal > 0 ? (Number(m.yesPool) / poolTotal) * 100 : 50;
              return (
                <div key={String(m.id)} className="rounded-xl p-3 space-y-2" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
                  <p className="text-[11px] font-mono" style={{ color: "var(--text-primary)" }}>{m.question}</p>
                  <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
                    <span>YES: {Number(m.yesPool)}</span>
                    <span>NO: {Number(m.noPool)}</span>
                    <span>Ends: {new Date(Number(m.resolvesAt) * 1000).toLocaleTimeString()}</span>
                  </div>
                  {poolTotal > 0 && (
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                      <div className="h-full rounded-full" style={{ width: `${yesPct}%`, background: "linear-gradient(90deg, #10B981, #EF4444)" }} />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => doWrite(() => predictMarket(m.id, true, "1000000000000000"), "YES predicted!")} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#10B981", color: "#fff", border: "none" }}>
                      YES (0.001 zkLTC)
                    </button>
                    <button onClick={() => doWrite(() => predictMarket(m.id, false, "1000000000000000"), "NO predicted!")} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#EF4444", color: "#fff", border: "none" }}>
                      NO (0.001 zkLTC)
                    </button>
                    {onLiteVM && <button onClick={() => doWrite(() => resolveMarket(m.id, true), "Resolved!")} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#8B5CF6", color: "#fff", border: "none" }}>
                      Resolve YES
                    </button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {actionMsg && <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{actionMsg}</p>}
    </div>
  );
}

const TABS = [
  { id: "points", label: "Points", icon: Star },
  { id: "tournaments", label: "Tournaments", icon: Trophy },
  { id: "predictions", label: "Predictions", icon: BarChart3 },
  { id: "tasks", label: "Tasks", icon: ListChecks },
];

export default function LitevmPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [switching, setSwitching] = useState(false);
  const [totalPred, setTotalPred] = useState(0);
  const [tab, setTab] = useState("points");

  // Points tab state
  useEffect(() => {
    if (!address) return;
    fetch(`/api/litevm/stats?wallet=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((data) => { if (data?.totalPred != null) setTotalPred(data.totalPred); })
      .catch(() => {});
  }, [address]);

  const onLiteVM = isConnected && chainId === LITVM_CHAIN_ID;

  const gameReads = useReadContracts({
    allowFailure: false,
    contracts: [
      { address: GAME_ADDR, abi: GAME2048_ABI, functionName: "playCount", args: [], chainId: LITVM_CHAIN_ID } as const,
      { address: GAME_ADDR, abi: GAME2048_ABI, functionName: "highScore", args: [], chainId: LITVM_CHAIN_ID } as const,
    ],
    query: { enabled: !!address },
  });

  const userData = useReadContract({
    address: NIK_ADDR, abi: NIKBASE_ABI, functionName: "getUserData",
    args: address ? [address] : undefined, chainId: LITVM_CHAIN_ID,
    query: { enabled: !!address },
  });

  const playCount = gameReads.data?.[0] ? Number(gameReads.data[0]) : 0;
  const highScore = gameReads.data?.[1] ? Number(gameReads.data[1]) : 0;
  const streak = userData.data?.[0] ? Number(userData.data[0]) : 0;
  const totalCI = userData.data?.[1] ? Number(userData.data[1]) : 0;
  const totalAct = userData.data?.[2] ? Number(userData.data[2]) : 0;

  const points = calculatePoints(streak, totalAct, playCount, highScore, totalPred);
  const isLoading = gameReads.isLoading || userData.isLoading;

  const handleSwitch = async () => {
    if (!switchChainAsync) return;
    setSwitching(true);
    try { await switchChainAsync({ chainId: LITVM_CHAIN_ID }); } catch {}
    setSwitching(false);
  };

  useEffect(() => {
    if (!address || !isConnected || !onLiteVM || isLoading) return;
    const timeout = setTimeout(async () => {
      try {
        await fetch("/api/litevm/stats", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address, playCount, highScore, streak, totalCi: totalCI, totalAct, totalPred, totalPoints: points.total }),
        });
      } catch {}
    }, 2000);
    return () => clearTimeout(timeout);
  }, [address, isConnected, onLiteVM, isLoading, playCount, highScore, streak, totalCI, totalAct, totalPred, points.total]);

  // Tournaments tab state
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tournLoading, setTournLoading] = useState(false);
  const [tournMsg, setTournMsg] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [tournForm, setTournForm] = useState({ name: "", entryFee: "0", maxPlayers: "100", durationHours: "24" });

  const fetchTournaments = useCallback(async () => {
    setTournLoading(true);
    try { const r = await fetch("/api/tournaments"); const d = await r.json(); setTournaments(d.tournaments || []); } catch {}
    setTournLoading(false);
  }, []);

  const fetchEntries = useCallback(async (id: number) => {
    try { const r = await fetch(`/api/tournaments/${id}/entries`); const d = await r.json(); setEntries(d.entries || []); } catch {}
  }, []);

  useEffect(() => { if (tab === "tournaments") fetchTournaments(); }, [tab, fetchTournaments]);
  useEffect(() => { if (selectedId) fetchEntries(selectedId); }, [selectedId, fetchEntries]);

  const handleCreateTourn = async () => {
    if (!address) return;
    setTournMsg(null);
    const endsAt = new Date(Date.now() + parseInt(tournForm.durationHours) * 3600000);
    try {
      const r = await fetch("/api/tournaments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tournForm.name, entryFee: parseInt(tournForm.entryFee) || 0, maxPlayers: parseInt(tournForm.maxPlayers) || 100, startsAt: new Date().toISOString(), endsAt: endsAt.toISOString(), createdBy: address }),
      });
      const d = await r.json();
      if (d.error) { setTournMsg(d.error); return; }
      setTournMsg(`"${tournForm.name}" created!`);
      setShowCreate(false); setTournForm({ name: "", entryFee: "0", maxPlayers: "100", durationHours: "24" });
      fetchTournaments();
    } catch (e: any) { setTournMsg(e.message); }
  };

  if (!isConnected) {
    return (
      <DashboardLayout title="LITVM Hub">
        <div className="flex items-center justify-center h-64">
          <button onClick={() => {}} className="px-6 py-3 rounded-xl text-sm font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>Connect Wallet</button>
        </div>
      </DashboardLayout>
    );
  }

  const tabContent = (
    <>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-mono transition-all" style={{
              background: tab === t.id ? "var(--bg)" : "transparent",
              color: tab === t.id ? "var(--text-primary)" : "var(--text-secondary)",
            }}>
              <Icon className="w-3 h-3" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Points */}
      {tab === "points" && (
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-4 flex items-center justify-between flex-wrap gap-3" style={{ border: `1px solid ${onLiteVM ? "rgba(0,255,136,0.2)" : "rgba(255,212,0,0.2)"}` }}>
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-[#FFD700]" />
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>LITVM Liteforge</h3>
                <p className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>Chain ID: {LITVM_CHAIN_ID}{isConnected && ` • ${address?.slice(0, 6)}...${address?.slice(-4)}`}</p>
              </div>
            </div>
            {isConnected && !onLiteVM && <button onClick={handleSwitch} disabled={switching} className="btn-primary px-4 py-2 text-xs">{switching ? "Switching..." : "Switch to LITVM"}</button>}
            {onLiteVM && <span className="text-[10px] px-2.5 py-1 rounded-full font-mono" style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.2)" }}>Connected</span>}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-xl p-6 text-center relative overflow-hidden" style={{ border: "1px solid rgba(255,215,0,0.2)" }}>
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Star className="w-4 h-4 text-[#FFD700]" />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-quaternary)" }}>Total Points</span>
              </div>
              <div className="text-5xl font-black gradient-text-cyan mb-2">
                {isLoading ? <span className="animate-pulse" style={{ color: "var(--text-quaternary)" }}>...</span> : points.total.toLocaleString()}
              </div>
              <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                {isLoading ? "Loading..." : `${totalAct} actions, ${streak}d streak, ${playCount} games, ${totalPred} predictions`}
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Streak", value: streak, icon: Flame, color: "#ff6b6b" },
              { label: "Actions", value: totalAct, icon: Activity, color: "#00d4ff" },
              { label: "Check-ins", value: totalCI, icon: Target, color: "#00ff88" },
              { label: "Games Played", value: playCount, icon: Trophy, color: "#ffaa00" },
              { label: "Predictions", value: totalPred, icon: BarChart3, color: "#F59E0B" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="glass-panel rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                    <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-quaternary)" }}>{stat.label}</span>
                  </div>
                  <div className="text-xl font-black" style={{ color: stat.color }}>
                    {isLoading ? <span className="animate-pulse">—</span> : stat.value.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4"><Shield className="w-4 h-4" style={{ color: "#00d4ff" }} /><span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Points Breakdown</span></div>
              <div className="flex flex-col gap-2">
                {points.breakdown.map((b) => {
                  const pct = points.total > 0 ? Math.round((b.points / points.total) * 100) : 0;
                  return (
                    <div key={b.label} className="p-3 rounded-lg" style={{ background: "rgba(6,13,26,0.8)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><span className="text-sm">{b.icon}</span><span className="text-xs" style={{ color: "var(--text-secondary)" }}>{b.label}</span></div>
                        <span className="text-xs font-bold" style={{ color: "#ffaa00" }}>+{b.points.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(26,58,92,0.4)" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #FFD700, #ffaa00)" }} />
                      </div>
                      <div className="text-[9px] font-mono mt-1 text-right" style={{ color: "var(--text-quaternary)" }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4"><Users className="w-4 h-4" style={{ color: "#00d4ff" }} /><span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Quick Actions</span></div>
              <div className="flex flex-col gap-2">
                <Link href="/2048" className="p-3 rounded-lg flex items-center justify-between transition-all hover:opacity-80" style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(255,215,0,0.15)" }}>
                  <div className="flex items-center gap-2"><Gamepad2 className="w-4 h-4" style={{ color: "#FFD700" }} /><span className="text-xs" style={{ color: "var(--text-secondary)" }}>Play 2048</span></div>
                  <span className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>Play →</span>
                </Link>
                <Link href="/litvm-market" className="p-3 rounded-lg flex items-center justify-between transition-all hover:opacity-80" style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(139,92,246,0.15)" }}>
                  <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4" style={{ color: "#8B5CF6" }} /><span className="text-xs" style={{ color: "var(--text-secondary)" }}>Prediction Market</span></div>
                  <span className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>Predict →</span>
                </Link>
                <Link href="/tasks" className="p-3 rounded-lg flex items-center justify-between transition-all hover:opacity-80" style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(0,212,255,0.15)" }}>
                  <div className="flex items-center gap-2"><ListChecks className="w-4 h-4" style={{ color: "#00d4ff" }} /><span className="text-xs" style={{ color: "var(--text-secondary)" }}>Daily Tasks</span></div>
                  <span className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>Tasks →</span>
                </Link>
              </div>
            </div>
          </div>

          {highScore > 0 && (
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3"><Trophy className="w-4 h-4" style={{ color: "#ffaa00" }} /><span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Game Achievements</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg text-center" style={{ background: "rgba(6,13,26,0.8)" }}>
                  <div className="text-[9px] font-mono uppercase mb-1" style={{ color: "var(--text-quaternary)" }}>High Score</div>
                  <div className="text-lg font-black" style={{ color: "#ffaa00" }}>{highScore.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ background: "rgba(6,13,26,0.8)" }}>
                  <div className="text-[9px] font-mono uppercase mb-1" style={{ color: "var(--text-quaternary)" }}>Games Played</div>
                  <div className="text-lg font-black" style={{ color: "#00d4ff" }}>{playCount.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4"><Users className="w-4 h-4" style={{ color: "#00d4ff" }} /><span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Contracts</span></div>
            <div className="flex flex-col gap-3">
              {[
                { name: "Game2048", addr: GAME_ADDR, desc: "Play count & high score", color: "#FFD700" },
                { name: "NikBase", addr: NIK_ADDR, desc: "Daily tasks: streak, actions", color: "#00d4ff" },
              ].map((c) => (
                <div key={c.name} className="p-3 rounded-lg" style={{ background: "rgba(6,13,26,0.8)", border: `1px solid ${c.color}15` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                    <span className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>{c.addr.slice(0, 10)}...{c.addr.slice(-6)}</span>
                  </div>
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tournaments */}
      {tab === "tournaments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>Compete in 2048 tournaments for prizes</p>
            <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              {showCreate ? "Cancel" : "+ New"}
            </button>
          </div>

          {showCreate && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
              <div>
                <label className="text-[10px] font-mono uppercase" style={{ color: "var(--text-quaternary)" }}>Name</label>
                <input value={tournForm.name} onChange={(e) => setTournForm({ ...tournForm, name: e.target.value })} placeholder="Weekend Showdown" className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase" style={{ color: "var(--text-quaternary)" }}>Entry (pts)</label>
                  <input type="number" value={tournForm.entryFee} onChange={(e) => setTournForm({ ...tournForm, entryFee: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase" style={{ color: "var(--text-quaternary)" }}>Max Players</label>
                  <input type="number" value={tournForm.maxPlayers} onChange={(e) => setTournForm({ ...tournForm, maxPlayers: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase" style={{ color: "var(--text-quaternary)" }}>Duration (hrs)</label>
                  <input type="number" value={tournForm.durationHours} onChange={(e) => setTournForm({ ...tournForm, durationHours: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                </div>
              </div>
              <button onClick={handleCreateTourn} disabled={!tournForm.name} className="px-6 py-2.5 rounded-xl text-xs font-mono transition-all hover:opacity-80 disabled:opacity-40" style={{ background: "#F59E0B", color: "#000", border: "none" }}>Create Tournament</button>
              {tournMsg && <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{tournMsg}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-mono mb-2" style={{ color: "var(--text-quaternary)" }}>Active Tournaments</p>
              {tournLoading ? (
                <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>Loading...</p>
              ) : tournaments.length === 0 ? (
                <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>No active tournaments. Create one!</p>
              ) : (
                <div className="space-y-2">
                  {tournaments.map((t) => {
                    const remaining = Math.max(0, Math.floor((new Date(t.endsAt).getTime() - Date.now()) / 3600000));
                    return (
                      <button key={t.id} onClick={() => setSelectedId(t.id)} className="w-full text-left rounded-xl p-3 transition-all" style={{ background: selectedId === t.id ? "var(--bg-strong)" : "transparent", border: selectedId === t.id ? "1px solid var(--border)" : "1px solid transparent" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>{t.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: "color-mix(in srgb, #10B981 15%, transparent)", color: "#10B981" }}>{remaining}h left</span>
                        </div>
                        <div className="flex gap-3 text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
                          <span>Prize: {t.prizePool} pts</span>
                          <span>Entry: {t.entryFee} pts</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-mono mb-2" style={{ color: "var(--text-quaternary)" }}>{selectedId ? "Leaderboard" : "Select a tournament"}</p>
              {selectedId && entries.length > 0 ? (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <table className="w-full text-xs font-mono">
                    <thead><tr style={{ background: "var(--bg-strong)" }}>
                      <th className="py-2 px-3 text-left" style={{ color: "var(--text-quaternary)" }}>#</th>
                      <th className="py-2 px-3 text-left" style={{ color: "var(--text-quaternary)" }}>Player</th>
                      <th className="py-2 px-3 text-right" style={{ color: "var(--text-quaternary)" }}>Score</th>
                      <th className="py-2 px-3 text-right" style={{ color: "var(--text-quaternary)" }}>Tile</th>
                    </tr></thead>
                    <tbody>
                      {entries.map((e, i) => (
                        <tr key={e.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{i + 1}</td>
                          <td className="py-2 px-3" style={{ color: "var(--text-primary)" }}>{shortenAddress(e.walletAddress)}</td>
                          <td className="py-2 px-3 text-right" style={{ color: e.walletAddress === address ? "#F59E0B" : "var(--text-primary)" }}>{e.score.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right" style={{ color: "var(--text-secondary)" }}>{e.bestTile}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : selectedId ? <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>No entries yet.</p> : null}
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "#F59E0B" }}>&#9654;</span> Play <Link href="/2048" className="underline">2048</Link> during an active tournament to submit your score.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Predictions */}
      {tab === "predictions" && (
        <PredictionTab address={address} isConnected={isConnected} chainId={chainId} onLiteVM={onLiteVM} />
      )}

      {/* Tab: Tasks */}
      {tab === "tasks" && (
        <div className="space-y-3">
          {[
            { icon: "🎮", title: "Play 2048", desc: "Earn points by playing 2048 on LITVM", href: "/2048", pts: "+50 per game", color: "#FFD700" },
            { icon: "🎲", title: "Make a Prediction", desc: "Predict outcomes on LITVM Prediction Market", href: "/litvm-market", pts: "+20 each", color: "#8B5CF6" },
            { icon: "✅", title: "Complete Daily Tasks", desc: "Check in and do daily actions on NikBase", href: "/tasks", pts: "+10 each", color: "#00d4ff" },
            { icon: "🏆", title: "Join a Tournament", desc: "Compete in 2048 tournaments for top prizes", href: "/litevm", pts: "+50 win bonus", color: "#ffaa00" },
            { icon: "🔒", title: "Create an Escrow", desc: "Use GenLayer AI Escrow for secure deals", href: "/genlayer-escrow", pts: "+30 each", color: "#8B5CF6" },
          ].map((task) => (
            <Link key={task.title} href={task.href} className="rounded-xl p-3 flex items-center justify-between transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{task.icon}</span>
                <div>
                  <p className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>{task.title}</p>
                  <p className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>{task.desc}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded-full" style={{ background: "color-mix(in srgb, " + task.color + " 15%, transparent)", color: task.color }}>{task.pts}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );

  return (
    <DashboardLayout title="LITVM Hub" subtitle="// points, tournaments & tasks">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {tabContent}
      </div>
    </DashboardLayout>
  );
}
