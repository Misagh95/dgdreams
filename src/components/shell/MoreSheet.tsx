"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, m,  useReducedMotion } from "framer-motion";
import { Ellipsis, X } from "lucide-react";

import { MORE_NAV } from "@/lib/nav";

/**
 * The overflow sheet.
 *
 * Everything that does not deserve a place in the rail lives here. Shared by
 * the desktop rail and the phone tab bar so the list is written once.
 */
export default function MoreSheet({
  trigger,
  align = "left",
}: {
  trigger: (open: () => void) => ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  return (
    <>
      {trigger(() => setOpen(true))}

      {/*
        The sheet must live at the document root, not in `this` component's
        place in the tree. It is rendered inside the app rail, and the rail is
        `position: sticky`, which forms a stacking context: a z-index there can
        never rise above the page's own `position: relative` cards, so the
        open sheet would be painted underneath the page. Portalling to the
        body lifts the sheet (and its backdrop) into the root stacking
        context where z-50 means what it says. No portal during SSR, which is
        fine — the sheet is only ever opened from a user interaction.
      */}
      {typeof document === "undefined" ? null : createPortal(
        <AnimatePresence>
        {open ? (
          <>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(12,10,8,.4)" }}
              onClick={() => setOpen(false)}
            />
            <m.div
              role="dialog"
              aria-label="More"
              initial={reduced ? { opacity: 0 } : { x: "-100%" }}
              animate={reduced ? { opacity: 1 } : { x: 0 }}
              exit={reduced ? { opacity: 0 } : { x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed left-0 top-0 h-full w-72 z-50 flex flex-col overflow-y-auto"
              style={{
                background: "var(--bg-elevated)",
                borderRight: "1px solid var(--border-default)",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--border-default)" }}
              >
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: "var(--text-bright)" }}
                >
                  Everything else
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-0.5">
                {MORE_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-[12px] transition-colors hover:bg-[var(--bg-strong)]"
                    >
                      <Icon
                        className="w-[18px] h-[18px] mt-0.5 flex-shrink-0"
                        strokeWidth={1.75}
                        style={{ color: "var(--text-tertiary)" }}
                      />
                      <span className="min-w-0">
                        <span
                          className="block text-[14px] font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.label}
                        </span>
                        {item.blurb ? (
                          <span
                            className="block text-[12px] mt-0.5"
                            style={{ color: "var(--text-faint)" }}
                          >
                            {item.blurb}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </m.div>
          </>
        ) : null}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}

export function MoreGlyph() {
  return <Ellipsis className="w-[18px] h-[18px]" strokeWidth={1.75} />;
}
