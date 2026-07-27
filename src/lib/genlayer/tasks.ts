"use client";

import { TransactionStatus, type Hash } from "genlayer-js/types";
import { getGenLayerReadClient, getGenLayerWriteClient, GENLAYER_CHAIN_ID } from "./client";

export const GENLAYER_CONTRACT = "0x1203ab4E8386220F792f129C605460fD0F52C412" as const;

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

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 60,
    interval: 3000,
  });

  return { hash: hash as unknown as string, receipt };
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
