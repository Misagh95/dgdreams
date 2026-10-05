"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { SwapSection } from "@/components/sections/SwapSection";

export default function SwapPage() {
  return (
    <DashboardLayout title="Swap" subtitle="// token exchange via LI.FI aggregation">
      <SwapSection />
    </DashboardLayout>
  );
}
