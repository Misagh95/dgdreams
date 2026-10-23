"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const STORE = "dgdreams-theme";

/** Themes that used to exist all collapse onto the two that remain. */
const LEGACY_DARK = new Set([
  "web3",
  "web3-light",
  "dark",
  "cyber",
  "emerald",
  "frost",
  "matrix",
]);

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored =
      localStorage.getItem(STORE) ?? localStorage.getItem("voidchain-theme") ?? "";
    if (stored === "dark" || LEGACY_DARK.has(stored)) return "dark";
    if (stored === "light") return "light";
  } catch {
    /* private mode */
  }
  // Nothing saved: the layout ships data-theme="dark", so the control
  // must agree with it instead of flipping the page back to light.
  return "dark";
}

/**
 * The theme control.
 *
 * Two states, one button. The old build had a dropdown with two themes
 * (both neon), a "performance mode" that only existed to tame the starfield
 * and the frosted blur, and a monospaced caption under each option. The
 * starfield and the blur are gone, so the dropdown is gone too — all that is
 * left is the thing people actually change: light or dark.
 */
export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("dark");

  // The boot script in the layout has already painted the right theme; this
  // only reads it back so the icon matches.
  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORE, next);
    } catch {
      /* private mode */
    }
  };

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
      className="flex items-center justify-center w-9 h-9 rounded-[12px] transition-colors hover:bg-[var(--bg-strong)]"
      style={{ color: "var(--text-tertiary)" }}
    >
      {isLight ? (
        <Moon className="w-[17px] h-[17px]" strokeWidth={1.75} />
      ) : (
        <Sun className="w-[17px] h-[17px]" strokeWidth={1.75} />
      )}
    </button>
  );
}
