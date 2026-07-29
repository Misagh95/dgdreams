import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments, tournamentEntries } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { ensureTables } from "@/lib/init-db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureTables();
  const { id } = await params;
  const entries = await db
    .select()
    .from(tournamentEntries)
    .where(eq(tournamentEntries.tournamentId, parseInt(id)))
    .orderBy(desc(tournamentEntries.score));
  return NextResponse.json({ entries });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureTables();
  const { id } = await params;
  try {
    const body = await request.json();
    const { walletAddress, score, bestTile } = body;
    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, parseInt(id)));
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (tournament.status !== "active") {
      return NextResponse.json({ error: "Tournament is not active" }, { status: 400 });
    }
    const now = new Date();
    if (now < tournament.startsAt || now > tournament.endsAt) {
      return NextResponse.json({ error: "Tournament is not in session" }, { status: 400 });
    }
    const existing = await db
      .select()
      .from(tournamentEntries)
      .where(
        and(
          eq(tournamentEntries.tournamentId, parseInt(id)),
          eq(tournamentEntries.walletAddress, walletAddress)
        )
      );
    if (existing.length > 0) {
      const prev = existing[0];
      if (score > (prev.score || 0)) {
        const [updated] = await db
          .update(tournamentEntries)
          .set({ score: score || 0, bestTile: bestTile || 0 })
          .where(eq(tournamentEntries.id, prev.id))
          .returning();
        return NextResponse.json({ entry: updated, improved: true });
      }
      return NextResponse.json({ entry: prev, improved: false });
    }
    const [entry] = await db
      .insert(tournamentEntries)
      .values({
        tournamentId: parseInt(id),
        walletAddress,
        score: score || 0,
        bestTile: bestTile || 0,
      })
      .returning();
    return NextResponse.json({ entry });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
