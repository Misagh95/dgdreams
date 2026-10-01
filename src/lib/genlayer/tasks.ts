"use client";

import type { Hash } from "genlayer-js/types";
import { getGenLayerReadClient, getGenLayerWriteClient, GENLAYER_CHAIN_ID } from "./client";

/**
 * ⚠️ README says 0x1203ab4E…C412, this file used 0x7cEb…024b.
 * After redeploying nikbase_genlayer.py v1.1.0, set NEXT_PUBLIC_GENLAYER_NIKBASE
 * in Vercel so there is ONE source of truth.
 */
export const GENLAYER_CONTRACT = (process.env.NEXT_PUBLIC_GENLAYER_NIKBASE ||
  "0x7cEb5303F2367608B533dB1E2616948ac98D024b") as `0x${string}`;

export type GenLayerTaskAction = "dailyCheckIn" | "gm" | "gn";

export async function genLayerWriteTask(
  address: `0x${string}`,
  functionName: GenLayerTaskAction,
  args: unknown[] = []
): Promise<{ hash: string }> {
  const client = getGenLayerWriteClient(address);
  if (!client) throw new Error("GenLayer wallet not connected");

  const hash = (await client.writeContract({
    address: GENLAYER_CONTRACT,
    functionName,
    args: args as any,
    value: BigInt(0),
  })) as unknown as Hash;

  return { hash: hash as unknown as string };
}

export async function genLayerReadContract(
  functionName: "getActionCounts" | "getUserData" | "getLastActions",
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

const OK_STATUSES = ["ACCEPTED", "FINALIZED"];
const FAIL_STATUSES = ["UNDETERMINED", "CANCELED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"];

/** Pulls the execution result out of a GenLayer tx, whichever shape the SDK returns. */
function executionFailed(tx: any): string | null {
  const name = String(
    tx?.txExecutionResultName ??
      tx?.resultName ??
      tx?.consensus_data?.leader_receipt?.[0]?.execution_result ??
      tx?.consensus_data?.leader_receipt?.execution_result ??
      ""
  ).toUpperCase();
  if (name.includes("ERROR") || name.includes("ROLLBACK")) {
    const msg =
      tx?.consensus_data?.leader_receipt?.[0]?.error ??
      tx?.consensus_data?.leader_receipt?.error ??
      "Contract rejected the action";
    return String(msg);
  }
  return null;
}

/**
 * Waits until the tx is ACCEPTED/FINALIZED **and** the contract did not raise.
 * Since nikbase v1.1.0 raises on "already done today", this is what stops the UI
 * from showing ✓ for actions that never happened.
 */
export async function waitForGenLayerTx(
  hash: string,
  { pollMs = 4000, timeoutMs = 180000, isCancelled = () => false } = {}
): Promise<{ ok: true } | { ok: false; reason: string; already?: boolean }> {
  const client = getGenLayerReadClient();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isCancelled()) return { ok: false, reason: "Cancelled" };
    try {
      const tx = (await (client as any).getTransaction({ hash })) as any;
      const status = String(tx?.statusName || tx?.status || "PENDING").toUpperCase();
      if (OK_STATUSES.includes(status)) {
        const err = executionFailed(tx);
        if (err) return { ok: false, reason: err, already: /already done today/i.test(err) };
        return { ok: true };
      }
      if (FAIL_STATUSES.includes(status)) return { ok: false, reason: `GenLayer: ${status}` };
    } catch {
      /* not indexed yet, keep polling */
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return { ok: false, reason: "GenLayer confirmation timed out" };
}

/** @deprecated use waitForGenLayerTx */
export async function genLayerTxStatus(hash: string, pollMs = 5000, timeoutMs = 120000): Promise<string> {
  const r = await waitForGenLayerTx(hash, { pollMs, timeoutMs });
  return r.ok ? "ACCEPTED" : r.reason;
}

export async function genLayerGetTxReceipt(hash: string): Promise<any> {
  const client = getGenLayerReadClient();
  try {
    return await (client as any).getTransaction({ hash });
  } catch {
    return null;
  }
}
