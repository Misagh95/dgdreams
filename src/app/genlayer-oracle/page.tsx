"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import DashboardLayout from "@/components/DashboardLayout";
import { isGenLayerChain } from "@/lib/genlayer/client";
import { oracleGetPrice, oracleFetchPrice, getTxStatus } from "@/lib/genlayer/oracle";
import { cn } from "@/lib/utils";

const SYMBOLS = ["BTC", "ETH", "SOL", "DOGE", "LINK"];
const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT", ETH: "ETHUSDT", SOL: "SOLUSDT", DOGE: "DOGEUSDT", LINK: "LINKUSDT",
};

export default function GenLayerOraclePage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const [symbol, setSymbol] = useState("BTC");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [loadingBinance, setLoadingBinance] = useState(true);
  const [onChainPrice, setOnChainPrice] = useState<number | null>(null);
  const [onChainStatus, setOnChainStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);
  const [binanceError, setBinanceError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [txConsensusStatus, setTxConsensusStatus] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onGenLayer = isGenLayerChain(chainId ?? 0);

  const fetchBinancePrice = useCallback(async (sym: string) => {
    setLoadingBinance(true);
    setBinanceError(null);
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${BINANCE_SYMBOLS[sym]}`);
      if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
      const data = await res.json();
      setLivePrice(parseFloat(data.price));
    } catch (e: any) {
      setLivePrice(null);
      setBinanceError(e?.message || "Failed to fetch live price");
    } finally {
      setLoadingBinance(false);
    }
  }, []);

  const loadOnChainPrice = useCallback(async () => {
    if (!onGenLayer) return;
    try {
      const data = await oracleGetPrice(symbol);
      setOnChainPrice(data.price);
      setOnChainStatus(data.status);
    } catch {
      setOnChainPrice(null);
      setOnChainStatus("unavailable");
    }
  }, [symbol, onGenLayer]);

  useEffect(() => {
    fetchBinancePrice(symbol);
    if (onGenLayer) loadOnChainPrice();
  }, [symbol, fetchBinancePrice, onGenLayer, loadOnChainPrice]);

  useEffect(() => {
    if (!txHash || !onGenLayer) return;
    let cancelled = false;
    pollRef.current = setInterval(async () => {
      if (cancelled) return;
      const s = await getTxStatus(txHash);
      setTxConsensusStatus(s.status);
      if (s.status === "FINALIZED" || s.status === "ACCEPTED") {
        if (cancelled) return;
        const data = await oracleGetPrice(symbol);
        if (data.price) setOnChainPrice(data.price);
        setOnChainStatus(data.status);
      }
    }, 5000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [txHash, onGenLayer, symbol]);

  const handleChangeSymbol = useCallback(async (s: string) => {
    setSymbol(s);
    setTxHash(null);
    setTxConsensusStatus(null);
    setOnChainPrice(null);
    setOnChainStatus("idle");
    // fetchBinancePrice and loadOnChainPrice triggered by useEffect
  }, []);

  const handleFetch = useCallback(async () => {
    if (!address || !onGenLayer) return;
    setFetching(true);
    setError(null);
    setTxHash(null);
    setTxConsensusStatus(null);
    try {
      const hash = await oracleFetchPrice(address, symbol);
      setTxHash(hash);
    } catch (err: any) {
      setError(err?.message || "Transaction failed");
    } finally {
      setFetching(false);
    }
  }, [address, onGenLayer, symbol]);

  const handleSwitch = useCallback(async () => {
    if (!isConnected) { openConnectModal?.(); return; }
    try { await switchChainAsync({ chainId: 4221 }); } catch {}
  }, [isConnected, switchChainAsync, openConnectModal]);

  const displayedPrice = onChainPrice ?? livePrice;

  return (
    <DashboardLayout title="GenLayer Oracle" subtitle="// AI-validated price feeds">
      <div className="space-y-6 max-w-2xl">
        <div className="p-5 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in srgb, #00D4FF 15%, transparent)" }}>
              <svg className="w-5 h-5" style={{ color: "#00D4FF" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-bright)" }}>GenLayer AI Oracle</h3>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Live price from Binance · Recorded on GenLayer with AI consensus
              </p>
            </div>
          </div>

          {!onGenLayer ? (
            <button onClick={handleSwitch}
              className="w-full py-3 rounded-lg text-sm font-medium text-white transition-all duration-200"
              style={{ background: "var(--accent)" }}
            >
              {isConnected ? "Switch to GenLayer Bradbury" : "Connect Wallet"}
            </button>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                {SYMBOLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleChangeSymbol(s)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      symbol === s ? "text-white" : "opacity-60 hover:opacity-100"
                    )}
                    style={{
                      background: symbol === s ? "var(--accent)" : "var(--bg-strong)",
                      border: "1px solid var(--border-strong)",
                    }}
                  >
                    {s}/USDT
                  </button>
                ))}
              </div>

              <div className="p-6 rounded-xl text-center mb-4" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-xs font-mono mb-1" style={{ color: "var(--text-quaternary)" }}>
                  {symbol}/USDT
                  {onChainPrice ? " · On-Chain" : livePrice ? " · Live" : ""}
                </p>
                <p className="text-4xl font-bold font-mono" style={{ color: displayedPrice ? "var(--text-bright)" : "var(--text-quaternary)" }}>
                  {loadingBinance && !onChainPrice ? "..." : displayedPrice ? `$${displayedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "---"}
                </p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  {onChainPrice && (
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
                      ✓ Recorded on GenLayer
                    </span>
                  )}
                  {livePrice && !onChainPrice && (
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: "color-mix(in srgb, #00D4FF 15%, transparent)", color: "#00D4FF" }}>
                      Live from Binance
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleFetch}
                disabled={fetching}
                className="w-full py-3 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {fetching ? "Submitting..." : `Record ${symbol}/USDT on GenLayer`}
              </button>

              {txHash && (
                <div className="mt-3 text-center">
                  <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>
                    Tx: {txHash.slice(0, 10)}...{txHash.slice(-6)}
                  </p>
                  {txConsensusStatus && (
                    <p className="text-[10px] font-mono mt-1" style={{ color: "var(--text-tertiary)" }}>
                      Consensus: {txConsensusStatus}
                      {txConsensusStatus !== "FINALIZED" && txConsensusStatus !== "ACCEPTED" && txConsensusStatus !== "UNKNOWN" && (
                        <span className="ml-1 animate-pulse" style={{ color: "var(--accent)" }}>●</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {binanceError && (
                <p className="text-xs mt-2 text-center" style={{ color: "var(--danger)" }}>
                  Binance API: {binanceError}
                </p>
              )}
              {error && (
                <p className="text-xs mt-2 text-center" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="p-5 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-bright)" }}>How It Works</h3>
          <div className="space-y-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>1</span>
              <div><strong style={{ color: "var(--text-secondary)" }}>Live Price</strong> — Fetched directly from Binance API and displayed instantly. No waiting.</div>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>2</span>
              <div><strong style={{ color: "var(--text-secondary)" }}>Submit to GenLayer</strong> — Click "Record on GenLayer" to submit the price to the AI oracle contract. 5 validators independently fetch and compare results using <code className="text-[10px] px-1 py-0.5 rounded" style={{ background: "var(--bg-subtle)" }}>strict_eq</code>.</div>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>3</span>
              <div><strong style={{ color: "var(--text-secondary)" }}>On-Chain Storage</strong> — After consensus (&lt;30 min), the verified price is stored on GenLayer and displayed with a ✓ badge.</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
