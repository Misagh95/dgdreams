import { sql } from "drizzle-orm";
import { db } from "../src/db/index.js";

async function main() {
  console.log("Creating tournaments table...");
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

  console.log("Creating tournament_entries table...");
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

  console.log("Tables created successfully!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
