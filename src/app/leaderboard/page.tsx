"use client";

import { useEffect, useMemo, useState } from "react";
import { m } from "framer-motion";
import { Flame, Gamepad2, RefreshCw, Star, UserRound } from "lucide-react";
import Image from "next/image";
import { useAccount } from "wagmi";

import DashboardLayout from "@/components/DashboardLayout";
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
  unit: string;
  sub: string;
}[] = [
  { id: "streak", label: "Streak", icon: Flame, unit: "days", sub: "Consecutive days" },
  { id: "game2048", label: "2048", icon: Gamepad2, unit: "points", sub: "Best score" },
  // "litevm" is what the API and the table still call it; the tab says what it
  // actually ranks, which is total points.
  { id: "litevm", label: "Points", icon: Star, unit: "points", sub: "Total points" },
];

const ALL_NETWORKS = "All Networks";

const NETWORKS = [
  { name: ALL_NETWORKS, shortName: "All", logo: "" },
  ...[...mainnetNetworks, ...testnetNetworks].map((n) => ({
    name: n.name,
    shortName: n.shortName,
    logo: n.logo,
  })),
];

/**
 * Ranks.
 *
 * One list. A short podium for the top three, then rows — rank, wallet, value.
 * The old page stacked category tabs, three tinted stat cards, a category
 * summary strip, a podium and a list, each with its own colour, so the answer
 * to "where am I?" was five cards down.
 */
export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const [category, setCategory] = useState<Category>("litevm");
  const [network, setNetwork] = useState(ALL_NETWORKS);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats>({
    totalPlayers: 0,
    totalValue: 0,
    avgValue: 0,
  });
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
        const res = await fetch(
          `/api/leaderboard?category=${category}&chain=${
            network === ALL_NETWORKS ? "all" : encodeURIComponent(network)
          }`
        );
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
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(Math.min(entries.length, 3));

  return (
    <DashboardLayout title="Ranks">
      <div className="space-y-4 sm:space-y-6">
        {/* header */}
        <div>
          <p className="kicker">Every wallet, one board</p>
          <h1
            className="mt-1 text-[20px] sm:text-[32px] font-bold"
            style={{ color: "var(--text-bright)" }}
          >
            Ranks
          </h1>
        </div>

        {/* controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="segmented">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  aria-pressed={active}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[14px] font-medium transition-colors"
                  style={{
                    background: active ? "var(--accent)" : "transparent",
                    color: active ? "var(--accent-contrast)" : "var(--text-secondary)",
                  }}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="sm:ml-auto flex items-center gap-2">
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              aria-label="Filter by network"
              className="input-terminal px-3 py-2 text-[14px] max-w-[190px]"
              style={{ borderRadius: "var(--r-sm)" }}
            >
              {NETWORKS.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              title="Refresh"
              aria-label="Refresh"
              className="w-10 h-10 rounded-[12px] flex items-center justify-center transition-colors hover:bg-[var(--bg-strong)]"
              style={{ border: "1px solid var(--border-default)", color: "var(--text-tertiary)" }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* the board */}
        <section
          className="rounded-[20px] overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <header
            className="flex items-center gap-4 px-5 py-4 flex-wrap"
            style={{ borderBottom: "1px solid var(--border-default)" }}
          >
            <div className="min-w-0">
              <p className="text-[14px] font-semibold" style={{ color: "var(--text-bright)" }}>
                {cat.sub}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {network === ALL_NETWORKS ? "All networks" : network} ·{" "}
                {stats.totalPlayers.toLocaleString()} wallets
              </p>
            </div>

            {isConnected ? (
              <div className="ml-auto text-right">
                <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                  Your rank
                </p>
                <p
                  className="text-[20px] font-bold leading-tight tabular-nums"
                  style={{ color: "var(--text-bright)" }}
                >
                  {myEntry ? `#${myEntry.rank}` : "—"}
                </p>
              </div>
            ) : null}
          </header>

          {loading ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-[12px] skeleton" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                No one has posted a {cat.label.toLowerCase()} score yet.
              </p>
              <p className="text-[12px] mt-1" style={{ color: "var(--text-faint)" }}>
                {network === ALL_NETWORKS
                  ? "Be the first — finish a mission or a game."
                  : "Nothing recorded on this network yet."}
              </p>
            </div>
          ) : (
            <>
              {/* top three, on one line */}
              {top3.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: "var(--border-default)" }}>
                  {top3.map((e, i) => {
                    const isMe =
                      myAddress !== undefined &&
                      e.walletAddress.toLowerCase() === myAddress;
                    return (
                      <m.div
                        key={e.walletAddress}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                        className="px-5 py-5"
                        style={{ background: "var(--bg-card)" }}
                      >
                        <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                          {i === 0 ? "First" : i === 1 ? "Second" : "Third"}
                        </p>
                        <p
                          className="mt-1 text-[16px] font-semibold truncate"
                          style={{ color: "var(--text-bright)" }}
                          title={e.walletAddress}
                        >
                          {isMe ? "You" : shortenAddress(e.walletAddress, 4)}
                        </p>
                        <p
                          className="mt-2 text-[32px] font-bold leading-none tabular-nums"
                          style={{ color: "var(--text-bright)" }}
                        >
                          {e.value.toLocaleString()}
                          <span
                            className="text-[14px] font-normal ml-1.5"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {cat.unit}
                          </span>
                        </p>
                      </m.div>
                    );
                  })}
                </div>
              ) : null}

              {/* the rest */}
              {rest.length > 0 ? (
                <ul>
                  {rest.map((e) => {
                    const isMe =
                      myAddress !== undefined &&
                      e.walletAddress.toLowerCase() === myAddress;
                    return (
                      <li
                        key={e.walletAddress}
                        className="flex items-center gap-3 px-5 py-3"
                        style={{
                          borderTop: "1px solid var(--border-default)",
                          background: isMe ? "var(--accent-muted)" : "transparent",
                        }}
                      >
                        <span
                          className="w-8 text-[12px] tabular-nums flex-shrink-0"
                          style={{ color: "var(--text-faint)" }}
                        >
                          {e.rank}
                        </span>

                        <span className="flex-1 min-w-0">
                          <span
                            className="flex items-center gap-1.5 text-[14px] font-medium truncate"
                            style={{ color: "var(--text-primary)" }}
                            title={e.walletAddress}
                          >
                            {shortenAddress(e.walletAddress, 4)}
                            {isMe ? (
                              <span
                                className="inline-flex items-center gap-1 text-[12px] font-semibold flex-shrink-0"
                                style={{ color: "var(--accent-text)" }}
                              >
                                <UserRound className="w-3 h-3" strokeWidth={2} />
                                you
                              </span>
                            ) : null}
                          </span>
                          <span
                            className="block text-[12px] truncate mt-0.5"
                            style={{ color: "var(--text-faint)" }}
                          >
                            {e.secondary}
                            {e.network && e.network !== ALL_NETWORKS ? ` · ${e.network}` : ""}
                          </span>
                        </span>

                        <span
                          className="text-[14px] font-semibold tabular-nums flex-shrink-0"
                          style={{ color: "var(--text-bright)" }}
                        >
                          {e.value.toLocaleString()}
                          <span
                            className="text-[12px] font-normal ml-1"
                            style={{ color: "var(--text-faint)" }}
                          >
                            {cat.unit}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </>
          )}
        </section>

        <p className="text-[12px] text-center" style={{ color: "var(--text-faint)" }}>
          Read from the chain and the score table. Updates as wallets move.
        </p>
      </div>
    </DashboardLayout>
  );
}
