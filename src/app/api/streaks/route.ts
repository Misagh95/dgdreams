import { NextResponse } from "next/server";
import { db } from "@/db";
import { streaks } from "@/db/schema";
import { desc } from "drizzle-orm";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { getAddressFromToken } from "@/lib/session";

export async function GET() {
  try {
    const data = await db
      .select()
      .from(streaks)
      .orderBy(desc(streaks.date))
      .limit(30);
    return NextResponse.json({ streaks: data });
  } catch (error) {
    console.error("Failed to fetch streaks:", error);
    return NextResponse.json({ streaks: [] });
  }
}

export async function POST(request: Request) {
  if (!rateLimit(clientIp(request), 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const address = getAddressFromToken(request);
  if (!address) {
    return NextResponse.json(
      { error: "Authentication required. Connect your wallet and sign in." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      userId?: number;
      chainId?: number;
      chainName?: string;
      actionCount?: number;
      points?: number;
    };

    const { userId, chainId, chainName, actionCount, points } = body;
    const invalid =
      (userId !== undefined &&
        (typeof userId !== "number" || !Number.isSafeInteger(userId))) ||
      (chainId !== undefined &&
        (typeof chainId !== "number" || !Number.isSafeInteger(chainId))) ||
      (chainName !== undefined && typeof chainName !== "string") ||
      (actionCount !== undefined &&
        (typeof actionCount !== "number" || !Number.isSafeInteger(actionCount))) ||
      (points !== undefined &&
        (typeof points !== "number" || !Number.isSafeInteger(points)));
    if (invalid) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(streaks)
      .values({
        userId: body.userId ?? null,
        date: new Date(),
        chainId: body.chainId ?? null,
        chainName: body.chainName ?? null,
        actionCount: body.actionCount ?? 1,
        points: body.points ?? 10,
      })
      .returning();

    return NextResponse.json({ streak: inserted });
  } catch (error) {
    console.error("Failed to save streak:", error);
    return NextResponse.json({ error: "Failed to save streak" }, { status: 500 });
  }
}
