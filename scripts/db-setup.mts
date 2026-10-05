/**
 * Local dev setup: create the database and the tables the Sybil endpoint reads.
 *
 * This mirrors what init-db.ts does at runtime, so the endpoint can be exercised
 * on a machine that has Postgres but an empty database. Safe to re-run — every
 * statement is IF NOT EXISTS.
 *
 *   node --experimental-strip-types scripts/db-setup.mts
 */
import pg from "pg";

const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

async function createDatabase() {
  const target = new URL(url);
  const name = target.pathname.slice(1);
  // Connect to the maintenance database: you cannot CREATE DATABASE from
  // inside the database you are trying to create.
  const admin = new URL(url);
  admin.pathname = "/postgres";

  const pool = new pg.Pool({
    connectionString: admin.toString(),
    connectionTimeoutMillis: 5000,
  });
  try {
    const client = await pool.connect();
    const { rowCount } = await client.query(
      "select 1 from pg_database where datname = $1",
      [name]
    );
    if (rowCount === 0) {
      // Identifiers cannot be parameterised; the name comes from our own URL.
      await client.query(`create database "${name.replace(/"/g, '""')}"`);
      console.log(`created database "${name}"`);
    } else {
      console.log(`database "${name}" already exists`);
    }
    client.release();
  } finally {
    await pool.end().catch(() => {});
  }
}

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS wallet_streaks (
     id SERIAL PRIMARY KEY,
     wallet_address TEXT NOT NULL,
     chain_id INTEGER NOT NULL,
     chain_name TEXT,
     streak INTEGER DEFAULT 0,
     total_check_ins INTEGER DEFAULT 0,
     total_actions INTEGER DEFAULT 0,
     day INTEGER,
     synced_at TIMESTAMP DEFAULT NOW(),
     created_at TIMESTAMP DEFAULT NOW(),
     CONSTRAINT wallet_streak_wallet_idx UNIQUE (wallet_address)
   )`,
  `CREATE TABLE IF NOT EXISTS prediction_activities (
     id SERIAL PRIMARY KEY,
     wallet_address TEXT NOT NULL,
     action TEXT NOT NULL,
     question TEXT NOT NULL,
     market_id TEXT,
     chain TEXT NOT NULL DEFAULT 'genlayer',
     tx_hash TEXT,
     points INTEGER NOT NULL DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS wallet_socials (
     id SERIAL PRIMARY KEY,
     wallet_address TEXT NOT NULL,
     platform TEXT NOT NULL,
     handle TEXT NOT NULL,
     updated_at TIMESTAMP DEFAULT NOW(),
     created_at TIMESTAMP DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS game_scores (
     id SERIAL PRIMARY KEY,
     wallet_address TEXT,
     chain TEXT,
     score INTEGER NOT NULL,
     best_tile INTEGER NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS tournament_entries (
     id SERIAL PRIMARY KEY,
     tournament_id INTEGER,
     wallet_address TEXT NOT NULL,
     score INTEGER DEFAULT 0,
     best_tile INTEGER DEFAULT 0,
     rank INTEGER,
     prize INTEGER DEFAULT 0,
     paid INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS wallet_socials_platform_handle_idx
     ON wallet_socials (platform, handle)`,
  `CREATE INDEX IF NOT EXISTS prediction_activities_wallet_idx
     ON prediction_activities (wallet_address, created_at DESC)`,
];

async function createTables() {
  const pool = new pg.Pool({
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });
  try {
    const client = await pool.connect();
    for (const stmt of STATEMENTS) {
      await client.query(stmt);
    }
    console.log(`ensured ${STATEMENTS.length} statement(s)`);
    client.release();
  } finally {
    await pool.end().catch(() => {});
  }
}

await createDatabase();
await createTables();
console.log("done. Now set DATABASE_URL in .env.local and restart next dev.");
