"use client";

import { getGenLayerReadClient, getGenLayerWriteClient } from "./client";
import { TransactionStatus, type Hash } from "genlayer-js/types";

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

  const hash = (await client.writeContract({
    address: PRICE_ORACLE_CONTRACT,
    functionName: "fetchPrice",
    args: [symbol],
    value: BigInt(0),
  })) as unknown as Hash;

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 90,
    interval: 3000,
  });

  return hash as unknown as string;
}

export async function getTxStatus(hash: string) {
  const client = getGenLayerReadClient();
  try {
    const tx = await client.getTransaction({ hash: hash as any });
    return {
      status: tx.statusName || "UNKNOWN",
      result: tx.txExecutionResultName,
    };
  } catch {
    return { status: "UNKNOWN", result: undefined };
  }
}
