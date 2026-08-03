"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Gamepad2,
  Star,
  Crown,
  Medal,
  RefreshCw,
  UserRound,
  ChevronDown,
  Check,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAccount } from "wagmi";
import { mainnetNetworks, testnetNetworks } from "@/config/chains";
import { shortenAddress } from "@/lib/utils";

type Category = "streak" | "game2048" | "litevm";

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  value: number;
  secondary: string;
  network: string;
}

interface LeaderboardStats {
  totalPlayers: number;
  totalValue: number;
  avgValue: number;
}

const CATEGORIES: {
  id: Category;
  label: string;
  icon: typeof Flame;
  color: string;
  unit: string;
  sub: string;
}[] = [
  { id: "streak", label: "Streak", icon: Flame, color: "#ff6b6b", unit: "d", sub: "Consecutive days" },
  { id: "game2048", label: "2048", icon: Gamepad2, color: "#FFD700", unit: "pts", sub: "Best score" },
  { id: "litevm", label: "LiteVM", icon: Star, color: "#00d4ff", unit: "pts", sub: "Total points" },
];

const ALL_NETWORKS = "All Networks";

const NETWORKS = [
  { name: ALL_NETWORKS, shortName: "ALL", color: "#00d4ff" },
  ...[...mainnetNetworks, ...testnetNetworks].map((n) => ({
    name: n.name,
    shortName: n.shortName,
    color: n.color,
  })),
];

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

function CategoryTabs({
  category,
  onChange,
}: {
  category: Category;
  onChange: (c: Category) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
      {CATEGORIES.map((c) => {
        const Icon = c.icon;
        const active = category === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-mono transition-all"
            style={{
              background: active ? "var(--bg)" : "transparent",
              color: active ? c.color : "var(--text-secondary)",
              border: active ? `1px solid ${c.color}33` : "1px solid transparent",
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function NetworkFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = NETWORKS.find((n) => n.name === value) || NETWORKS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-all hover:opacity-85"
        style={{ background: "var(--bg-strong)", border: "1px solid var(--border)", color: "var(--text-primary)", minWidth: 150 }}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selected.color, boxShadow: `0 0 6px ${selected.color}` }} />
        <span className="flex-1 truncate text-left">{selected.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--text-quaternary)" }} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-64 max-h-80 overflow-auto rounded-xl p-1.5"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
            >
              {NETWORKS.map((n) => {
                const active = n.name === value;
                return (
                  <button
                    key={n.name}
                    onClick={() => {
                      onChange(n.name);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all hover:opacity-80"
                    style={{ color: active ? "var(--text-bright)" : "var(--text-secondary)", background: active ? "var(--bg-strong)" : "transparent" }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: n.color }} />
                    <span className="flex-1 truncate text-left">{n.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--bg)", color: "var(--text-quaternary)" }}>
                      {n.shortName}
                    </span>
                    {active && <Check className="w-3 h-3" style={{ color: "var(--accent)" }} />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Podium({ entries, unit }: { entries: LeaderboardEntry[]; unit: string }) {
  if (entries.length === 0) return null;
  const top3 = entries.slice(0, 3);
  // order: 2nd, 1st, 3rd on desktop; 1st, 2nd, 3rd on mobile
  const order = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="flex gap-3 items-end justify-center">
      {order.map((e, idx) => {
        const realIdx = top3.indexOf(e);
        const isFirst = realIdx === 0;
        const medal = MEDAL_COLORS[realIdx] || "#334155";
        return (
          <motion.div
            key={e.walletAddress}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, type: "spring", damping: 24, stiffness: 200 }}
            className="relative rounded-xl p-4 text-center overflow-hidden flex-1 max-w-[280px]"
            style={{
              background: `linear-gradient(180deg, color-mix(in srgb, ${medal} 14%, transparent) 0%, var(--bg-card) 100%)`,
              border: `1px solid color-mix(in srgb, ${medal} 35%, transparent)`,
              paddingTop: isFirst ? 28 : 20,
              boxShadow: isFirst ? `0 0 32px color-mix(in srgb, ${medal} 15%, transparent)` : undefined,
            }}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              {isFirst ? (
                <Crown className="w-4 h-4" style={{ color: medal }} />
              ) : (
                <Medal className="w-3.5 h-3.5" style={{ color: medal }} />
              )}
              <span className="text-[10px] font-mono font-bold" style={{ color: medal }}>
                #{realIdx + 1}
              </span>
            </div>
            <div
              className={`font-black ${isFirst ? "text-3xl" : "text-xl"} mb-1 truncate px-1`}
              style={{ color: isFirst ? medal : "var(--text-primary)" }}
              title={e.walletAddress}
            >
              {shortenAddress(e.walletAddress, 3)}
            </div>
            <div className="text-lg font-black" style={{ color: "var(--text-bright)" }}>
              {e.value.toLocaleString()}
              <span className="text-[10px] font-mono ml-1" style={{ color: "var(--text-quaternary)" }}>{unit}</span>
            </div>
            <div className="text-[9px] font-mono mt-0.5 truncate" style={{ color: "var(--text-quaternary)" }}>
              {e.secondary}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function StatsGrid({ stats, category, loading }: { stats: LeaderboardStats; category: Category; loading: boolean }) {
  const cat = CATEGORIES.find((c) => c.id === category)!;
  const items = [
    {
      label: "Players",
      value: stats.totalPlayers.toLocaleString(),
      unit: "wallets",
      icon: UserRound,
      color: cat.color,
    },
    {
      label: `Total ${cat.label}`,
      value: stats.totalValue.toLocaleString(),
      unit: cat.unit,
      icon: Star,
      color: cat.color,
    },
    {
      label: `Avg ${cat.label}`,
      value: stats.avgValue.toLocaleString(undefined, { maximumFractionDigits: 1 }),
      unit: cat.unit,
      icon: Flame,
      color: cat.color,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "var(--bg-card)", border: `1px solid ${item.color}22` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)`, border: `1px solid ${item.color}30` }}>
              <Icon className="w-4 h-4" style={{ color: item.color }} />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-quaternary)" }}>
                {item.label}
              </div>
              {loading ? (
                <div className="h-4 w-16 rounded mt-1 animate-pulse" style={{ background: "var(--bg-strong)" }} />
              ) : (
                <div className="text-lg font-black truncate" style={{ color: "var(--text-bright)" }}>
                  {item.value}
                  <span className="text-[10px] font-mono ml-1 font-normal" style={{ color: "var(--text-quaternary)" }}>
                    {item.unit}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-xl animate-pulse" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
          <div className="w-8 h-8 rounded-lg" style={{ background: "var(--bg)" }} />
          <div className="flex-1">
            <div className="h-3 w-40 rounded mb-2" style={{ background: "var(--bg)" }} />
            <div className="h-2 w-24 rounded" style={{ background: "var(--bg)" }} />
          </div>
          <div className="h-4 w-16 rounded" style={{ background: "var(--bg)" }} />
        </div>
      ))}
    </div>
  );
}

function EntryRow({
  entry,
  category,
  myAddress,
}: {
  entry: LeaderboardEntry;
  category: Category;
  myAddress: string | undefined;
}) {
  const isMe = myAddress !== undefined && entry.walletAddress.toLowerCase() === myAddress;
  const cat = CATEGORIES.find((c) => c.id === category)!;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(entry.rank * 0.03, 0.4) }}
      className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl transition-all"
      style={{
        background: isMe ? "color-mix(in srgb, var(--accent) 10%, var(--bg-card))" : "var(--bg-strong)",
        border: isMe
          ? `1px solid color-mix(in srgb, var(--accent) 60%, transparent)`
          : "1px solid var(--border)",
        boxShadow: isMe ? "0 0 24px color-mix(in srgb, var(--accent) 15%, transparent)" : undefined,
      }}
    >
      {/* Rank */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs flex-shrink-0"
        style={{
          background: "var(--bg)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        {entry.rank}
      </div>

      {/* Wallet */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold truncate" style={{ color: isMe ? "var(--accent)" : "var(--text-primary)" }} title={entry.walletAddress}>
            {shortenAddress(entry.walletAddress, 4)}
          </span>
          {isMe && (
            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-mono flex-shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" }}>
              <UserRound className="w-2.5 h-2.5" /> YOU
            </span>
          )}
        </div>
        <div className="text-[10px] font-mono truncate mt-0.5" style={{ color: "var(--text-quaternary)" }}>
          {entry.secondary}
        </div>
      </div>

      {/* Network chip */}
      {entry.network && entry.network !== ALL_NETWORKS && (
        <span className="hidden md:inline-flex items-center gap-1.5 text-[9px] px-2 py-1 rounded-full font-mono flex-shrink-0" style={{ background: "color-mix(in srgb, #FFD700 10%, transparent)", color: "#FFD700", border: "1px solid color-mix(in srgb, #FFD700 25%, transparent)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#FFD700" }} />
          {entry.network}
        </span>
      )}

      {/* Value */}
      <div className="text-right flex-shrink-0 min-w-[64px]">
        <div className="text-sm sm:text-base font-black" style={{ color: isMe ? "var(--accent)" : cat.color }}>
          {entry.value.toLocaleString()}
        </div>
        <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-quaternary)" }}>
          {cat.unit}
        </div>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const [category, setCategory] = useState<Category>("litevm");
  const [network, setNetwork] = useState(ALL_NETWORKS);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats>({ totalPlayers: 0, totalValue: 0, avgValue: 0 });
  const [loadedKey, setLoadedKey] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const myAddress = useMemo(
    () => (isConnected && address ? address.toLowerCase() : undefined),
    [isConnected, address]
  );

  const fetchKey = `${category}|${network}|${reloadKey}`;
  const loading = loadedKey !== fetchKey;

  useEffect(() => {
    let cancelled = false;
    const key = fetchKey;
    (async () => {
      try {
        const res = await fetch(`/api/leaderboard?category=${category}&chain=${network === ALL_NETWORKS ? "all" : encodeURIComponent(network)}`);
        const data = await res.json();
        if (!cancelled) {
          setEntries(data.entries || []);
          setStats(data.stats || { totalPlayers: 0, totalValue: 0, avgValue: 0 });
        }
      } catch {
        if (!cancelled) {
          setEntries([]);
          setStats({ totalPlayers: 0, totalValue: 0, avgValue: 0 });
        }
      } finally {
        if (!cancelled) setLoadedKey(key);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, network, reloadKey, fetchKey]);

  const myEntry = entries.find((e) => e.walletAddress.toLowerCase() === myAddress);

  const cat = CATEGORIES.find((c) => c.id === category)!;
  const CatIcon = cat.icon;

  return (
    <DashboardLayout title="Leaderboard" subtitle="// global rankings">
      <div className="max-w-full space-y-6">
        {/* Header: tabs + network + refresh */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 min-w-0">
            <CategoryTabs category={category} onChange={setCategory} />
          </div>
          <div className="flex items-center gap-2">
            <NetworkFilter value={network} onChange={setNetwork} />
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: "var(--bg-strong)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <StatsGrid stats={stats} category={category} loading={loading} />

        {/* Category summary strip */}
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${cat.color} 14%, transparent)`, border: `1px solid ${cat.color}33` }}>
            <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {cat.label} Rankings
            </div>
            <div className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
              {cat.sub} · {network} · {stats.totalPlayers.toLocaleString()} players tracked
            </div>
          </div>
          {isConnected && (
            <div className="text-right flex-shrink-0">
              <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-quaternary)" }}>
                Your rank
              </div>
              <div className="text-lg font-black" style={{ color: myEntry ? "var(--accent)" : "var(--text-secondary)" }}>
                {myEntry ? `#${myEntry.rank}` : "—"}
              </div>
            </div>
          )}
        </div>

        {/* Podium */}
        {!loading && entries.length > 0 && (
          <div>
            <Podium entries={entries} unit={cat.unit} />
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {loading ? (
            <SkeletonRows />
          ) : entries.length === 0 ? (
            <div className="rounded-xl p-10 text-center" style={{ background: "var(--bg-strong)", border: "1px dashed var(--border)" }}>
              <div className="text-3xl mb-3">🛰️</div>
              <div className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                No rankings yet for this leaderboard
              </div>
              <div className="text-[10px] font-mono mt-1" style={{ color: "var(--text-quaternary)" }}>
                {network === ALL_NETWORKS
                  ? "Connect your wallet and start earning streaks, 2048 scores or LiteVM points."
                  : "No data recorded on this network yet — try another network."}
              </div>
            </div>
          ) : (
            <>
              {entries.slice(Math.min(entries.length, 3)).map((e) => (
                <EntryRow key={e.walletAddress} entry={e} category={category} myAddress={myAddress} />
              ))}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
