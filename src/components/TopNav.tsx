"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  Trophy,
  Globe,
  ArrowDownUp,
  Terminal,
  Gamepad2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeSwitcher from "./ThemeSwitcher";
import { ConnectButton } from "@rainbow-me/rainbowkit";

/* ---------------------------------------------
   TopNav — a horizontal nav strip in the header:
   logo on the left, links across, scrolling
   sideways when the viewport is too narrow.
   --------------------------------------------- */

const navItems = [
  { href: "/app", icon: Terminal, label: "Terminal", badge: "All", color: "#00D4FF" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", badge: null, color: "#6F75E5" },
  { href: "/tasks", icon: Zap, label: "Daily Tasks", badge: "14", color: "#F59E0B" },
  { href: "/swap", icon: ArrowDownUp, label: "Swap", badge: "New", color: "#00D4AA" },
  { href: "/genlayer", icon: Globe, label: "GenLayer Hub", badge: "AI", color: "#3B82F6" },
  { href: "/truthcourt", icon: Terminal, label: "TruthCourt", badge: "AI", color: "#A78BFA" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard", badge: null, color: "#FFB020" },
  { href: "/2048", icon: Gamepad2, label: "2048", badge: null, color: "#FF6B6B" },
  { href: "/sybil", icon: ShieldCheck, label: "Risk", badge: null, color: "#00B17E" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <div
      className="flex items-center gap-3 px-4 lg:px-5 h-14"
      style={{ borderBottom: "1px solid var(--border-default)" }}
    >
      {/* Logo */}
      <Link href="/app" className="flex items-center gap-2.5 flex-shrink-0">
        <div
          className="relative w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
        >
          <Image src="/logo.svg" alt="DGDreams" width={22} height={22} />
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
            style={{ background: "var(--success)", boxShadow: "0 0 6px var(--success)" }}
          />
        </div>
        <span className="hidden sm:block leading-tight">
          <span
            className="block font-bold text-sm tracking-wide"
            style={{ color: "var(--text-bright)" }}
          >
            DGDreams
          </span>
          <span
            className="block text-[8px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "var(--text-quaternary)" }}
          >
            Terminal v2.1
          </span>
        </span>
      </Link>

      {/* Links — scroll horizontally rather than wrapping on narrow screens */}
      <nav
        className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0"
        style={{ scrollbarWidth: "none" }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
                active ? "" : "opacity-75 hover:opacity-100"
              )}
              style={
                active
                  ? {
                      background: `color-mix(in srgb, ${item.color} 16%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${item.color} 42%, transparent)`,
                      color: item.color,
                    }
                  : { color: "var(--text-secondary)" }
              }
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className="text-[8px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${item.color} 14%, transparent)`,
                    color: item.color,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right — theme toggle and the wallet button, pinned to the edge so the
          nav scrolls between the logo and these instead of pushing them off. */}
      <div className="flex items-center gap-2 flex-shrink-0 pl-2">
        <ThemeSwitcher />
        <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
      </div>
    </div>
  );
}
