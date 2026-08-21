"use client";

import { getGenLayerReadClient, getGenLayerWriteClient } from "./client";
import type { Address } from "viem";

export const TRUTHCOURT_CONTRACT =
  "0x43330f8F9d1f9B531C88C5BaC3C5918cb6DD1cd6" as const;

export interface TruthCourtClaim {
  id: number;
  text: string;
  evidence_urls: string[];
  poster: string;
  bond: string; // wei, decimal string
  challenger: string;
  challenger_urls: string[];
  status: "open" | "contested" | "resolved";
  verdict: "" | "true" | "false" | "unverifiable" | "cancelled";
  reasoning: string;
}

export interface TruthCourtConfig {
  fee_bps: number;
  treasury: string;
}

export async function truthCourtGetConfig(): Promise<TruthCourtConfig> {
  const client = getGenLayerReadClient();
  const r = await client.readContract({
    address: TRUTHCOURT_CONTRACT,
    functionName: "get_config",
    args: [],
  });
  return JSON.parse(String(r));
}

export async function truthCourtGetClaims(): Promise<TruthCourtClaim[]> {
  const client = getGenLayerReadClient();
  const count = Number(
    await client.readContract({
      address: TRUTHCOURT_CONTRACT,
      functionName: "get_claim_count",
      args: [],
    })
  );
  if (!count || count <= 0) return [];
  const page = await client.readContract({
    address: TRUTHCOURT_CONTRACT,
    functionName: "get_claims",
    args: [0, count],
  });
  return (page as string[]).map((c) => JSON.parse(c));
}

export async function truthCourtSubmitClaim(
  wallet: Address,
  text: string,
  urls: string[],
  bondWei: bigint
): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: TRUTHCOURT_CONTRACT,
    functionName: "submit_claim",
    args: [text, urls],
    value: bondWei,
  })) as string;
}

export async function truthCourtChallengeClaim(
  wallet: Address,
  claimId: number,
  urls: string[],
  bondWei: bigint
): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: TRUTHCOURT_CONTRACT,
    functionName: "challenge_claim",
    args: [claimId, urls],
    value: bondWei,
  })) as string;
}

export async function truthCourtResolveClaim(
  wallet: Address,
  claimId: number
): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: TRUTHCOURT_CONTRACT,
    functionName: "resolve_claim",
    args: [claimId],
    value: BigInt(0),
  })) as string;
}

export async function truthCourtCancelClaim(
  wallet: Address,
  claimId: number
): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: TRUTHCOURT_CONTRACT,
    functionName: "cancel_claim",
    args: [claimId],
    value: BigInt(0),
  })) as string;
}

export async function truthCourtWithdraw(
  wallet: Address
): Promise<string> {
  const client = getGenLayerWriteClient(wallet);
  if (!client) throw new Error("GenLayer wallet not connected");
  return (await client.writeContract({
    address: TRUTHCOURT_CONTRACT,
    functionName: "withdraw",
    args: [],
    value: BigInt(0),
  })) as string;
}

/** GEN (decimal string, e.g. "0.1") -> wei */
export function genToWei(amountGen: string): bigint {
  const [whole, frac = ""] = amountGen.trim().split(".");
  const fracPadded = (frac + "000000000000000000").slice(0, 18);
  return BigInt(whole || "0") * 10n ** 18n + BigInt(fracPadded || "0");
}

/** wei -> GEN display string */
export function weiToGen(wei: string | bigint): string {
  const w = typeof wei === "bigint" ? wei : BigInt(wei);
  const whole = w / 10n ** 18n;
  const frac = (w % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function shortAddr(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}