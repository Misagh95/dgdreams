/**
 * Sybil Risk Score — fact collection.
 *
 * Gathers everything the engine needs for one wallet from the database and,
 * for a bounded set of networks, from the chain itself. Nothing here decides
 * anything: it only assembles a WalletProfile so the arithmetic stays in
 * engine.ts and stays testable.
 *
 * Every read is best-effort. A database row or an RPC that is missing narrows
 * what the engine can see, which lowers `coverage` — it must never be turned
 * into a clean bill of health.
 */

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { createPublicClient, fallback, http } from "viem";
import { db } from "@/db";
import {
  gameScores,
  predictionActivities,
  tournamentEntries,
  walletSocials,
  walletStreaks,
} from "@/db/schema";
import { getNetworkConfig, mainnetNetworks, testnetNetworks } from "@/config/chains";
import { scoreProfile } from "./engine";
import type { NetworkFacts, SybilReport, WalletProfile } from "./types";

export type { NetworkFacts, SybilReport, WalletProfile };

/** How many networks to probe on-chain for a single wallet request. */
const MAX_CHAIN_PROBES = 4;

/** Action history is capped so a heavy wallet cannot blow up the query. */
const MAX_ACTION_SAMPLES = 500;

/** Native balance below this is treated as "barely funded". */
const DUST_FLOOR_NATIVE = 0.0005;

function asEpochMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Dustiness of a native balance, normalised to 0..1.
 *
 * Comparing across 20 chains in raw wei is meaningless — $0.0001 is dust on
 * Arbitrum and a fortune on a low-decimals token. This converts to the native
 * unit first, then measures against a small absolute threshold, so "barely
 * funded" means the same thing on every network.
 */
export function dustinessFromNative(native: number): number {
  if (!Number.isFinite(native) || native <= 0) return 1;
  if (native >= DUST_FLOOR_NATIVE) return 0;
  // Linear from fully-dust at 0 to clean at the floor.
  return Math.min(1, Math.max(0, 1 - native / DUST_FLOOR_NATIVE));
}

/** Read balance, nonce and code size for one wallet on one network. */
async function probeNetwork(
  address: `0x${string}`,
  chainId: number
): Promise<NetworkFacts | null> {
  const cfg = getNetworkConfig(chainId);
  if (!cfg) return null;
  const urls = cfg.rpcUrls.default.http;
  if (urls.length === 0) return null;

  try {
    const client = createPublicClient({
      chain: {
        id: cfg.id,
        name: cfg.name,
        nativeCurrency: cfg.nativeCurrency,
        rpcUrls: { default: { http: urls } },
        blockExplorers: cfg.blockExplorers,
        testnet: cfg.isTestnet,
      },
      transport:
        urls.length > 1
          ? fallback(urls.map((u) => http(u, { timeout: 6_000 })))
          : http(urls[0], { timeout: 6_000 }),
    });

    const [balance, nonce, code] = await Promise.all([
      client.getBalance({ address }),
      client.getTransactionCount({ address }),
      client.getCode({ address }).catch(() => undefined),
    ]);

    return {
      chainId: cfg.id,
      chainName: cfg.name,
      dustiness: dustinessFromNative(
        Number(balance) / 10 ** cfg.nativeCurrency.decimals
      ),
      nonce,
      isContract: typeof code === "string" && code.length > 2,
    };
  } catch {
    // A flaky or unreachable RPC narrows coverage; it is not evidence of risk.
    return null;
  }
}
/**
 * Database how many distinct wallets claim each of the caller's own handles.
 *
 * Restricted to the handles already linked to this wallet, so the endpoint can
 * never be used to enumerate the rest of the user table.
 */
async function collectSharedHandles(
  address: string
): Promise<{ platform: string; handle: string; sharedBy: number }[]> {
  const mine = await db
    .select({ platform: walletSocials.platform, handle: walletSocials.handle })
    .from(walletSocials)
    .where(eq(walletSocials.walletAddress, address));

  if (mine.length === 0) return [];

  const counts = await db
    .select({
      platform: walletSocials.platform,
      handle: walletSocials.handle,
      wallets: sql<number>`count(distinct ${walletSocials.walletAddress})::int`,
    })
    .from(walletSocials)
    .where(
      and(
        inArray(
          walletSocials.handle,
          mine.map((m) => m.handle)
        ),
        inArray(
          walletSocials.platform,
          mine.map((m) => m.platform)
        )
      )
    )
    .groupBy(walletSocials.platform, walletSocials.handle);

  return counts.map((c) => ({
    platform: c.platform,
    handle: c.handle,
    sharedBy: Number(c.wallets) || 1,
  }));
}

/** Assemble the full fact set for one wallet, then score it. */
export async function buildProfile(
  rawAddress: string
): Promise<{ profile: WalletProfile; report: SybilReport }> {
  const address = rawAddress.toLowerCase();

  const [streakRow, handles, actions, distinctActions, games, entries] =
    await Promise.all([
      db
        .select()
        .from(walletStreaks)
        .where(eq(walletStreaks.walletAddress, address))
        .limit(1),
      collectSharedHandles(address),
      db
        .select({
          createdAt: predictionActivities.createdAt,
          chain: predictionActivities.chain,
        })
        .from(predictionActivities)
        .where(eq(predictionActivities.walletAddress, address))
        .orderBy(desc(predictionActivities.createdAt))
        .limit(MAX_ACTION_SAMPLES),
      db
        .select({ n: count() })
        .from(
          db
            .selectDistinct({ action: predictionActivities.action })
            .from(predictionActivities)
            .where(eq(predictionActivities.walletAddress, address))
            .as("distinct_actions")
        ),
      db
        .select({ n: count() })
        .from(gameScores)
        .where(eq(gameScores.walletAddress, address)),
      db
        .select({ n: count() })
        .from(tournamentEntries)
        .where(eq(tournamentEntries.walletAddress, address)),
    ]);

  const streak = streakRow[0];
  const actionTimestamps = actions
    .map((a) => asEpochMs(a.createdAt))
    .filter((t): t is number => t !== null);

  // Network breadth comes from the recorded action history plus the network the
  // streak was last verified on — the only two places a network is named.
  const everyNetwork = [...mainnetNetworks, ...testnetNetworks];
  const networks = new Set<number>();
  for (const a of actions) {
    const cfg = everyNetwork.find(
      (n) => n.name.toLowerCase() === a.chain.toLowerCase()
    );
    if (cfg) networks.add(cfg.id);
  }
  if (streak?.chainId) networks.add(streak.chainId);

  // Probe only a few networks: enough for the dust signal, bounded so one slow
  // RPC cannot hold up the whole request.
  const probeTargets = [...networks].slice(0, MAX_CHAIN_PROBES);
  const probed = (
    await Promise.all(
      probeTargets.map((id) => probeNetwork(address as `0x${string}`, id))
    )
  ).filter((n): n is NetworkFacts => n !== null);

  const firstSeen = actionTimestamps.length
    ? Math.min(...actionTimestamps)
    : asEpochMs(streak?.createdAt);
  const lastActive = actionTimestamps.length
    ? Math.max(...actionTimestamps)
    : asEpochMs(streak?.syncedAt);

  const profile: WalletProfile = {
    address,
    streak: streak?.streak ?? 0,
    totalCheckIns: streak?.totalCheckIns ?? 0,
    totalActions: streak?.totalActions ?? 0,
    firstSeen,
    lastActive,
    networks: networks.size,
    actionTimestamps,
    socialHandles: handles,
    distinctActionTypes: Number(distinctActions[0]?.n ?? 0),
    gamePlays: Number(games[0]?.n ?? 0),
    tournamentEntries: Number(entries[0]?.n ?? 0),
    onchain: probed,
    // No funding-source indexer is wired up in this codebase. null is the
    // honest answer: the engine reports the gap instead of assuming this
    // wallet has no co-funded siblings.
    fundingClusterSize: null,
  };

  return { profile, report: scoreProfile(profile) };
}
