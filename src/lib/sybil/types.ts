/**
 * Sybil Risk Score — shared types.
 *
 * A "sybil" is one human running many wallets to farm a rewards program. The
 * signals here look for that shape: reused identities, machine-regular
 * activity, fan-out across networks, and wallets that exist only to call a
 * contract.
 *
 * IMPORTANT: this is a *heuristic*, not a verdict. Every number it produces is
 * an estimate with a confidence attached, and the aggregation is deliberately
 * built so no single signal can convict a wallet on its own. See engine.ts.
 *
 * Deliberately dependency-free (no `@/` imports) so it can be unit tested by
 * running the file directly under Node's type stripping.
 */

export type SybilFamily = "identity" | "behavior" | "onchain" | "social";

export type SybilTier = "low" | "watch" | "elevated" | "severe";

/** One measured indicator. */
export interface SybilSignal {
  id: string;
  family: SybilFamily;
  /** Normalised risk for this indicator alone, 0 (clean) .. 1 (maximal). */
  risk: number;
  /** Relative importance inside its family, 0 .. 1. */
  weight: number;
  /**
   * How much data actually backed the measurement, 0 .. 1. A signal computed
   * from six timestamps is not as trustworthy as one computed from six hundred.
   * Zero confidence means "not measured" and the signal is dropped entirely —
   * never treated as clean.
   */
  confidence: number;
  /**
   * Short, human-readable justification shown in the UI. Must never name or
   * link another wallet: shared handles are reported as counts only.
   */
  evidence: string;
}

/** On-chain facts for a single network, already normalised by the collector. */
export interface NetworkFacts {
  chainId: number;
  chainName: string;
  /**
   * 0 .. 1 — how close the native balance sits to "dust". 1 means the wallet
   * holds only enough to squeak a transaction through. Collected here rather
   * than in the engine so the engine stays free of per-chain decimals.
   */
  dustiness: number;
  /** Outbound transaction count reported by the node. */
  nonce: number;
  /** True when the address has deployed code. */
  isContract: boolean;
}

/** Everything the engine needs about one wallet. */
export interface WalletProfile {
  address: string;
  /** Longest chain-verified streak. */
  streak: number;
  totalCheckIns: number;
  totalActions: number;
  /** Epoch ms of the earliest activity we have on record, if any. */
  firstSeen: number | null;
  /** Epoch ms of the most recent activity. */
  lastActive: number | null;
  /** Distinct networks this wallet has been seen on. */
  networks: number;
  /**
   * Epoch ms of individual actions, used for cadence analysis. More samples
   * means a more trustworthy verdict.
   */
  actionTimestamps: number[];
  /** Linked social handles, with how many distinct wallets share each. */
  socialHandles: { platform: string; handle: string; sharedBy: number }[];
  /** Distinct action types seen in prediction/games, e.g. create_market, gm. */
  distinctActionTypes: number;
  gamePlays: number;
  tournamentEntries: number;
  onchain: NetworkFacts[];
  /** Wallets funded from the same source, or null when no indexer is wired. */
  fundingClusterSize: number | null;
}

export interface SybilReport {
  address: string;
  /** 0 (clean) .. 100 (severe). */
  score: number;
  tier: SybilTier;
  /** Weighted mean of the confidence of every signal that was measured. */
  confidence: number;
  /**
   * Fraction of the total signal weight that could actually be measured. Low
   * coverage caps how high the score is allowed to go.
   */
  coverage: number;
  /** Per-family risk, 0 .. 1. */
  families: Record<SybilFamily, number>;
  /** Families that fired meaningfully — corroboration is what raises trust. */
  triggeredFamilies: SybilFamily[];
  signals: SybilSignal[];
  networks: number;
  computedAt: string;
  /** Things a reader must know before acting on this number. */
  disclaimers: string[];
}
