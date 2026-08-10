import { NextResponse } from "next/server";
import { db } from "@/db";
import { predictionActivities } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { getAddressFromToken } from "@/lib/session";

const POINTS: Record<string, number> = {
  create_market: 30,
  predict_yes: 20,
  predict_no: 20,
  resolve_market: 50,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");
    if (!wallet) {
      return NextResponse.json({ activities: [] });
    }
    const data = await db
      .select()
      .from(predictionActivities)
      .where(eq(predictionActivities.walletAddress, wallet.toLowerCase()))
      .orderBy(desc(predictionActivities.createdAt))
      .limit(50);
    return NextResponse.json({ activities: data });
  } catch (error) {
    console.error("Failed to fetch prediction activities:", error);
    return NextResponse.json({ activities: [] });
  }
}

export async function POST(request: Request) {
  if (!rateLimit(clientIp(request), 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const address = getAddressFromToken(request);
  if (!address) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  try {
    const body = await request.json() as {
      walletAddress: string;
      action: string;
      question: string;
      marketId?: string;
      chain?: string;
      txHash?: string;
    };

    if (!body.walletAddress || !body.action || !body.question) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (body.walletAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: "Address mismatch" }, { status: 401 });
    }

    const points = POINTS[body.action] || 0;

    const [inserted] = await db
      .insert(predictionActivities)
      .values({
        walletAddress: address.toLowerCase(),
        action: body.action,
        question: body.question,
        marketId: body.marketId ?? null,
        chain: body.chain ?? "genlayer",
        txHash: body.txHash ?? null,
        points,
      })
      .returning();

    return NextResponse.json({ activity: inserted });
  } catch (error) {
    console.error("Failed to save prediction activity:", error);
    return NextResponse.json({ error: "Failed to save activity" }, { status: 500 });
  }
}
