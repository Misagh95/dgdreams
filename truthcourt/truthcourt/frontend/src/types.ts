/// <reference types="vite/client" />

/** A single claim as returned by the contract's `get_claim` view. */
export interface Claim {
  id: number;
  text: string;
  evidence_urls: string[];
  poster: string;
  bond: string; // wei, decimal string
  challenger: string;
  challenger_urls: string[];
  status: "open" | "contested" | "resolved";
  verdict: "true" | "false" | "unverifiable" | "cancelled" | "";
  reasoning: string;
}

export interface Config {
  fee_bps: number;
  treasury: string;
}

export type TxState =
  | "idle"
  | "submitting"
  | "pending"
  | "accepted"
  | "finalized"
  | "error";
