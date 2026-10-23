"use client";

import AppShell from "@/components/shell/AppShell";
import TodayHero from "@/components/ritual/TodayHero";
import { TasksSection } from "@/components/sections/TasksSection";

/**
 * The ritual.
 *
 * The three daily missions live in the hero, not in a grid of fourteen cards
 * below it. What is left on this page is the deeper tooling: the six-in-one
 * run, the standalone counter, and the badge.
 */
export default function TasksPage() {
  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-6">
        <TodayHero variant="compact" />
        <TasksSection />
      </div>
    </AppShell>
  );
}
