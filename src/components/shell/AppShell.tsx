"use client";

import type { ReactNode } from "react";

import { ActiveNetworkProvider } from "@/lib/activeNetwork";
import AppRail from "@/components/shell/AppRail";
import ScoreRail from "@/components/shell/ScoreRail";
import MobileNav from "@/components/MobileNav";
import SiteFooter from "@/components/SiteFooter";

/**
 * The three-zone layout.
 *
 *   rail (64px)  │  centre column  │  score rail (260px)
 *
 * The centre column is the only one that scrolls with the page. The rails
 * are sticky, so the navigation and the score are always one glance away
 * without repeating them on every card.
 */
export default function AppShell({
  children,
  /** widen the centre column when a page has no right rail of its own */
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <ActiveNetworkProvider>
      <div className="min-h-screen flex">
        <AppRail />

        <div className="flex-1 min-w-0 flex flex-col">
          <MobileNav />

          <main
            className={`flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-28 lg:pb-10 ${
              wide ? "" : "xl:mr-6"
            }`}
          >
            <div
              className={
                wide
                  ? "mx-auto w-full"
                  : "mx-auto w-full max-w-[1040px] xl:max-w-none"
              }
            >
              {children}
            </div>
          </main>

          <SiteFooter />
        </div>

        {!wide ? <ScoreRail /> : null}
      </div>
    </ActiveNetworkProvider>
  );
}
