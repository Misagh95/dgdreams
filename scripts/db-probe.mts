/**
 * Row counts and recent activity per table, so it is clear which sources the
 * risk collector can actually read from. Read-only.
 *
 *   node --experimental-strip-types scripts/db-probe.mts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: new URL("../.env.local", import.meta.url) });

const pg = (await import("pg")).default;
const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

console.log(`probing ${url.replace(/:[^:@/]*@/, ":***@")}`);

const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 5000 });

try {
  const client = await pool.connect();
  const { rows } = await client.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`
  );
  console.log(`\n${rows.length} table(s):`);
  for (const r of rows) console.log(`  - ${r.table_name}`);

  // Count each table that exists, so we can see which are actually populated.
  console.log("\nrow counts:");
  for (const { table_name: t } of rows) {
    if (t.startsWith("_")) continue; // drizzle migration bookkeeping
    const { rows: c } = await client.query(
      `select count(*)::int as n from "${t}"`
    );
    const n = c[0].n as number;
    const mark = n === 0 ? "  (empty)" : "";
    console.log(`  ${String(n).padStart(6)}  ${t}${mark}`);
  }

  // What does the activity history the risk engine reads actually look like?
  const { rows: act } = await client.query(
    `select wallet_address, count(*)::int as n,
            min(created_at) as first_at, max(created_at) as last_at
       from prediction_activities
      group by wallet_address
      order by n desc
      limit 10`
  );
  console.log("\nprediction_activities by wallet:");
  if (act.length === 0) console.log("  (none)");
  for (const a of act) {
    console.log(`  ${a.wallet_address}  n=${a.n}  ${a.first_at?.toISOString?.() ?? "?"} → ${a.last_at?.toISOString?.() ?? "?"}`);
  }

  const { rows: st } = await client.query(
    `select wallet_address, chain_name, streak, total_check_ins, total_actions
       from wallet_streaks order by streak desc nulls last limit 10`
  );
  console.log("\nwallet_streaks:");
  if (st.length === 0) console.log("  (none)");
  for (const s of st) {
    console.log(`  ${s.wallet_address}  streak=${s.streak} ci=${s.total_check_ins} act=${s.total_actions} (${s.chain_name})`);
  }

  client.release();
  process.exit(0);
} catch (e) {
  console.error("probe failed:", (e as Error).message);
  process.exit(1);
} finally {
  await pool.end().catch(() => {});
}
