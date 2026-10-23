"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import DashboardLayout from "@/components/DashboardLayout";
import GenLayerSpinner from "@/components/GenLayerSpinner";
import { isGenLayerChain } from "@/lib/genlayer/client";
import {
  TRUTHCOURT_CONTRACT,
  truthCourtCancelClaim,
  truthCourtChallengeClaim,
  truthCourtGetClaims,
  truthCourtGetPayout,
  truthCourtGetConfig,
  truthCourtResolveClaim,
  truthCourtSubmitClaim,
  truthCourtWithdraw,
  genToWei,
  weiToGen,
  shortAddr,
  type TruthCourtClaim,
  type TruthCourtConfig,
} from "@/lib/genlayer/truthcourt";
import { Scale, Link2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const ACCENT = "var(--success)";
const OPEN_COLOR = "var(--accent)";
const CONTESTED_COLOR = "var(--warning)";
const RESOLVED_COLOR = "var(--success)";

const BOND_PRESETS = ["0.1", "1", "5"];

function StatusPill({ claim }: { claim: TruthCourtClaim }) {
  const map = {
    open: { label: "◉ Open", color: OPEN_COLOR },
    contested: { label: "⚔ Contested", color: CONTESTED_COLOR },
    resolved: { label: "✓ Resolved", color: RESOLVED_COLOR },
  } as const;
  const m = map[claim.status] ?? { label: claim.status, color: "var(--text-quaternary)" };
  return (
    <span
      className="text-[12px] px-2 py-0.5 rounded-full shrink-0"
      style={{ background: `color-mix(in srgb, ${m.color} 15%, transparent)`, color: m.color, border: `1px solid color-mix(in srgb, ${m.color} 28%, transparent)` }}
    >
      {m.label}
    </span>
  );
}

function VerdictBadge({ claim }: { claim: TruthCourtClaim }) {
  if (!claim.verdict) return null;
  const map: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    true: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "TRUE", color: RESOLVED_COLOR },
    false: { icon: <XCircle className="w-3.5 h-3.5" />, label: "FALSE", color: "var(--danger)" },
    unverifiable: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "UNVERIFIABLE", color: CONTESTED_COLOR },
    cancelled: { icon: <XCircle className="w-3.5 h-3.5" />, label: "CANCELLED", color: "var(--text-quaternary)" },
  };
  const m = map[claim.verdict] ?? { icon: null, label: claim.verdict, color: "var(--text-quaternary)" };
  return (
    <span
      className="text-[12px] px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1"
      style={{ background: `color-mix(in srgb, ${m.color} 15%, transparent)`, color: m.color, border: `1px solid color-mix(in srgb, ${m.color} 30%, transparent)` }}
    >
      {m.icon} {m.label}
    </span>
  );
}

function EvidenceLinks({ claim }: { claim: TruthCourtClaim }) {
  return (
    <div className="space-y-1">
      {claim.evidence_urls.map((u) => (
        <div key={u} className="flex items-center gap-1.5 min-w-0">
          <span className="text-[12px] px-1 py-px rounded" style={{ background: `color-mix(in srgb, ${OPEN_COLOR} 14%, transparent)`, color: OPEN_COLOR }}>P</span>
          <a href={u} target="_blank" rel="noreferrer" className="text-[12px] truncate hover:underline" style={{ color: "var(--text-secondary)" }}>{u}</a>
        </div>
      ))}
      {claim.challenger_urls.map((u) => (
        <div key={u} className="flex items-center gap-1.5 min-w-0">
          <span className="text-[12px] px-1 py-px rounded" style={{ background: `color-mix(in srgb, ${CONTESTED_COLOR} 14%, transparent)`, color: CONTESTED_COLOR }}>C</span>
          <a href={u} target="_blank" rel="noreferrer" className="text-[12px] truncate hover:underline" style={{ color: "var(--text-secondary)" }}>{u}</a>
        </div>
      ))}
    </div>
  );
}

export default function TruthCourtPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const onGenLayer = isGenLayerChain(chainId ?? 0);

  const [config, setConfig] = useState<TruthCourtConfig | null>(null);
  const [claims, setClaims] = useState<TruthCourtClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [challengeUrls, setChallengeUrls] = useState<Record<number, string>>({});
  const [payout, setPayout] = useState("0");

  // submit form
  const [text, setText] = useState("");
  const [urls, setUrls] = useState("");
  const [bond, setBond] = useState("0.1");

  const addLog = useCallback((msg: string) => setLog((p) => [msg, ...p.slice(0, 49)]), []);

  // Accept URLs pasted as lines, spaces, or comma-separated lists.
  const parseUrls = (raw: string): string[] =>
    raw.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, list] = await Promise.all([truthCourtGetConfig(), truthCourtGetClaims()]);
      setConfig(cfg);
      setClaims(list);
    } catch (e: any) {
      addLog(`read error: ${e?.message || e}`);
    }
    setLoading(false);
  }, [addLog]);

  useEffect(() => {
    if (isConnected) fetchData();
    else setClaims([]);
  }, [isConnected, fetchData]);

  // Winnings refresh whenever the wallet changes or claims move (resolutions
  // credit payouts, so claims updating implies payout may have changed).
  const fetchPayout = useCallback(async () => {
    if (!address) { setPayout("0"); return; }
    try {
      setPayout(await truthCourtGetPayout(address));
    } catch {
      /* keep last known value */
    }
  }, [address]);

  useEffect(() => {
    fetchPayout();
  }, [fetchPayout, claims]);

  const requireGenLayer = async () => {
    if (!onGenLayer) {
      try {
        await switchChainAsync({ chainId: 4221 } as any);
      } catch {
        /* user cancelled */
      }
    }
  };

  const handleSubmit = async () => {
    if (!address || !text.trim()) return;
    await requireGenLayer();
    if (chainId !== 4221) { setActionMsg("Switch to GenLayer (Bradbury) first"); return; }
    const urlList = parseUrls(urls);
    if (urlList.length === 0) { setActionMsg("Add at least one evidence URL"); return; }
    const value = genToWei(bond);
    if (value <= 0n) { setActionMsg("Bond must be positive"); return; }
    setBusy("submit");
    setActionMsg(null);
    try {
      const tx = await truthCourtSubmitClaim(address, text.trim(), urlList, value);
      addLog(`submit_claim tx: ${tx}`);
      setActionMsg("Claim submitted — awaiting finalization");
      setText(""); setUrls("");
      await new Promise((r) => setTimeout(r, 4000));
      fetchData();
      setActionMsg("✓ Claim posted!");
    } catch (e: any) {
      setActionMsg(`Error: ${e?.message || e}`);
    }
    setBusy(null);
  };

  const handleChallenge = async (claim: TruthCourtClaim) => {
    if (!address) return;
    await requireGenLayer();
    if (chainId !== 4221) { setActionMsg("Switch to GenLayer (Bradbury) first"); return; }
    const urls = parseUrls(challengeUrls[claim.id] || "");
    if (urls.length === 0) { setActionMsg("Add challenger evidence URLs"); return; }
    setBusy(`challenge-${claim.id}`);
    setActionMsg(null);
    try {
      const tx = await truthCourtChallengeClaim(address, claim.id, urls, BigInt(claim.bond));
      addLog(`challenge #${claim.id} tx: ${tx}`);
      setActionMsg("Challenge submitted — awaiting finalization");
      await new Promise((r) => setTimeout(r, 4000));
      fetchData();
      setActionMsg("✓ Challenge posted!");
    } catch (e: any) {
      setActionMsg(`Error: ${e?.message || e}`);
    }
    setBusy(null);
  };

  const handleResolve = async (claim: TruthCourtClaim) => {
    if (!address) return;
    await requireGenLayer();
    if (chainId !== 4221) { setActionMsg("Switch to GenLayer (Bradbury) first"); return; }
    setBusy(`resolve-${claim.id}`);
    setActionMsg(null);
    try {
      const tx = await truthCourtResolveClaim(address, claim.id);
      addLog(`resolve #${claim.id} tx: ${tx}`);
      setActionMsg("AI adjudication submitted — validators are converging");
      await new Promise((r) => setTimeout(r, 5000));
      fetchData();
      setActionMsg("✓ Resolved by AI validators!");
    } catch (e: any) {
      setActionMsg(`Error: ${e?.message || e}`);
    }
    setBusy(null);
  };

  const handleCancel = async (claim: TruthCourtClaim) => {
    if (!address) return;
    await requireGenLayer();
    if (chainId !== 4221) { setActionMsg("Switch to GenLayer (Bradbury) first"); return; }
    setBusy(`cancel-${claim.id}`);
    setActionMsg(null);
    try {
      const tx = await truthCourtCancelClaim(address, claim.id);
      addLog(`cancel #${claim.id} tx: ${tx}`);
      setActionMsg("Cancel submitted");
      await new Promise((r) => setTimeout(r, 4000));
      fetchData();
      setActionMsg("✓ Claim cancelled & refunded");
    } catch (e: any) {
      setActionMsg(`Error: ${e?.message || e}`);
    }
    setBusy(null);
  };

  const handleWithdraw = async () => {
    if (!address) return;
    await requireGenLayer();
    if (chainId !== 4221) { setActionMsg("Switch to GenLayer (Bradbury) first"); return; }
    setBusy("withdraw");
    setActionMsg(null);
    try {
      const tx = await truthCourtWithdraw(address);
      addLog(`withdraw tx: ${tx}`);
      setActionMsg("Withdrawal submitted");
      await new Promise((r) => setTimeout(r, 4000));
      fetchData();
      setActionMsg("✓ Withdrawal finalized");
    } catch (e: any) {
      setActionMsg(`Error: ${e?.message || e}`);
    }
    setBusy(null);
  };

  if (!isConnected) {
    return (
      <DashboardLayout title="TruthCourt">
        <div className="flex items-center justify-center h-64">
          <button onClick={openConnectModal} className="px-6 py-3 rounded-xl text-sm transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
            Connect Wallet
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const open = claims.filter((c) => c.status === "open").length;
  const contested = claims.filter((c) => c.status === "contested").length;
  const resolved = claims.filter((c) => c.status === "resolved").length;
  const total = claims.length;
  const inPlay = claims
    .filter((c) => c.status === "open" || c.status === "contested")
    .reduce((s, c) => s + BigInt(c.bond), 0n);
  const slice = (n: number) => (total === 0 ? 0 : (n / total) * 360);
  const donut = total
    ? `conic-gradient(${OPEN_COLOR} 0deg ${slice(open)}deg, ${CONTESTED_COLOR} ${slice(open)}deg ${slice(open + contested)}deg, ${RESOLVED_COLOR} ${slice(open + contested)}deg 360deg)`
    : "var(--bg-subtle)";

  return (
    <DashboardLayout title="TruthCourt">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <GenLayerSpinner size={20} animated={loading || busy !== null} color={ACCENT} label="TruthCourt" />
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>TruthCourt</h1>
            <span className="text-[12px] px-1.5 py-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${ACCENT} 15%, transparent)`, color: ACCENT }}>AI</span>
          </div>
          <div className="flex items-center gap-2">
            {!onGenLayer && <span className="text-[12px] px-2 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--danger) 15%, transparent)", color: "var(--danger)" }}>Switch to GenLayer</span>}
            {config && (
              <span className="text-[12px] px-2 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent-text)" }}>
                fee {(config.fee_bps / 100).toFixed(2)}%
              </span>
            )}
            <span className="text-[12px] px-2 py-1 rounded-full" style={{ background: "var(--bg-strong)", color: "var(--text-quaternary)", border: "1px solid var(--border)" }}>
              {shortAddr(TRUTHCOURT_CONTRACT)}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="rounded-xl p-3 flex items-center gap-3 col-span-2" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
            <div className="w-12 h-12 rounded-full shrink-0" style={{ background: donut }} />
            <div className="text-[12px] leading-tight" style={{ color: "var(--text-quaternary)" }}>
              <span className="block text-2xl font-black" style={{ color: "var(--text-primary)" }}>{total}</span>
              claims total
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--bg-strong)", border: `1px solid color-mix(in srgb, ${OPEN_COLOR} 24%, transparent)` }}>
            <p className="text-[12px]" style={{ color: OPEN_COLOR }}>OPEN</p>
            <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{open}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--bg-strong)", border: `1px solid color-mix(in srgb, ${CONTESTED_COLOR} 24%, transparent)` }}>
            <p className="text-[12px]" style={{ color: CONTESTED_COLOR }}>CONTESTED</p>
            <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{contested}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
            <p className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>IN PLAY</p>
            <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{weiToGen(inPlay)} GEN</p>
          </div>
        </div>

        {/* Submit */}
        <div className="rounded-xl p-5 mb-6 space-y-3" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4" style={{ color: ACCENT }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Post a Claim</span>
          </div>
          <div>
            <label className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>Claim</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder='e.g. "Company X announced product Y on August 1, 2026"' className="w-full mt-1 px-3 py-2 rounded-lg text-xs outline-none resize-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
          </div>
          <div>
            <label className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>Evidence URLs (one per line)</label>
            <textarea value={urls} onChange={(e) => setUrls(e.target.value)} rows={3} placeholder={"https://example.com/primary-source\nhttps://news.example.org/article"} className="w-full mt-1 px-3 py-2 rounded-lg text-xs outline-none resize-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>Bond (GEN)</label>
              <input value={bond} onChange={(e) => setBond(e.target.value)} type="number" min="0" step="0.01" className="w-full mt-1 px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <div className="flex gap-1.5">
              {BOND_PRESETS.map((b) => (
                <button key={b} onClick={() => setBond(b)} disabled={busy !== null}
                  className="px-2.5 py-1.5 rounded-lg text-[12px] transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: bond === b ? `color-mix(in srgb, ${ACCENT} 18%, transparent)` : "var(--bg)", color: bond === b ? ACCENT : "var(--text-quaternary)", border: `1px solid ${bond === b ? `color-mix(in srgb, ${ACCENT} 35%, transparent)` : "var(--border)"}` }}>
                  {b}
                </button>
              ))}
            </div>
            <button onClick={handleSubmit} disabled={busy !== null} className="mt-4 px-6 py-2.5 rounded-xl text-xs transition-all hover:opacity-80 disabled:opacity-40 flex items-center gap-1.5"
              style={{ background: ACCENT, color: "#000", border: "none" }}>
              {busy === "submit" ? <GenLayerSpinner size={14} color="#000" label="Submitting" /> : null}
              {busy === "submit" ? "Submitting…" : "Submit claim"}
            </button>
          </div>
        </div>

        {/* Claims */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Claims</span>
            <span className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>{claims.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px]" style={{ color: ACCENT }}>
              Your winnings: {weiToGen(payout)} GEN
            </span>
            <button onClick={handleWithdraw} disabled={busy !== null || BigInt(payout) <= 0n}
              title={BigInt(payout) <= 0n ? "Nothing to withdraw yet — win a resolution first" : "Withdraw your winnings"}
              className="px-3 py-1.5 rounded-lg text-[12px] transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--bg-strong)", color: BigInt(payout) > 0n ? "var(--text-secondary)" : "var(--text-quaternary)", border: "1px solid var(--border)" }}>
              Withdraw winnings
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8"><GenLayerSpinner size={28} /><p className="text-xs" style={{ color: "var(--text-quaternary)" }}>Loading claims…</p></div>
        ) : claims.length === 0 ? (
          <p className="text-xs py-8 text-center" style={{ color: "var(--text-quaternary)" }}>No claims yet — post the first one above.</p>
        ) : (
          <div className="space-y-3">
            {claims.map((c) => {
              const isPoster = c.poster.toLowerCase() === (address || "").toLowerCase();
              const isChallenger = !!c.challenger && c.challenger.toLowerCase() === (address || "").toLowerCase();
              const acting = busy === `challenge-${c.id}` || busy === `resolve-${c.id}` || busy === `cancel-${c.id}`;
              return (
                <div key={c.id} className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-strong)", border: `1px solid ${
                  c.status === "contested" ? `color-mix(in srgb, ${CONTESTED_COLOR} 30%, transparent)` : c.verdict === "false" ? "color-mix(in srgb, var(--danger) 30%, transparent)" : "var(--border)"
                }` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>#{c.id}</span>
                      <StatusPill claim={c} />
                      <VerdictBadge claim={c} />
                    </div>
                    <span className="text-[12px] shrink-0" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 999 }}>⛁ {weiToGen(c.bond)} GEN</span>
                  </div>

                  <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{c.text}</p>

                  <div className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>
                    Poster {shortAddr(c.poster)}{isPoster ? <span style={{ color: ACCENT }}> (you)</span> : ""}
                    {c.challenger && <> · Challenger {shortAddr(c.challenger)}{isChallenger ? <span style={{ color: CONTESTED_COLOR }}> (you)</span> : ""}</>}
                  </div>

                  <EvidenceLinks claim={c} />

                  {c.reasoning && (
                    <blockquote className="text-[12px] italic leading-relaxed p-3 rounded-lg" style={{ background: "var(--bg)", borderLeft: `3px solid ${ACCENT}`, color: "var(--text-secondary)" }}>
                      “{c.reasoning}”
                    </blockquote>
                  )}

                  <div className="space-y-2">
                    {c.status === "open" && !isPoster && (
                      <>
                        <input
                          value={challengeUrls[c.id] || ""}
                          onChange={(e) => setChallengeUrls((p) => ({ ...p, [c.id]: e.target.value }))}
                          placeholder="Your evidence URLs (one per line)"
                          className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
                          style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                        />
                        <button onClick={() => handleChallenge(c)} disabled={acting || !(challengeUrls[c.id] || "").trim()}
                          className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all hover:opacity-80 disabled:opacity-40 flex items-center gap-1.5"
                          style={{ background: "color-mix(in srgb, var(--danger) 15%, transparent)", color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 32%, transparent)" }}>
                          {acting ? <GenLayerSpinner size={13} color="var(--danger)" label="Challenging" /> : null}
                          ⚔ Challenge with {weiToGen(c.bond)} GEN
                        </button>
                      </>
                    )}
                    {c.status === "open" && isPoster && (
                      <button onClick={() => handleCancel(c)} disabled={acting}
                        className="px-4 py-2 rounded-lg text-[12px] transition-all hover:opacity-80 disabled:opacity-40"
                        style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                        ↩ Cancel &amp; refund
                      </button>
                    )}
                    {c.status === "contested" && (
                      <button onClick={() => handleResolve(c)} disabled={acting}
                        className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all hover:opacity-80 disabled:opacity-40 flex items-center gap-1.5"
                        style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                        {acting ? <GenLayerSpinner size={13} color="#fff" label="Resolving" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {acting ? "Resolving…" : "⚖ Resolve with AI"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {actionMsg && <p className="text-[12px] mt-3" style={{ color: "var(--text-secondary)" }}>{actionMsg}</p>}

        {log.length > 0 && (
          <div className="mt-8">
            <p className="text-[12px] mb-2" style={{ color: "var(--text-quaternary)" }}>Log</p>
            <div className="rounded-xl p-3 max-h-32 overflow-y-auto" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
              {log.map((msg, i) => (
                <p key={i} className="text-[12px] leading-relaxed" style={{ color: "var(--text-quaternary)" }}>{msg}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}