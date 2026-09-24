"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useBalance, useConfig, useReadContract, useSwitchChain } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { encodeFunctionData, formatUnits, maxUint256, parseUnits, type Address } from "viem";
import { ArrowDownUp, Zap } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import NetworkSelect from "@/components/NetworkSelect";
import TokenSelect from "@/components/swap/TokenSelect";
import { getNetworkConfig } from "@/config/chains";
import { parseTxError, getExplorerUrl, shortenHash } from "@/utils/transactions";
import {
  fetchQuotes, fetchTokens, isNativeToken, sortTokens,
  SWAP_SUPPORTED_CHAINS, SWAP_SOURCES,
  type LifiToken, type NormalizedQuote, type SwapSourceId,
} from "@/lib/lifi";

const ERC20_ABI = [
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" },
] as const;

type Phase = "idle" | "quoting" | "quoted" | "approving" | "swapping" | "confirmed" | "failed";

const NETWORKS = SWAP_SUPPORTED_CHAINS.map((id) => {
  const c = getNetworkConfig(id)!;
  return { id: c.id, name: c.name };
});export default function SwapPage() {
  const { address, isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const wagmiConfig = useConfig();

  const [netId, setNetId] = useState<number>(8453);
  const [tokens, setTokens] = useState<LifiToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [fromToken, setFromToken] = useState<LifiToken | undefined>();
  const [toToken, setToToken] = useState<LifiToken | undefined>();
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<NormalizedQuote | null>(null);
  const [quotes, setQuotes] = useState<NormalizedQuote[]>([]);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<SwapSourceId>("lifi");
  const [phase, setPhase] = useState<Phase>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const quoteReqId = useRef(0);
  const sourceIdRef = useRef<SwapSourceId>("lifi");

  /* Keep refs in sync for use inside async quote callbacks */
  useEffect(() => { sourceIdRef.current = sourceId; }, [sourceId]);
  /* Keep refs in sync for use inside async quote callbacks */
  useEffect(() => { sourceIdRef.current = sourceId; }, [sourceId]);

  const pickSource = useCallback((id: SwapSourceId) => {
    sourceIdRef.current = id;
    setSourceId(id);
    setQuotes((prev) => {
      const q = prev.find((x) => x.source === id);
      if (q) {
        setQuote(q);
        setTxHash(null);
        setError(null);
      }
      return prev;
    });
  }, []);


  const net = getNetworkConfig(netId);

  useEffect(() => {
    let cancel = false;
    setTokensLoading(true);
    setFromToken(undefined);
    setToToken(undefined);
    setQuote(null);
    fetchTokens(netId)
      .then((list) => {
        if (cancel) return;
        const sorted = sortTokens(list);
        setTokens(sorted);
        setFromToken(sorted[0]);
        setToToken(sorted.find((t) => t.symbol === "USDC") ?? sorted[1]);
      })
      .catch(() => { if (!cancel) setTokens([]); })
      .finally(() => { if (!cancel) setTokensLoading(false); });
    return () => { cancel = true; };
  }, [netId]);

  const isFromNative = fromToken ? isNativeToken(fromToken.address) : true;
  const { data: balance } = useBalance({
    address,
    chainId: netId,
    token: isFromNative ? undefined : (fromToken?.address as Address | undefined),
    query: { enabled: isConnected && !!fromToken },
  });

  const fromAmountWei = useMemo(() => {
    try {
      if (!fromToken || !amount || Number(amount) <= 0) return null;
      return parseUnits(amount, fromToken.decimals);
    } catch {
      return null;
    }
  }, [amount, fromToken]);
  useEffect(() => {
    if (!fromToken || !toToken || !fromAmountWei || !address || fromToken.address === toToken.address) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    setPhase("quoting");
    setQuoteError(null);
    const timer = setTimeout(async () => {
      const want = quoteReqId.current + 1;
      quoteReqId.current = want;
      try {
        const all = await fetchQuotes(
          SWAP_SOURCES.map((s) => s.id),
          {
            chainId: netId,
            fromToken: fromToken.address as Address,
            toToken: toToken.address as Address,
            fromAmount: fromAmountWei.toString(),
            fromAddress: address,
          }
        );
        if (quoteReqId.current !== want) return; // stale response
        if (all.length === 0) throw new Error("No route from any source");
        setQuotes(all);
        const pick = all.find((q) => q.source === sourceIdRef.current) ?? all[0];
        setQuote(pick);
        setPhase("quoted");
      } catch (e: any) {
        if (quoteReqId.current !== want) return;
        setQuote(null);
        setQuotes([]);
        setQuoteError(e?.message || "No route found");
        setPhase("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fromToken, toToken, fromAmountWei, address, netId]);

  /* Allowance check for ERC20 source */
  const needsApproval = quote && fromToken && !isFromNative && fromAmountWei
    ? { spender: quote.approvalAddress as Address, token: fromToken.address as Address }
    : null;
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: needsApproval?.token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: needsApproval && address ? [address, needsApproval.spender] : undefined,
    chainId: netId,
    query: { enabled: !!needsApproval && !!address && chainId === netId },
  });
  const mustApprove = !!needsApproval && allowance !== undefined && fromAmountWei !== null && allowance < fromAmountWei;

  const getProvider = useCallback(async () => {
    const state = wagmiConfig.state;
    const conn = state.current ? state.connections.get(state.current) : undefined;
    return (conn?.connector ? await conn.connector.getProvider() : undefined) as
      | { request: (a: { method: string; params?: readonly unknown[] }) => Promise<unknown> }
      | undefined;
  }, [wagmiConfig]);

  const sendViaProvider = useCallback(
    async (tx: { to: string; data: string; value?: string }): Promise<`0x${string}`> => {
      const provider = await getProvider();
      if (!provider?.request) throw new Error("No wallet provider");
      return (await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: address, to: tx.to, data: tx.data, ...(tx.value && tx.value !== "0x0" ? { value: tx.value } : {}) }],
      })) as `0x${string}`;
    },
    [getProvider, address]
  );

  const pollReceipt = useCallback(
    async (hash: `0x${string}`) => {
      const pub = getPublicClient(wagmiConfig, { chainId: netId });
      const provider = await getProvider();
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const r = await pub?.getTransactionReceipt({ hash });
          if (r) return r.status === "success";
        } catch { /* try provider */ }
        try {
          const r = (await provider?.request({ method: "eth_getTransactionReceipt", params: [hash] })) as { status?: string } | null;
          if (r) return r.status !== "0x0";
        } catch { /* keep polling */ }
      }
      throw new Error("Confirmation timed out — check the explorer");
    },
    [wagmiConfig, netId, getProvider]
  );

  const ensureChain = useCallback(async () => {
    if (chainId !== netId) await switchChainAsync({ chainId: netId });
  }, [chainId, netId, switchChainAsync]);
  const handleApprove = useCallback(async () => {
    if (!needsApproval || !address) return;
    setError(null);
    setPhase("approving");
    try {
      await ensureChain();
      const data = encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [needsApproval.spender, maxUint256] });
      const hash = await sendViaProvider({ to: needsApproval.token, data });
      setTxHash(hash);
      const ok = await pollReceipt(hash);
      if (!ok) throw new Error("Approve transaction reverted");
      await refetchAllowance();
      setPhase("quoted");
    } catch (e: any) {
      setError(parseTxError(e));
      setPhase(quote ? "quoted" : "idle");
    }
  }, [needsApproval, address, ensureChain, sendViaProvider, pollReceipt, refetchAllowance, quote]);

  const handleSwap = useCallback(async () => {
    if (!quote || !address) return;
    setError(null);
    setPhase("swapping");
    try {
      await ensureChain();
      const hash = await sendViaProvider(quote.send);
      setTxHash(hash);
      const ok = await pollReceipt(hash);
      if (!ok) {
        setError("Transaction reverted on-chain");
        setPhase("failed");
        return;
      }
      setPhase("confirmed");
    } catch (e: any) {
      setError(parseTxError(e));
      setPhase("quoted");
    }
  }, [quote, address, ensureChain, sendViaProvider, pollReceipt]);

  const flip = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setQuote(null);
  }, [fromToken, toToken]);

  const estOut = quote && toToken ? formatUnits(BigInt(quote.toAmount), toToken.decimals) : null;
  const estOutMin = quote && toToken ? formatUnits(BigInt(quote.toAmountMin), toToken.decimals) : null;
  const notEnoughBalance = balance && fromAmountWei ? balance.value < fromAmountWei : false;
  const busy = phase === "quoting" || phase === "approving" || phase === "swapping";

  return (
    <DashboardLayout title="Swap" subtitle="// token exchange via LI.FI aggregation">
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span className="font-semibold text-sm" style={{ color: "var(--text-bright)" }}>Swap</span>
          </div>
          <NetworkSelect
            networks={NETWORKS}
            value={netId}
            onChange={(id) => { setNetId(id); setQuote(null); setPhase("idle"); }}
            disabled={busy}
          />
        </div>
        {/* From */}
        <div className="p-4 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>From</span>
            {balance && (
              <button
                onClick={() => setAmount(formatUnits(balance.value, balance.decimals))}
                className="text-[10px] font-mono hover:opacity-80"
                style={{ color: "var(--accent)" }}
              >
                Balance: {Number(formatUnits(balance.value, balance.decimals)).toFixed(5)} {balance.symbol} · MAX
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent outline-none text-2xl font-semibold min-w-0"
              style={{ color: "var(--text-bright)" }}
            />
            <TokenSelect tokens={tokens} value={fromToken} onChange={(t) => { setFromToken(t); setQuote(null); }} label="From token" />
          </div>
          {notEnoughBalance && (
            <p className="text-[11px] mt-1.5" style={{ color: "var(--danger)" }}>Insufficient balance</p>
          )}
        </div>

        {/* Flip */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={flip}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform hover:rotate-180 duration-300"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--accent)" }}
            aria-label="Flip tokens"
          >
            <ArrowDownUp className="w-4 h-4" />
          </button>
        </div>

        {/* To */}
        <div className="p-4 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>To (estimated)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-2xl font-semibold min-w-0 truncate" style={{ color: phase === "quoting" ? "var(--text-tertiary)" : "var(--text-bright)" }}>
              {phase === "quoting" ? "..." : estOut ? Number(estOut).toPrecision(7) : "0.0"}
            </span>
            <TokenSelect tokens={tokens} value={toToken} onChange={(t) => { setToToken(t); setQuote(null); }} label="To token" />
          </div>
        </div>
        {/* Quote details */}
        {quote && (
          <div className="p-3 rounded-xl text-xs space-y-1.5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-default)" }}>
            <div className="flex justify-between" style={{ color: "var(--text-tertiary)" }}>
              <span>Route</span>
              <span className="font-mono" style={{ color: "var(--accent)" }}>{quote.tool} · via {quote.source === "lifi" ? "LI.FI" : "Relay"}</span>
            </div>
            <div className="flex justify-between" style={{ color: "var(--text-tertiary)" }}>
              <span>Min. received</span>
              <span className="font-mono" style={{ color: "var(--text-bright)" }}>{estOutMin ? Number(estOutMin).toPrecision(6) : "-"} {toToken?.symbol}</span>
            </div>
            <div className="flex justify-between" style={{ color: "var(--text-tertiary)" }}>
              <span>Slippage</span>
              <span className="font-mono" style={{ color: "var(--text-bright)" }}>0.5%</span>
            </div>
          </div>
        )}

        {/* Source comparison */}
        {quotes.length > 1 && (
          <div className="p-3 rounded-xl space-y-1.5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-default)" }}>
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Compare sources</span>
            {quotes.map((q) => {
              const bestTo = quotes.reduce((m, x) => (BigInt(x.toAmount) > BigInt(m.toAmount) ? x : m)).toAmount;
              const out = toToken ? Number(formatUnits(BigInt(q.toAmount), toToken.decimals)) : 0;
              const best = q.toAmount === bestTo;
              const active = quote?.source === q.source;
              return (
                <button
                  key={q.source}
                  type="button"
                  onClick={() => pickSource(q.source)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all hover:opacity-85"
                  style={{
                    background: active ? "var(--accent-muted)" : "var(--bg-strong)",
                    border: active ? "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" : "1px solid var(--border-default)",
                  }}
                >
                  <span className="font-semibold" style={{ color: active ? "var(--accent)" : "var(--text-primary)" }}>
                    {q.source === "lifi" ? "LI.FI" : "Relay"}
                    {best && (
                      <span className="ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}>BEST</span>
                    )}
                  </span>
                  <span className="font-mono" style={{ color: "var(--text-bright)" }}>{out.toPrecision(6)} {toToken?.symbol}</span>
                </button>
              );
            })}
          </div>
        )}

        {quoteError && (
          <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(255,170,0,.1)", border: "1px solid rgba(255,170,0,.28)", color: "#FFC24B" }}>{quoteError}</p>
        )}
        {error && (
          <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "color-mix(in srgb, var(--danger) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)", color: "var(--danger)" }}>{error}</p>
        )}
        {txHash && net && (
          <a
            href={getExplorerUrl(net, txHash, "tx")}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[11px] font-mono hover:underline"
            style={{ color: "var(--text-tertiary)" }}
          >
            {phase === "confirmed" ? "Swap confirmed - " : ""}{shortenHash(txHash)}
          </a>
        )}
        {/* Action button */}
        {!isConnected ? (
          <button
            onClick={() => openConnectModal?.()}
            className="btn-primary w-full justify-center py-3.5 rounded-2xl text-sm font-semibold"
          >
            Connect Wallet
          </button>
        ) : tokensLoading ? (
          <button
            disabled
            className="btn-primary w-full justify-center py-3.5 rounded-2xl text-sm font-semibold opacity-60"
          >
            Loading tokens...
          </button>
        ) : mustApprove ? (
          <button
            onClick={handleApprove}
            disabled={busy}
            className="btn-primary w-full justify-center py-3.5 rounded-2xl text-sm font-semibold"
          >
            {phase === "approving" ? "Approving..." : "Approve " + (fromToken?.symbol ?? "")}
          </button>
        ) : (
          <button
            onClick={handleSwap}
            disabled={busy || !quote || !!notEnoughBalance || !amount}
            className="btn-primary w-full justify-center py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-40"
          >
            {phase === "swapping" ? (
              "Swapping..."
            ) : phase === "quoting" ? (
              "Fetching best route..."
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Swap
              </span>
            )}
          </button>
        )}

        <p className="text-center text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
          Powered by LI.FI - quotes refresh as you type
        </p>
      </div>
    </DashboardLayout>
  );
}