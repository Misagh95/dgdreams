import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let _db: ReturnType<typeof drizzle> | null = null;

/**
 * pg-connection-string treats `prefer`, `require` and `verify-ca` as aliases
 * for `verify-full` and prints a security warning on every connection about
 * the upcoming v3 semantics change. The behavior TODAY is already
 * verify-full — certificate and hostname are checked — so rewriting the mode
 * makes that explicit, silences the warning, and changes nothing about how
 * the connection is made.
 */
function normalizeSslMode(url: string): string {
  return url.replace(
    /([?&])sslmode=(prefer|require|verify-ca)(&|$)/,
    (_match, sep: string, _mode: string, tail: string) =>
      tail ? `${sep}sslmode=verify-full&` : `${sep}sslmode=verify-full`
  );
}

function getDb() {
  if (_db) return _db;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const globalForDb = globalThis as typeof globalThis & {
    __arenaNextJsPostgresqlPool?: Pool;
  };
  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: normalizeSslMode(databaseUrl),
    });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  _db = drizzle(pool);
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
