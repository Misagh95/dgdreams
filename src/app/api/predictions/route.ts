import { NextResponse } from "next/server";

const COINGECKO = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd";

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export async function GET() {
  try {
    const res = await fetch(COINGECKO, { next: { revalidate: 3600 } });
    const data = await res.json();
    const btc = data?.bitcoin?.usd || 0;
    const eth = data?.ethereum?.usd || 0;
    const sol = data?.solana?.usd || 0;

    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const suggestions = [
      {
        question: `Will BTC close above $${(btc + 1000).toLocaleString()} by end of day?`,
        targetPrice: roundToNearest(btc + 1000, 1000),
        resolvesAt: Math.floor(endOfDay.getTime() / 1000),
        source: "coingecko",
        currentPrice: btc,
      },
      {
        question: `Will ETH stay above $${(eth - 100).toLocaleString()} by end of day?`,
        targetPrice: roundToNearest(eth - 100, 100),
        resolvesAt: Math.floor(endOfDay.getTime() / 1000),
        source: "coingecko",
        currentPrice: eth,
      },
    ];

    return NextResponse.json({
      date: now,
      suggestions,
      prices: { btc, eth, sol },
    });
  } catch {
    return NextResponse.json({
      date: Date.now(),
      suggestions: [],
      prices: {},
      error: "Failed to fetch prices",
    });
  }
}
