import { db } from "@/db";
import { sql } from "drizzle-orm";

let initialized = false;

export async function ensureTables() {
  if (initialized) return;
  try {
    // The new tables reference users, so ensure the parent exists on a fresh
    // database before creating them. Keep the flag false if initialization
    // fails so a transient database error can recover on the next request.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        avatar TEXT,
        wallet_address TEXT,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        last_active_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        game_type TEXT NOT NULL DEFAULT '2048',
        entry_fee INTEGER DEFAULT 0,
        prize_pool INTEGER DEFAULT 0,
        max_players INTEGER DEFAULT 100,
        status TEXT NOT NULL DEFAULT 'pending',
        starts_at TIMESTAMP NOT NULL,
        ends_at TIMESTAMP NOT NULL,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tournament_entries (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) NOT NULL,
        wallet_address TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        best_tile INTEGER DEFAULT 0,
        rank INTEGER,
        prize INTEGER DEFAULT 0,
        paid INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Score tables used by the leaderboard (fresh DBs).
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        wallet_address TEXT,
        chain TEXT,
        score INTEGER NOT NULL,
        best_tile INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS litevm_stats (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        chain TEXT,
        play_count INTEGER DEFAULT 0,
        high_score INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        total_ci INTEGER DEFAULT 0,
        total_act INTEGER DEFAULT 0,
        total_pred INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        last_sync_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Add chain column to existing score tables (migration for live DBs).
    await db.execute(sql`ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS chain TEXT`);
    await db.execute(sql`ALTER TABLE litevm_stats ADD COLUMN IF NOT EXISTS chain TEXT`);
    initialized = true;
  } catch (e) {
    initialized = false;
  }
}
