"use client";

import { isAddress, type Address } from "viem";

/* ─────────────────────────────────────────────
   LI.FI swap integration (public, keyless API)
   ───────────────────────────────────────────── */

export const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

export interface LifiToken {
  address: string;
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  priceUSD?: string;
}

export interface LifiQuote {
  id: string;
  tool: string;
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    feeCosts?: { amountUSD?: string }[];
  };
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
    gasPrice?: string;
    chainId: number;
    from?: string;
  };
}

/* Chains from our config that LI.FI actually supports (checked live). */
export const SWAP_SUPPORTED_CHAINS = [
  8453, 999, 130, 4217, 4663, 1, 57073, 5042,
] as const;

/* In-memory token-list cache so switching tokens/networks is instant. */
const tokenCache = new Map<number, LifiToken[]>();

export async function fetchTokens(chainId: number): Promise<LifiToken[]> {
  const hit = tokenCache.get(chainId);
  if (hit) return hit;
  const res = await fetch(`https://li.quest/v1/tokens?chains=${chainId}`);
  if (!res.ok) throw new Error(`Token list failed (${res.status})`);
  const json = await res.json();
  const list: LifiToken[] = (json.tokens?.[String(chainId)] ?? []).filter(
    (t: LifiToken) => isAddress(t.address)
  );
  tokenCache.set(chainId, list);
  return list;
}

export function isNativeToken(addr: string): boolean {
  return addr.toLowerCase() === NATIVE_TOKEN.toLowerCase();
}

/** Popular tokens shown on top of the selector. */
const PINNED_SYMBOLS = ["USDC", "USDT", "WETH", "ETH", "DAI", "EURC", "HYPE", "UNI"];

export function sortTokens(tokens: LifiToken[]): LifiToken[] {
  return [...tokens].sort((a, b) => {
    if (isNativeToken(a.address)) return -1;
    if (isNativeToken(b.address)) return 1;
    const ai = PINNED_SYMBOLS.indexOf(a.symbol);
    const bi = PINNED_SYMBOLS.indexOf(b.symbol);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.symbol.localeCompare(b.symbol);
  });
}

export async function fetchQuote(params: {
  chainId: number;
  fromToken: Address;
  toToken: Address;
  fromAmount: string;
  fromAddress: Address;
  slippage?: number;
}): Promise<LifiQuote> {
  const q = new URLSearchParams({
    fromChain: String(params.chainId),
    toChain: String(params.chainId),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAddress: params.fromAddress,
    fromAmount: params.fromAmount,
    slippage: String(params.slippage ?? 0.005),
  });
  const res = await fetch(`https://li.quest/v1/quote?${q}`);
  if (!res.ok) {
    let msg = `Quote failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  return res.json();
}

/* ─────────────────────────────────────────────
   Multi-source Layer — user picks the aggregator
   ───────────────────────────────────────────── */

export type SwapSourceId = "lifi" | "relay";

export interface SwapSource {
  id: SwapSourceId;
  name: string;
  tagline: string;
}

export const SWAP_SOURCES: SwapSource[] = [
  { id: "lifi", name: "LI.FI", tagline: "Dex + bridge aggregator" },
  { id: "relay", name: "Relay", tagline: "Fast multichain solver" },
];

/* Normalized quote used by the Swap page — same shape for every source. */
export interface NormalizedQuote {
  source: SwapSourceId;
  tool: string;
  toAmount: string;
  toAmountMin: string;
  approvalAddress: string;
  send: { to: string; data: string; value?: string };
}

interface SourceQuoteParams {
  chainId: number;
  fromToken: Address;
  toToken: Address;
  fromAmount: string;
  fromAddress: Address;
  slippage?: number;
}

/* ── LI.FI adapter ── */

async function quoteLifi(p: SourceQuoteParams): Promise<NormalizedQuote> {
  const q = await fetchQuote(p);
  return {
    source: "lifi",
    tool: q.tool,
    toAmount: q.estimate.toAmount,
    toAmountMin: q.estimate.toAmountMin,
    approvalAddress: q.estimate.approvalAddress,
    send: {
      to: q.transactionRequest.to,
      data: q.transactionRequest.data,
      ...(q.transactionRequest.value && q.transactionRequest.value !== "0x0"
        ? { value: q.transactionRequest.value }
        : {}),
    },
  };
}

/* ── Relay adapter (api.relay.link/quote/v2, keyless) ── */

interface RelayQuoteResponse {
  requestId?: string;
  details?: {
    currencyOut?: { amount?: string; minimumAmount?: string };
    operation?: string;
    rate?: string;
    sender?: string;
    recipient?: string;
  };
  checks?: { approval?: { to?: string; spender?: string; value?: string } | null };
  steps?: {
    id: string;
    items?: { data?: { to?: string; data?: string; value?: string } }[];
  }[];
}

async function quoteRelay(p: SourceQuoteParams): Promise<NormalizedQuote> {
  const body = {
    user: p.fromAddress,
    originChainId: p.chainId,
    destinationChainId: p.chainId,
    originCurrency: p.fromToken,
    destinationCurrency: p.toToken,
    amount: p.fromAmount,
    tradeType: "EXACT_INPUT" as const,
    useExternalLiquidity: false,
  };
  const res = await fetch("https://api.relay.link/quote/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `Relay quote failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = Array.isArray(j.message) ? j.message.join("; ") : j.message;
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  const j = (await res.json()) as RelayQuoteResponse;
  const swapStep = (j.steps ?? []).find((s) => s.id === "swap");
  const txData = swapStep?.items?.[0]?.data;
  const out = j.details?.currencyOut;
  if (!txData?.to || !txData?.data || !out?.amount) {
    throw new Error("Relay: no executable route returned");
  }
  const approveSpender =
    j.checks?.approval?.spender ??
    (j.steps ?? []).find((s) => s.id === "approve")?.items?.[0]?.data?.to ??
    txData.to;
  return {
    source: "relay",
    tool: j.details?.operation === "SOLVE" ? "Relay Solver" : j.details?.operation ?? "Relay",
    toAmount: String(out.amount),
    toAmountMin: String(out.minimumAmount ?? out.amount),
    approvalAddress: approveSpender,
    send: {
      to: txData.to,
      data: txData.data,
      ...(txData.value && txData.value !== "0" && txData.value !== "0x0" ? { value: txData.value } : {}),
    },
  };
}

/* Fetch quotes from requested sources in parallel; returns successes only. */
export async function fetchQuotes(
  sourceIds: SwapSourceId[],
  params: SourceQuoteParams
): Promise<NormalizedQuote[]> {
  const results = await Promise.allSettled(
    sourceIds.map((id) => (id === "relay" ? quoteRelay(params) : quoteLifi(params)))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<NormalizedQuote> => r.status === "fulfilled")
    .map((r) => r.value);
}
