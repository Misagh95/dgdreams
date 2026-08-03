import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { isAddress } from "viem";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function GET(request: Request) {
  if (!rateLimit(clientIp(request), 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "A valid address is required" },
      { status: 400 }
    );
  }

  const nonce = randomBytes(16).toString("hex");
  const message = [
    "DGDreams Sign-In",
    "",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${Date.now()}`,
    "",
    "Sign this message to verify ownership of your wallet.",
  ].join("\n");

  return NextResponse.json({ nonce, message });
}
