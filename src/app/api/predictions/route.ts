import { NextResponse } from "next/server";

const COINGECKO = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,avalanche-2,chainlink,polygon&vs_currencies=usd&include_24hr_change=true";

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function rng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

export async function GET() {
  try {
    const res = await fetch(COINGECKO, { next: { revalidate: 3600 } });
    const data = await res.json();
    const btc = data?.bitcoin?.usd || 0;
    const eth = data?.ethereum?.usd || 0;
    const sol = data?.solana?.usd || 0;
    const ada = data?.cardano?.usd || 0;
    const avax = data?.["avalanche-2"]?.usd || 0;
    const link = data?.chainlink?.usd || 0;
    const matic = data?.polygon?.usd || 0;

    const prices = { btc, eth, sol, ada, avax, link, matic };

    const btcChange = data?.bitcoin?.["usd_24h_change"] || 0;
    const ethChange = data?.ethereum?.["usd_24h_change"] || 0;
    const solChange = data?.solana?.["usd_24h_change"] || 0;

    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const rand = rng(dayOfYear * 1000);

    const eod = new Date();
    eod.setUTCHours(23, 59, 59, 999);
    const eodTs = Math.floor(eod.getTime() / 1000);

    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    tom.setUTCHours(12, 0, 0, 0);
    const tomTs = Math.floor(tom.getTime() / 1000);

    const week = new Date();
    week.setDate(week.getDate() + 7);
    week.setUTCHours(12, 0, 0, 0);
    const weekTs = Math.floor(week.getTime() / 1000);

    const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

    const and = (a: number, b: number) => roundToNearest(a + b, b < 1 ? 0.01 : b < 10 ? 1 : b < 100 ? 10 : 100);
    const sub = (a: number, b: number) => roundToNearest(a - b, b < 1 ? 0.01 : b < 10 ? 1 : b < 100 ? 10 : 100);

    const suggestions = [
      // BTC
      { question: `Will BTC close above $${and(btc, 1000).toLocaleString()} by end of day?`, resolvesAt: eodTs, currentPrice: btc },
      { question: `Will BTC drop below $${sub(btc, 1000).toLocaleString()} by end of day?`, resolvesAt: eodTs, currentPrice: btc },
      { question: `Will BTC break $${roundToNearest(btc + 3000, 1000).toLocaleString()} by end of week?`, resolvesAt: weekTs, currentPrice: btc },
      { question: `Will BTC 24h volume exceed $${roundToNearest(btc * 0.05, 1000).toLocaleString()}B by midnight?`, resolvesAt: eodTs, currentPrice: btc },

      // ETH
      { question: `Will ETH break $${and(eth, 200).toLocaleString()} by end of day?`, resolvesAt: eodTs, currentPrice: eth },
      { question: `Will ETH hold above $${sub(eth, 100).toLocaleString()} by end of day?`, resolvesAt: eodTs, currentPrice: eth },
      { question: `Will ETH surpass $${roundToNearest(eth * 1.1, 500).toLocaleString()} by next week?`, resolvesAt: weekTs, currentPrice: eth },

      // SOL
      { question: `Will SOL exceed $${and(sol, 10).toLocaleString()} by end of day?`, resolvesAt: eodTs, currentPrice: sol },
      { question: `Will SOL drop below $${sub(sol, 8).toLocaleString()} by end of day?`, resolvesAt: eodTs, currentPrice: sol },

      // Cross-asset
      { question: `Will ${pick(["BTC", "ETH", "SOL"])} outperform ${pick(["BTC", "ETH", "SOL"])} today?`, resolvesAt: eodTs, currentPrice: btc },
      { question: `Will 3 of top 5 coins close green today?`, resolvesAt: eodTs, currentPrice: btc },
      { question: `Will total market cap go up by tomorrow noon?`, resolvesAt: tomTs, currentPrice: btc },

      // Altcoins (randomized selection each day)
      ...(ada > 0 && rand() > 0.3 ? [{
        question: `Will ADA break $${and(ada, 0.05).toFixed(2)} by end of day?`, resolvesAt: eodTs, currentPrice: ada,
      }] : []),
      ...(avax > 0 && rand() > 0.4 ? [{
        question: `Will AVAX close above $${and(avax, 2).toLocaleString()} by end of day?`, resolvesAt: eodTs, currentPrice: avax,
      }] : []),
      ...(link > 0 && rand() > 0.5 ? [{
        question: `Will LINK exceed $${and(link, 1).toFixed(1)} by end of day?`, resolvesAt: eodTs, currentPrice: link,
      }] : []),
      ...(matic > 0 && rand() > 0.6 ? [{
        question: `Will MATIC reclaim $${and(matic, 0.1).toFixed(2)} by end of day?`, resolvesAt: eodTs, currentPrice: matic,
      }] : []),
    ];

    return NextResponse.json({
      date: Date.now(),
      dayOfYear,
      suggestions,
      prices,
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
