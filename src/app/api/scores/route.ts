import { NextResponse } from "next/server";
import { db } from "@/db";
import { gameScores } from "@/db/schema";
import { desc } from "drizzle-orm";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { ensureTables } from "@/lib/init-db";
import { isAddress } from "viem";

export async function GET() {
  await ensureTables();
  try {
    const scores = await db
      .select()
      .from(gameScores)
      .orderBy(desc(gameScores.score))
      .limit(10);
    return NextResponse.json({ scores });
  } catch (error) {
    console.error("Failed to fetch scores:", error);
    return NextResponse.json({ scores: [] });
  }
}

export async function POST(request: Request) {
  await ensureTables();
  if (!rateLimit(clientIp(request), 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { walletAddress, score, bestTile, chain } = body as {
      walletAddress?: string;
      score: number;
      bestTile: number;
      chain?: string;
    };

    if (
      typeof score !== "number" ||
      !Number.isSafeInteger(score) ||
      score < 0 ||
      score > 2_147_483_647 ||
      typeof bestTile !== "number" ||
      !Number.isSafeInteger(bestTile) ||
      bestTile < 0 ||
      bestTile > 131072
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(gameScores)
      .values({
        walletAddress: walletAddress.toLowerCase(),
        score,
        bestTile,
        chain: chain || null,
      })
      .returning();

    return NextResponse.json({ score: inserted });
  } catch (error) {
    console.error("Failed to save score:", error);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}
