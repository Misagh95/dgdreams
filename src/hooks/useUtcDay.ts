"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatCountdown,
  msUntilNextUtcMidnight,
  utcDayNumber,
} from "@/lib/utcDay";

/**
 * useUtcDay — tracks the current UTC day on the client.
 *
 * The contracts reset at 00:00 UTC. A page that stays open across that instant
 * would otherwise keep yesterday's cached "already done" flags forever, so this
 * hook flips a day number at the exact rollover and can notify listeners.
 *
 * @param onNewDay called right after the UTC day changes, so callers can clear
 *                 per-day caches (probe results, optimistic task state, ...).
 */
export function useUtcDay(onNewDay?: (newDay: number) => void) {
  const [day, setDay] = useState(() => utcDayNumber());
  const [countdown, setCountdown] = useState(() => formatCountdown(msUntilNextUtcMidnight()));
  // kept in a ref so the timer never needs to be rebuilt when a callback changes
  const cb = useRef(onNewDay);
  cb.current = onNewDay;

  useEffect(() => {
    let alive = true;

    const tick = () => {
      if (!alive) return;
      const now = utcDayNumber();
      setDay((prev) => {
        if (prev !== now) {
          // crossed 00:00 UTC — tell the caller to drop yesterday's state
          cb.current?.(now);
          return now;
        }
        return prev;
      });
      setCountdown(formatCountdown(msUntilNextUtcMidnight()));
    };

    // Align to the next UTC midnight, then tick once a second.
    let timer: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;

    const schedule = () => {
      // +250ms cushion: a timer firing a hair early must not land on the old day
      timer = setTimeout(() => {
        tick();
        schedule();
      }, msUntilNextUtcMidnight() + 250);
    };

    tick();
    schedule();
    interval = setInterval(tick, 1000);

    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  return { day, countdown };
}

export default useUtcDay;