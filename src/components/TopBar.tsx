"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Search, Circle } from "lucide-react";
import ThemeSwitcher from "./ThemeSwitcher";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <div className="flex items-center justify-between h-16 px-4 lg:px-6"
      style={{ borderBottom: "1px solid var(--border-default)" }}>
      {/* Left: System Status + Title */}
      <div className="flex items-center gap-4">
        {/* System Status */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-default)" }}>
          <div className="flex items-center gap-1.5">
            <Circle className="w-2 h-2 fill-[var(--success)] text-[var(--success)]"
              style={{ filter: "drop-shadow(0 0 4px var(--success))" }} />
            <span className="text-[10px] font-mono font-semibold" style={{ color: "var(--success)" }}>ONLINE</span>
          </div>
          <span className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>
            <span style={{ color: "var(--accent)" }}>24ms</span> · Block <span style={{ color: "var(--accent)" }}>#21.4M</span>
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-base lg:text-lg font-bold tracking-tight" style={{ color: "var(--text-bright)" }}>{title}</h1>
          {subtitle && <p className="text-[10px] font-mono hidden sm:block" style={{ color: "var(--text-tertiary)" }}>{subtitle}</p>}
        </div>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-faint)" }} />
          <input
            className="input-terminal pl-8 py-2 text-xs"
            placeholder="Search chains, txs, wallets..."
          />
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <ConnectButton
          accountStatus="address"
          chainStatus="icon"
          showBalance={false}
        />
      </div>
    </div>
  );
}
