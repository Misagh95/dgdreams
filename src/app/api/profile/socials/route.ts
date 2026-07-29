import { NextResponse } from "next/server";
import { db } from "@/db";
import { walletSocials } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(walletSocials)
      .where(eq(walletSocials.walletAddress, address.toLowerCase()));
    const socials: Record<string, string> = {};
    for (const row of rows) {
      socials[row.platform] = row.handle;
    }
    return NextResponse.json({ socials });
  } catch (error) {
    console.error("Failed to fetch socials:", error);
    return NextResponse.json({ socials: {} }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as {
      address?: string;
      socials?: Record<string, string>;
    };

    if (!body.address || !body.socials) {
      return NextResponse.json({ error: "address and socials are required" }, { status: 400 });
    }

    const addr = body.address.toLowerCase();
    const upserted: { platform: string; handle: string }[] = [];

    for (const [platform, handle] of Object.entries(body.socials)) {
      if (!handle || typeof handle !== "string") continue;

      const existing = await db
        .select()
        .from(walletSocials)
        .where(and(eq(walletSocials.walletAddress, addr), eq(walletSocials.platform, platform)))
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await db
          .update(walletSocials)
          .set({ handle, updatedAt: new Date() })
          .where(eq(walletSocials.id, existing[0].id))
          .returning();
        upserted.push({ platform: updated.platform, handle: updated.handle });
      } else {
        const [inserted] = await db
          .insert(walletSocials)
          .values({ walletAddress: addr, platform, handle })
          .returning();
        upserted.push({ platform: inserted.platform, handle: inserted.handle });
      }
    }

    return NextResponse.json({ socials: upserted });
  } catch (error) {
    console.error("Failed to save socials:", error);
    return NextResponse.json({ error: "Failed to save socials" }, { status: 500 });
  }
}
