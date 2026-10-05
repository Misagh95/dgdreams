/**
 * Seeds a few wallets with known risk shapes so the endpoint can be exercised
 * locally with real rows.
 *
 * Three wallets, deliberately different:
 *   clean  — one social, varied actions, irregular timestamps
 *   farm   — shared handle, perfect 60-day streak, cron timing
 *   ghost  — a long streak and nothing else
 *
 * Local dev only. Writes to whatever DATABASE_URL points at, so do not run it
 * against production.
 *
 *   node --experimental-strip-types scripts/sybil-seed.mts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: new URL("../.env.local", import.meta.url) });

const pg = (await import("pg")).default;

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const DAY = 86_400_000;
const pool = new pg.Pool({ connectionString: url });

/**
 * Irregular, waking-hours timestamps for a real person.
 *
 * Independent draws for hour, minute and second, plus drift across the day
 * grid, so consecutive actions are not exactly 24h apart. A single draw makes
 * the gaps too even — which is the regularity the cadence signal detects, so
 * the "human" fixture must not look like a bot itself.
 */
function humanDays(count: number, seed: number): Date[] {
  let s = seed >>> 0;
  const next = () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 4294967296;
  };
  const out: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const hour = 8 + Math.floor(next() * 16);
    const minute = Math.floor(next() * 60);
    const second = Math.floor(next() * 60);
    const drift = next() * 20 * 3_600_000;
    const day = new Date(Date.now() - i * DAY + drift);
    day.setUTCHours(hour, minute, second, 0);
    out.push(day);
  }
  return out;
}

/** Exactly every 8 hours, forever. */
function botDays(count: number): Date[] {
  const out: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    out.push(new Date(Date.now() - i * 8 * 3_600_000));
  }
  return out;
}

const WALLETS = {
  clean: "0x1111111111111111111111111111111111111111",
  farm: "0x2222222222222222222222222222222222222222",
  ghost: "0x3333333333333333333333333333333333333333",
};

/** Siblings that share the farm's handle, so reuse has something to count. */
const RING = [
  "0x4444444444444444444444444444444444444444",
  "0x5555555555555555555555555555555555555555",
  "0x6666666666666666666666666666666666666666",
];

const client = await pool.connect();

try {
  await client.query("begin");

  // Clear prior runs so the script is repeatable.
  for (const w of [...Object.values(WALLETS), ...RING]) {
    await client.query("delete from prediction_activities where wallet_address = $1", [w]);
    await client.query("delete from wallet_socials where wallet_address = $1", [w]);
    await client.query("delete from wallet_streaks where wallet_address = $1", [w]);
  }

  // ── clean: varied actions, human schedule, a linked identity ─────────────
  await client.query(
    `insert into wallet_streaks
       (wallet_address, chain_id, chain_name, streak, total_check_ins, total_actions, day, synced_at)
     values ($1, 1, 'Ethereum', 45, 52, 180, $2, now())`,
    [WALLETS.clean, Math.floor(Date.now() / DAY)]
  );
  await client.query(
    `insert into wallet_socials (wallet_address, platform, handle) values ($1, 'twitter', 'alice_real')`,
    [WALLETS.clean]
  );
  for (const at of humanDays(45)) {
    for (const action of ["predict_yes", "predict_no", "create_market"]) {
      await client.query(
        `insert into prediction_activities
           (wallet_address, action, question, chain, points, created_at)
         values ($1, $2, 'seed question', 'genlayer', 10, $3::timestamp)`,
        [WALLETS.clean, action, at.toISOString()]
      );
    }
  }

  // ── farm: shared handle, perfect streak, cron timing ──────────────────────
  await client.query(
    `insert into wallet_streaks
       (wallet_address, chain_id, chain_name, streak, total_check_ins, total_actions, day, synced_at)
     values ($1, 1, 'Ethereum', 60, 60, 240, $2, now())`,
    [WALLETS.farm, Math.floor(Date.now() / DAY)]
  );
  for (const w of [WALLETS.farm, ...RING]) {
    await client.query(
      `insert into wallet_socials (wallet_address, platform, handle) values ($1, 'twitter', 'alpha_degen')`,
      [w]
    );
  }
  for (const at of botDays(60)) {
    await client.query(
      `insert into prediction_activities
         (wallet_address, action, question, chain, points, created_at)
       values ($1, 'predict_yes', 'up or down?', 'genlayer', 20, $2::timestamp)`,
      [WALLETS.farm, at.toISOString()]
    );
  }

  // ── ghost: a long streak and no identity at all ──────────────────────────
  await client.query(
    `insert into wallet_streaks
       (wallet_address, chain_id, chain_name, streak, total_check_ins, total_actions, day, synced_at)
     values ($1, 8453, 'Base', 30, 34, 90, $2, now())`,
    [WALLETS.ghost, Math.floor(Date.now() / DAY)]
  );
  for (const at of humanDays(30, 991)) {
    await client.query(
      `insert into prediction_activities
         (wallet_address, action, question, chain, points, created_at)
       values ($1, 'predict_yes', 'quiet activity?', 'genlayer', 20, $2::timestamp)`,
      [WALLETS.ghost, at.toISOString()]
    );
  }

  await client.query("commit");
  console.log("seeded 3 wallets:\n");
  for (const [k, v] of Object.entries(WALLETS)) console.log(`  ${k.padEnd(6)} ${v}`);
} catch (e) {
  await client.query("rollback");
  console.error("seed failed:", (e as Error).message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end().catch(() => {});
}
