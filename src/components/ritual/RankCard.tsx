"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ChevronRight, Trophy } from "lucide-react";

import { BentoCard } from "@/components/ui/Bento";
import { useRitual } from "@/hooks/useRitual";

interface LeaderboardResponse {
  entries: { rank: number; walletAddress: string; value: number }[];
  stats: { totalPlayers: number };
}

/**
 * The rank card.
 *
 * Where the wallet stands on the streak board. It is a small, honest number
 * — not a leaderboard inside a leaderboard.
 */
export default function RankCard() {
  const { address, isConnected } = useAccount();
  const { streak } = useRitual();
  const [data, setData] = useState<LeaderboardResponse | null>(null);

  useEffect(() => {
    if (!isConnected) return;
    let alive = true;
    fetch("/api/leaderboard?category=streak&limit=100")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (alive && json) setData(json as LeaderboardResponse);
      })
      .catch(() => {
        /* the board is optional — the page still works without it */
      });
    return () => {
      alive = false;
    };
  }, [isConnected, streak]);

  const mine = data?.entries.find(
    (e) => e.walletAddress?.toLowerCase() === address?.toLowerCase()
  );

  return (
    <BentoCard title="Rank" icon={<Trophy className="w-4 h-4" strokeWidth={1.75} />}>
      {!isConnected ? (
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Connect a wallet to see where you stand.
        </p>
      ) : !data ? (
        <p className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
          Reading the board…
        </p>
      ) : mine ? (
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[32px] font-bold leading-none"
              style={{ color: "var(--text-bright)" }}
            >
              #{mine.rank}
            </span>
            <span className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
              of {data.stats.totalPlayers}
            </span>
          </div>
          <p className="mt-2 text-[14px]" style={{ color: "var(--text-secondary)" }}>
            {mine.value} day streak on the board.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[32px] font-bold leading-none"
              style={{ color: "var(--text-bright)" }}
            >
              {streak}
            </span>
            <span className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
              day streak
            </span>
          </div>
          <p className="mt-2 text-[14px]" style={{ color: "var(--text-secondary)" }}>
            Not on the board yet. Finish a mission to get ranked.
          </p>
        </div>
      )}

      <Link
        href="/leaderboard"
        className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium hover:underline"
        style={{ color: "var(--text-secondary)" }}
      >
        Full leaderboard
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </BentoCard>
  );
}
