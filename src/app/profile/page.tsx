"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Flame,
  Star,
  CheckCircle2,
  Copy,
  ExternalLink,
  Shield,
  Zap,
  TrendingUp,
  Calendar,
  Award,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAccount, useBalance, useEnsName } from "wagmi";
import { mainnet } from "viem/chains";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function ProfilePage() {
  const { address, isConnected, chainId } = useAccount();
  const { data: balance } = useBalance({ address, chainId: chainId || mainnet.id });
  const { data: ensName } = useEnsName({ address });
  const [copied, setCopied] = useState(false);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        {/* On-Chain Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#00d4ff]" />
            <span className="font-semibold text-sm text-[#e2e8f0]">On-Chain Statistics</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Txs", value: "0", icon: Zap, color: "#00d4ff" },
              { label: "Active Days", value: "0", icon: Calendar, color: "#00ff88" },
              { label: "Chains Active", value: "0", icon: TrendingUp, color: "#ffaa00" },
              { label: "Gas Spent", value: "$0", icon: Flame, color: "#ff6b00" },
              { label: "Points Earned", value: "0", icon: Star, color: "#ffaa00" },
              { label: "Achievements", value: "0", icon: Award, color: "#8b5cf6" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center p-3 rounded-xl"
                  style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.4)" }}>
                  <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
                  <div className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px] text-[#334155] font-mono mt-0.5">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#8b5cf6]" />
            <span className="font-semibold text-sm text-[#e2e8f0]">Preferences</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Email Notifications", value: "Disabled", status: false },
              { label: "Streak Reminders", value: "Off", status: false },
              { label: "Gas Price Alerts", value: "Off", status: false },
              { label: "Public Profile", value: "Visible", status: true },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.4)" }}>
                <div>
                  <div className="text-sm text-[#e2e8f0]">{pref.label}</div>
                  <div className="text-xs text-[#475569] font-mono mt-0.5">{pref.value}</div>
                </div>
                <div className="w-10 h-5 rounded-full relative cursor-pointer flex-shrink-0"
                  style={{ background: pref.status ? "rgba(0,212,255,0.3)" : "rgba(26,58,92,0.6)", border: "1px solid rgba(0,212,255,0.3)" }}>
                  <div className="absolute top-0.5 rounded-full w-4 h-4 transition-all"
                    style={{
                      background: pref.status ? "#00d4ff" : "#334155",
                      left: pref.status ? "auto" : "2px",
                      right: pref.status ? "2px" : "auto",
                      boxShadow: pref.status ? "0 0 6px rgba(0,212,255,0.5)" : "none",
                    }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
