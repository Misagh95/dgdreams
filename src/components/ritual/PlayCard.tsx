"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ChevronRight, Grid3x3 } from "lucide-react";

import { BentoCard } from "@/components/ui/Bento";

interface Game2048Response {
  entries: { walletAddress: string; value: number; secondary: string }[];
}

/**
 * The play card.
 *
 * 2048 is the one game in the product, and its score is on chain. The card
 * shows the best tile the wallet has reached and opens the game.
 */
export default function PlayCard() {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<Game2048Response | null>(null);

  useEffect(() => {
    if (!isConnected) return;
    let alive = true;
    fetch("/api/leaderboard?category=game2048&limit=100")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (alive && json) setData(json as Game2048Response);
      })
      .catch(() => {
        /* optional */
      });
    return () => {
      alive = false;
    };
  }, [isConnected]);

  const mine = data?.entries.find(
    (e) => e.walletAddress?.toLowerCase() === address?.toLowerCase()
  );

  return (
    <BentoCard title="Play" icon={<Grid3x3 className="w-4 h-4" strokeWidth={1.75} />}>
      <div className="flex items-baseline gap-2">
        <span
          className="text-[32px] font-bold leading-none"
          style={{ color: "var(--text-bright)" }}
        >
          {mine ? mine.value : "—"}
        </span>
        <span className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
          best tile
        </span>
      </div>
      <p className="mt-2 text-[14px]" style={{ color: "var(--text-secondary)" }}>
        {isConnected
          ? mine
            ? "Your best game, recorded on chain."
            : "Play once and your best tile lands on chain."
          : "Connect a wallet to record your score on chain."}
      </p>

      <Link
        href="/2048"
        className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium hover:underline"
        style={{ color: "var(--text-secondary)" }}
      >
        Open 2048
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </BentoCard>
  );
}
