"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { TasksSection } from "@/components/sections/TasksSection";

export default function TasksPage() {
  return (
    <DashboardLayout title="Daily Tasks" subtitle="// your daily on-chain ritual">
      <div className="space-y-5">
        <div>
          <p className="kicker mb-1.5">Daily ritual</p>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text-bright)" }}>
            Daily Tasks
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Check-in, GM and GN on any supported network. Resets at 00:00 UTC.
          </p>
        </div>
        <TasksSection />
      </div>
    </DashboardLayout>
  );
}
