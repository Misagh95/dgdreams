"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Search,
  Flame,
  TrendingUp,
  Activity,
  Calendar,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const allTransactions: {
  hash: string;
  type: string;
  chain: string;
  amount: string;
  status: string;
  time: string;
  gas: string;
  points: number;
}[] = [];

const chainColors: Record<string, string> = {
  ETH: "#627eea",
  ARB: "#28a0f0",
  BASE: "#0052ff",
  POLY: "#8247e5",
  OP: "#ff0420",
  BNB: "#f3ba2f",
};

type FilterType = "all" | "success" | "failed" | "pending";

export default function ActivityPage() {
  const [statusFilter, setStatusFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = allTransactions.filter((tx) => {
    const matchStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchSearch =
      !searchQuery ||
      tx.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalPoints = allTransactions
    .filter((t) => t.status === "success")
    .reduce((s, t) => s + t.points, 0);

  return (
    <DashboardLayout title="Activity Log" subtitle="// on-chain transaction history">
      <div className="space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Transactions", value: "0", icon: Activity, color: "#00d4ff" },
            { label: "Success Rate", value: "—", icon: TrendingUp, color: "#00ff88" },
            { label: "Points Earned", value: "0", icon: Flame, color: "#ffaa00" },
            { label: "Active Days", value: "0", icon: Calendar, color: "#8b5cf6" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-4 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  <span className="text-xs font-mono text-[#475569]">{stat.label}</span>
                </div>
                <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel p-4 rounded-xl"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#334155]" />
              <input
                className="input-terminal pl-8 py-2 text-xs"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#475569]" />
              {(["all", "success", "failed", "pending"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all ${
                    statusFilter === f
                      ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)]"
                      : "text-[#475569] hover:text-[#94a3b8]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Transaction Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-[#1a3a5c]/30">
            <span className="font-semibold text-sm text-[#e2e8f0]">Transactions</span>
            <span className="text-xs text-[#475569] font-mono">{filtered.length} results</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(26,58,92,0.3)" }}>
                  {["Tx Hash", "Type", "Chain", "Amount", "Gas", "Points", "Status", "Time"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] text-[#334155] font-mono uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#334155] font-mono text-sm">
                      No transactions yet. Connect your wallet and start interacting.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
