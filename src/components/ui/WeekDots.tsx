"use client";

import { m, useReducedMotion } from "framer-motion";
import { getWeekDays, weekdayTitle, type WeekDay } from "@/lib/ritual";

interface WeekDotsProps {
  /** UTC day keys that had a completed mission */
  completed: Record<string, true>;
}

/**
 * The week strip — seven dots, Monday to Sunday.
 *
 * A filled dot is a day the ritual was completed. Today's dot is outlined
 * until the day is done. Future days are barely there. The strip is the
 * quietest possible answer to "did I keep the streak?".
 */
export default function WeekDots({ completed }: WeekDotsProps) {
  const reduced = useReducedMotion();
  const days: WeekDay[] = getWeekDays();

  return (
    <div className="flex items-center gap-2" role="list" aria-label="This week">
      {days.map((day, i) => {
        const isDone = !!completed[day.key] && !day.isFuture;
        return (
          <m.div
            key={day.key}
            role="listitem"
            className="flex flex-col items-center gap-1.5"
            initial={reduced ? undefined : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : i * 0.04, duration: 0.3 }}
            title={`${weekdayTitle(i)} ${day.date}`}
          >
            <m.span
              className="block w-3 h-3 rounded-full"
              style={{
                background: isDone ? "var(--accent)" : "transparent",
                border: isDone
                  ? "1px solid var(--accent)"
                  : day.isToday
                  ? "1.5px solid var(--text-secondary)"
                  : "1px solid var(--border-default)",
              }}
              animate={
                isDone && !reduced
                  ? { scale: [1, 1.35, 1] }
                  : { scale: 1 }
              }
              transition={
                isDone && !reduced
                  ? { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }
                  : undefined
              }
            />
            <span
              className="text-[12px] leading-none"
              style={{
                color: day.isToday
                  ? "var(--text-bright)"
                  : "var(--text-faint)",
                fontWeight: day.isToday ? 600 : 500,
              }}
            >
              {day.label}
            </span>
          </m.div>
        );
      })}
    </div>
  );
}
