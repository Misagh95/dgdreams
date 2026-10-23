/**
 * The daily ritual.
 *
 * Three transactions, once per UTC day, on any network that has a NikBase
 * contract deployed. Everything the "Today" page shows about the ritual is
 * derived from these three definitions.
 */

export type MissionId = "checkIn" | "gm" | "gn";

export type MissionMethod = "dailyCheckIn" | "gm" | "gn";

export interface MissionDef {
  id: MissionId;
  /** what the button says */
  label: string;
  /** what the mission actually is, in one line */
  blurb: string;
  method: MissionMethod;
  /** points the contract awards */
  points: number;
}

export const MISSIONS: MissionDef[] = [
  {
    id: "checkIn",
    label: "Check in",
    blurb: "Sign in for the day",
    method: "dailyCheckIn",
    points: 15,
  },
  {
    id: "gm",
    label: "GM",
    blurb: "Say good morning",
    method: "gm",
    points: 25,
  },
  {
    id: "gn",
    label: "GN",
    blurb: "Say good night",
    method: "gn",
    points: 25,
  },
];

export const MISSION_BY_ID: Record<MissionId, MissionDef> = MISSIONS.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<MissionId, MissionDef>
);

export const TOTAL_MISSION_POINTS = MISSIONS.reduce(
  (sum, m) => sum + m.points,
  0
);

/* ─────────── the week strip ─────────── */

export interface WeekDay {
  /** UTC day key, YYYY-MM-DD */
  key: string;
  /** single-letter weekday label, in the app's locale */
  label: string;
  /** day of month, for the tooltip */
  date: number;
  isToday: boolean;
  isFuture: boolean;
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAY_TITLES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * The seven days of the current UTC week, Monday first.
 *
 * The contract buckets days as `block.timestamp / 1 days`, so the week has
 * to be a UTC week too — a local-time week would put a dot on the wrong day
 * for anyone east or west of Greenwich.
 */
export function getWeekDays(now: number = Date.now()): WeekDay[] {
  const today = new Date(now);
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  // getUTCDay(): 0 = Sunday. Shift so Monday = 0.
  const mondayIndex = (today.getUTCDay() + 6) % 7;
  const monday = todayUtc - mondayIndex * 86_400_000;

  return WEEKDAY_LABELS.map((label, i) => {
    const d = new Date(monday + i * 86_400_000);
    return {
      key: d.toISOString().slice(0, 10),
      label,
      date: d.getUTCDate(),
      isToday: i === mondayIndex,
      isFuture: i > mondayIndex,
    };
  });
}

export function weekdayTitle(index: number): string {
  return WEEKDAY_TITLES[index] ?? "";
}

/* ─────────── local week log ─────────── */

const WEEK_LOG_KEY = "dgdreams.weeklog.v1";

/**
 * Which days this browser saw a completed mission.
 *
 * The contract only exposes today's flags, so the historical dots come from a
 * small local record: when a mission lands, the day is written here. It is a
 * convenience strip, not the source of truth — the streak and the points
 * always come from the chain.
 */
export function readWeekLog(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WEEK_LOG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, true>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function markDayComplete(dayKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const log = readWeekLog();
    log[dayKey] = true;
    window.localStorage.setItem(WEEK_LOG_KEY, JSON.stringify(log));
  } catch {
    /* private mode — the strip simply stays empty */
  }
}
