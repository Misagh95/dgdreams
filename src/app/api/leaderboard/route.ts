import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { litevmStats, gameScores, tournamentEntries } from "@/db/schema";
import { desc, count, sum, avg, eq } from "drizzle-orm";
import { ensureTables } from "@/lib/init-db";

const LITVM_NETWORK = "LITVM Liteforge";
const ALL_NETWORKS = "All Networks";

export type LeaderboardCategory = "streak" | "game2048" | "litevm";

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  value: number;
  secondary: string;
  network: string;
}

export interface LeaderboardStats {
  totalPlayers: number;
  totalValue: number;
  avgValue: number;
}

export async function GET(request: NextRequest) {
  await ensureTables();
  const { searchParams } = new URL(request.url);
  const rawCategory = searchParams.get("category") || "litevm";
  const category: LeaderboardCategory =
    rawCategory === "streak" || rawCategory === "game2048" || rawCategory === "litevm"
      ? rawCategory
      : "litevm";
  const chain = searchParams.get("chain") || "all";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 100);

  // "All Networks" (the page's default) is the same as "all" — no filtering.
  const filter = chain.toLowerCase();
  const isAll = filter === "all" || filter === "all networks";

  try {
    let rows: Omit<LeaderboardEntry, "rank">[] = [];
    let stats: LeaderboardStats = { totalPlayers: 0, totalValue: 0, avgValue: 0 };

    if (category === "streak") {
      const where = isAll ? undefined : eq(litevmStats.chain, chain);
      const [data, agg] = await Promise.all([
        db
          .select()
          .from(litevmStats)
          .where(where)
          .orderBy(desc(litevmStats.streak))
          .limit(limit),
        db
          .select({
            totalPlayers: count(),
            totalValue: sum(litevmStats.streak),
            avgValue: avg(litevmStats.streak),
          })
          .from(litevmStats)
          .where(where),
      ]);
      rows = data.map((s) => ({
        walletAddress: s.walletAddress,
        value: s.streak ?? 0,
        secondary: `${s.totalAct ?? 0} actions · ${s.totalCi ?? 0} check-ins`,
        network: s.chain || LITVM_NETWORK,
      }));
      stats = {
        totalPlayers: agg[0]?.totalPlayers ?? 0,
        totalValue: Number(agg[0]?.totalValue ?? 0),
        avgValue: Number(agg[0]?.avgValue ?? 0),
      };
    } else if (category === "game2048") {
      const [scores, tourn] = await Promise.all([
        db.select().from(gameScores).orderBy(desc(gameScores.score)).limit(500),
        db
          .select()
          .from(tournamentEntries)
          .orderBy(desc(tournamentEntries.score))
          .limit(500),
      ]);
      const best = new Map<
        string,
        { walletAddress: string; value: number; tile: number; network: string }
      >();
      for (const s of scores) {
        if (!s.walletAddress) continue;
        const key = s.walletAddress.toLowerCase();
        const cur = best.get(key);
        if (!cur || (s.score ?? 0) > cur.value) {
          best.set(key, {
            walletAddress: key,
            value: s.score ?? 0,
            tile: s.bestTile ?? 0,
            network: s.chain || ALL_NETWORKS,
          });
        }
      }
      for (const t of tourn) {
        if (!t.walletAddress) continue;
        const key = t.walletAddress.toLowerCase();
        const cur = best.get(key);
        if (!cur || (t.score ?? 0) > cur.value) {
          best.set(key, {
            walletAddress: key,
            value: t.score ?? 0,
            tile: t.bestTile ?? 0,
            network: ALL_NETWORKS,
          });
        }
      }
      let merged = [...best.values()];
      if (!isAll) {
        // Select the best score after filtering, not before it. Otherwise a
        // player's score on another network can hide their score here.
        const networkBest = new Map<string, (typeof merged)[number]>();
        for (const s of scores) {
          if (!s.walletAddress || (s.chain || ALL_NETWORKS).toLowerCase() !== filter) continue;
          const key = s.walletAddress.toLowerCase();
          const current = networkBest.get(key);
          if (!current || (s.score ?? 0) > current.value) {
            networkBest.set(key, {
              walletAddress: key,
              value: s.score ?? 0,
              tile: s.bestTile ?? 0,
              network: s.chain || ALL_NETWORKS,
            });
          }
        }
        merged = [...networkBest.values()];
      }
      const totalValue = merged.reduce((acc, m) => acc + m.value, 0);
      stats = {
        totalPlayers: merged.length,
        totalValue,
        avgValue: merged.length > 0 ? totalValue / merged.length : 0,
      };
      rows = merged.map((b) => ({
        walletAddress: b.walletAddress,
        value: b.value,
        secondary: b.tile > 0 ? `best tile ${b.tile}` : "2048",
        network: b.network,
      }));
    } else {
      const where = isAll ? undefined : eq(litevmStats.chain, chain);
      const [data, agg] = await Promise.all([
        db.select().from(litevmStats).orderBy(desc(litevmStats.totalPoints)).limit(limit),
        db
          .select({
            totalPlayers: count(),
            totalValue: sum(litevmStats.totalPoints),
            avgValue: avg(litevmStats.totalPoints),
          })
          .from(litevmStats)
          .where(where),
      ]);
      rows = data.map((s) => ({
        walletAddress: s.walletAddress,
        value: s.totalPoints ?? 0,
        secondary: `${s.playCount ?? 0} games · hs ${s.highScore ?? 0}`,
        network: s.chain || LITVM_NETWORK,
      }));
      stats = {
        totalPlayers: agg[0]?.totalPlayers ?? 0,
        totalValue: Number(agg[0]?.totalValue ?? 0),
        avgValue: Number(agg[0]?.avgValue ?? 0),
      };
    }

    // streak/litevm rows are already chain-filtered by the SQL where clause;
    // game2048 was filtered inline before computing stats.
    const entries: LeaderboardEntry[] = rows
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return NextResponse.json({ category, chain, stats, entries });
  } catch (e) {
    console.error("GET /api/leaderboard error:", e);
    return NextResponse.json({
      category,
      chain,
      stats: { totalPlayers: 0, totalValue: 0, avgValue: 0 },
      entries: [],
    });
  }
}
