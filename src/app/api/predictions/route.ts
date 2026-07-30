import { NextResponse } from "next/server";

const COINGECKO = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,avalanche-2,chainlink,polygon&vs_currencies=usd&include_24hr_change=true";

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
    const ada = data?.cardano?.usd || 0;
    const avax = data?.["avalanche-2"]?.usd || 0;
    const link = data?.chainlink?.usd || 0;
    const matic = data?.polygon?.usd || 0;

    const btcChange = data?.bitcoin?.["usd_24h_change"] || 0;
    const ethChange = data?.ethereum?.["usd_24h_change"] || 0;
    const solChange = data?.solana?.["usd_24h_change"] || 0;

    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);
    const eodTs = Math.floor(endOfDay.getTime() / 1000);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(12, 0, 0, 0);
    const tomorrowTs = Math.floor(tomorrow.getTime() / 1000);

    const suggestions = [
      // BTC predictions
      {
        question: `Will BTC close above $${(btc + 1000).toLocaleString()} by end of day?`,
        targetPrice: roundToNearest(btc + 1000, 1000),
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: btc,
      },
      {
        question: `Will BTC drop below $${(btc - 1000).toLocaleString()} by end of day?`,
        targetPrice: roundToNearest(btc - 1000, 1000),
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: btc,
      },
      {
        question: `Will BTC 24h change exceed ${btcChange > 0 ? "+" : ""}${btcChange.toFixed(1)}% by midnight?`,
        targetPrice: roundToNearest(btc * (1 + Math.abs(btcChange) / 10000), 1000),
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: btc,
      },
      // ETH predictions
      {
        question: `Will ETH break $${roundToNearest(eth + 200, 100).toLocaleString()} by end of day?`,
        targetPrice: roundToNearest(eth + 200, 100),
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: eth,
      },
      {
        question: `Will ETH hold above $${(eth - 100).toLocaleString()} by end of day?`,
        targetPrice: roundToNearest(eth - 100, 100),
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: eth,
      },
      {
        question: `Will ETH outperform BTC today (${(ethChange - btcChange).toFixed(1)}% diff)?`,
        targetPrice: roundToNearest(eth + 50, 100),
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: eth,
      },
      // SOL predictions
      {
        question: `Will SOL exceed $${roundToNearest(sol + 10, 5).toLocaleString()} by end of day?`,
        targetPrice: roundToNearest(sol + 10, 5),
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: sol,
      },
      {
        question: `Will SOL stay above $${(sol - 5).toLocaleString()} by end of day?`,
        targetPrice: roundToNearest(sol - 5, 5),
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: sol,
      },
      // Cross-asset predictions
      {
        question: `Will BTC dominance increase by end of day?`,
        targetPrice: btc,
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: btc,
      },
      {
        question: `Will total crypto market cap go up by tomorrow noon?`,
        targetPrice: btc,
        resolvesAt: tomorrowTs,
        source: "coingecko",
        currentPrice: btc,
      },
      // Altcoin predictions
      ...(ada > 0 ? [{
        question: `Will ADA break $${roundToNearest(ada + 0.05, 0.05).toFixed(2)} by end of day?`,
        targetPrice: roundToNearest(ada + 0.05, 0.05),
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: ada,
      }] : []),
      ...(avax > 0 ? [{
        question: `Will AVAX close above $${roundToNearest(avax + 2, 1).toLocaleString()} by end of day?`,
        targetPrice: roundToNearest(avax + 2, 1),
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: avax,
      }] : []),
      ...(link > 0 ? [{
        question: `Will LINK exceed $${roundToNearest(link + 1, 0.5).toFixed(1)} by end of day?`,
        targetPrice: roundToNearest(link + 1, 0.5),
        resolvesAt: eodTs,
        source: "coingecko",
        currentPrice: link,
      }] : []),
    ];

    return NextResponse.json({
      date: now,
      suggestions,
      prices: { btc, eth, sol, ada, avax, link, matic },
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
