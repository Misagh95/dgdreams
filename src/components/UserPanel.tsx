"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  MessageCircle,
  Trophy,
  Flame,
  Star,
  TrendingUp,
  Shield,
  Zap,
  Link2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Copy,
  ExternalLink,
  GitBranch,
  AtSign,
} from "lucide-react";
import { cn, shortenAddress } from "@/lib/utils";
import WalletModal from "./WalletModal";
import { useAccount } from "wagmi";

const SOCIAL_PLATFORMS = [
  { key: "x", label: "X / Twitter", icon: AtSign, color: "#00d4ff", urlPrefix: "https://x.com/" },
  { key: "discord", label: "Discord", icon: MessageCircle, color: "#7289da", urlPrefix: "" },
  { key: "github", label: "GitHub", icon: GitBranch, color: "#6e7681", urlPrefix: "https://github.com/" },
];

const achievements = [
  { icon: "🔥", label: "7-Day Streak", color: "#ff6b00" },
  { icon: "🌐", label: "Multi-Chain", color: "#8b5cf6" },
  { icon: "💎", label: "Diamond Hands", color: "#00ccff" },
  { icon: "🚀", label: "Early Adopter", color: "#00ff88" },
];

const chainStats = [
  { chain: "Ethereum", txCount: 0, color: "#627eea" },
  { chain: "Base", txCount: 0, color: "#0052ff" },
  { chain: "HyperEVM", txCount: 0, color: "#FF6B6B" },
  { chain: "Ink", txCount: 0, color: "#0052ff" },
];

export default function UserPanel() {
  const { address, isConnected } = useAccount();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [linkingPlatform, setLinkingPlatform] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [socialHandles, setSocialHandles] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("voidchain-socials") || "{}");
    } catch { return {}; }
  });

  const toggleSection = (s: string) => {
    setExpandedSection(expandedSection === s ? null : s);
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const saveSocial = (key: string) => {
    const handle = linkInput.trim();
    if (!handle) return;
    const updated = { ...socialHandles, [key]: handle };
    setSocialHandles(updated);
    localStorage.setItem("voidchain-socials", JSON.stringify(updated));
    setLinkingPlatform(null);
    setLinkInput("");
  };

  const removeSocial = (key: string) => {
    const updated = { ...socialHandles };
    delete updated[key];
    setSocialHandles(updated);
    localStorage.setItem("voidchain-socials", JSON.stringify(updated));
  };

  const connectedCount = SOCIAL_PLATFORMS.filter((p) => socialHandles[p.key]).length;

  return (
    <>
      <aside className="fixed right-0 top-0 h-full w-72 z-40 overflow-y-auto hidden xl:block">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060d1a]/95 via-[#0a1628]/95 to-[#060d1a]/95 backdrop-blur-xl border-l border-[#1a3a5c]/40" />

        <div className="relative p-4 flex flex-col gap-4">
          {/* User Identity */}
          <div className="glass-panel p-4 rounded-xl mt-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{
                    background: isConnected
                      ? "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))"
                      : "rgba(26,58,92,0.3)",
                    border: isConnected ? "2px solid rgba(0,212,255,0.3)" : "2px solid rgba(26,58,92,0.3)",
                    boxShadow: isConnected ? "0 0 20px rgba(0,212,255,0.15)" : "none",
                  }}>
                  {isConnected ? "🌌" : "👤"}
                </div>
                {isConnected && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#060d1a] bg-[#00ff88]"
                    style={{ boxShadow: "0 0 6px rgba(0,255,136,0.6)" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#e2e8f0] text-sm truncate">
                  {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : "Guest"}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isConnected ? (
                    <span className="badge-cyan text-[10px] py-0">Connected</span>
                  ) : (
                    <span className="text-[10px] text-[#475569] font-mono">Wallet not connected</span>
                  )}
                </div>
              </div>
            </div>

            {/* Streak Hero */}
            <div className="rounded-xl p-3 mb-3"
              style={{
                background: "linear-gradient(135deg, rgba(255,107,0,0.1), rgba(255,68,68,0.08))",
                border: "1px solid rgba(255,107,0,0.2)",
              }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" style={{ filter: "drop-shadow(0 0 6px rgba(255,107,0,0.6))" }} />
                  <div>
                    <div className="text-[10px] text-[#475569] font-mono uppercase tracking-widest">Current Streak</div>
                    <div className="text-2xl font-bold text-orange-400" style={{ textShadow: "0 0 10px rgba(255,107,0,0.5)" }}>
                      0 <span className="text-base font-normal text-orange-500">days</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#475569] font-mono">Best</div>
                  <div className="text-lg font-bold text-[#ffaa00]">0</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Points", value: "0", icon: Star, color: "#ffaa00" },
                { label: "Actions", value: "0", icon: Zap, color: "#00d4ff" },
                { label: "Chains", value: "0", icon: TrendingUp, color: "#8b5cf6" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center rounded-lg p-2"
                    style={{ background: "rgba(10,22,40,0.6)", border: "1px solid rgba(26,58,92,0.4)" }}>
                    <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: stat.color }} />
                    <div className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="text-[10px] text-[#334155] font-mono">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wallets Section */}
          <div className="glass-panel rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection("wallets")}
              className="w-full flex items-center justify-between p-3 hover:bg-[rgba(0,212,255,0.04)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#00d4ff]" />
                <span className="text-sm font-semibold text-[#e2e8f0]">Wallet</span>
                {isConnected && <span className="badge-cyan text-[10px] py-0">1</span>}
              </div>
              {expandedSection === "wallets" ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
            </button>

            <AnimatePresence>
              {expandedSection === "wallets" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 flex flex-col gap-2">
                    {isConnected && address ? (
                      <div className="rounded-lg p-2.5"
                        style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.5)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="status-dot status-dot-green" style={{ width: 6, height: 6 }} />
                            <span className="badge-cyan text-[10px] py-0">Connected</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyAddress(address)}
                              className="p-1 hover:text-[#00d4ff] text-[#475569] transition-colors"
                            >
                              {copiedAddress === address
                                ? <CheckCircle2 className="w-3 h-3 text-[#00ff88]" />
                                : <Copy className="w-3 h-3" />
                              }
                            </button>
                            <button className="p-1 hover:text-[#00d4ff] text-[#475569] transition-colors">
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="font-mono text-[11px] text-[#64748b] mb-1">
                          {shortenAddress(address, 6)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <p className="text-xs text-[#475569] font-mono mb-2">No wallet connected</p>
                        <button className="btn-primary w-full py-2 text-xs">Connect Wallet</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Social Accounts */}
          <div className="glass-panel rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection("social")}
              className="w-full flex items-center justify-between p-3 hover:bg-[rgba(0,212,255,0.04)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#8b5cf6]" />
                <span className="text-sm font-semibold text-[#e2e8f0]">Social Accounts</span>
                <span className="badge-green text-[10px] py-0">{connectedCount}/{SOCIAL_PLATFORMS.length}</span>
              </div>
              {expandedSection === "social" ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
            </button>

            <AnimatePresence>
              {expandedSection === "social" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 flex flex-col gap-2">
                    {SOCIAL_PLATFORMS.map((platform) => {
                      const Icon = platform.icon;
                      const handle = socialHandles[platform.key];
                      return (
                        <div key={platform.key} className="flex flex-col gap-2 rounded-lg p-2.5"
                          style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.5)" }}>
                          {linkingPlatform === platform.key ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-[#94a3b8] font-mono">
                                  {platform.label} handle:
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {platform.urlPrefix && (
                                  <span className="text-[10px] text-[#475569] font-mono shrink-0">{platform.urlPrefix}</span>
                                )}
                                <input
                                  value={linkInput}
                                  onChange={(e) => setLinkInput(e.target.value)}
                                  placeholder={platform.key === "discord" ? "username#0000" : "username"}
                                  className="flex-1 bg-[#060d1a] border border-[#1a3a5c]/60 rounded px-2 py-1.5 text-xs text-[#e2e8f0] font-mono outline-none focus:border-[#00d4ff]/50"
                                  autoFocus
                                  onKeyDown={(e) => e.key === "Enter" && saveSocial(platform.key)}
                                />
                                <button onClick={() => saveSocial(platform.key)}
                                  className="btn-primary text-[11px] py-1.5 px-2 rounded">Save</button>
                                <button onClick={() => { setLinkingPlatform(null); setLinkInput(""); }}
                                  className="text-[11px] py-1.5 px-2 rounded text-[#475569] hover:text-[#94a3b8]">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: `${platform.color}22`, border: `1px solid ${platform.color}44` }}>
                                <Icon className="w-3.5 h-3.5" style={{ color: platform.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-[#475569] font-mono">{platform.label}</div>
                                <div className="text-xs font-medium truncate"
                                  style={{ color: handle ? platform.color : "#475569" }}>
                                  {handle || "Not connected"}
                                </div>
                              </div>
                              {handle ? (
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                                  <button onClick={() => removeSocial(platform.key)}
                                    className="text-[11px] py-1 px-2 rounded text-[#475569] hover:text-[#ff4444]">Remove</button>
                                </div>
                              ) : (
                                <button onClick={() => setLinkingPlatform(platform.key)}
                                  className="btn-primary text-[11px] py-1 px-2 rounded flex-shrink-0">Link</button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Achievements */}
          <div className="glass-panel p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-[#ffaa00]" />
              <span className="text-sm font-semibold text-[#e2e8f0]">Achievements</span>
              <span className="badge-amber text-[10px] py-0">0</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {achievements.map((ach) => (
                <motion.div
                  key={ach.label}
                  className="flex flex-col items-center gap-1 rounded-lg p-2 cursor-default opacity-40"
                  style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.4)" }}
                  title={ach.label}
                >
                  <span className="text-lg leading-none">{ach.icon}</span>
                  <span className="text-[9px] text-[#475569] text-center leading-tight font-mono">{ach.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Chain Activity */}
          <div className="glass-panel p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[#00d4ff]" />
              <span className="text-sm font-semibold text-[#e2e8f0]">Chain Activity</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {chainStats.map((stat) => {
                return (
                  <div key={stat.chain}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#64748b] font-mono">{stat.chain}</span>
                      <span className="text-xs font-bold" style={{ color: stat.color }}>0 txs</span>
                    </div>
                    <div className="progress-bar">
                      <div className="h-full rounded-full"
                        style={{ width: "0%", background: `linear-gradient(90deg, ${stat.color}88, ${stat.color})` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </>
  );
}
