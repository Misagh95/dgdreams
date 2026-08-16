"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import GenLayerSpinner from "@/components/GenLayerSpinner";
import { isGenLayerChain } from "@/lib/genlayer/client";
import { Globe, Shield, BarChart3, ExternalLink } from "lucide-react";

const TABS = [
  { id: "oracle", label: "Oracle", icon: Globe, color: "#00D4FF" },
  { id: "escrow", label: "Escrow", icon: Shield, color: "#8B5CF6" },
  { id: "markets", label: "Markets", icon: BarChart3, color: "#F59E0B" },
];

const TAB_CONTENT: Record<string, { href: string; desc: string; badge: string }> = {
  oracle: { href: "/genlayer-oracle", desc: "AI-powered price oracle that fetches live asset prices from Binance via GenLayer validators", badge: "AI" },
  escrow: { href: "/genlayer-escrow", desc: "Secure AI escrow for freelance, NFT, DAO, and domain deals with dispute resolution", badge: "AI" },
  markets: { href: "/genlayer-market", desc: "Just a question + YES/NO — resolved by AI validators with live price data", badge: "AI" },
};

export default function GenLayerHubPage() {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [tab, setTab] = useState("oracle");
  const onGenLayer = isGenLayerChain(chainId ?? 0);
  const waitingForGenLayer = !onGenLayer;

  return (
    <DashboardLayout title="GenLayer Hub">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <GenLayerSpinner
            size={20}
            animated={waitingForGenLayer || isSwitching}
            color={onGenLayer ? "#00D4FF" : "#6D6AFF"}
            label={waitingForGenLayer ? "Waiting for GenLayer network" : "GenLayer"}
          />
          <h1 className="text-lg font-mono font-semibold" style={{ color: "var(--text-primary)" }}>GenLayer Hub</h1>
          {waitingForGenLayer && isConnected ? (
            <button
              type="button"
              onClick={() => switchChain({ chainId: 4221 })}
              disabled={isSwitching}
              className="text-[9px] px-1.5 py-0.5 rounded-full font-mono transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: "color-mix(in srgb, #6D6AFF 15%, transparent)", color: "#8B89FF", border: "1px solid color-mix(in srgb, #6D6AFF 24%, transparent)" }}
            >
              {isSwitching ? "Switching..." : "Switch to Bradbury"}
            </button>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: `color-mix(in srgb, ${onGenLayer ? "#00D4FF" : "var(--text-quaternary)"} 15%, transparent)`, color: onGenLayer ? "#00D4FF" : "var(--text-quaternary)" }}>
              {onGenLayer ? "Bradbury connected" : "Awaiting wallet"}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono transition-all flex-1 justify-center"
                style={{
                  background: tab === t.id ? "var(--bg)" : "transparent",
                  color: tab === t.id ? t.color : "var(--text-quaternary)",
                  border: tab === t.id ? `1px solid color-mix(in srgb, ${t.color} 20%, transparent)` : "1px solid transparent",
                }}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
          {(() => {
            const content = TAB_CONTENT[tab];
            const Icon = TABS.find(t => t.id === tab)!.icon;
            const color = TABS.find(t => t.id === tab)!.color;
            return (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 20%, transparent)` }}>
                  <Icon className="w-8 h-8" style={{ color }} />
                </div>
                <h2 className="text-lg font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                  {TABS.find(t => t.id === tab)!.label}
                </h2>
                <p className="text-xs font-mono max-w-md mx-auto" style={{ color: "var(--text-quaternary)" }}>
                  {content.desc}
                </p>
                <div>
                  <Link href={content.href}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono transition-all hover:opacity-80"
                    style={{ background: color, color: "#000", border: "none" }}>
                    Open {TABS.find(t => t.id === tab)!.label}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Quick links to all GenLayer pages */}
        <div className="mt-8">
          <p className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color: "var(--text-quaternary)" }}>All GenLayer Pages</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TABS.map((t) => {
              const content = TAB_CONTENT[t.id];
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <Link key={t.id} href={content.href}
                  className="rounded-xl p-4 transition-all hover:opacity-80"
                  style={{
                    background: isActive ? "var(--bg-strong)" : "var(--bg)",
                    border: `1px solid ${isActive ? `color-mix(in srgb, ${t.color} 20%, transparent)` : "var(--border)"}`,
                  }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: t.color }} />
                    <span className="text-xs font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{t.label}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: `color-mix(in srgb, ${t.color} 15%, transparent)`, color: t.color }}>
                      AI
                    </span>
                  </div>
                  <p className="text-[10px] font-mono leading-relaxed" style={{ color: "var(--text-quaternary)" }}>
                    {content.desc.slice(0, 80)}...
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
