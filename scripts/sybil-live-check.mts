/**
 * Local smoke test for GET /api/sybil.
 *
 * Mints a real session token using the same HMAC construction as
 * src/lib/session.ts, then calls the endpoint exactly as the browser would.
 *
 * The signing step is duplicated here rather than imported on purpose: the app
 * reaches session.ts through the "@/" path alias, which bare Node cannot
 * resolve, and importing a Next-only module into a standalone script would be
 * the bigger problem. Keep this in sync with createSessionToken() if the token
 * format ever changes.
 *
 * Run the dev server first:
 *   npx next dev -p 3000
 *   node --experimental-strip-types scripts/sybil-live-check.mts
 *
 * This is a read-only check: it never writes to the database.
 */
import { createHmac } from "node:crypto";
import { config as loadEnv } from "dotenv";
loadEnv({ path: new URL("../.env.local", import.meta.url) });

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("SESSION_SECRET is not set in .env.local");

function createSessionToken(address: string, ttlMs = 7 * 24 * 60 * 60 * 1000) {
  const payload = { address, iat: Date.now(), exp: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}


const BASE = process.env.SYBIL_BASE_URL ?? "http://localhost:3000";

/**
 * Wallets to score. Override with SYBIL_TEST_WALLETS (comma separated) — the
 * seeded placeholders are empty once their profile has been moved onto a
 * derived test wallet, so the default set is only useful right after seeding.
 */
const DEFAULT_WALLETS =
  "0x1111111111111111111111111111111111111111," +
  "0x2222222222222222222222222222222222222222," +
  "0x3333333333333333333333333333333333333333";

const WALLETS_TO_CHECK = (process.env.SYBIL_TEST_WALLETS ?? DEFAULT_WALLETS)
  .split(",")
  .map((w) => w.trim())
  .filter(Boolean)
  .map((address, i) => ({
    label: process.env.SYBIL_TEST_LABELS?.split(",")[i]?.trim() ?? `w${i + 1}`,
    address: address.toLowerCase(),
  }));

let leaked = false;

for (const { label, address } of WALLETS_TO_CHECK) {
  const token = createSessionToken(address);
  const res = await fetch(`${BASE}/api/sybil`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log(`\n=== ${label.trim()}  ${address} ===`);
  console.log(`status: ${res.status}`);

  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.log("body:", JSON.stringify(body));
    leaked = true;
    continue;
  }

  const r = body.report as {
    score: number;
    tier: string;
    confidence: number;
    coverage: number;
    families: Record<string, number>;
    triggeredFamilies: string[];
    networks: number;
    signals: { id: string; risk: number; evidence: string }[];
    disclaimers: string[];
  };

  console.log(`score      : ${r.score}/100  (${r.tier})`);
  console.log(`confidence : ${r.confidence}%   coverage: ${r.coverage}%`);
  console.log(`networks   : ${r.networks}`);
  console.log(`families   : ${JSON.stringify(r.families)}`);
  console.log(`triggered  : ${JSON.stringify(r.triggeredFamilies)}`);
  for (const s of r.signals) {
    console.log(`   - ${s.id} (risk ${s.risk}) — ${s.evidence}`);
  }

  // The response must never carry a session secret, a tx-sized hash, or any
  // address other than the one that was asked about.
  const serialized = JSON.stringify(body);
  if (/"exp"|"iat"|privateKey|0x[a-fA-F0-9]{64}/.test(serialized)) {
    console.log("   !! leak check FAILED");
    leaked = true;
  }
  for (const other of WALLETS_TO_CHECK) {
    if (other.address !== address && serialized.includes(other.address)) {
      console.log(`   !! leak: response contained ${other.address}`);
      leaked = true;
    }
  }
}

console.log(`\nleak check : ${leaked ? "FAILED" : "clean"}`);
process.exit(leaked ? 1 : 0);
