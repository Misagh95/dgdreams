"use client";

import { useEffect, useState } from "react";

const ATTR = "data-perf";
const STORE = "dgdreams-perf";
const EVENT = "dgdreams-perf-change";

/**
 * "Performance mode" trades the ambient visuals for a free main thread:
 * the starfield renders one static frame and the frosted panels lose their
 * backdrop blur. Everything else about the layout is unchanged.
 *
 * It does NOT change how long a transaction takes on the network - only how
 * responsive the page is while it waits.
 */
export function readPerfMode(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.getAttribute(ATTR) === "low") return true;
  try {
    return localStorage.getItem(STORE) === "low";
  } catch {
    return false;
  }
}

export function applyPerfMode(low: boolean) {
  if (typeof document === "undefined") return;
  if (low) document.documentElement.setAttribute(ATTR, "low");
  else document.documentElement.removeAttribute(ATTR);
  try {
    if (low) localStorage.setItem(STORE, "low");
    else localStorage.removeItem(STORE);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export default function usePerfMode(): [boolean, (next: boolean) => void] {
  const [low, setLow] = useState(false);

  useEffect(() => {
    // Restore the stored preference before first paint of the UI.
    const stored = readPerfMode();
    if (stored) applyPerfMode(true);
    setLow(stored);

    const sync = () => setLow(readPerfMode());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [low, applyPerfMode];
}

export { ATTR as PERF_ATTR, STORE as PERF_STORE };
