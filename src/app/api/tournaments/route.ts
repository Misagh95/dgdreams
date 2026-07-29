import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureTables } from "@/lib/init-db";

export async function GET(request: NextRequest) {
  await ensureTables();
  const status = request.nextUrl.searchParams.get("status") || "active";
  const all = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, status))
    .orderBy(desc(tournaments.createdAt));
  return NextResponse.json({ tournaments: all });
}

export async function POST(request: Request) {
  await ensureTables();
  try {
    const body = await request.json();
    const { name, entryFee, maxPlayers, startsAt, endsAt, createdBy } = body;
    if (!name || !startsAt || !endsAt || !createdBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const [tournament] = await db
      .insert(tournaments)
      .values({
        name,
        entryFee: entryFee || 0,
        maxPlayers: maxPlayers || 100,
        prizePool: entryFee || 0,
        status: "active",
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        createdBy,
      })
      .returning();
    return NextResponse.json({ tournament });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
