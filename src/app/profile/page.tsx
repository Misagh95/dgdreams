"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Flame,
  Star,
  CheckCircle2,
  Copy,
  ExternalLink,
  Save,
  Loader2,
  Mail,
  Send,
  MessageCircle,
  GitBranch,
  Globe,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAccount, useBalance, useEnsName } from "wagmi";
import { mainnet } from "viem/chains";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const SOCIAL_PLATFORMS = [
  { key: "gmail", label: "Gmail", icon: Mail, color: "#EA4335" },
  { key: "telegram", label: "Telegram", icon: Send, color: "#26A5E4" },
  { key: "twitter", label: "Twitter / X", icon: MessageCircle, color: "#1DA1F2" },
  { key: "discord", label: "Discord", icon: MessageCircle, color: "#5865F2" },
  { key: "github", label: "GitHub", icon: GitBranch, color: "#ffffff" },
];

export default function ProfilePage() {
  const { address, isConnected, chainId } = useAccount();
  const { data: balance } = useBalance({ address, chainId: chainId || mainnet.id });
  const { data: ensName } = useEnsName({ address });
  const [copied, setCopied] = useState(false);
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [socialsLoading, setSocialsLoading] = useState(false);
  const [socialsSaving, setSocialsSaving] = useState(false);
  const [socialSaved, setSocialSaved] = useState(false);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchSocials = useCallback(async () => {
    if (!address) return;
    setSocialsLoading(true);
    try {
      const res = await fetch(`/api/profile/socials?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        setSocials(data.socials || {});
      }
    } catch {} finally {
      setSocialsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) fetchSocials();
  }, [isConnected, fetchSocials]);

  const handleSocialChange = (platform: string, value: string) => {
    setSocials((prev) => ({ ...prev, [platform]: value }));
  };

  const handleSaveSocials = async () => {
    if (!address) return;
    setSocialsSaving(true);
    setSocialSaved(false);
    try {
      const res = await fetch("/api/profile/socials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, socials }),
      });
      if (res.ok) {
        setSocialSaved(true);
        setTimeout(() => setSocialSaved(false), 3000);
      }
    } catch {} finally {
      setSocialsSaving(false);
    }
  };

  return (
    <DashboardLayout title="Profile Hub" subtitle="// identity & reputation center">
      <div className="max-w-full space-y-6">

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-6 relative overflow-hidden"
          style={{ border: "1px solid rgba(0,212,255,0.15)" }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 opacity-5"
            style={{ background: "radial-gradient(circle at top right, #00d4ff, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 opacity-5"
            style={{ background: "radial-gradient(circle at bottom left, #8b5cf6, transparent 70%)" }} />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl"
                style={{
                  background: isConnected
                    ? "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))"
                    : "rgba(26,58,92,0.3)",
                  border: isConnected
                    ? "2px solid rgba(0,212,255,0.4)"
                    : "2px solid rgba(26,58,92,0.3)",
                  boxShadow: isConnected ? "0 0 30px rgba(0,212,255,0.15)" : "none",
                }}>
                {isConnected ? "🌌" : "👤"}
              </div>
              {isConnected && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#060d1a] bg-[#00ff88]"
                  style={{ boxShadow: "0 0 8px rgba(0,255,136,0.6)" }} />
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              {isConnected ? (
                <>
                  <h1 className="text-2xl font-black gradient-text-cyan">
                    {ensName || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                  </h1>
                  <div className="flex items-center gap-2 mt-2 mb-3">
                    <span className="badge-cyan text-[10px] py-0.5">Connected</span>
                    {chainId && (
                      <span className="badge-purple text-[10px] py-0.5">Chain #{chainId}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-[#64748b]">
                      {address?.slice(0, 8)}...{address?.slice(-6)}
                    </span>
                    <button
                      onClick={() => address && copyAddress(address)}
                      className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-colors text-[#475569] hover:text-[#00d4ff]"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-[#00ff88]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-black text-[#475569]">Welcome</h1>
                  <p className="text-sm text-[#64748b] font-mono mt-2 mb-4">
                    Connect your wallet to view your profile and on-chain identity
                  </p>
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <button
                        onClick={openConnectModal}
                        className="btn-primary px-6 py-3 text-sm flex items-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        Connect Wallet
                      </button>
                    )}
                  </ConnectButton.Custom>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 flex-shrink-0">
              {[
                { label: "Streak", value: "0", unit: "days", icon: Flame, color: "#ff6b00" },
                { label: "Points", value: "0", unit: "total", icon: Star, color: "#ffaa00" },
                { label: "Balance", value: isConnected && balance ? `${Number(balance.formatted).toFixed(4)}` : "—", unit: balance?.symbol || "ETH", icon: Wallet, color: "#00d4ff" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center p-3 rounded-xl"
                    style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.4)" }}>
                    <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: stat.color }} />
                    <div className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="text-[10px] text-[#334155] font-mono">{stat.unit}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Wallet Details */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-[#00d4ff]" />
              <span className="font-semibold text-sm text-[#e2e8f0]">Wallet Details</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.4)" }}>
                <span className="text-xs text-[#64748b] font-mono">Address</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#00d4ff]">
                    {address?.slice(0, 10)}...{address?.slice(-8)}
                  </span>
                  <button
                    onClick={() => address && copyAddress(address)}
                    className="p-1 hover:text-[#00d4ff] text-[#475569]"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff88]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={`https://etherscan.io/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:text-[#00d4ff] text-[#475569]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.4)" }}>
                <span className="text-xs text-[#64748b] font-mono">Network</span>
                <span className="text-xs font-mono text-[#00ff88]">Chain #{chainId}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.4)" }}>
                <span className="text-xs text-[#64748b] font-mono">Balance</span>
                <span className="text-xs font-bold text-[#ffaa00]">
                  {balance ? `${Number(balance.formatted).toFixed(6)} ${balance.symbol}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.4)" }}>
                <span className="text-xs text-[#64748b] font-mono">ENS</span>
                <span className="text-xs font-mono" style={{ color: ensName ? "#00d4ff" : "#475569" }}>
                  {ensName || "Not set"}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Social Accounts */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#00d4ff]" />
                <span className="font-semibold text-sm text-[#e2e8f0]">Social Accounts</span>
              </div>
              {socialSaved && (
                <span className="text-[10px] font-mono text-[#00ff88] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            {socialsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent)" }} />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, color }) => (
                  <div key={key}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.4)" }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${color} 15%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                      }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-[#e2e8f0]">{label}</label>
                      <input
                        type={key === "gmail" ? "email" : "text"}
                        value={socials[key] || ""}
                        onChange={(e) => handleSocialChange(key, e.target.value)}
                        placeholder={key === "gmail" ? "example@gmail.com" : key === "telegram" ? "@username" : key === "twitter" ? "@username" : key === "discord" ? "username#0000" : "username"}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg text-xs font-mono outline-none transition-colors"
                        style={{
                          background: "rgba(6,13,26,0.5)",
                          border: "1px solid rgba(26,58,92,0.6)",
                          color: "#cbd5e1",
                        }}
                        onFocus={(e) => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
                        onBlur={(e) => e.target.style.borderColor = "rgba(26,58,92,0.6)"}
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleSaveSocials}
                  disabled={socialsSaving}
                  className="flex items-center justify-center gap-2 w-full mt-2 py-3 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: "var(--accent)",
                    color: "white",
                    opacity: socialsSaving ? 0.6 : 1,
                  }}
                >
                  {socialsSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {socialsSaving ? "Saving..." : "Save Social Accounts"}
                </button>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </DashboardLayout>
  );
}
