"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSwitchChain, useReadContract, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import DashboardLayout from "@/components/DashboardLayout";
import { LITE_PREDICTION_ADDR, LITE_PREDICTION_ABI } from "@/lib/litevm-prediction";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

const LITVM_CHAIN_ID = 4441;
const PREDICT_AMOUNT = "1000000000000000"; // 0.001 zkLTC

const PRESETS = [
  { label: "BTC up today", question: "Will BTC price be higher at market close?", resolvesInMin: 1440 },
  { label: "ETH up today", question: "Will ETH price be higher at market close?", resolvesInMin: 1440 },
  { label: "SOL up today", question: "Will SOL price be higher at market close?", resolvesInMin: 1440 },
  { label: "BTC > $70k", question: "Will BTC exceed $70,000 in the next 24h?", resolvesInMin: 1440 },
  { label: "BTC < $60k", question: "Will BTC drop below $60,000 in the next 24h?", resolvesInMin: 1440 },
  { label: "ETH > $4k", question: "Will ETH exceed $4,000 in the next 24h?", resolvesInMin: 1440 },
  { label: "SOL > $200", question: "Will SOL exceed $200 in the next 24h?", resolvesInMin: 1440 },
  { label: "SOL < $120", question: "Will SOL drop below $120 in the next 24h?", resolvesInMin: 1440 },
  { label: "ADA > $1", question: "Will ADA break $1 in the next 48h?", resolvesInMin: 2880 },
  { label: "AVAX > $30", question: "Will AVAX exceed $30 in the next 24h?", resolvesInMin: 1440 },
  { label: "LINK > $15", question: "Will LINK break $15 in the next 24h?", resolvesInMin: 1440 },
  { label: "3 coins green", question: "Will BTC, ETH and SOL all close green today?", resolvesInMin: 1440 },
  { label: "ETH beats BTC", question: "Will ETH outperform BTC by 2% today?", resolvesInMin: 1440 },
  { label: "BTC weekend", question: "Will BTC close higher on Sunday than Friday?", resolvesInMin: 4320 },
];

export default function LitVMMarketPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();
  const onLiteVM = isConnected && chainId === LITVM_CHAIN_ID;

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [dailyPrices, setDailyPrices] = useState<any>({});
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createQuestion, setCreateQuestion] = useState("");
  const [createResolvesAt, setCreateResolvesAt] = useState("");

  const addLog = useCallback((msg: string) => setLog((p) => [msg, ...p.slice(0, 49)]), []);

  const { data: activeMarkets, refetch: refetchMarkets } = useReadContract({
    address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
    functionName: "getActiveMarkets", args: [], chainId: LITVM_CHAIN_ID,
    query: { enabled: !!address },
  });

  useEffect(() => {
    fetch("/api/predictions").then(r => r.json()).then(d => {
      setSuggestions(d.suggestions || []);
      setDailyPrices(d.prices || {});
    }).catch(() => {});
  }, []);

  const requireLiteVM = async () => {
    if (!onLiteVM) { try { await switchChainAsync({ chainId: LITVM_CHAIN_ID } as any); } catch {} }
  };

  const doWrite = async (fn: () => Promise<any>, msg: string) => {
    if (!address) return;
    await requireLiteVM();
    if (!onLiteVM) { setActionMsg("Switch to LITVM first"); return; }
    setActionMsg(null);
    try { await fn(); setActionMsg(msg); refetchMarkets(); } catch (e: any) { setActionMsg(e.message); }
  };

  const handleCreateMarket = async () => {
    if (!createQuestion || !createResolvesAt) return;
    const ts = Math.floor(new Date(createResolvesAt).getTime() / 1000);
    if (ts <= Math.floor(Date.now() / 1000)) { setActionMsg("Resolve time must be in the future"); return; }
    await doWrite(async () => {
      const tx = await writeContractAsync({
        address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
        functionName: "createMarket", args: [createQuestion, BigInt(ts)],
        chainId: LITVM_CHAIN_ID,
      });
      addLog(`createMarket tx: ${tx}`);
      setShowCreate(false);
      setCreateQuestion("");
      setCreateResolvesAt("");
    }, "Market created!");
  };

  const handlePredict = async (id: bigint, outcome: boolean) => {
    await doWrite(async () => {
      const tx = await writeContractAsync({
        address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
        functionName: "predict", args: [id, outcome],
        value: BigInt(PREDICT_AMOUNT),
        chainId: LITVM_CHAIN_ID,
      });
      addLog(`predict #${id} tx: ${tx}`);
    }, outcome ? "YES predicted!" : "NO predicted!");
  };

  const handleResolve = async (id: bigint, outcome: boolean) => {
    await doWrite(async () => {
      const tx = await writeContractAsync({
        address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
        functionName: "resolveMarket", args: [id, outcome],
        chainId: LITVM_CHAIN_ID,
      });
      addLog(`resolve #${id} tx: ${tx}`);
    }, "Resolved!");
  };

  const applyPreset = (question: string, min: number) => {
    const ts = new Date(Date.now() + min * 60 * 1000);
    setCreateQuestion(question);
    setCreateResolvesAt(ts.toISOString().slice(0, 16));
    setShowCreate(true);
  };

  if (!isConnected) {
    return (
      <DashboardLayout title="LITVM Predictions">
        <div className="flex items-center justify-center h-64">
          <button onClick={openConnectModal} className="px-6 py-3 rounded-xl text-sm font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>Connect Wallet</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="LITVM Predictions">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: "#8B5CF6" }} />
            <h1 className="text-lg font-mono font-semibold" style={{ color: "var(--text-primary)" }}>Prediction Market</h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: "color-mix(in srgb, #8B5CF6 15%, transparent)", color: "#8B5CF6" }}>LITVM</span>
          </div>
          <div className="flex items-center gap-2">
            {!onLiteVM && <span className="text-[9px] px-2 py-1 rounded-full font-mono" style={{ background: "color-mix(in srgb, #EF4444 15%, transparent)", color: "#EF4444" }}>Requires LITVM</span>}
            {onLiteVM && <span className="text-[9px] px-2 py-1 rounded-full font-mono" style={{ background: "color-mix(in srgb, #10B981 15%, transparent)", color: "#10B981" }}>LITVM</span>}
            <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
              {showCreate ? "Cancel" : "+ New Market"}
            </button>
          </div>
        </div>

        <p className="text-[10px] font-mono mb-6" style={{ color: "var(--text-quaternary)" }}>
          Contract: {LITE_PREDICTION_ADDR.slice(0, 10)}...{LITE_PREDICTION_ADDR.slice(-6)}
        </p>

        {/* Daily Predictions */}
        {suggestions.length > 0 && (
          <div className="rounded-xl p-4 mb-6" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>CoinGecko Suggestions</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: "color-mix(in srgb, #10B981 15%, transparent)", color: "#10B981" }}>Free</span>
            </div>
            {dailyPrices.btc && <p className="text-[10px] font-mono mb-3" style={{ color: "var(--text-quaternary)" }}>BTC: ${dailyPrices.btc.toLocaleString()} &middot; ETH: ${dailyPrices.eth?.toLocaleString()} &middot; SOL: ${dailyPrices.sol?.toLocaleString()}</p>}
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div>
                    <p className="text-[11px] font-mono" style={{ color: "var(--text-primary)" }}>{s.question}</p>
                    <p className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-quaternary)" }}>Resolves at {new Date(s.resolvesAt * 1000).toLocaleTimeString()}</p>
                  </div>
                  <button onClick={() => doWrite(() => writeContractAsync({
                    address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
                    functionName: "createMarket", args: [s.question, BigInt(s.resolvesAt)],
                    chainId: LITVM_CHAIN_ID,
                  }).then(tx => { addLog(`createMarket tx: ${tx}`); }), "Market created!")} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#F59E0B", color: "#000", border: "none", whiteSpace: "nowrap" }}>
                    Create Market
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => applyPreset(p.question, p.resolvesInMin)} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "color-mix(in srgb, #8B5CF6 12%, transparent)", color: "#8B5CF6", border: "1px solid color-mix(in srgb, #8B5CF6 20%, transparent)" }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="rounded-xl p-6 mb-6 space-y-3" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Question</label>
              <input value={createQuestion} onChange={(e) => setCreateQuestion(e.target.value)} placeholder="Will BTC exceed $70k?" className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Resolves At</label>
              <input type="datetime-local" value={createResolvesAt} onChange={(e) => setCreateResolvesAt(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <button onClick={handleCreateMarket} disabled={!createQuestion || !createResolvesAt} className="px-6 py-2.5 rounded-xl text-xs font-mono transition-all hover:opacity-80 disabled:opacity-40" style={{ background: "#8B5CF6", color: "#fff", border: "none" }}>
              Create Market
            </button>
          </div>
        )}

        {/* Active markets */}
        {!activeMarkets || (activeMarkets as any[])?.length === 0 ? (
          <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>No active markets. Create one!</p>
        ) : (
          <div className="space-y-3">
            {(activeMarkets as any[])?.map((m: any) => {
              const isExpired = Number(m.resolvesAt) * 1000 < Date.now();
              const poolTotal = Number(m.yesPool) + Number(m.noPool);
              const yesPct = poolTotal > 0 ? (Number(m.yesPool) / poolTotal) * 100 : 50;
              return (
                <div key={String(m.id)} className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{m.question}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{
                      background: m.resolved ? "color-mix(in srgb, #8B5CF6 15%, transparent)" : isExpired ? "color-mix(in srgb, #EF4444 15%, transparent)" : "color-mix(in srgb, #10B981 15%, transparent)",
                      color: m.resolved ? "#8B5CF6" : isExpired ? "#EF4444" : "#10B981",
                    }}>
                      {m.resolved ? `Resolved: ${m.outcome ? "YES" : "NO"}` : isExpired ? "Expired" : "Open"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" style={{ color: "#10B981" }} /> YES: {Number(m.yesPool)}</span>
                    <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" style={{ color: "#EF4444" }} /> NO: {Number(m.noPool)}</span>
                    <span>Ends: {new Date(Number(m.resolvesAt) * 1000).toLocaleTimeString()}</span>
                  </div>
                  {poolTotal > 0 && (
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${yesPct}%`, background: "linear-gradient(90deg, #10B981, #EF4444)" }} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {!m.resolved && !isExpired && (
                      <>
                        <button onClick={() => handlePredict(m.id, true)} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#10B981", color: "#fff", border: "none" }}>
                          YES (0.001 zkLTC)
                        </button>
                        <button onClick={() => handlePredict(m.id, false)} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#EF4444", color: "#fff", border: "none" }}>
                          NO (0.001 zkLTC)
                        </button>
                      </>
                    )}
                    {!m.resolved && isExpired && (
                      <button onClick={() => handleResolve(m.id, true)} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#8B5CF6", color: "#fff", border: "none" }}>
                        Resolve YES
                      </button>
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
