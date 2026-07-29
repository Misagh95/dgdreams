"use client";

import { getGenLayerReadClient, getGenLayerWriteClient } from "./client";
import type { Address } from "viem";

export const ESCROW_CONTRACT = "0x13c15Ba23CA9160F1B358d3a8062AE6592fFdf15" as const; // placeholder until deployed

export async function escrowGetEscrow(escrowId: number): Promise<any> {
  const client = getGenLayerReadClient();
  const result = await client.readContract({
    address: ESCROW_CONTRACT,
    functionName: "getEscrow",
    args: [escrowId],
  });
  return JSON.parse(String(result));
}

export async function escrowGetByParty(party: Address): Promise<any[]> {
  const client = getGenLayerReadClient();
  const result = await client.readContract({
    address: ESCROW_CONTRACT,
    functionName: "getEscrowsByParty",
    args: [party],
  });
  return JSON.parse(String(result));
}

export async function escrowCreate(
  wallet: Address,
  partyB: string,
  terms: string,
  amount: number
): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: ESCROW_CONTRACT,
    functionName: "createEscrow",
    args: [partyB, terms, amount],
    value: BigInt(0),
  })) as string;
}

export async function escrowAccept(wallet: Address, escrowId: number): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: ESCROW_CONTRACT,
    functionName: "acceptEscrow",
    args: [escrowId],
    value: BigInt(0),
  })) as string;
}

export async function escrowRelease(wallet: Address, escrowId: number): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: ESCROW_CONTRACT,
    functionName: "releaseFunds",
    args: [escrowId],
    value: BigInt(0),
  })) as string;
}

export async function escrowRaiseDispute(wallet: Address, escrowId: number, evidence: string): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: ESCROW_CONTRACT,
    functionName: "raiseDispute",
    args: [escrowId, evidence],
    value: BigInt(0),
  })) as string;
}

export async function escrowResolve(wallet: Address, escrowId: number): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: ESCROW_CONTRACT,
    functionName: "resolveDispute",
    args: [escrowId],
    value: BigInt(0),
  })) as string;
}
