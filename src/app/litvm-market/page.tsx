"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSwitchChain, useReadContract, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import DashboardLayout from "@/components/DashboardLayout";
import { LITE_PREDICTION_ADDR, LITE_PREDICTION_ABI } from "@/lib/litevm-prediction";
import { BarChart3, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { logPredictionActivity } from "@/lib/log-activity";

const LITVM_CHAIN_ID = 4441;
const PREDICT_AMOUNT = "1000000000000000";

const QUICK_QUESTIONS = [
  "Will BTC exceed $75,000 by end of week?",
  "Will ETH break $4,000 by end of week?",
  "Will SOL stay above $150 by end of day?",
  "Will ADA reach $1 by end of month?",
];

export default function LitVMMarketPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();
  const onLiteVM = isConnected && chainId === LITVM_CHAIN_ID;

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createQuestion, setCreateQuestion] = useState("");
  const [createHours, setCreateHours] = useState("24");

  const addLog = useCallback((msg: string) => setLog((p) => [msg, ...p.slice(0, 49)]), []);

  const { data: activeMarkets, refetch: refetchMarkets } = useReadContract({
    address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
    functionName: "getActiveMarkets", args: [], chainId: LITVM_CHAIN_ID,
    query: { enabled: !!address },
  });

  useEffect(() => {
    fetch("/api/predictions").then(r => r.json()).then(d => {
      setSuggestions(d.suggestions || []);
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

  const handleCreate = async (question: string, hours: string) => {
    if (!question) return;
    const resolvesAt = Math.floor(Date.now() / 1000) + parseInt(hours) * 3600;
    await doWrite(async () => {
      const tx = await writeContractAsync({
        address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
        functionName: "createMarket", args: [question, BigInt(resolvesAt)],
        chainId: LITVM_CHAIN_ID,
      });
      addLog(`createMarket tx: ${tx}`);
      logPredictionActivity({ walletAddress: address!, action: "create_market", question, chain: "litvm", txHash: tx });
      setShowCreate(false);
      setCreateQuestion("");
    }, "Market created!");
  };

  const handlePredict = async (id: bigint, outcome: boolean, question?: string) => {
    await doWrite(async () => {
      const tx = await writeContractAsync({
        address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
        functionName: "predict", args: [id, outcome],
        value: BigInt(PREDICT_AMOUNT),
        chainId: LITVM_CHAIN_ID,
      });
      addLog(`predict #${id} ${outcome ? "YES" : "NO"} tx: ${tx}`);
      logPredictionActivity({ walletAddress: address!, action: outcome ? "predict_yes" : "predict_no", question: question || `Market #${id}`, marketId: String(id), chain: "litvm", txHash: tx });
    }, outcome ? "YES predicted!" : "NO predicted!");
  };

  const handleResolve = async (id: bigint, outcome: boolean, question?: string) => {
    await doWrite(async () => {
      const tx = await writeContractAsync({
        address: LITE_PREDICTION_ADDR, abi: LITE_PREDICTION_ABI,
        functionName: "resolveMarket", args: [id, outcome],
        chainId: LITVM_CHAIN_ID,
      });
      addLog(`resolve #${id} -> ${outcome ? "YES" : "NO"} tx: ${tx}`);
      logPredictionActivity({ walletAddress: address!, action: "resolve_market", question: question || `Market #${id}`, marketId: String(id), chain: "litvm", txHash: tx });
    }, "Resolved!");
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
            <Sparkles className="w-5 h-5" style={{ color: "#8B5CF6" }} />
            <h1 className="text-lg font-mono font-semibold" style={{ color: "var(--text-primary)" }}>Predictions</h1>
          </div>
          <div className="flex items-center gap-2">
            {!onLiteVM && <span className="text-[9px] px-2 py-1 rounded-full font-mono" style={{ background: "color-mix(in srgb, #EF4444 15%, transparent)", color: "#EF4444" }}>Switch to LITVM</span>}
            <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
              {showCreate ? "Cancel" : "+ New"}
            </button>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 mb-6">
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} onClick={() => { setCreateQuestion(q); setShowCreate(true); }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80 text-left max-w-[280px]"
              style={{ background: "color-mix(in srgb, #8B5CF6 10%, transparent)", color: "#8B5CF6", border: "1px solid color-mix(in srgb, #8B5CF6 20%, transparent)" }}>
              {q}
            </button>
          ))}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="rounded-xl p-6 mb-6 space-y-3" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Question</label>
              <textarea value={createQuestion} onChange={(e) => setCreateQuestion(e.target.value)} rows={2} placeholder='Will BTC exceed $75,000 by end of week?' className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none resize-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Resolves In</label>
                <select value={createHours} onChange={(e) => setCreateHours(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
                  <option value="1">1 hour</option>
                  <option value="4">4 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">3 days</option>
                  <option value="168">7 days</option>
                  <option value="720">30 days</option>
                </select>
              </div>
              <button onClick={() => handleCreate(createQuestion, createHours)} disabled={!createQuestion.trim()} className="mt-5 px-6 py-2.5 rounded-xl text-xs font-mono transition-all hover:opacity-80 disabled:opacity-40" style={{ background: "#8B5CF6", color: "#fff", border: "none" }}>
                Create Market
              </button>
            </div>
          </div>
        )}

        {/* Daily Suggestions */}{suggestions.length > 0 && (
          <div className="rounded-xl p-5 mb-6 space-y-3" style={{ background: "linear-gradient(135deg, color-mix(in srgb, #10B981 8%, var(--bg-strong)) 0%, color-mix(in srgb, #8B5CF6 5%, var(--bg-strong)) 100%)", border: "1px solid color-mix(in srgb, #10B981 20%, transparent)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: "#10B981" }} />
                 <span className="text-xs font-mono font-semibold" style={{ color: "var(--text-primary)" }}>Today&apos;s Predictions</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: "color-mix(in srgb, #10B981 15%, transparent)", color: "#10B981" }}>CoinGecko</span>
              </div>
              <p className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>{suggestions.length} questions</p>
            </div>
            <div className="space-y-2">
              {suggestions.slice(0, 6).map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[11px] font-mono" style={{ color: "var(--text-primary)" }}>{s.question}</p>
                    <p className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-quaternary)" }}>Ends {new Date(s.resolvesAt * 1000).toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleCreate(s.question, String(Math.max(1, Math.round((s.resolvesAt - Date.now() / 1000) / 3600))))} className="px-3 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap" style={{ background: "#10B981", color: "#000", border: "none" }}>
                    Create
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active markets */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color: "var(--text-quaternary)" }}>Active Markets</p>
          {!activeMarkets || (activeMarkets as any[])?.length === 0 ? (
            <p className="text-xs font-mono py-8 text-center" style={{ color: "var(--text-quaternary)" }}>No active markets — create one!</p>
          ) : (
            <div className="space-y-3">
              {(activeMarkets as any[])?.map((m: any) => {
                const isExpired = Number(m.resolvesAt) * 1000 < Date.now();
                const poolTotal = Number(m.yesPool) + Number(m.noPool);
                const yesPct = poolTotal > 0 ? (Number(m.yesPool) / poolTotal) * 100 : 50;
                return (
                  <div key={String(m.id)} className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-mono font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{m.question}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0" style={{
                        background: m.resolved ? "color-mix(in srgb, #8B5CF6 15%, transparent)" : isExpired ? "color-mix(in srgb, #EF4444 15%, transparent)" : "color-mix(in srgb, #10B981 15%, transparent)",
                        color: m.resolved ? "#8B5CF6" : isExpired ? "#EF4444" : "#10B981",
                      }}>
                        {m.resolved ? m.outcome ? "YES ✓" : "NO ✗" : isExpired ? "Expired" : "Open"}
                      </span>
                    </div>
                    {poolTotal > 0 && (
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${yesPct}%`, background: "linear-gradient(90deg, #10B981, #EF4444)" }} />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
                      <span>Ends {new Date(Number(m.resolvesAt) * 1000).toLocaleString()}</span>
                      <span>Pool: {poolTotal} zkLTC</span>
                    </div>
                    <div className="flex gap-2">
                      {!m.resolved && (
                        isExpired ? (
                          <button onClick={() => handleResolve(m.id, true, m.question)} className="flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all hover:opacity-80" style={{ background: "#8B5CF6", color: "#fff", border: "none" }}>
                            Resolve YES
                          </button>
                        ) : (
                          <>
                            <button onClick={() => handlePredict(m.id, true, m.question)} className="flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all hover:opacity-80 flex items-center justify-center gap-1.5" style={{ background: "color-mix(in srgb, #10B981 15%, transparent)", color: "#10B981", border: "1px solid color-mix(in srgb, #10B981 30%, transparent)" }}>
                              <TrendingUp className="w-3.5 h-3.5" /> YES · {Number(m.yesPool)}
                            </button>
                            <button onClick={() => handlePredict(m.id, false, m.question)} className="flex-1 py-2 rounded-lg text-xs font-mono font-semibold transition-all hover:opacity-80 flex items-center justify-center gap-1.5" style={{ background: "color-mix(in srgb, #EF4444 15%, transparent)", color: "#EF4444", border: "1px solid color-mix(in srgb, #EF4444 30%, transparent)" }}>
                              <TrendingDown className="w-3.5 h-3.5" /> NO · {Number(m.noPool)}
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
        </div>

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
