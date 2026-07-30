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

const CONDITIONS = [
  { id: "gt", label: "Price >" },
  { id: "lt", label: "Price <" },
  { id: "eq", label: "Price ==" },
  { id: "contains", label: "Contains text" },
];

  const PRESET_URLS = [
    { label: "BTC/USDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT" },
    { label: "ETH/USDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT" },
    { label: "SOL/USDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT" },
    { label: "ADA/USDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=ADAUSDT" },
    { label: "AVAX/USDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=AVAXUSDT" },
    { label: "LINK/USDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=LINKUSDT" },
    { label: "OP/USDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=OPUSDT" },
    { label: "ARB/USDT", url: "https://api.binance.com/api/v3/ticker/24hr?symbol=ARBUSDT" },
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

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    question: "",
    sourceUrl: PRESET_URLS[0].url,
    targetValue: "",
    condition: "gt",
    resolvesInHours: "24",
  });

  const PRESET_MARKETS = [
    { label: "BTC > $70k", question: "Will BTC exceed $70,000 within 24h?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", targetValue: "70000", condition: "gt" },
    { label: "BTC < $60k", question: "Will BTC drop below $60,000 within 24h?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", targetValue: "60000", condition: "lt" },
    { label: "BTC > $100k", question: "Will BTC exceed $100,000 by next week?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", targetValue: "100000", condition: "gt" },
    { label: "ETH > $4k", question: "Will ETH exceed $4,000 within 24h?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT", targetValue: "4000", condition: "gt" },
    { label: "ETH < $3k", question: "Will ETH drop below $3,000 within 24h?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT", targetValue: "3000", condition: "lt" },
    { label: "SOL > $200", question: "Will SOL exceed $200 within 24h?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT", targetValue: "200", condition: "gt" },
    { label: "SOL < $120", question: "Will SOL drop below $120 within 24h?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT", targetValue: "120", condition: "lt" },
    { label: "ADA > $1", question: "Will ADA break $1 within 48h?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=ADAUSDT", targetValue: "1", condition: "gt" },
    { label: "AVAX > $30", question: "Will AVAX exceed $30 within 24h?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=AVAXUSDT", targetValue: "30", condition: "gt" },
    { label: "LINK > $15", question: "Will LINK break $15 within 24h?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=LINKUSDT", targetValue: "15", condition: "gt" },
    { label: "ETH beats BTC", question: "Will ETH outperform BTC by 2% today?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT", targetValue: "2", condition: "gt" },
    { label: "Total 3 up", question: "Will BTC, ETH, and SOL all close positive today?", sourceUrl: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", targetValue: "1", condition: "gt" },
  ];

  // Predict
  const [predictAmount, setPredictAmount] = useState("1");
  const [predicting, setPredicting] = useState<number | null>(null);

  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await marketGetMarkets();
      setMarkets(data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMarkets(); }, [fetchMarkets]);

  const handleCreate = async () => {
    if (!address) return;
    await requireGenLayer();
    if (chainId !== 4221) { setActionMsg("Switch to GenLayer first"); return; }
    setActionMsg(null);
    const resolvesAt = Math.floor(Date.now() / 1000) + parseInt(form.resolvesInHours) * 3600;
    try {
      const tx = await marketCreate(address, form.question, form.sourceUrl, form.targetValue, form.condition, resolvesAt);
      addLog(`createMarket tx: ${tx}`);
      await new Promise((r) => setTimeout(r, 3000));
      syncPredictionActivity(address, "create");
      setActionMsg("Market created!");
      setShowCreate(false);
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
      const tx = await marketPredict(address, marketId, outcome, parseInt(predictAmount) || 1);
      addLog(`predict #${marketId} tx: ${tx}`);
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
      await new Promise((r) => setTimeout(r, 3000));
      syncPredictionActivity(address, "resolve");
      setActionMsg("Market resolved by AI validators!");
      fetchMarkets();
    } catch (e: any) {
      setActionMsg(`Error: ${e.message || e}`);
    }
  };

  const handleOracleResolve = async (marketId: number, symbol: string) => {
    if (!address) return;
    await requireGenLayer();
    if (chainId !== 4221) { setActionMsg("Switch to GenLayer first"); return; }
    setActionMsg(null);
    try {
      const tx = await marketResolveWithOracle(address, marketId, symbol);
      addLog(`oracle-resolve #${marketId} tx: ${tx}`);
      await new Promise((r) => setTimeout(r, 3000));
      syncPredictionActivity(address, "resolve");
      setActionMsg("Market resolved via PriceOracle!");
      fetchMarkets();
    } catch (e: any) {
      setActionMsg(`Error: ${e.message || e}`);
    }
  };

  const requireGenLayer = async () => {
    if (!onGenLayer) { try { await switchChainAsync({ chainId: 4221 } as any); } catch {} }
  };

  if (!isConnected) {
    return (
      <DashboardLayout title="Prediction Market">
        <div className="flex items-center justify-center h-64">
          <button onClick={openConnectModal} className="px-6 py-3 rounded-xl text-sm font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>Connect Wallet</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Prediction Market">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: "#F59E0B" }} />
            <h1 className="text-lg font-mono font-semibold" style={{ color: "var(--text-primary)" }}>Prediction Market</h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: "color-mix(in srgb, #F59E0B 15%, transparent)", color: "#F59E0B" }}>AI</span>
          </div>
          <div className="flex items-center gap-2">
            {!onGenLayer && <span className="text-[9px] px-2 py-1 rounded-full font-mono" style={{ background: "color-mix(in srgb, #EF4444 15%, transparent)", color: "#EF4444" }}>Requires GenLayer</span>}
            {onGenLayer && <span className="text-[9px] px-2 py-1 rounded-full font-mono" style={{ background: "color-mix(in srgb, #10B981 15%, transparent)", color: "#10B981" }}>GenLayer</span>}
            <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
              {showCreate ? "Cancel" : "+ New Market"}
            </button>
          </div>
        </div>

        <p className="text-[10px] font-mono mb-6" style={{ color: "var(--text-quaternary)" }}>
          Contract: {MARKET_CONTRACT.slice(0, 10)}...{MARKET_CONTRACT.slice(-6)}
        </p>

        {showCreate && (
          <div className="rounded-xl p-6 mb-6 space-y-3" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider mb-2 block" style={{ color: "var(--text-quaternary)" }}>Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_MARKETS.map((p) => (
                  <button key={p.label} onClick={() => setForm({ question: p.question, sourceUrl: p.sourceUrl, targetValue: p.targetValue, condition: p.condition, resolvesInHours: form.resolvesInHours })} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "color-mix(in srgb, #F59E0B 12%, transparent)", color: "#F59E0B", border: "1px solid color-mix(in srgb, #F59E0B 20%, transparent)" }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Question</label>
              <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Will BTC exceed $70k within 24h?" className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Source URL</label>
              <div className="flex gap-2 mb-2">
                {PRESET_URLS.map((p) => (
                  <button key={p.label} onClick={() => setForm({ ...form, sourceUrl: p.url })} className="px-2 py-1 rounded text-[9px] font-mono transition-all" style={{ background: form.sourceUrl === p.url ? "#F59E0B" : "var(--bg)", color: form.sourceUrl === p.url ? "#000" : "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://api.binance.com/..." className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Condition</label>
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
                  {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Target Value</label>
                <input value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} placeholder="70000" className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Resolves In (hrs)</label>
                <input type="number" value={form.resolvesInHours} onChange={(e) => setForm({ ...form, resolvesInHours: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
              </div>
            </div>
            <button onClick={handleCreate} disabled={!form.question || !form.targetValue} className="px-6 py-2.5 rounded-xl text-xs font-mono transition-all hover:opacity-80 disabled:opacity-40" style={{ background: "#F59E0B", color: "#000", border: "none" }}>
              Create Market
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>Loading markets...</p>
        ) : markets.length === 0 ? (
          <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>No markets yet. Create one!</p>
        ) : (
          <div className="space-y-3">
            {markets.map((m) => {
              const isExpired = Date.now() / 1000 > m.resolves_at;
              const poolTotal = (m.yes_pool || 0) + (m.no_pool || 0);
              return (
                <div key={m.id} className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{m.question}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{
                      background: m.resolved ? "color-mix(in srgb, #8B5CF6 15%, transparent)" : isExpired ? "color-mix(in srgb, #EF4444 15%, transparent)" : "color-mix(in srgb, #10B981 15%, transparent)",
                      color: m.resolved ? "#8B5CF6" : isExpired ? "#EF4444" : "#10B981",
                    }}>
                      {m.resolved ? `Resolved: ${m.outcome}` : isExpired ? "Expired" : "Open"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
                    <span>YES pool: {m.yes_pool}</span>
                    <span>NO pool: {m.no_pool}</span>
                    <span>Condition: {m.condition} {m.target_value}</span>
                    <span>Source: {m.source_url.slice(0, 40)}...</span>
                  </div>

                  {/* Progress bar */}
                  {poolTotal > 0 && (
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${((m.yes_pool || 0) / poolTotal) * 100}%`,
                        background: "linear-gradient(90deg, #10B981, #F59E0B)",
                      }} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {!m.resolved && !isExpired && (
                      <div className="flex items-center gap-2">
                        <input type="number" value={predictAmount} onChange={(e) => setPredictAmount(e.target.value)} min="1" className="w-16 px-2 py-1.5 rounded-lg text-[10px] font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                        <button onClick={() => handlePredict(m.id, 1)} disabled={predicting === m.id} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80 disabled:opacity-40" style={{ background: "#10B981", color: "#fff", border: "none" }}>
                          {predicting === m.id ? "..." : "YES"}
                        </button>
                        <button onClick={() => handlePredict(m.id, 0)} disabled={predicting === m.id} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80 disabled:opacity-40" style={{ background: "#EF4444", color: "#fff", border: "none" }}>
                          {predicting === m.id ? "..." : "NO"}
                        </button>
                      </div>
                    )}
                    {!m.resolved && isExpired && (
                      <>
                        <button onClick={() => handleResolve(m.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#8B5CF6", color: "#fff", border: "none" }}>
                          Resolve (AI)
                        </button>
                        <button onClick={() => handleOracleResolve(m.id, (m.source_url || "").includes("BTC") ? "BTC" : (m.source_url || "").includes("ETH") ? "ETH" : "SOL")} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#00D4FF", color: "#000", border: "none" }}>
                          Resolve (Oracle)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {actionMsg && <p className="text-xs font-mono mt-3" style={{ color: "var(--text-secondary)" }}>{actionMsg}</p>}

        {log.length > 0 && (
          <div className="mt-8">
            <p className="text-[9px] font-mono uppercase mb-2" style={{ color: "var(--text-quaternary)" }}>Transaction Log</p>
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
