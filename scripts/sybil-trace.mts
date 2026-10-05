/**
 * Traces the risk collector for one address against the real database, showing
 * every intermediate value. Use this to find out *why* a wallet scores zero
 * rather than guessing.
 *
 *   SYBIL_TEST_WALLET=0x1111111111111111111111111111111111111111 \
 *     node --experimental-strip-types scripts/sybil-trace.mts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: new URL("../.env.local", import.meta.url) });

const pg = (await import("pg")).default;

const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

const wallet = (process.env.SYBIL_TEST_WALLET ?? "").toLowerCase();
if (!wallet) {
  console.error("set SYBIL_TEST_WALLET to the address you are debugging");
  process.exit(1);
}

const DAY = 86_400_000;
const pool = new pg.Pool({ connectionString: url });
const client = await pool.connect();

const q = async (label: string, sql: string) => {
  const { rows } = await client.query(sql, [wallet]);
  console.log(`${label}: ${JSON.stringify(rows)}`);
  return rows;
};

console.log(`\ntracing ${wallet}\n`);

const streak = await q("wallet_streaks", "select chain_id, chain_name, streak, total_check_ins, total_actions from wallet_streaks where wallet_address = $1");
const socials = await q("wallet_socials", "select platform, handle from wallet_socials where wallet_address = $1");
const acts = await q(
  "prediction_activities (recent 5)",
  "select action, chain, created_at from prediction_activities where wallet_address = $1 order by created_at desc limit 5"
);
const actCount = await q("activity count", "select count(*)::int as n from prediction_activities where wallet_address = $1");
const distinct = await q("distinct action types", "select count(distinct action)::int as n from prediction_activities where wallet_address = $1");
const games = await q("game_scores", "select count(*)::int as n from game_scores where wallet_address = $1");
const entries = await q("tournament_entries", "select count(*)::int as n from tournament_entries where wallet_address = $1");
const shared = await q(
  "handle sharing",
  `select s.platform, s.handle, count(distinct s2.wallet_address)::int as wallets
     from wallet_socials s
     join wallet_socials s2 on s2.platform = s.platform and s2.handle = s.handle
    where s.wallet_address = $1
    group by s.platform, s.handle`
);

const n = (actCount[0]?.n ?? 0) as number;
const types = (distinct[0]?.n ?? 0) as number;

console.log("\n── what the engine will see ──");
console.log(`streak            : ${streak[0]?.streak ?? 0}`);
console.log(`totalCheckIns     : ${streak[0]?.total_check_ins ?? 0}`);
console.log(`totalActions      : ${streak[0]?.total_actions ?? 0}`);
console.log(`actionTimestamps  : ${n}  (need >= 3 for cadence, >= 6 for entropy)`);
console.log(`distinctActionType: ${types}  (need >= 3 for "varied")`);
console.log(`socialHandles     : ${socials.length}`);
console.log(`gamePlays         : ${games[0]?.n ?? 0}`);
console.log(`tournamentEntries : ${entries[0]?.n ?? 0}`);

// Reproduce the engine's network detection, which is name-based.
const chainsSeen = new Set<string>();
for (const a of acts as { chain: string }[]) chainsSeen.add(a.chain);
console.log(`chain names seen  : ${JSON.stringify([...chainsSeen])}`);

console.log("\n── verdict ──");
if (streak.length === 0) {
  console.log("NO wallet_streaks row  -> the sync endpoint has never recorded this wallet.");
  console.log("This is the usual cause of an all-zero report on a real wallet.");
}
if (n === 0) {
  console.log("NO prediction_activities -> cadence/breadth signals cannot fire at all.");
}

client.release();
await pool.end();
