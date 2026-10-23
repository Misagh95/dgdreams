"use client";

import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface ProgressRingProps {
  /** how far along we are */
  value: number;
  /** the target the arc completes at */
  max: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  /** label under the ring, e.g. "day streak" */
  caption?: string;
}

/**
 * A progress ring around the streak number.
 *
 * This replaced the rotating 3D cube: the ring says something (how far
 * through the week you are) instead of just moving. It is drawn with a
 * single SVG circle and one dash offset — no canvas, no glow, no rotation.
 */
export default function ProgressRing({
  value,
  max,
  size = 168,
  stroke = 8,
  children,
  caption,
}: ProgressRingProps) {
  const reduced = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value} of ${max}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={stroke}
        />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - ratio) }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 120, damping: 22 }
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
        {caption ? (
          <span
            className="mt-1 text-[12px] font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            {caption}
          </span>
        ) : null}
      </div>
    </div>
  );
}
