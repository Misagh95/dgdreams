"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  User,
  Gamepad2,
  Menu,
  X,
  Zap,
  Star,
  Trophy,
  HelpCircle,
  BookOpen,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks", icon: Zap, label: "Daily Tasks" },
  { href: "/litevm", icon: Star, label: "LiteVM Points" },
  { href: "/activity", icon: Activity, label: "Activity" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/2048", icon: Gamepad2, label: "2048 Game" },
];

const bottomLinks = [
  { href: "/faq", icon: HelpCircle, label: "FAQ" },
  { href: "/terms", icon: BookOpen, label: "Terms" },
  { href: "/license", icon: Scale, label: "License" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4"
        style={{
          background: "color-mix(in srgb, var(--bg-base) 90%, transparent)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border-default)",
        }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
            <Image src="/logo.svg" alt="DGDreams" width={20} height={20} />
          </div>
          <span className="font-bold text-sm" style={{ color: "var(--accent)" }}>DGDreams</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "var(--bg-strong)", border: "1px solid var(--border-strong)", color: "var(--text-tertiary)" }}
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-full w-64 z-50 flex flex-col"
              style={{
                background: "color-mix(in srgb, var(--bg-elevated) 98%, transparent)",
                backdropFilter: "blur(24px)",
                borderRight: "1px solid var(--border-default)",
              }}
            >
              <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--border-default)" }}>
                <div className="flex items-center gap-2">
                  <Image src="/logo.svg" alt="DGDreams" width={22} height={22} />
                  <span className="font-bold" style={{ color: "var(--accent)" }}>DGDreams</span>
                </div>
                <button onClick={() => setOpen(false)} style={{ color: "var(--text-tertiary)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-0.5 p-4 flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const isGame = item.href === "/2048";
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                      <div className={cn("nav-item", isActive && "active", isGame && "mt-2")}
                        style={isGame ? {
                          background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                          color: "var(--accent)",
                        } : {}}>
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                        {isGame && <span className="ml-auto badge-cyan text-[9px]">Game</span>}
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom links */}
              <div className="p-4 border-t" style={{ borderColor: "var(--border-default)" }}>
                {bottomLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 py-2 px-2 rounded-lg text-xs transition-all"
                      style={{ color: "var(--text-quaternary)" }}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
