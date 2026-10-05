"use client";

import { type ReactNode } from "react";
import SpaceBackground from "./SpaceBackground";
import Sidebar from "./Sidebar";
import UserPanel from "./UserPanel";
import TopBar from "./TopBar";
import MobileNav from "./MobileNav";
import SiteFooter from "./SiteFooter";
import NetworkRail from "./NetworkRail";
import { ActiveNetworkProvider } from "@/lib/activeNetwork";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <ActiveNetworkProvider>
      <div className="min-h-screen relative" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        {/* Animated space background */}
        <SpaceBackground />

        {/* Mobile Navigation */}
        <MobileNav />

        {/* Left Sidebar - desktop only */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Network rail - sits right next to the sidebar, always visible */}
        <NetworkRail />

        {/* Right User Panel - desktop only */}
        <div className="hidden xl:block">
          <UserPanel />
        </div>

        {/* Main content area — offset by the sidebar + rail on desktop, and by
            the horizontal rail strip on mobile. */}
        <main className="relative z-10 lg:ml-[340px] xl:mr-72 min-h-screen flex flex-col">
          {/* Top Bar */}
          <div className="sticky top-0 z-30 backdrop-blur-xl pt-14 lg:pt-0"
            style={{ background: "color-mix(in srgb, var(--bg-base) 80%, transparent)" }}>
            <TopBar title={title} subtitle={subtitle} />
          </div>

          {/* Page content */}
          <div className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto">
            {children}
          </div>

          {/* Site footer */}
          <SiteFooter />
        </main>
      </div>
    </ActiveNetworkProvider>
  );
}
