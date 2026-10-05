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
 * Wallet streak index — one record per wallet.
 *
 * The streak itself lives in the NikBase contract, keyed by wallet address, and
 * rolls over at 00:00 UTC. This endpoint never accepts a streak from the
 * client. It requires a session token (proving the caller owns the address) and
 * then reads the real value off the chain, so what lands in the database is
 * chain truth rather than a self-reported score.
 *
 * The network is *not* part of the key: the wallet signs in once (the token is
 * cached client-side) and every later verification rewrites that single row, so
 * playing on a second network updates the record instead of duplicating it.
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

/** GET — the caller's own record. Requires a signed-in wallet. */
export async function GET(request: NextRequest) {
  await ensureTables();
  const address = getAddressFromToken(request);
  if (!address) {
    return NextResponse.json(
      { error: "Authentication required. Connect your wallet and sign in." },
      { status: 401 }
    );
  }

  const rows = await db
    .select()
    .from(walletStreaks)
    .where(eq(walletStreaks.walletAddress, address.toLowerCase()))
    .orderBy(desc(walletStreaks.streak))
    // One row per wallet by construction; the limit is just a guard.
    .limit(1);

  return NextResponse.json({ streak: rows[0] ?? null });
}

/** Every network that can answer a streak read, in config order. */
function chainIdsWithNikBase(): number[] {
  return Object.keys(NIKBASE_CONTRACTS)
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isSafeInteger(id) && isAddress(NIKBASE_CONTRACTS[id]));
}

/**
 * POST — verify a wallet's streak and store it as the wallet's single record.
 *
 * Body: { chainId?: number }. Optional; when absent the network the streak was
 * last verified on is reused, so a plain "refresh" re-reads the same place.
 *
 * Nothing in the body is trusted as a value: the streak always comes from the
 * chain read. Only *which* network to read is client-supplied.
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

  const addr = address.toLowerCase() as `0x${string}`;

  let requestedChainId: number | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as { chainId?: unknown };
    if (typeof body.chainId === "number" && Number.isSafeInteger(body.chainId)) {
      requestedChainId = body.chainId;
    }
  } catch {
    // no body is fine, we fall back to the wallet's known chain below
  }

  // The one row this wallet already owns, if any. Reading it first lets us
  // reuse its chain instead of asking the client which network to look at.
  const existing = await db
    .select()
    .from(walletStreaks)
    .where(eq(walletStreaks.walletAddress, addr))
    .limit(1);

  const previous = existing[0];

  const candidates = chainIdsWithNikBase();
  const chainId =
    requestedChainId && candidates.includes(requestedChainId)
      ? requestedChainId
      : // Fall back to the network already on file, then to the first that has
        // a NikBase. A sync never fans out across networks any more.
        candidates.includes(previous?.chainId as number)
        ? (previous?.chainId as number)
        : candidates[0];

  if (chainId === undefined) {
    return NextResponse.json({ streak: previous ?? null, synced: 0 });
  }

  const day = utcDayNumber();
  const now = new Date();

  try {
    const onChain = await readStreakOnChain(addr, chainId);

    if (onChain) {
      // Upsert on wallet alone. The unique index makes this safe against two
      // syncs landing at once, and it is what keeps a wallet to a single row.
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
          target: walletStreaks.walletAddress,
          set: {
            chainId,
            chainName: onChain.chainName,
            streak: onChain.streak,
            totalCheckIns: onChain.totalCheckIns,
            totalActions: onChain.totalActions,
            day,
            syncedAt: now,
          },
        });
    }
  } catch {
    // A flaky RPC must not fail the request: the stored row, if any, stands.
  }

  const stored = await db
    .select()
    .from(walletStreaks)
    .where(eq(walletStreaks.walletAddress, addr))
    .limit(1);

  const row = stored[0] ?? null;
  return NextResponse.json({
    streak: row,
    synced: row ? 1 : 0,
    chainId,
  });
}
