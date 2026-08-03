import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { litevmStats } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureTables } from "@/lib/init-db";

export async function GET(request: NextRequest) {
  await ensureTables();
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet query param required" }, { status: 400 });
  }
  try {
    const rows = await db
      .select()
      .from(litevmStats)
      .where(eq(litevmStats.walletAddress, wallet.toLowerCase()))
      .orderBy(desc(litevmStats.lastSyncAt))
      .limit(1);
    return NextResponse.json(rows[0] || null);
  } catch (e) {
    console.error("GET /api/litevm/stats error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await ensureTables();
  try {
    const body = await request.json();
    const { walletAddress, playCount, highScore, streak, totalCi, totalAct, totalPred, totalPoints, chain } = body;
    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
    }
    const addr = walletAddress.toLowerCase();
    const now = new Date();
    const existing = await db
      .select()
      .from(litevmStats)
      .where(eq(litevmStats.walletAddress, addr))
      .orderBy(desc(litevmStats.lastSyncAt))
      .limit(1);
    if (existing.length > 0) {
      await db
        .update(litevmStats)
        .set({
          chain: chain ?? existing[0].chain,
          playCount: playCount ?? existing[0].playCount,
          highScore: highScore ?? existing[0].highScore,
          streak: streak ?? existing[0].streak,
          totalCi: totalCi ?? existing[0].totalCi,
          totalAct: totalAct ?? existing[0].totalAct,
          totalPred: totalPred ?? existing[0].totalPred,
          totalPoints: totalPoints ?? existing[0].totalPoints,
          lastSyncAt: now,
        })
        .where(eq(litevmStats.id, existing[0].id));
    } else {
      await db.insert(litevmStats).values({
        walletAddress: addr,
        chain: chain ?? null,
        playCount: playCount ?? 0,
        highScore: highScore ?? 0,
        streak: streak ?? 0,
        totalCi: totalCi ?? 0,
        totalAct: totalAct ?? 0,
        totalPred: totalPred ?? 0,
        totalPoints: totalPoints ?? 0,
        lastSyncAt: now,
      });
    }
    return NextResponse.json({ ok: true, syncedAt: now.toISOString() });
  } catch (e) {
    console.error("POST /api/litevm/stats error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
