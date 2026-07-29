const POINTS: Record<string, number> = { create: 30, predict: 20, resolve: 50 };

export async function syncPredictionActivity(walletAddress: string, action: "create" | "predict" | "resolve") {
  try {
    const cur = await (await fetch(`/api/litevm/stats?wallet=${encodeURIComponent(walletAddress)}`)).json();
    const gain = POINTS[action];
    await fetch("/api/litevm/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress,
        totalAct: (cur?.totalAct || 0) + 1,
        totalPred: (cur?.totalPred || 0) + 1,
        totalPoints: (cur?.totalPoints || 0) + gain,
      }),
    });
  } catch {}
}
