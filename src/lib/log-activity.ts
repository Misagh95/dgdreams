export async function logPredictionActivity(
  params: {
    walletAddress: string;
    action: "create_market" | "predict_yes" | "predict_no" | "resolve_market";
    question: string;
    marketId?: string;
    chain?: string;
    txHash?: string;
  },
  token?: string | null
) {
  try {
    await fetch("/api/prediction-activities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
    });
  } catch {}
}
