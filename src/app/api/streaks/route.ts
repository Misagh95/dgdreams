import { NextResponse } from "next/server";
import { db } from "@/db";
import { streaks } from "@/db/schema";
import { desc } from "drizzle-orm";

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
  try {
    const body = await request.json() as {
      userId?: number;
      chainId?: number;
      chainName?: string;
      actionCount?: number;
      points?: number;
    };

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
