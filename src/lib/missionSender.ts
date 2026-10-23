"use client";

import { getPublicClient } from "@wagmi/core";
import { encodeFunctionData, toHex } from "viem";
import type { Config } from "wagmi";
import type { NetworkConfig } from "@/config/chains";
import { NIKBASE_TASKS_ABI } from "@/lib/preflight";

/**
 * The one place that actually puts a NikBase call on chain.
 *
 * Both the mission modal and the "Today" hero use this, so a fix to the
 * quirks below (Orbit sequencers, wallet-side gas estimation, receipt
 * polling) lands in one file instead of two.
 */

export const MISSION_ABI = NIKBASE_TASKS_ABI;

export type MissionMethod = "dailyCheckIn" | "gm" | "gn" | "incrementCounter";

/**
 * The calldata for one NikBase mission.
 *
 * Written as an explicit switch rather than a generic call, so the ABI and
 * the method name can never drift apart — the type checker has to agree that
 * "gm" is a function on this contract.
 */
export function encodeMission(method: MissionMethod): `0x${string}` {
  switch (method) {
    case "dailyCheckIn":
      return encodeFunctionData({
        abi: NIKBASE_TASKS_ABI,
        functionName: "dailyCheckIn",
        args: [],
      });
    case "gm":
      return encodeFunctionData({
        abi: NIKBASE_TASKS_ABI,
        functionName: "gm",
        args: [],
      });
    case "gn":
      return encodeFunctionData({
        abi: NIKBASE_TASKS_ABI,
        functionName: "gn",
        args: [],
      });
    case "incrementCounter":
      return encodeFunctionData({
        abi: NIKBASE_TASKS_ABI,
        functionName: "incrementCounter",
        args: [],
      });
  }
}

interface RawProvider {
  request: (a: {
    method: string;
    params?: readonly unknown[];
  }) => Promise<unknown>;
}

/**
 * Ask the wallet to broadcast a single contract call.
 *
 * The transaction is deliberately minimal: no site-side gas or fee
 * estimation. A flaky RPC must never block the wallet popup, so the wallet
 * estimates gas and fees itself.
 */
export async function broadcastCall(opts: {
  wagmiConfig: Config;
  network: NetworkConfig;
  to: `0x${string}`;
  data: `0x${string}`;
  address: `0x${string}`;
  /** the NikBase method being called — only used by the wagmi fallback */
  method: MissionMethod;
  /** wagmi fallback, used when the connector has no raw provider */
  writeContractAsync: (args: {
    chainId: number;
    address: `0x${string}`;
    abi: typeof NIKBASE_TASKS_ABI;
    functionName: MissionMethod;
    args: readonly unknown[];
  }) => Promise<`0x${string}`>;
}): Promise<`0x${string}`> {
  const { wagmiConfig, network, to, data, address, method, writeContractAsync } = opts;

  const pubClient = getPublicClient(wagmiConfig, { chainId: network.id });
  const state = wagmiConfig.state;
  const conn = state.current ? state.connections.get(state.current) : undefined;
  const rawProvider = (conn?.connector
    ? await conn.connector.getProvider()
    : undefined) as RawProvider | undefined;

  if (!rawProvider?.request) {
    // Fallback: the wagmi path (still wallet-side estimation).
    return writeContractAsync({
      chainId: network.id,
      address: to,
      abi: MISSION_ABI,
      functionName: method,
      args: [],
    });
  }

  // ── ORBIT CHAINS ─────────────────────────────────────────────────────
  // Arbitrum Orbit sequencers reject a transaction that carries no explicit
  // gasPrice, and they also reject it when the wallet's local nonce has
  // drifted from the sequencer's expected message index. Both are invisible
  // to the user and look like a random failure, so inject them here.
  const txParams: Record<string, unknown> = { from: address, to, data };
  if (network.requiresLegacyGas) {
    if (!txParams.gasPrice && !txParams.maxFeePerGas) {
      txParams.gasPrice = network.legacyGasPrice ?? "0x989680";
    }
    try {
      const nonce = await pubClient?.getTransactionCount({
        address,
        blockTag: "pending",
      });
      if (nonce !== undefined) txParams.nonce = toHex(nonce);
    } catch {
      /* nonce fetch failed — let the wallet decide */
    }
  }

  return (await rawProvider.request({
    method: "eth_sendTransaction",
    params: [txParams],
  })) as `0x${string}`;
}

/**
 * Wait for a transaction to be mined.
 *
 * Two signals, whichever lands first:
 *   1) the receipt itself
 *   2) a NEW BLOCK on the target chain (the tx is mined within ~1 block)
 *
 * Returns the receipt status, or throws when the confirmation times out.
 */
export async function waitForReceipt(opts: {
  wagmiConfig: Config;
  network: NetworkConfig;
  hash: `0x${string}`;
  rawProvider?: RawProvider;
  /** stop waiting (the user closed the modal) */
  isCancelled?: () => boolean;
  /** how many poll rounds to try before giving up */
  rounds?: number;
}): Promise<{ status?: string }> {
  const { wagmiConfig, network, hash, rawProvider, isCancelled, rounds = 90 } = opts;

  const pubClient = getPublicClient(wagmiConfig, { chainId: network.id });
  let receipt: { status?: string } | null = null;
  const SCHEDULE = [150, 300, 500, 750, 1000, 1000, 1500, 1500, 2000];
  let lastBlock = (await pubClient?.getBlockNumber().catch(() => undefined)) ?? 0n;

  for (let p = 0; p < rounds && !isCancelled?.(); p++) {
    if (p > 0) {
      await new Promise((r) =>
        setTimeout(r, SCHEDULE[Math.min(p - 1, SCHEDULE.length - 1)])
      );
    }
    try {
      const r = await pubClient?.getTransactionReceipt({ hash });
      if (r) {
        receipt = r as { status?: string };
        break;
      }
    } catch {
      /* not mined yet or site RPC hiccup — try provider */
    }
    try {
      const r = (await rawProvider?.request({
        method: "eth_getTransactionReceipt",
        params: [hash],
      })) as { status?: string } | null;
      if (r) {
        receipt = r;
        break;
      }
    } catch {
      /* keep polling */
    }
    // Block moved: the tx is very likely in it, check once more right away.
    try {
      const bn = await pubClient?.getBlockNumber();
      if (bn !== undefined && bn > lastBlock) {
        lastBlock = bn;
        try {
          const r2 = await pubClient?.getTransactionReceipt({ hash });
          if (r2) {
            receipt = r2 as { status?: string };
            break;
          }
        } catch {
          /* next round */
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (!receipt) {
    if (isCancelled?.()) throw new Error("Cancelled");
    throw new Error("Confirmation timed out — check the explorer link above");
  }
  return receipt;
}

/** The raw provider of the connected connector, when it exposes one. */
export async function getRawProvider(
  wagmiConfig: Config
): Promise<RawProvider | undefined> {
  const state = wagmiConfig.state;
  const conn = state.current ? state.connections.get(state.current) : undefined;
  return (conn?.connector
    ? await conn.connector.getProvider()
    : undefined) as RawProvider | undefined;
}
