"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { TasksSection } from "@/components/sections/TasksSection";

export default function TasksPage() {
  return (
    <DashboardLayout title="Daily Tasks" subtitle="// your daily on-chain ritual">
      <TasksSection />
    </DashboardLayout>
  );
}
