export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTCUSDT";

  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return Response.json({ error: "Binance API error" }, { status: 502 });
    }
    const data = await res.json();
    return Response.json({ symbol: symbol.replace("USDT", ""), price: parseFloat(data.price), status: "live" });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Fetch failed" }, { status: 500 });
  }
}
