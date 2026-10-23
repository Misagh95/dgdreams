"use client";

import AppShell from "@/components/shell/AppShell";
import TodayHero from "@/components/ritual/TodayHero";
import NetworkStatusCard from "@/components/ritual/NetworkStatusCard";
import BadgeCard from "@/components/ritual/BadgeCard";
import RankCard from "@/components/ritual/RankCard";
import PlayCard from "@/components/ritual/PlayCard";
import { BentoGrid } from "@/components/ui/Bento";

/**
 * Today.
 *
 * One hero, then a small grid of consequences. The old page had a status
 * header, four stat cards, a chain grid, a rotating cube, a 2048 card and a
 * terminal status bar — fourteen competing things for a job that takes sixty
 * seconds.
 */
export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-6">
        <TodayHero />

        <BentoGrid>
          {/* the network strip spans the full width — it is a strip, not a card */}
          <div className="md:col-span-2 xl:col-span-3">
            <NetworkStatusCard />
          </div>
          <BadgeCard />
          <RankCard />
          <PlayCard />
        </BentoGrid>
      </div>
    </AppShell>
  );
}
