import { NextResponse } from "next/server";
import { db } from "@/db";
import { gameScores } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
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
  try {
    const body = await request.json();
    const { walletAddress, score, bestTile } = body as {
      walletAddress?: string;
      score: number;
      bestTile: number;
    };

    if (typeof score !== "number" || typeof bestTile !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(gameScores)
      .values({ walletAddress: walletAddress ?? null, score, bestTile })
      .returning();

    return NextResponse.json({ score: inserted });
  } catch (error) {
    console.error("Failed to save score:", error);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}
