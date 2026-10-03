import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { walletStreaks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { createPublicClient, defineChain, http, isAddress, fallback } from "viem";
import { getNetworkConfig, NIKBASE_CONTRACTS } from "@/config/chains";
import { ensureTables } from "@/lib/init-db";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { getAddressFromToken } from "@/lib/session";
import { utcDayNumber } from "@/lib/utcDay";

/**
 * Wallet streak index.
 *
 * The streak itself lives in the NikBase contract, keyed by wallet address, and
 * rolls over at 00:00 UTC. This endpoint never accepts a streak from the
 * client. It requires a session token (proving the caller owns the address) and
 * then reads the real value off the chain, so what lands in the database is
 * chain truth rather than a self-reported score.
 */

/** NikBase.getUserData — (streak, totalCheckIns, totalActions) */
const NIKBASE_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserData",
    outputs: [
      { name: "streak", type: "uint256" },
      { name: "totalCheckIns", type: "uint256" },
      { name: "totalActions", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** A public RPC is fine: this only reads data that is already on-chain. */
async function readStreakOnChain(wallet: `0x${string}`, chainId: number) {
  const cfg = getNetworkConfig(chainId);
  const contract = NIKBASE_CONTRACTS[chainId];
  if (!cfg || !contract || !isAddress(contract)) return null;

  const urls = cfg.rpcUrls.default.http;
  // Rebuild the chain for viem: NetworkConfig already carries the rpc list and
  // the explorer, and reading is chain-agnostic so nothing else is needed.
  const chain = defineChain({
    id: cfg.id,
    name: cfg.name,
    nativeCurrency: cfg.nativeCurrency,
    rpcUrls: { default: { http: urls } },
    blockExplorers: {
      default: {
        name: cfg.blockExplorers.default.name,
        url: cfg.blockExplorers.default.url,
      },
    },
    testnet: cfg.isTestnet,
  });

  const client = createPublicClient({
    chain,
    transport: urls.length > 1 ? fallback(urls.map((u) => http(u))) : http(urls[0]),
  });

  const data = (await client.readContract({
    address: contract as `0x${string}`,
    abi: NIKBASE_ABI,
    functionName: "getUserData",
    args: [wallet],
  })) as readonly [bigint, bigint, bigint];

  return {
    streak: Number(data[0]),
    totalCheckIns: Number(data[1]),
    totalActions: Number(data[2]),
    chainName: cfg.name,
  };
}

/** GET — the caller's own rows, best streak first. Requires a signed-in wallet. */
export async function GET(request: NextRequest) {
  await ensureTables();
  const address = getAddressFromToken(request);
  if (!address) {
    return NextResponse.json(
      { error: "Authentication required. Connect your wallet and sign in." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 100);

  const rows = await db
    .select()
    .from(walletStreaks)
    .where(eq(walletStreaks.walletAddress, address.toLowerCase()))
    .orderBy(desc(walletStreaks.streak))
    .limit(limit);

  return NextResponse.json({ streaks: rows });
}

/**
 * POST — verify a wallet's streak on one or more networks.
 *
 * Body: { chainIds?: number[] }. Defaults to the networks this wallet already
 * has rows for, so a plain "refresh" re-verifies what it knows.
 *
 * Nothing in the body is trusted as a value: the streak always comes from the
 * chain read. Only the list of networks to check is client-supplied.
 */
export async function POST(request: NextRequest) {
  await ensureTables();

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

  let chainIds: number[] = [];
  try {
    const body = (await request.json().catch(() => ({}))) as { chainIds?: unknown };
    if (Array.isArray(body.chainIds)) {
      chainIds = body.chainIds
        .filter((c): c is number => typeof c === "number" && Number.isSafeInteger(c))
        // bound the work per request; a caller cannot fan out across every chain
        .slice(0, 10);
    }
  } catch {
    // no body is fine, we fall back to the caller's known chains below
  }

  if (chainIds.length === 0) {
    const known = await db
      .select({ chainId: walletStreaks.chainId })
      .from(walletStreaks)
      .where(eq(walletStreaks.walletAddress, address.toLowerCase()));
    chainIds = known.map((k) => k.chainId).slice(0, 10);
  }

  if (chainIds.length === 0) {
    return NextResponse.json({ streaks: [], synced: 0 });
  }

  const addr = address.toLowerCase() as `0x${string}`;
  const day = utcDayNumber();
  const now = new Date();

  const results = await Promise.all(
    chainIds.map(async (chainId) => {
      try {
        const onChain = await readStreakOnChain(addr, chainId);
        if (!onChain) return null;

        // Upsert on (wallet, chain). The unique index makes this safe against
        // two syncs landing at once: the loser updates, it does not duplicate.
        await db
          .insert(walletStreaks)
          .values({
            walletAddress: addr,
            chainId,
            chainName: onChain.chainName,
            streak: onChain.streak,
            totalCheckIns: onChain.totalCheckIns,
            totalActions: onChain.totalActions,
            day,
            syncedAt: now,
          })
          .onConflictDoUpdate({
            target: [walletStreaks.walletAddress, walletStreaks.chainId],
            set: {
              chainName: onChain.chainName,
              streak: onChain.streak,
              totalCheckIns: onChain.totalCheckIns,
              totalActions: onChain.totalActions,
              day,
              syncedAt: now,
            },
          });

        return { chainId, ...onChain };
      } catch {
        // A single flaky RPC must not fail the whole sync.
        return null;
      }
    })
  );

  const synced = results.filter((r) => r !== null);
  return NextResponse.json({
    streaks: synced,
    synced: synced.length,
    requested: chainIds.length,
  });
}
