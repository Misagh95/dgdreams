"use client";

import { getGenLayerReadClient, getGenLayerWriteClient } from "./client";
import { TransactionStatus } from "genlayer-js/types";

export const PRICE_ORACLE_CONTRACT = "0x44771EC9c74e91712Df7117dEF85993401a3D244" as const;

export async function oracleGetPrice(symbol: string): Promise<{ symbol: string; price: number; status: string }> {
  const client = getGenLayerReadClient();
  const result = await client.readContract({
    address: PRICE_ORACLE_CONTRACT,
    functionName: "getPrice",
    args: [symbol],
  });
  return JSON.parse(String(result));
}

export async function oracleFetchPrice(
  address: `0x${string}`,
  symbol: string
): Promise<string> {
  const client = getGenLayerWriteClient(address);
  if (!client) throw new Error("GenLayer wallet not connected");

  const hash = await client.writeContract({
    address: PRICE_ORACLE_CONTRACT,
    functionName: "fetchPrice",
    args: [symbol],
    value: BigInt(0),
  });

  await client.waitForTransactionReceipt({
    hash: hash as any,
    status: TransactionStatus.ACCEPTED,
    retries: 60,
    interval: 3000,
  });

  return hash as unknown as string;
}
