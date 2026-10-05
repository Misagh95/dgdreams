import { NextRequest, NextResponse } from "next/server";
import { buildProfile } from "@/lib/sybil/collect";
import { ensureTables } from "@/lib/init-db";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { getAddressFromToken } from "@/lib/session";
import { isValidAddress } from "@/lib/validation";

/**
 * Sybil Risk Score — the caller's own wallet.
 *
 * GET returns the score for the signed-in wallet. `?wallet=` lets an operator
 * look up a different address, but only for an address they are signed in as:
 * the token must match the requested wallet, exactly like /api/prediction-
 * activities checks ownership. There is no way to enumerate other users.
 *
 * The score is a review aid. It is deliberately not wired into rewards: no
 * code path here can move points, and a score never blocks a withdrawal. The
 * report ships with `disclaimers` so the UI can render the caveats next to the
 * number rather than burying them.
 */
export async function GET(request: NextRequest) {
  await ensureTables();

  if (!rateLimit(clientIp(request), 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const sessionAddress = getAddressFromToken(request);
  if (!sessionAddress) {
    return NextResponse.json(
      { error: "Authentication required. Connect your wallet and sign in." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("wallet");

  if (requested !== null) {
    if (!isValidAddress(requested)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }
    if (requested.toLowerCase() !== sessionAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "You can only view your own risk score" },
        { status: 403 }
      );
    }
  }

  try {
    const { report } = await buildProfile(sessionAddress);
    return NextResponse.json({ report });
  } catch (e) {
    // Never fail the page over a risk read: the streaks view must keep
    // working even if this endpoint is degraded.
    console.error("GET /api/sybil error:", e);
    return NextResponse.json({ error: "Failed to compute risk score" }, { status: 500 });
  }
}
