/**
 * UTC day helpers.
 *
 * The on-chain NikBase contract already buckets days as
 * `block.timestamp / 1 days`, i.e. a new day starts at 00:00 UTC. The app has
 * to agree with that boundary exactly, otherwise a page left open across
 * midnight keeps showing "already done today" from yesterday's cached state.
 *
 * Everything here is timezone-independent: we never use local-time getters.
 */

/** Milliseconds in one day. */
export const DAY_MS = 86_400_000;

/** The current UTC day number (days since the Unix epoch). */
export function utcDayNumber(now: number = Date.now()): number {
  return Math.floor(now / DAY_MS);
}

/** The Date of 00:00 UTC for the given day number (or timestamp). */
export function utcDayStart(day: number | Date = utcDayNumber()): Date {
  const n = typeof day === "number" ? day : utcDayNumber(day.getTime());
  return new Date(n * DAY_MS);
}

/** YYYY-MM-DD for a UTC day, safe to store in a DB column. */
export function utcDayKey(day: number = utcDayNumber()): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Milliseconds left until the next 00:00 UTC. Every new day begins here, for
 * every user in every timezone.
 */
export function msUntilNextUtcMidnight(now: number = Date.now()): number {
  return DAY_MS - (now % DAY_MS);
}

/** "7h 12m" — a compact countdown label for the UTC day rollover. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m` : h === 0 && m > 0 ? `${m}m ${pad(s)}s` : `${s}s`;
}