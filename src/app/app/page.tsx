"use client";

import { type ReactNode } from "react";
import { ArrowDownUp, Rocket, Zap } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { TasksSection } from "@/components/sections/TasksSection";
import { SwapSection } from "@/components/sections/SwapSection";
import { DeploySection } from "@/components/sections/DeploySection";

/* ─────────────────────────────────────────────
   /app — Daily tasks, swap and deploy on one
   page, under fixed headers, with the network
   chosen from the rail on the left edge.
   ───────────────────────────────────────────── */

function SectionHeader({
  id,
  index,
  title,
  subtitle,
  icon,
  color,
}: {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <div
      id={id}
      className="flex items-center gap-3 px-4 py-3 scroll-mt-24"
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
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>
            {index}
          </span>
          <h2 className="text-sm font-bold tracking-tight" style={{ color: "var(--text-bright)" }}>
            {title}
          </h2>
        </div>
        <p className="text-[10px] font-mono truncate" style={{ color: "var(--text-tertiary)" }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export default function AppPage() {
  return (
    <DashboardLayout title="Terminal" subtitle="// daily tasks · swap · deploy — one page">
      <div className="space-y-6 max-w-5xl">
        {/* 01 — Daily tasks */}
        <section className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
          <SectionHeader
            id="daily-tasks"
            index="01"
            title="Daily Tasks"
            subtitle="GM · Check · GN once per UTC day, plus the soulbound badge"
            icon={<Zap className="w-4 h-4" />}
            color="#F59E0B"
          />
          <div className="p-4 lg:p-5">
            <TasksSection />
          </div>
        </section>

        {/* 02 — Swap */}
        <section className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
          <SectionHeader
            id="swap"
            index="02"
            title="Swap"
            subtitle="Token exchange on the network picked in the left rail"
            icon={<ArrowDownUp className="w-4 h-4" />}
            color="#00D4AA"
          />
          <div className="p-4 lg:p-5">
            <SwapSection />
          </div>
        </section>

        {/* 03 — Deploy */}
        <section className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
          <SectionHeader
            id="deploy"
            index="03"
            title="Deploy"
            subtitle="Put a contract on-chain from your own wallet"
            icon={<Rocket className="w-4 h-4" />}
            color="#F97316"
          />
          <div className="p-4 lg:p-5">
            <DeploySection />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
