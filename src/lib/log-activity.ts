export async function logPredictionActivity(params: {
  walletAddress: string;
  action: "create_market" | "predict_yes" | "predict_no" | "resolve_market";
  question: string;
  marketId?: string;
  chain?: string;
  txHash?: string;
}) {
  try {
    await fetch("/api/prediction-activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {}
}
