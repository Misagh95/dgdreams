"use client";

import { getGenLayerReadClient, getGenLayerWriteClient } from "./client";

export const PRICE_ORACLE_CONTRACT = "0x0B1Efa2056F76bC7D55a9c4f4A43Fb9a99e1252b" as const;

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
    const tx = (await client.getTransaction({ hash: hash as any })) as any;
    const s = tx?.statusName || tx?.status || "UNKNOWN";
    return { hash, status: String(s) };
  } catch {
    return { hash, status: "UNKNOWN" };
  }
}
