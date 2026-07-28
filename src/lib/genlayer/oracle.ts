"use client";

import { getGenLayerReadClient, getGenLayerWriteClient } from "./client";

export const PRICE_ORACLE_CONTRACT = "0xe4edDda1250A0a3d70968798Ef09b70F1BfA94eF" as const;

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

  const hash = (await client.writeContract({
    address: PRICE_ORACLE_CONTRACT,
    functionName: "fetchPrice",
    args: [symbol],
    value: BigInt(0),
  })) as string;

  return hash;
}

export async function getTxStatus(hash: string): Promise<{ hash: string; status: string }> {
  try {
    const client = getGenLayerReadClient();
    const receipt = (await client.getTransactionReceipt({ hash: hash as `0x${string}` })) as any;
    if (receipt?.status === "ACCEPTED" || receipt?.status === "FINALIZED") {
      return { hash, status: "FINALIZED" };
    }
    return { hash, status: receipt?.status || "UNKNOWN" };
  } catch {
    return { hash, status: "UNKNOWN" };
  }
}
