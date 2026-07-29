"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  User,
  Gamepad2,
  Zap,
  Star,
  ChevronRight,
  HelpCircle,
  Scale,
  Gauge,
  Trophy,
  BookOpen,
  Globe,
  Shield,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", badge: null },
  { href: "/tasks", icon: Zap, label: "Daily Tasks", badge: "14" },
  { href: "/litevm", icon: Star, label: "LiteVM Hub", badge: null },
  { href: "/activity", icon: Activity, label: "Activity", badge: null },
  { href: "/profile", icon: User, label: "Profile", badge: null },
];

const infoLinks = [
  { href: "/faq", icon: HelpCircle, label: "FAQ" },
  { href: "/terms", icon: BookOpen, label: "Terms" },
  { href: "/license", icon: Scale, label: "License" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (pathname === "/" && href === "/dashboard");

  return (
    <aside className="fixed left-0 top-0 h-full w-64 z-40 flex flex-col">
      <div className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, color-mix(in srgb, var(--bg-base) 98%, transparent) 0%, var(--bg-elevated) 100%)",
          backdropFilter: "blur(24px)",
          borderRight: "1px solid var(--border-default)",
        }} />

      <div className="relative flex flex-col h-full p-4">
        {/* Logo */}
        <div className="mb-8 px-1 pt-3">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative glow-border">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                style={{
                  background: "var(--bg-card)",
                }}>
                <Image src="/logo.svg" alt="DGDreams" width={28} height={28} />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />
            </div>
            <div>
              <div className="font-bold text-base tracking-wide" style={{ color: "var(--text-bright)" }}>
                DGDreams
              </div>
              <div className="text-[9px] font-mono tracking-widest uppercase" style={{ color: "var(--text-quaternary)" }}>
                Terminal v2.1
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="px-1 mb-2">
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: "var(--text-quaternary)" }}>
            Navigation
          </span>
        </div>

        <nav className="flex flex-col gap-0.5 mb-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className={cn("nav-item text-sm", active && "active")}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="badge-cyan text-[9px] py-0.5">{item.badge}</span>
                  )}
                  {active && <ChevronRight className="w-3 h-3 opacity-40" />}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="h-px mb-4" style={{ background: "linear-gradient(90deg, transparent, var(--border-default), transparent)" }} />

        {/* Mini Game */}
        <div className="px-1 mb-2">
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: "var(--text-quaternary)" }}>
            Mini Game
          </span>
        </div>

        <Link href="/2048">
          <motion.div
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="relative rounded-xl p-4 cursor-pointer overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, transparent) 0%, color-mix(in srgb, #4F46E5 8%, transparent) 100%)",
              border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
            }}
          >
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                }}>
                <Gamepad2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm" style={{ color: "var(--text-bright)" }}>2048 Game</div>
                <div className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>On-chain scoring</div>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: "var(--accent)" }} />
            </div>
          </motion.div>
        </Link>

        {/* GenLayer */}
        <div className="px-1 mb-2">
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: "var(--text-quaternary)" }}>
            GenLayer
          </span>
        </div>

        <Link href="/genlayer-oracle">
          <motion.div
            whileHover={{ x: 2 }}
            className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-xs transition-all mb-3"
            style={{
              color: "var(--text-secondary)",
              background: pathname === "/genlayer-oracle" ? "var(--bg-strong)" : "transparent",
              border: pathname === "/genlayer-oracle" ? "1px solid color-mix(in srgb, #00D4FF 20%, transparent)" : "1px solid transparent",
            }}
          >
            <Globe className="w-3.5 h-3.5" style={{ color: "#00D4FF" }} />
            <span className="flex-1">Oracle</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, #00D4FF 15%, transparent)", color: "#00D4FF" }}>
              AI
            </span>
          </motion.div>
        </Link>

        <Link href="/genlayer-escrow">
          <motion.div
            whileHover={{ x: 2 }}
            className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-xs transition-all mb-3"
            style={{
              color: "var(--text-secondary)",
              background: pathname === "/genlayer-escrow" ? "var(--bg-strong)" : "transparent",
              border: pathname === "/genlayer-escrow" ? "1px solid color-mix(in srgb, #8B5CF6 20%, transparent)" : "1px solid transparent",
            }}
          >
            <Shield className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
            <span className="flex-1">Escrow</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, #8B5CF6 15%, transparent)", color: "#8B5CF6" }}>
              AI
            </span>
          </motion.div>
        </Link>

        <Link href="/genlayer-market">
          <motion.div
            whileHover={{ x: 2 }}
            className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-xs transition-all mb-3"
            style={{
              color: "var(--text-secondary)",
              background: pathname === "/genlayer-market" ? "var(--bg-strong)" : "transparent",
              border: pathname === "/genlayer-market" ? "1px solid color-mix(in srgb, #F59E0B 20%, transparent)" : "1px solid transparent",
            }}
          >
            <BarChart3 className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
            <span className="flex-1">Markets</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, #F59E0B 15%, transparent)", color: "#F59E0B" }}>
              AI
            </span>
          </motion.div>
        </Link>

        {/* Info Links */}
        <div className="mt-auto pt-4">
          <div className="flex flex-col gap-0.5">
            {infoLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}
                  className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-xs transition-all"
                  style={{ color: "var(--text-quaternary)" }}>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Bottom System Status */}
          <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-quaternary)" }}>
                System
              </span>
              <div className="flex items-center gap-1.5">
                <div className="status-dot status-dot-green" style={{ width: 5, height: 5 }} />
                <span className="text-[9px] font-mono" style={{ color: "var(--success)" }}>Online</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div>
                <span style={{ color: "var(--text-quaternary)" }}>Latency</span>
                <div style={{ color: "var(--accent)" }}>24ms</div>
              </div>
              <div>
                <span style={{ color: "var(--text-quaternary)" }}>Block</span>
                <div style={{ color: "var(--accent)" }}>#21.4M</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
