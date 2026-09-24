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
