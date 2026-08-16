"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import DashboardLayout from "@/components/DashboardLayout";
import GenLayerSpinner from "@/components/GenLayerSpinner";
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
  const [price, setPrice] = useState<number | null>(null);
  const [priceStatus, setPriceStatus] = useState<string>("idle"); // idle | pending | verified | failed
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onGenLayer = isGenLayerChain(chainId ?? 0);

  useEffect(() => {
    if (!txHash || !onGenLayer) return;
    let cancelled = false;
    pollRef.current = setInterval(async () => {
      if (cancelled) return;
      const s = await getTxStatus(txHash);
      if (s.status === "FINALIZED" || s.status === "ACCEPTED") {
        if (cancelled) return;
        try {
          const data = await oracleGetPrice(symbol);
          if (data.price) setPrice(data.price);
          setPriceStatus("verified");
        } catch {
          setPriceStatus("failed");
        }
      }
    }, 5000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [txHash, onGenLayer, symbol]);

  const handleChangeSymbol = useCallback((s: string) => {
    setSymbol(s);
    setTxHash(null);
    setPrice(null);
    setPriceStatus("idle");
    setError(null);
  }, []);

  const handleFetch = useCallback(async () => {
    if (!address || !onGenLayer) return;
    setFetching(true);
    setError(null);
    setPrice(null);
    setPriceStatus("idle");
    setTxHash(null);
    try {
      const [hash] = await Promise.all([
        oracleFetchPrice(address, symbol),
        fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${BINANCE_SYMBOLS[symbol]}`)
          .then(r => r.json())
          .then(d => setPrice(parseFloat(d.price)))
          .catch(() => {}),
      ]);
      setTxHash(hash);
      setPriceStatus("pending");
    } catch (err: any) {
      setError(err?.message || "Transaction failed");
      setPriceStatus("failed");
    } finally {
      setFetching(false);
    }
  }, [address, onGenLayer, symbol]);

  const handleSwitch = useCallback(async () => {
    if (!isConnected) { openConnectModal?.(); return; }
    try { await switchChainAsync({ chainId: 4221 }); } catch {}
  }, [isConnected, switchChainAsync, openConnectModal]);

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
                Submit a price fetch transaction and get AI-validated price data
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
                  {symbol}/USDT · {priceStatus === "verified" ? "On-Chain" : priceStatus === "pending" ? "Awaiting Consensus" : priceStatus === "failed" ? "Failed" : "No Data"}
                </p>
                <p className="text-4xl font-bold font-mono" style={{ color: price ? "var(--text-bright)" : "var(--text-quaternary)" }}>
                  {price ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "---"}
                </p>
                {priceStatus === "pending" && (
                  <p className="text-[10px] font-mono mt-2" style={{ color: "var(--text-tertiary)" }}>
                    <GenLayerSpinner size={12} className="mr-1 align-middle" />
                    Waiting for {txHash ? "AI consensus" : "transaction..."}
                  </p>
                )}
                {priceStatus === "verified" && (
                  <p className="text-[10px] font-mono mt-2" style={{ color: "var(--success)" }}>
                    ✓ Verified by GenLayer validators
                  </p>
                )}
              </div>

              <button
                onClick={handleFetch}
                disabled={fetching}
                className="w-full py-3 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {fetching ? <><GenLayerSpinner size={14} className="mr-2 align-middle" />Submitting transaction...</> : `Fetch ${symbol}/USDT via GenLayer`}
              </button>

              {txHash && priceStatus !== "pending" && priceStatus !== "verified" && (
                <div className="mt-3 text-center">
                  <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>
                    Tx: {txHash.slice(0, 14)}...{txHash.slice(-6)}
                  </p>
                </div>
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
              <div><strong style={{ color: "var(--text-secondary)" }}>Submit Transaction</strong> — Click &quot;Fetch&quot; to submit a price request to the GenLayer oracle contract. The price is fetched from Binance and shown immediately.</div>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>2</span>
              <div><strong style={{ color: "var(--text-secondary)" }}>AI Consensus</strong> — 5 independent validators each fetch the price. <code className="text-[10px] px-1 py-0.5 rounded" style={{ background: "var(--bg-subtle)" }}>strict_eq</code> ensures they agree before the result is stored on-chain.</div>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>3</span>
              <div><strong style={{ color: "var(--text-secondary)" }}>On-Chain Storage</strong> — After consensus (&lt;30 min), the verified price is stored on GenLayer and becomes available to other smart contracts.</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
