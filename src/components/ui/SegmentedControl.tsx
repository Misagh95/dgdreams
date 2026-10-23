"use client";

import { m, useReducedMotion } from "framer-motion";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** small state marker, e.g. a tick for a mission already on chain */
  state?: "idle" | "done" | "busy";
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

/**
 * A segmented control.
 *
 * One pill, one selection, one lime fill. The selected segment gets the
 * accent and black text — the accent is a fill here, never small type.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const reduced = useReducedMotion();
  const groupId = `seg-${options.map((o) => o.value).join("-")}`;

  return (
    <div className="segmented w-full sm:w-auto" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className="relative flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: active ? "var(--accent-contrast)" : "var(--text-secondary)" }}
          >
            {active && (
              <m.span
                layoutId={reduced ? undefined : `${groupId}-pill`}
                className="absolute inset-0 rounded-full"
                style={{ background: "var(--accent)" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {option.state === "done" ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
