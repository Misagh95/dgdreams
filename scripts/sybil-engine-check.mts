/**
 * Engine check — run with:  node --experimental-strip-types scripts/sybil-engine-check.ts
 *
 * Verifies the scoring behaves the way the design promises: honest wallets
 * stay low, a one-signal oddity is damped, and only a wallet that trips
 * several independent families at once climbs.
 */
import {
  scoreProfile,
  tierFor,
  intervalRegularity,
  hourEntropy,
  type WalletProfile,
} from "../src/lib/sybil/engine.ts";

let failures = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);
const DAY = 86_400_000;

/**
 * Irregular, waking-hours timestamps for a real person.
 *
 * Two independent random draws per day: the hour of day it happened, and a
 * minute offset inside that hour. A single draw makes the gaps suspiciously
 * even, which is the very regularity the cadence signal is meant to detect —
 * the "human" fixture must not itself look like a bot.
 */
function humanTimestamps(n: number, seed = 7): number[] {
  let s = seed >>> 0;
  const next = () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 4294967296;
  };
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    // Waking hours only (UTC 8..23) — people are not on-chain at 4am.
    const hour = 8 + Math.floor(next() * 16);
    const minute = Math.floor(next() * 60);
    const second = Math.floor(next() * 60);
    // 0..20 extra days of jitter on top of the day grid, so consecutive
    // actions are not exactly 24h apart.
    const drift = next() * 20 * 3_600_000;
    const day = new Date(NOW - i * DAY + drift);
    day.setUTCHours(hour, minute, second, 0);
    out.push(day.getTime());
  }
  return out.sort((a, b) => a - b);
}

function botTimestamps(n: number): number[] {
  // Exactly every 8 hours, forever. The textbook farming signature.
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(NOW - i * 8 * 3_600_000);
  return out;
}

function base(over: Partial<WalletProfile> = {}): WalletProfile {
  return {
    address: "0x1111111111111111111111111111111111111111",
    streak: 5,
    totalCheckIns: 6,
    totalActions: 30,
    firstSeen: NOW - 60 * DAY,
    lastActive: NOW,
    networks: 2,
    actionTimestamps: humanTimestamps(30),
    socialHandles: [{ platform: "twitter", handle: "alice", sharedBy: 1 }],
    distinctActionTypes: 3,
    gamePlays: 4,
    tournamentEntries: 1,
    onchain: [
      { chainId: 1, chainName: "Ethereum", dustiness: 0.05, nonce: 40, isContract: false },
    ],
    fundingClusterSize: null,
    ...over,
  };
}

console.log("\n[1] Honest long-time user stays low");
{
  const r = scoreProfile(base({ streak: 40, totalCheckIns: 44 }));
  check("score below 25 (watch threshold)", r.score < 25, `got ${r.score}`);
  check("tier is low", r.tier === "low", `got ${r.tier}`);
  check("confidence is meaningful", r.confidence > 30, `got ${r.confidence}`);
}

console.log("\n[2] Human irregularity is correctly measured as irregular");
{
  const humanCv = intervalRegularity(humanTimestamps(40)) ?? 0;
  const humanH = hourEntropy(humanTimestamps(40)) ?? 0;
  const botCv = intervalRegularity(botTimestamps(40)) ?? 9;
  const botH = hourEntropy(botTimestamps(40)) ?? 9;
  console.log(`        human CV=${humanCv.toFixed(2)} entropy=${humanH.toFixed(2)}`);
  console.log(`        cron  CV=${botCv.toFixed(2)} entropy=${botH.toFixed(2)}`);
  check("human gap variance is high", humanCv > 0.5, `got ${humanCv.toFixed(2)}`);
  check("human hours are clustered", humanH > 0.8, `got ${humanH.toFixed(2)}`);
  check("cron gap variance is near zero", botCv < 0.01, `got ${botCv.toFixed(2)}`);
  check("cron hours are flat", botH < 0.6, `got ${botH.toFixed(2)}`);
}

console.log("\n[3] Bots separate from humans — including honest power users");
{
  const honest = scoreProfile(
    base({
      streak: 120,
      totalCheckIns: 130,
      totalActions: 400,
      actionTimestamps: humanTimestamps(120),
      distinctActionTypes: 3,
      networks: 8,
    })
  );
  const bot = scoreProfile(
    base({
      streak: 120,
      totalCheckIns: 120,
      totalActions: 400,
      actionTimestamps: botTimestamps(120),
      distinctActionTypes: 1,
    })
  );
  console.log(`        honest power user = ${honest.score} (${honest.tier}) triggered=${JSON.stringify(honest.triggeredFamilies)}`);
  console.log(`        cron bot           = ${bot.score} (${bot.tier}) triggered=${JSON.stringify(bot.triggeredFamilies)}`);
  for (const s of bot.signals) {
    console.log(`            bot signal ${s.id} risk=${s.risk.toFixed(2)} w=${s.weight} conf=${s.confidence.toFixed(2)}`);
  }
  check(
    "an honest power user stays low despite a 120-day streak",
    honest.score < 25,
    `got ${honest.score}`
  );
  check(
    "a cron bot is flagged above the honest user",
    bot.score > honest.score,
    `${bot.score} vs ${honest.score}`
  );
}

console.log("\n[4] A single odd signal is damped, not convicted");
{
  // One lone family firing, nothing else wrong.
  const lone = scoreProfile(
    base({ streak: 40, totalCheckIns: 40, actionTimestamps: humanTimestamps(40) })
  );
  const clean = scoreProfile(
    base({ streak: 6, totalCheckIns: 8, actionTimestamps: humanTimestamps(40) })
  );
  check(
    "lone perfect-attendance signal stays well under 50",
    lone.score < 50,
    `got ${lone.score}`
  );
  check(
    "lone signal scores above a clean wallet",
    lone.score > clean.score,
    `${lone.score} vs ${clean.score}`
  );
  check(
    "exactly one family triggered",
    lone.triggeredFamilies.length === 1,
    `got ${JSON.stringify(lone.triggeredFamilies)}`
  );
}

console.log("\n[5] A wallet tripping many independent families escalates");
{
  const farm = scoreProfile(
    base({
      streak: 60,
      totalCheckIns: 60,
      totalActions: 200,
      actionTimestamps: botTimestamps(60),
      socialHandles: [{ platform: "twitter", handle: "farmbot", sharedBy: 12 }],
      distinctActionTypes: 1,
      gamePlays: 0,
      tournamentEntries: 0,
      networks: 14,
      onchain: [
        { chainId: 1, chainName: "Ethereum", dustiness: 0.95, nonce: 5, isContract: false },
      ],
    })
  );
  check("score is elevated or worse", farm.score >= 50, `got ${farm.score}`);
  check(
    "multiple families corroborate",
    farm.triggeredFamilies.length >= 3,
    `got ${farm.triggeredFamilies.length}`
  );
  check(
    "handle reuse evidence avoids naming other wallets",
    !/0x[0-9a-fA-F]{6,}/.test(JSON.stringify(farm.signals))
  );
}

console.log("\n[6] Sparse data is capped rather than trusted");
{
  const thin = scoreProfile(
    base({
      streak: 40,
      totalCheckIns: 40,
      actionTimestamps: [],
      socialHandles: [],
      distinctActionTypes: 0,
      gamePlays: 0,
      tournamentEntries: 0,
      onchain: [],
    })
  );
  check("score capped at 35 or below", thin.score <= 35, `got ${thin.score}`);
  check("coverage is reported as low", thin.coverage < 50, `got ${thin.coverage}`);
  check("disclaimer explains the cap", thin.disclaimers.some((d) => /inconclusive/i.test(d)));
}

console.log("\n[7] Invariants and tier boundaries");
{
  const r = scoreProfile(
    base({ streak: 40, totalCheckIns: 40, actionTimestamps: botTimestamps(60) })
  );
  check(
    "score is an integer 0..100",
    Number.isInteger(r.score) && r.score >= 0 && r.score <= 100
  );
  check(
    "family keys complete",
    Object.keys(r.families).sort().join() === "behavior,identity,onchain,social"
  );
  check(
    "signals sorted by contribution",
    r.signals.every((s, i, a) => i === 0 || a[i - 1].risk * a[i - 1].weight >= s.risk * s.weight)
  );
  check("tierFor(0) is low", tierFor(0) === "low");
  check("tierFor(30) is watch", tierFor(30) === "watch");
  check("tierFor(60) is elevated", tierFor(60) === "elevated");
  check("tierFor(90) is severe", tierFor(90) === "severe");
}

console.log("\n[8] Determinism");
{
  const p = base({ streak: 30, totalCheckIns: 30, actionTimestamps: botTimestamps(30) });
  const a = scoreProfile(p).score;
  const b = scoreProfile(p).score;
  check("same input gives same score", a === b, `${a} vs ${b}`);
}

console.log("\n[9] Degenerate input cannot crash or NaN");
{
  const empty = scoreProfile(
    base({
      streak: 0,
      totalCheckIns: 0,
      totalActions: 0,
      actionTimestamps: [],
      socialHandles: [],
      distinctActionTypes: 0,
      networks: 0,
      onchain: [],
    })
  );
  check("empty wallet scores 0", empty.score === 0, `got ${empty.score}`);
  check("empty wallet is low tier", empty.tier === "low", `got ${empty.tier}`);
  const dup = scoreProfile(
    base({
      socialHandles: Array.from({ length: 50 }, () => ({
        platform: "twitter",
        handle: "x",
        sharedBy: 2,
      })),
    })
  );
  check("duplicate handles do not inflate past 100", dup.score <= 100, `got ${dup.score}`);
}

console.log(
  failures === 0 ? "\nAll engine checks passed.\n" : `\n${failures} check(s) failed.\n`
);
process.exit(failures === 0 ? 0 : 1);
