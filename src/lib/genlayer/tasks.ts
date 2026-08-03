"use client";

import type { Hash } from "genlayer-js/types";
import { getGenLayerReadClient, getGenLayerWriteClient, GENLAYER_CHAIN_ID } from "./client";

export const GENLAYER_CONTRACT = "0x7cEb5303F2367608B533dB1E2616948ac98D024b" as const;

export type GenLayerTaskAction =
  | "dailyCheckIn"
  | "reception"
  | "gm"
  | "gn"
  | "takeDose"
  | "moodCheck"
  | "sanitizeWallet"
  | "incrementCounter"
  | "luckySpin";

export async function genLayerWriteTask(
  address: `0x${string}`,
  functionName: GenLayerTaskAction,
  args: unknown[] = []
): Promise<{ hash: string; receipt: any }> {
  const client = getGenLayerWriteClient(address);
  if (!client) throw new Error("GenLayer wallet not connected");

  const hash = (await client.writeContract({
    address: GENLAYER_CONTRACT,
    functionName,
    args: args as any,
    value: BigInt(0),
  })) as unknown as Hash;

  return { hash: hash as unknown as string, receipt: null };
}

export async function genLayerReadContract(
  functionName: "getActionCounts" | "getUserData",
  args: unknown[] = []
): Promise<string> {
  const client = getGenLayerReadClient();
  const result = await client.readContract({
    address: GENLAYER_CONTRACT,
    functionName,
    args: args as any,
  });
  return String(result);
}

export function isGenLayer(chainId: number) {
  return chainId === GENLAYER_CHAIN_ID;
}

export async function genLayerTxStatus(hash: string, pollMs: number = 5000, timeoutMs: number = 120000): Promise<string> {
  const client = getGenLayerReadClient();
  const start = Date.now();
  let last = "PENDING";
  while (Date.now() - start < timeoutMs) {
    try {
      const tx = (await (client as any).getTransaction({ hash })) as any;
      last = String(tx?.statusName || tx?.status || "PENDING");
      if (["ACCEPTED", "UNDETERMINED", "CANCELED", "FINALIZED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"].includes(last)) {
        return last;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return last;
}

export async function genLayerGetTxReceipt(hash: string): Promise<any> {
  const client = getGenLayerReadClient();
  try {
    const tx = await (client as any).getTransaction({ hash });
    return tx;
  } catch {
    return null;
  }
}
