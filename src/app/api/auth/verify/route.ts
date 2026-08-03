import { NextResponse } from "next/server";
import { isAddress, recoverMessageAddress } from "viem";
import { createSessionToken } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  if (!rateLimit(clientIp(request), 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as {
      address?: string;
      message?: string;
      signature?: string;
    };
    const { address, message, signature } = body;

    if (!address || !message || !signature || !isAddress(address)) {
      return NextResponse.json(
        { error: "address, message and signature are required" },
        { status: 400 }
      );
    }

    if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const messageAddress = message.match(/^Address: (0x[0-9a-fA-F]{40})$/m)?.[1];
    const issuedAt = Number(message.match(/^Issued At: (\d+)$/m)?.[1]);
    if (
      !message.startsWith("DGDreams Sign-In\n\n") ||
      !messageAddress ||
      messageAddress.toLowerCase() !== address.toLowerCase() ||
      !Number.isSafeInteger(issuedAt) ||
      Math.abs(Date.now() - issuedAt) > 5 * 60_000
    ) {
      return NextResponse.json(
        { error: "Invalid or expired sign-in message" },
        { status: 400 }
      );
    }

    const recovered = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json(
        { error: "Signature does not match address" },
        { status: 401 }
      );
    }

    return NextResponse.json({ token: createSessionToken(recovered) });
  } catch (error) {
    console.error("Auth verify failed:", error);
    return NextResponse.json(
      { error: "Failed to verify signature" },
      { status: 400 }
    );
  }
}
