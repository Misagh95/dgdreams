"use client";

import { type ReactNode } from "react";
import SpaceBackground from "./SpaceBackground";
import TopNav from "./TopNav";
import MobileNav from "./MobileNav";
import SiteFooter from "./SiteFooter";
import NetworkRail from "./NetworkRail";
import { ActiveNetworkProvider } from "@/lib/activeNetwork";

interface DashboardLayoutProps {
  children: ReactNode;
  /**
   * Kept optional for callers that pass it, but no longer rendered: the title
   * and subtitle used to live in the top bar, and the horizontal nav replaced
   * it. Each page already names itself inside its own content.
   */
  title?: string;
  subtitle?: string;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ActiveNetworkProvider>
      <div className="min-h-screen relative" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        {/* Animated space background */}
        <SpaceBackground />

        {/* Mobile Navigation */}
        <MobileNav />

        {/* Page shell — the nav is a horizontal strip across the top, so the
            content is full width and only needs to clear the mobile bar. */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <div
            className="sticky top-0 z-30 backdrop-blur-xl pt-14 lg:pt-0"
            style={{ background: "color-mix(in srgb, var(--bg-base) 80%, transparent)" }}
          >
            <TopNav />
          </div>

          {/* Network rail — a horizontal strip of chain logos under the nav */}
          <NetworkRail />

          {/* Page content */}
          <div className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">{children}</div>

          {/* Site footer */}
          <SiteFooter />
        </div>
      </div>
    </ActiveNetworkProvider>
  );
}
