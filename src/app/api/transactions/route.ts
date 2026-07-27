import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const data = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(50);
    return NextResponse.json({ transactions: data });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json({ transactions: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      userId?: number;
      hash: string;
      chainId: number;
      chainName: string;
      type: string;
      status: string;
      amount?: string;
      token?: string;
      gasUsed?: string;
      blockNumber?: number;
    };

    if (!body.hash || !body.chainId || !body.type || !body.status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(transactions)
      .values({
        userId: body.userId ?? null,
        hash: body.hash,
        chainId: body.chainId,
        chainName: body.chainName,
        type: body.type,
        status: body.status,
        amount: body.amount ?? null,
        token: body.token ?? null,
        gasUsed: body.gasUsed ?? null,
        blockNumber: body.blockNumber ?? null,
      })
      .returning();

    return NextResponse.json({ transaction: inserted });
  } catch (error) {
    console.error("Failed to save transaction:", error);
    return NextResponse.json({ error: "Failed to save transaction" }, { status: 500 });
  }
}
