"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { DeploySection } from "@/components/sections/DeploySection";

export default function DeployPage() {
  return (
    <DashboardLayout title="Deploy" subtitle="// put a contract on-chain from your own wallet">
      <DeploySection />
    </DashboardLayout>
  );
}
