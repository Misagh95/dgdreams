"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Info,
  AlertTriangle,
  Fingerprint,
  Users,
  Compass,
} from "lucide-react";
import { useAccount } from "wagmi";
import DashboardLayout from "@/components/DashboardLayout";
import { useSybilScore } from "@/hooks/useSybilScore";
import { shortenAddress } from "@/lib/utils";
import type { SybilReport, SybilTier } from "@/lib/sybil/types";

const TIER_STYLE: Record<
  SybilTier,
  { label: string; color: string; Icon: typeof ShieldCheck; blurb: string }
> = {
  low: {
    label: "Low risk",
    color: "#00B17E",
    Icon: ShieldCheck,
    blurb: "Nothing unusual found. Your activity looks like a normal wallet.",
  },
  watch: {
    label: "Worth a look",
    color: "#FFB020",
    Icon: ShieldAlert,
    blurb: "One or two patterns stood out. Not enough on their own to mean anything.",
  },
  elevated: {
    label: "Elevated risk",
    color: "#FF8A4C",
    Icon: ShieldAlert,
    blurb: "Several independent signals agree. Worth reviewing if this is not you.",
  },
  severe: {
    label: "Severe risk",
    color: "#FF6B6B",
    Icon: ShieldAlert,
    blurb: "Many independent signals agree that this wallet behaves like a farm.",
  },
};

const FAMILY_META: {
  key: "identity" | "behavior" | "onchain" | "social";
  label: string;
  Icon: typeof Users;
  hint: string;
}[] = [
  { key: "identity", label: "Identity", Icon: Fingerprint, hint: "Is this wallet a person, or one of many?" },
  { key: "behavior", label: "Behavior", Icon: Compass, hint: "Does the activity pattern look human?" },
  { key: "onchain", label: "On-chain", Icon: Wallet, hint: "Is the wallet funded like a real user?" },
  { key: "social", label: "Presence", Icon: Users, hint: "Is there a real person behind the streak?" },
];

export default function SybilRiskPage() {
  const { address, isConnected } = useAccount();
  const { report, loading, error, load } = useSybilScore(address);

  // Auto-load once a wallet is connected; the token is cached, so this is cheap.
  useEffect(() => {
    if (isConnected && address && !report && !loading) void load();
    // Intentionally keyed on connection only: re-running on every report change
    // would loop, since load() sets a new report object each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  return (
    <DashboardLayout title="Sybil Risk" subtitle="// wallet risk analysis">
      <div className="max-w-3xl mx-auto space-y-4 px-4 sm:px-0">
        <header className="glass-panel rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#00d4ff18", border: "1px solid #00d4ff33" }}
            >
              <ShieldCheck className="w-5 h-5" style={{ color: "#00d4ff" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-[#e2e8f0]">Sybil Risk Score</h1>
              <p className="text-[11px] font-mono text-[#64748b]">
                {"// one person, many wallets, farming the same rewards"}
              </p>
            </div>
            {isConnected && (
              <button
                onClick={() => void load()}
                disabled={loading}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)", color: "#00d4ff" }}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}
          </div>
        </header>

        {!isConnected && <NotConnected />}
        {isConnected && error && <ErrorNote message={error} />}
        {isConnected && !report && !error && <Skeleton loading={loading} />}

        {report && report.signals.length === 0 ? (
          <NoDataNote report={report} address={address} />
        ) : (
          report && <ScoreCard report={report} address={address} />
        )}
      </div>
    </DashboardLayout>
  );
}


/**
 * Shown when the score came back all zeros.
 *
 * This is almost always "we hold no records for this address", not "this
 * wallet is clean" — a zero must never be presented as an all-clear. The copy
 * says which is which so the number cannot be misread.
 */
function NoDataNote({ report, address }: { report: SybilReport; address?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-panel rounded-xl p-5"
    >
      <div className="flex items-center gap-5">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-mono font-bold text-[#334155]">0</span>
            <span className="text-[9px] font-mono text-[#475569]">/100</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" style={{ color: "#FFB020" }} />
            <span className="text-sm font-semibold" style={{ color: "#FFB020" }}>
              No activity on record
            </span>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
            This score is <strong className="text-[#e2e8f0]">not a clean bill of health</strong> —
            it is an absence of evidence. Nothing was measured, so nothing was found.
          </p>
          {address && (
            <p className="text-[10px] font-mono text-[#475569] mt-2">
              {shortenAddress(address)} · {report.networks} network
              {report.networks === 1 ? "" : "s"} · {report.signals.length} signal
              {report.signals.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      <div
        className="rounded-lg p-3 mt-4"
        style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)" }}
      >
        <p className="text-[11px] text-[#00d4ff] font-medium mb-1">To get a real score</p>
        <ul className="text-[11px] text-[#64748b] space-y-1 leading-relaxed">
          <li>· Complete your daily tasks so a streak is recorded on-chain.</li>
          <li>· Play 2048 or join a tournament, so activity is on record.</li>
          <li>· Link a social handle in your profile.</li>
        </ul>
      </div>
    </motion.section>
  );
}

function NotConnected() {
  return (
    <div className="glass-panel rounded-xl p-8 text-center">
      <Wallet className="w-7 h-7 mx-auto mb-3 text-[#475569]" />
      <p className="text-sm text-[#94a3b8] font-medium">Connect your wallet</p>
      <p className="text-xs text-[#64748b] mt-1 font-mono">
        The score is computed for your own address only.
      </p>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: "rgba(255,176,32,0.08)", border: "1px solid rgba(255,176,32,0.3)" }}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FFB020" }} />
      <p className="text-xs font-mono" style={{ color: "#FFB020" }}>
        {message}
      </p>
    </div>
  );
}

function Skeleton({ loading }: { loading: boolean }) {
  return (
    <div className="glass-panel rounded-xl p-8 text-center">
      <RefreshCw
        className={`w-5 h-5 mx-auto mb-3 text-[#00d4ff] ${loading ? "animate-spin" : ""}`}
      />
      <p className="text-xs text-[#64748b] font-mono">
        {loading ? "reading on-chain activity…" : "no score loaded yet"}
      </p>
    </div>
  );
}



function ScoreCard({ report, address }: { report: SybilReport; address?: string }) {
  const tier = TIER_STYLE[report.tier];
  const TierIcon = tier.Icon;

  return (
    <>
      {/* ── headline score ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-panel rounded-xl p-5"
        style={{ borderColor: `${tier.color}33` }}
      >
        <div className="flex items-center gap-5">
          {/* dial */}
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50" cy="50" r="42"
                fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8"
              />
              <motion.circle
                cx="50" cy="50" r="42"
                fill="none" stroke={tier.color} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - report.score / 100) }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-mono font-bold" style={{ color: tier.color }}>
                {report.score}
              </span>
              <span className="text-[9px] font-mono text-[#475569]">/100</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <TierIcon className="w-4 h-4" style={{ color: tier.color }} />
              <span className="text-sm font-semibold" style={{ color: tier.color }}>
                {tier.label}
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">{tier.blurb}</p>
            {address && (
              <p className="text-[10px] font-mono text-[#475569] mt-2">
                {shortenAddress(address)}
              </p>
            )}
          </div>
        </div>

        {/* confidence + coverage */}
        <div
          className="grid grid-cols-2 gap-3 mt-4 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Meter
            label="Confidence"
            value={report.confidence}
            hint="how much data backed this score"
            color={report.confidence >= 60 ? "#00B17E" : "#FFB020"}
          />
          <Meter
            label="Data coverage"
            value={report.coverage}
            hint="how much we could measure at all"
            color={report.coverage >= 60 ? "#00B17E" : "#FFB020"}
          />
        </div>
      </motion.section>

      {/* ── family breakdown ── */}
      <section className="glass-panel rounded-xl p-5">
        <h2 className="text-xs font-semibold text-[#e2e8f0] mb-1">What each family saw</h2>
        <p className="text-[10px] font-mono text-[#475569] mb-4">
          {"// risk only escalates when independent families agree"}
        </p>
        <div className="space-y-3">
          {FAMILY_META.map((f) => {
            const risk = report.families[f.key] ?? 0;
            const fired = report.triggeredFamilies.includes(f.key);
            const color = risk >= 0.6 ? "#FF6B6B" : risk >= 0.3 ? "#FFB020" : risk > 0 ? "#00d4ff" : "#334155";
            return (
              <div key={f.key} className="flex items-center gap-3">
                <f.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: fired ? color : "#475569" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#94a3b8] flex items-center gap-1.5">
                      {f.label}
                      {fired && (
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: `${color}1f`, color }}
                        >
                          fired
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color }}>
                      {Math.round(risk * 100)}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(risk * 100)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-[10px] text-[#475569] mt-1">{f.hint}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── individual signals ── */}
      <section className="glass-panel rounded-xl p-5">
        <h2 className="text-xs font-semibold text-[#e2e8f0] mb-1">Signals measured</h2>
        <p className="text-[10px] font-mono text-[#475569] mb-4">
          {`// ${report.signals.length} indicator${report.signals.length === 1 ? "" : "s"} from ${report.networks} network${report.networks === 1 ? "" : "s"}`}
        </p>
        {report.signals.length === 0 ? (
          <p className="text-xs text-[#64748b] font-mono">
            Not enough activity recorded yet to measure anything.
          </p>
        ) : (
          <div className="space-y-2">
            {report.signals.map((s, i) => (
              <motion.div
                key={`${s.id}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="rounded-lg p-3"
                style={{ background: "rgba(6,13,26,0.6)", border: "1px solid rgba(26,58,92,0.3)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#94a3b8] font-mono">{s.id}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono text-[#475569]">
                      conf {Math.round(s.confidence * 100)}%
                    </span>
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: s.risk >= 0.6 ? "#FF6B6B1f" : s.risk >= 0.3 ? "#FFB0201f" : "#00d4ff1f",
                        color: s.risk >= 0.6 ? "#FF6B6B" : s.risk >= 0.3 ? "#FFB020" : "#00d4ff",
                      }}
                    >
                      risk {Math.round(s.risk * 100)}%
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-[#64748b] mt-1.5 leading-relaxed">{s.evidence}</p>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── disclaimers: the caveats belong next to the number, not buried ── */}
      <section
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)" }}
      >
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#00d4ff" }} />
        <div>
          <p className="text-xs font-semibold text-[#00d4ff] mb-1.5">
            Read this before acting on the number
          </p>
          <ul className="space-y-1">
            {report.disclaimers.map((d) => (
              <li key={d} className="text-[11px] text-[#64748b] leading-relaxed">
                · {d}
              </li>
            ))}
          </ul>
          <p className="text-[10px] font-mono text-[#475569] mt-2">
            computed {new Date(report.computedAt).toLocaleString()}
          </p>
        </div>
      </section>
    </>
  );
}

function Meter({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: number;
  hint: string;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#64748b]">{label}</span>
        <span className="text-[10px] font-mono" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="text-[9px] text-[#475569] mt-1">{hint}</p>
    </div>
  );
}

