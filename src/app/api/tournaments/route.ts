import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureTables } from "@/lib/init-db";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { getAddressFromToken } from "@/lib/session";

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
  if (!rateLimit(clientIp(request), 10, 60_000)) {
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
    const body = await request.json();
    const { name, entryFee, maxPlayers, startsAt, endsAt, createdBy } = body;
    if (!name || !startsAt || !endsAt || !createdBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Attribute the tournament to the authenticated wallet.
    if (createdBy.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: "createdBy does not match authenticated wallet" }, { status: 401 });
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
        createdBy: address.toLowerCase(),
      })
      .returning();
    return NextResponse.json({ tournament });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
