"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import DashboardLayout from "@/components/DashboardLayout";
import { isGenLayerChain } from "@/lib/genlayer/client";
import { syncPredictionActivity } from "@/lib/litevm-sync";
import {
  marketGetMarkets,
  marketCreate,
  marketPredict,
  marketResolve,
  marketResolveWithOracle,
  MARKET_CONTRACT,
  type Market,
} from "@/lib/genlayer/market";
import { PRICE_ORACLE_CONTRACT } from "@/lib/genlayer/oracle";
import { BarChart3, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { logPredictionActivity } from "@/lib/log-activity";

const ASSET_MAP: Record<string, { symbol: string; url: string }> = {
  btc: { symbol: "BTCUSDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT" },
  eth: { symbol: "ETHUSDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT" },
  sol: { symbol: "SOLUSDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT" },
  ada: { symbol: "ADAUSDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=ADAUSDT" },
  avax: { symbol: "AVAXUSDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=AVAXUSDT" },
  link: { symbol: "LINKUSDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=LINKUSDT" },
};

function parseQuestion(q: string): { asset: string; targetValue: string; condition: string } | null {
  const upper = q.toUpperCase();
  const assetKey = Object.keys(ASSET_MAP).find(a => upper.includes(a.toUpperCase()));
  if (!assetKey) return null;
  const asset = ASSET_MAP[assetKey];
  const numMatch = q.match(/\$?([\d,]+(?:\.\d+)?)\s*k?/);
  if (!numMatch) return { asset: assetKey, targetValue: "", condition: "gt" };
  let val = numMatch[1].replace(/,/g, "");
  if (q.includes("K") || q.includes("k")) val = String(parseFloat(val) * 1000);
  const isBelow = /below|drop|under|less|bellow/i.test(q);
  const isAbove = /above|exceed|break|reach|surpass|higher/i.test(q) || !isBelow;
  return {
    asset: assetKey,
    targetValue: val,
    condition: isBelow ? "lt" : "gt",
  };
}

const QUICK_QUESTIONS = [
  "Will BTC exceed $75,000 by end of week?",
  "Will BTC drop below $65,000 by end of day?",
  "Will ETH break $4,000 by end of week?",
  "Will ETH stay above $3,500 by end of day?",
  "Will SOL surpass $200 by end of week?",
  "Will ADA reach $1 by end of month?",
];

export default function GenLayerMarketPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const onGenLayer = isGenLayerChain(chainId ?? 0);

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => setLog((p) => [msg, ...p.slice(0, 49)]), []);

  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState("");
  const [resolvesIn, setResolvesIn] = useState("24");

  const [predicting, setPredicting] = useState<number | null>(null);

  const [suggestions, setSuggestions] = useState<{ question: string; resolvesAt: number; currentPrice: number }[]>([]);
  useEffect(() => {
    fetch("/api/predictions").then(r => r.json()).then(d => setSuggestions(d.suggestions || [])).catch(() => {});
  }, []);

  const handleFillSuggestion = useCallback((q: string, rs: number) => {
    setQuestion(q);
    const hoursLeft = Math.max(1, Math.round((rs - Date.now() / 1000) / 3600));
    setResolvesIn(String(hoursLeft));
    setShowCreate(true);
  }, []);

  const allSuggestions = suggestions;

  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await marketGetMarkets();
      setMarkets(data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMarkets(); }, [fetchMarkets]);

  const requireGenLayer = async () => {
    if (!onGenLayer) { try { await switchChainAsync({ chainId: 4221 } as any); } catch {} }
  };

  const handleCreate = async () => {
    if (!address || !question.trim()) return;
    await requireGenLayer();
    if (chainId !== 4221) { setActionMsg("Switch to GenLayer first"); return; }
    setActionMsg(null);
    const parsed = parseQuestion(question);
    if (!parsed) { setActionMsg("Could not detect asset. Include BTC/ETH/SOL/ADA/AVAX/LINK."); return; }
    const resolvesAt = Math.floor(Date.now() / 1000) + parseInt(resolvesIn) * 3600;
    try {
      const tx = await marketCreate(address, question, ASSET_MAP[parsed.asset].url, parsed.targetValue, parsed.condition, resolvesAt);
      addLog(`createMarket tx: ${tx}`);
      logPredictionActivity({ walletAddress: address, action: "create_market", question, chain: "genlayer", txHash: tx });
      await new Promise((r) => setTimeout(r, 3000));
      syncPredictionActivity(address, "create");
      setActionMsg("Market created!");
      setShowCreate(false);
      setQuestion("");
      fetchMarkets();
    } catch (e: any) {
      setActionMsg(`Error: ${e.message || e}`);
    }
  };

  const handlePredict = async (marketId: number, outcome: number) => {
    if (!address) return;
    await requireGenLayer();
    if (chainId !== 4221) { setPredicting(null); setActionMsg("Switch to GenLayer first"); return; }
    setPredicting(marketId);
    setActionMsg(null);
    try {
      const tx = await marketPredict(address, marketId, outcome, 1);
      addLog(`predict #${marketId} ${outcome ? "YES" : "NO"} tx: ${tx}`);
      const market = markets.find(m => m.id === marketId);
      logPredictionActivity({ walletAddress: address, action: outcome ? "predict_yes" : "predict_no", question: market?.question || `Market #${marketId}`, marketId: String(marketId), chain: "genlayer", txHash: tx });
      await new Promise((r) => setTimeout(r, 3000));
      syncPredictionActivity(address, "predict");
      setActionMsg("Prediction submitted!");
      fetchMarkets();
    } catch (e: any) {
      setActionMsg(`Error: ${e.message || e}`);
    }
    setPredicting(null);
  };

  const handleResolve = async (marketId: number) => {
    if (!address) return;
    await requireGenLayer();
    if (chainId !== 4221) { setActionMsg("Switch to GenLayer first"); return; }
    setActionMsg(null);
    try {
      const tx = await marketResolve(address, marketId);
      addLog(`resolve #${marketId} tx: ${tx}`);
      const m = markets.find(mi => mi.id === marketId);
      logPredictionActivity({ walletAddress: address, action: "resolve_market", question: m?.question || `Market #${marketId}`, marketId: String(marketId), chain: "genlayer", txHash: tx });
      await new Promise((r) => setTimeout(r, 3000));
      syncPredictionActivity(address, "resolve");
      setActionMsg("Resolved by AI validators!");
      fetchMarkets();
    } catch (e: any) {
      setActionMsg(`Error: ${e.message || e}`);
    }
  };

  if (!isConnected) {
    return (
      <DashboardLayout title="Predictions">
        <div className="flex items-center justify-center h-64">
          <button onClick={openConnectModal} className="px-6 py-3 rounded-xl text-sm font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>Connect Wallet</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Predictions">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: "#F59E0B" }} />
            <h1 className="text-lg font-mono font-semibold" style={{ color: "var(--text-primary)" }}>Predictions</h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: "color-mix(in srgb, #F59E0B 15%, transparent)", color: "#F59E0B" }}>AI</span>
          </div>
          <div className="flex items-center gap-2">
            {!onGenLayer && <span className="text-[9px] px-2 py-1 rounded-full font-mono" style={{ background: "color-mix(in srgb, #EF4444 15%, transparent)", color: "#EF4444" }}>Switch to GenLayer</span>}
            <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
              {showCreate ? "Cancel" : "+ New"}
            </button>
          </div>
        </div>

        {/* Daily Suggestions */}
        {allSuggestions.length > 0 && (
          <div className="rounded-xl p-5 mb-6 space-y-3" style={{ background: "linear-gradient(135deg, color-mix(in srgb, #10B981 8%, var(--bg-strong)) 0%, color-mix(in srgb, #F59E0B 5%, var(--bg-strong)) 100%)", border: "1px solid color-mix(in srgb, #10B981 20%, transparent)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: "#10B981" }} />
                <span className="text-xs font-mono font-semibold" style={{ color: "var(--text-primary)" }}>Today's Predictions</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: "color-mix(in srgb, #10B981 15%, transparent)", color: "#10B981" }}>CoinGecko</span>
              </div>
              <p className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>{allSuggestions.length} questions</p>
            </div>
            <div className="space-y-2">
              {allSuggestions.slice(0, 6).map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[11px] font-mono" style={{ color: "var(--text-primary)" }}>{s.question}</p>
                    <p className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-quaternary)" }}>Ends {new Date(s.resolvesAt * 1000).toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleFillSuggestion(s.question, s.resolvesAt)} className="px-3 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap" style={{ background: "#F59E0B", color: "#000", border: "none" }}>
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick questions */}
        <div className="flex flex-wrap gap-2 mb-6">
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} onClick={() => { setQuestion(q); setShowCreate(true); }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80 text-left max-w-[280px]"
              style={{ background: "color-mix(in srgb, #F59E0B 10%, transparent)", color: "#F59E0B", border: "1px solid color-mix(in srgb, #F59E0B 20%, transparent)" }}>
              {q}
            </button>
          ))}
        </div>

        {/* Create */}
        {showCreate && (
          <div className="rounded-xl p-6 mb-6 space-y-3" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Question</label>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} placeholder='Will BTC exceed $75,000 by end of week?' className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none resize-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
              {question && (() => {
                const parsed = parseQuestion(question);
                return parsed ? (
                  <p className="text-[9px] font-mono mt-1" style={{ color: "#10B981" }}>Detected: {parsed.asset.toUpperCase()} {parsed.condition === "gt" ? ">" : "<"} ${parseInt(parsed.targetValue).toLocaleString()}</p>
                ) : (
                  <p className="text-[9px] font-mono mt-1" style={{ color: "#EF4444" }}>Add BTC/ETH/SOL/ADA/AVAX/LINK and a price target</p>
                );
              })()}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Resolves In</label>
                <select value={resolvesIn} onChange={(e) => setResolvesIn(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
                  <option value="1">1 hour</option>
                  <option value="4">4 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">3 days</option>
                  <option value="168">7 days</option>
                </select>
              </div>
              <button onClick={handleCreate} disabled={!question.trim()} className="mt-5 px-6 py-2.5 rounded-xl text-xs font-mono transition-all hover:opacity-80 disabled:opacity-40" style={{ background: "#F59E0B", color: "#000", border: "none" }}>
                Create Market
              </button>
            </div>
          </div>
        )}

        {/* Markets */}
        {loading ? (
          <p className="text-xs font-mono py-8 text-center" style={{ color: "var(--text-quaternary)" }}>Loading...</p>
        ) : markets.length === 0 ? (
          <p className="text-xs font-mono py-8 text-center" style={{ color: "var(--text-quaternary)" }}>No markets yet — create one!</p>
        ) : (
          <div className="space-y-3">
            {markets.map((m) => {
              const isExpired = Date.now() / 1000 > m.resolves_at;
              const poolTotal = (m.yes_pool || 0) + (m.no_pool || 0);
              return (
                <div key={m.id} className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-mono font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{m.question}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0" style={{
                      background: m.resolved ? "color-mix(in srgb, #8B5CF6 15%, transparent)" : isExpired ? "color-mix(in srgb, #EF4444 15%, transparent)" : "color-mix(in srgb, #10B981 15%, transparent)",
                      color: m.resolved ? "#8B5CF6" : isExpired ? "#EF4444" : "#10B981",
                    }}>
                      {m.resolved ? `Resolved: ${m.outcome}` : isExpired ? "Expired" : "Open"}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
                    {m.condition} {m.target_value} · Source: {m.source_url?.includes("BTC") ? "BTC" : m.source_url?.includes("ETH") ? "ETH" : m.source_url?.includes("SOL") ? "SOL" : "Custom"}
                  </div>
                  {poolTotal > 0 && (
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${((m.yes_pool || 0) / poolTotal) * 100}%`, background: "linear-gradient(90deg, #10B981, #F59E0B)" }} />
                    </div>
                  )}
                  <div className="flex gap-2">
                    {!m.resolved && (
                      isExpired ? (
                        <div className="flex gap-2 w-full">
                          <button onClick={() => handleResolve(m.id)} className="flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all hover:opacity-80" style={{ background: "#8B5CF6", color: "#fff", border: "none" }}>
                            Resolve (AI Verdict)
                          </button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => handlePredict(m.id, 1)} disabled={predicting === m.id} className="flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all hover:opacity-80 disabled:opacity-40 flex items-center justify-center gap-1.5" style={{ background: "color-mix(in srgb, #10B981 15%, transparent)", color: "#10B981", border: "1px solid color-mix(in srgb, #10B981 30%, transparent)" }}>
                            <TrendingUp className="w-3.5 h-3.5" /> YES · {m.yes_pool}
                          </button>
                          <button onClick={() => handlePredict(m.id, 0)} disabled={predicting === m.id} className="flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all hover:opacity-80 disabled:opacity-40 flex items-center justify-center gap-1.5" style={{ background: "color-mix(in srgb, #EF4444 15%, transparent)", color: "#EF4444", border: "1px solid color-mix(in srgb, #EF4444 30%, transparent)" }}>
                            <TrendingDown className="w-3.5 h-3.5" /> NO · {m.no_pool}
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {actionMsg && <p className="text-[11px] font-mono mt-3" style={{ color: "var(--text-secondary)" }}>{actionMsg}</p>}

        {log.length > 0 && (
          <div className="mt-8">
            <p className="text-[9px] font-mono uppercase mb-2" style={{ color: "var(--text-quaternary)" }}>Log</p>
            <div className="rounded-xl p-3 max-h-32 overflow-y-auto" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
              {log.map((msg, i) => (
                <p key={i} className="text-[9px] font-mono leading-relaxed" style={{ color: "var(--text-quaternary)" }}>{msg}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
