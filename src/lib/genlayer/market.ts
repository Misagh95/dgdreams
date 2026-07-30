"use client";

import { getGenLayerReadClient, getGenLayerWriteClient } from "./client";
import type { Address } from "viem";
import { PRICE_ORACLE_CONTRACT } from "./oracle";

export const MARKET_CONTRACT = "0xf3A951D4c2659C276aefA8bfd0B859564894fe76" as const;

export interface Market {
  id: number;
  question: string;
  source_url: string;
  target_value: string;
  condition: string;
  resolves_at: number;
  resolved: boolean;
  outcome: string;
  yes_pool: number;
  no_pool: number;
  predictions: Record<string, { outcome: number; amount: number }>;
  creator: string;
  created_at: number;
  my_prediction?: { outcome: number; amount: number };
}

export async function marketGetMarkets(): Promise<Market[]> {
  const client = getGenLayerReadClient();
  const result = await client.readContract({
    address: MARKET_CONTRACT,
    functionName: "getMarkets",
    args: [],
  });
  return JSON.parse(String(result));
}

export async function marketGetMarket(marketId: number): Promise<Market> {
  const client = getGenLayerReadClient();
  const result = await client.readContract({
    address: MARKET_CONTRACT,
    functionName: "getMarket",
    args: [marketId],
  });
  return JSON.parse(String(result));
}

export async function marketGetMyPredictions(wallet: Address): Promise<Market[]> {
  const client = getGenLayerReadClient();
  const result = await client.readContract({
    address: MARKET_CONTRACT,
    functionName: "getMyPredictions",
    args: [wallet],
  });
  return JSON.parse(String(result));
}

export async function marketCreate(
  wallet: Address,
  question: string,
  sourceUrl: string,
  targetValue: string,
  condition: string,
  resolvesAt: number
): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: MARKET_CONTRACT,
    functionName: "createMarket",
    args: [question, sourceUrl, targetValue, condition, resolvesAt],
    value: BigInt(0),
  })) as string;
}

export async function marketPredict(
  wallet: Address,
  marketId: number,
  outcome: number,
  amount: number
): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: MARKET_CONTRACT,
    functionName: "predict",
    args: [marketId, outcome, amount],
    value: BigInt(0),
  })) as string;
}

export async function marketResolve(
  wallet: Address,
  marketId: number
): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: MARKET_CONTRACT,
    functionName: "resolveMarket",
    args: [marketId, ""],
    value: BigInt(0),
  })) as string;
}

export async function marketResolveWithOracle(
  wallet: Address,
  marketId: number,
  symbol: string,
  maxAge: number = 3600
): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: MARKET_CONTRACT,
    functionName: "resolveWithOracle",
    args: [marketId, PRICE_ORACLE_CONTRACT, symbol, maxAge],
    value: BigInt(0),
  })) as string;
}
