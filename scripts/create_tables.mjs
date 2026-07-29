import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
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
  );

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
  );
`;

try {
  await pool.query(sql);
  console.log("Tables created successfully");
} catch (e) {
  console.error("Error:", e.message);
} finally {
  await pool.end();
}
