/**
 * Sybil Risk Score — scoring engine.
 *
 * Pure functions only: take a WalletProfile, return a SybilReport. No database,
 * no network, no `process.env`. That keeps the arithmetic testable and makes it
 * obvious that the same input always produces the same output.
 *
 * ── Why the aggregation is shaped the way it is ───────────────────────────
 *
 * The failure mode that ruins a score like this is the false positive: a real
 * user with a long streak and a quiet social presence gets flagged, feels
 * accused, and leaves. Two rules push back on that:
 *
 *   1. CORROBORATION. A single firing family is damped to at most
 *      SINGLE_FAMILY_CEILING of its own weight. One odd signal can suggest
 *      "worth a look", never "guilty". Independent signals have to agree.
 *   2. COVERAGE. Signals we could not measure do not count as clean — they
 *      reduce `coverage`, and low coverage caps the reported score so a wallet
 *      is never convicted on the absence of data.
 *
 * The converse also matters: the signals are only ever *indicators*. A high
 * score means "a human should look at this", not "this is a cheater".
 */

import type {
  NetworkFacts,
  SybilFamily,
  SybilReport,
  SybilSignal,
  SybilTier,
  WalletProfile,
} from "./types";

/** Signal definitions, grouped by the family each one argues for. */
const SIGNAL_WEIGHTS: Record<string, number> = {
  handle_reuse: 1,
  funding_cluster: 1,
  perfect_attendance: 0.9,
  cadence_regularity: 0.7,
  action_breadth: 0.5,
  cross_chain_fanout: 0.35,
  dust_concentration: 0.6,
  thin_presence: 0.4,
};

/**
 * What share of the weighted score survives when only one family fires.
 * 0.55 means a lone signal is held to roughly half its raw weight.
 */
const SINGLE_FAMILY_CEILING = 0.55;

/** With less than this much measured weight, the score is capped below "watch". */
const MIN_COVERAGE_FOR_ESCALATION = 0.4;
const LOW_COVERAGE_SCORE_CAP = 35;

/** Days of perfect attendance before a streak starts to look machine-run. */
const PERFECT_STREAK_FLOOR = 14;
/** Streak length at which perfect attendance saturates to full risk. */
const PERFECT_STREAK_CEILING = 42;

/** Networks before cross-chain fan-out saturates. */
const FANOUT_SATURATION = 10;

/** Action-type count that represents a genuinely varied user. */
const DIVERSE_ACTION_TYPES = 3;

const DAY_MS = 86_400_000;

const clamp01 = (n: number): number =>
  Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const stdev = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/**
 * Coefficient of variation of the gaps between actions. Humans are irregular;
 * a cron-driven bot is not. Returns null when there is too little to say.
 */
export function intervalRegularity(timestamps: number[]): number | null {
  if (timestamps.length < 3) return null;
  const sorted = [...timestamps].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > 0) gaps.push(gap);
  }
  if (gaps.length < 2) return null;
  const m = mean(gaps);
  if (m <= 0) return 0;
  return stdev(gaps) / m;
}

/**
 * Normalised Shannon entropy of the hour-of-day distribution, 0 .. 1.
 * A person has a sleep gap, so their hours are lumpy. A bot running around the
 * clock spreads thin, evenly-weighted actions across all 24 hours.
 */
export function hourEntropy(timestamps: number[]): number | null {
  if (timestamps.length < 6) return null;
  const counts = new Array(24).fill(0);
  for (const t of timestamps) {
    counts[new Date(t).getUTCHours()] += 1;
  }
  let entropy = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / timestamps.length;
    entropy -= p * Math.log2(p);
  }
  return clamp01(entropy / Math.log2(24));
}


/** Handles that are shared by more than one wallet are a strong identity leak. */
function handleReuseSignals(p: WalletProfile): SybilSignal[] {
  const out: SybilSignal[] = [];
  const seen = new Set<string>();
  for (const h of p.socialHandles) {
    if (h.sharedBy < 2) continue;
    const key = `${h.platform}:${h.handle}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // Two wallets on one handle is notable; a farm of ten is damning.
    const risk = clamp01((h.sharedBy - 1) / 4);
    out.push({
      id: "handle_reuse",
      family: "identity",
      risk,
      weight: SIGNAL_WEIGHTS.handle_reuse,
      confidence: 1,
      evidence:
        h.sharedBy > 2
          ? `The linked ${h.platform} handle is claimed by ${h.sharedBy} wallets.`
          : `The linked ${h.platform} handle is also claimed by another wallet.`,
    });
  }
  return out;
}

/**
 * Requires an indexer we do not ship. When no cluster data is available the
 * signal reports zero confidence and is dropped, rather than being assumed
 * clean — see the COVERAGE note at the top of this file.
 */
function fundingClusterSignals(p: WalletProfile): SybilSignal[] {
  const size = p.fundingClusterSize;
  if (size === null || size < 2) return [];
  return [
    {
      id: "funding_cluster",
      family: "identity",
      risk: clamp01((size - 1) / 9),
      weight: SIGNAL_WEIGHTS.funding_cluster,
      confidence: 0.9,
      evidence: `${size} wallets were funded from a common source.`,
    },
  ];
}

/**
 * A long run with zero missed days is unusual: real people forget, travel, and
 * skip. The longer the unbroken run, the harder that is to explain.
 */
function perfectAttendanceSignals(p: WalletProfile): SybilSignal[] {
  const streak = p.streak;
  if (streak < PERFECT_STREAK_FLOOR) return [];
  const missed = Math.max(0, p.totalCheckIns - streak);
  const neverMissed = missed === 0;
  const lengthRisk = clamp01(
    (streak - PERFECT_STREAK_FLOOR) /
      (PERFECT_STREAK_CEILING - PERFECT_STREAK_FLOOR)
  );
  // A perfect run over a long streak is the case we care about; a long streak
  // with a handful of misses is ordinary and only mildly interesting.
  const risk = clamp01(lengthRisk * (neverMissed ? 1 : 0.35));
  if (risk <= 0) return [];
  return [
    {
      id: "perfect_attendance",
      family: "behavior",
      risk,
      weight: SIGNAL_WEIGHTS.perfect_attendance,
      confidence: clamp01(p.totalCheckIns / 20),
      evidence: neverMissed
        ? `${streak} consecutive days with no missed check-in.`
        : `${streak}-day streak, ${missed} missed check-in(s).`,
    },
  ];
}

/** Machine-regular timing: low gap variance combined with a flat day profile. */
function cadenceSignals(p: WalletProfile): SybilSignal[] {
  const cv = intervalRegularity(p.actionTimestamps);
  const entropy = hourEntropy(p.actionTimestamps);
  if (cv === null) return [];

  // CV of 0 is perfectly periodic; ~1.5 or above is ordinary human behaviour.
  const regularityRisk = clamp01(1 - cv / 1.5);
  // Flat hour-of-day (entropy near 0) means no sleep gap at all.
  const diurnalRisk = entropy === null ? 0.35 : clamp01(1 - entropy);

  const risk = clamp01(regularityRisk * 0.5 + diurnalRisk * 0.5);
  if (risk <= 0.05) return [];

  const parts: string[] = [];
  if (regularityRisk > 0.5) parts.push("actions are near-perfectly periodic");
  if (diurnalRisk > 0.5) parts.push("activity is spread evenly around the clock");

  return [
    {
      id: "cadence_regularity",
      family: "behavior",
      risk,
      weight: SIGNAL_WEIGHTS.cadence_regularity,
      // Confidence grows with sample size but saturates; ten samples is thin.
      confidence: clamp01(p.actionTimestamps.length / 60),
      evidence:
        parts.length > 0
          ? `Across ${p.actionTimestamps.length} actions, ${parts.join(" and ")}.`
          : `${p.actionTimestamps.length} actions with mildly regular spacing.`,
    },
  ];
}

/**
 * Real participation shows variety. A wallet that only ever repeats the same
 * one action is a script, not a session.
 */
function actionBreadthSignals(p: WalletProfile): SybilSignal[] {
  if (p.totalActions < 12) return [];
  const variety = p.distinctActionTypes;
  if (variety >= DIVERSE_ACTION_TYPES) return [];
  const risk = clamp01(1 - variety / DIVERSE_ACTION_TYPES) * clamp01(
    (p.totalActions - 12) / 30
  );
  if (risk <= 0) return [];
  return [
    {
      id: "action_breadth",
      family: "behavior",
      risk,
      weight: SIGNAL_WEIGHTS.action_breadth,
      confidence: 0.7,
      evidence: `${p.totalActions} actions but only ${variety} distinct action type(s).`,
    },
  ];
}

/**
 * Running the same routine on many networks at once is a farming shape. Kept
 * deliberately weak: this app actively rewards multi-chain play, so breadth
 * alone must not look like abuse.
 */
function crossChainSignals(p: WalletProfile): SybilSignal[] {
  if (p.networks < 2) return [];
  const risk = clamp01((p.networks - 1) / FANOUT_SATURATION) * 0.5;
  return [
    {
      id: "cross_chain_fanout",
      family: "behavior",
      risk,
      weight: SIGNAL_WEIGHTS.cross_chain_fanout,
      confidence: 0.6,
      evidence: `Active on ${p.networks} networks from a single wallet.`,
    },
  ];
}

/** A wallet holding only dust, used purely to push transactions, is a burner. */
function dustSignals(p: WalletProfile, streak: number): SybilSignal[] {
  const withBalance = p.onchain.filter((n) => !n.isContract);
  if (withBalance.length === 0) return [];
  const dustiest = withBalance.reduce((a, b) =>
    b.dustiness > a.dustiness ? b : a
  );
  if (dustiest.dustiness < 0.6) return [];
  // A long streak with a barely-funded wallet is the combination that matters.
  const activityRisk = clamp01((streak - 7) / 21);
  const risk = clamp01(dustiest.dustiness * activityRisk);
  if (risk <= 0) return [];
  return [
    {
      id: "dust_concentration",
      family: "onchain",
      risk,
      weight: SIGNAL_WEIGHTS.dust_concentration,
      confidence: 0.65,
      evidence: `Holds only dust on ${dustiest.chainName} while running a ${streak}-day streak.`,
    },
  ];
}

/**
 * High points but no community footprint at all: no linked handle, no games,
 * no tournaments. Weak on its own, useful in combination.
 */
function thinPresenceSignals(p: WalletProfile): SybilSignal[] {
  if (p.streak < 14) return [];
  const footprint =
    (p.socialHandles.length > 0 ? 1 : 0) +
    (p.gamePlays > 0 ? 1 : 0) +
    (p.tournamentEntries > 0 ? 1 : 0);
  if (footprint > 0) return [];
  const risk = clamp01((p.streak - 14) / 28) * 0.6;
  if (risk <= 0) return [];
  return [
    {
      id: "thin_presence",
      family: "social",
      risk,
      weight: SIGNAL_WEIGHTS.thin_presence,
      confidence: 0.5,
      evidence: `${p.streak}-day streak with no linked social, game, or tournament activity.`,
    },
  ];
}

export function computeSignals(p: WalletProfile): SybilSignal[] {
  return [
    ...handleReuseSignals(p),
    ...fundingClusterSignals(p),
    ...perfectAttendanceSignals(p),
    ...cadenceSignals(p),
    ...actionBreadthSignals(p),
    ...crossChainSignals(p),
    ...dustSignals(p, p.streak),
    ...thinPresenceSignals(p),
  ];
}

const ALL_FAMILIES: SybilFamily[] = ["identity", "behavior", "onchain", "social"];

export function tierFor(score: number): SybilTier {
  if (score >= 75) return "severe";
  if (score >= 50) return "elevated";
  if (score >= 25) return "watch";
  return "low";
}


/**
 * Turn signals into a 0..100 score.
 *
 * Weight of a signal = its own weight, scaled by how much data backed it. A
 * signal measured with almost no confidence therefore barely counts, which is
 * how "we could not really tell" turns into "we do not accuse".
 */
export function scoreProfile(p: WalletProfile): SybilReport {
  const allSignals = computeSignals(p);
  const measured = allSignals.filter((s) => s.confidence > 0);

  // Coverage: measured weight over the weight we would have if everything had
  // been measurable. Missing data can only lower this.
  const totalPossibleWeight = Object.values(SIGNAL_WEIGHTS).reduce((a, b) => a + b, 0);
  const measuredWeight = measured.reduce(
    (acc, s) => acc + s.weight * s.confidence,
    0
  );
  const coverage = clamp01(measuredWeight / totalPossibleWeight);

  const familyRisk: Record<SybilFamily, number> = {
    identity: 0,
    behavior: 0,
    onchain: 0,
    social: 0,
  };
  const familyWeight: Record<SybilFamily, number> = {
    identity: 0,
    behavior: 0,
    onchain: 0,
    social: 0,
  };
  for (const s of measured) {
    const w = s.weight * s.confidence;
    // Signals inside a family are averaged, so stacking weak signals in one
    // family cannot out-shout a single strong signal elsewhere.
    familyRisk[s.family] =
      (familyRisk[s.family] * familyWeight[s.family] + s.risk * w) /
      (familyWeight[s.family] + w);
    familyWeight[s.family] += w;
  }

  const triggeredFamilies = ALL_FAMILIES.filter((f) => familyRisk[f] >= 0.2);

  const weightedSum = ALL_FAMILIES.reduce(
    (acc, f) => acc + familyRisk[f] * familyWeight[f],
    0
  );
  const weightSum = ALL_FAMILIES.reduce((acc, f) => acc + familyWeight[f], 0);
  let score = weightSum > 0 ? clamp01(weightedSum / weightSum) * 100 : 0;

  // Corroboration: one lone family is held to part of its weight. Two or more
  // independent families agreeing is what turns "odd" into "likely".
  const corroboration =
    triggeredFamilies.length <= 1
      ? SINGLE_FAMILY_CEILING
      : 1 - (SINGLE_FAMILY_CEILING - 1) * (triggeredFamilies.length - 1) * 0.35;
  score *= clamp01(corroboration);

  // Thin data must not produce a confident-looking accusation.
  if (coverage < MIN_COVERAGE_FOR_ESCALATION) {
    score = Math.min(score, LOW_COVERAGE_SCORE_CAP);
  }

  score = Math.round(clamp01(score / 100) * 100);

  const confidence =
    measured.length === 0
      ? 0
      : clamp01(
          measured.reduce((acc, s) => acc + s.confidence * s.weight, 0) /
            measured.reduce((acc, s) => acc + s.weight, 0)
        );

  const disclaimers: string[] = [
    "Heuristic estimate, not a verdict. A high score means a human should review, not that abuse is proven.",
    "No single signal is sufficient on its own — independent signals must agree before the score escalates.",
  ];
  if (coverage < MIN_COVERAGE_FOR_ESCALATION) {
    disclaimers.push(
      "Little data was available for this wallet, so the score is capped and should be treated as inconclusive."
    );
  }
  if (p.fundingClusterSize === null) {
    disclaimers.push(
      "Funding-source clustering was not measured (no indexer configured), which may hide a shared-funder ring."
    );
  }
  if (p.onchain.length === 0) {
    disclaimers.push(
      "No on-chain data was reachable, so balance and nonce signals could not contribute."
    );
  }

  return {
    address: p.address,
    score,
    tier: tierFor(score),
    confidence: Math.round(confidence * 100),
    coverage: Math.round(coverage * 100),
    families: Object.fromEntries(
      ALL_FAMILIES.map((f) => [f, Math.round(familyRisk[f] * 100) / 100])
    ) as Record<SybilFamily, number>,
    triggeredFamilies,
    signals: measured.sort((a, b) => b.risk * b.weight - a.risk * a.weight),
    networks: p.networks,
    computedAt: new Date().toISOString(),
    disclaimers,
  };
}

/** Days between two epoch-ms stamps, floored at 0. Exported for the collector. */
export function daysBetween(from: number | null, to: number | null): number {
  if (from === null || to === null) return 0;
  return Math.max(0, Math.floor((to - from) / DAY_MS));
}

// Re-exported so the test harness and collector need only one import.
export type {
  NetworkFacts,
  SybilFamily,
  SybilReport,
  SybilSignal,
  SybilTier,
  WalletProfile,
} from "./types";
