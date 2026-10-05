"use client";

import { type ReactNode } from "react";
import { ArrowDownUp } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { TasksSection } from "@/components/sections/TasksSection";
import { SwapSection } from "@/components/sections/SwapSection";

/* -------------------------------------------------------------
   /app - Terminal. Two cards across the top (daily check,
   swap), then the work split in two columns: daily missions
   on the wide side, swap on the narrow side.
   ------------------------------------------------------------- */

/** Narrow-column section: compact header + body. */
function SideSection({
  id,
  title,
  icon,
  color,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  color: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl overflow-hidden scroll-mt-28"
      style={{ border: "1px solid var(--border-default)" }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{
          background: `linear-gradient(90deg, color-mix(in srgb, ${color} 12%, transparent) 0%, transparent 70%)`,
          borderLeft: `3px solid ${color}`,
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: `color-mix(in srgb, ${color} 18%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
            color,
          }}
        >
          {icon}
        </span>
        <h2 className="text-sm font-bold tracking-tight" style={{ color: "var(--text-bright)" }}>
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}



export default function AppPage() {
  return (
    <DashboardLayout title="Terminal" subtitle="// daily missions · swap — one page">
      {/* Two columns: missions wide, swap narrow. The swap column is pinned to
          the right by giving the grid a fixed side column, so both cards line
          up at the same top edge and the same height. */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
        <section id="daily-tasks" className="scroll-mt-28 space-y-6">
          <div>
            <h2
              className="text-sm font-bold tracking-tight"
              style={{ color: "var(--text-bright)" }}
            >
              Daily missions
            </h2>
            <p className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              Run GM · Check · GN, then mint your soulbound badge
            </p>
          </div>
          <TasksSection />
        </section>

        <div className="space-y-6">
          <SideSection
            id="swap"
            title="Swap"
            icon={<ArrowDownUp className="w-4 h-4" />}
            color="#00D4AA"
          >
            <SwapSection />
          </SideSection>
        </div>
      </div>
    </DashboardLayout>
  );
}
