"use client";

import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import usePerfMode from "@/hooks/usePerfMode";

const THEMES = [
  { id: "web3-light", label: "Web3 Light", icon: "☀️", desc: "Chaingreets default", preview: "#6F75E5" },
  { id: "web3", label: "Web3 Dark", icon: "🌙", desc: "Lime & indigo glow", preview: "#D0FF94" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

/** Every theme that was removed maps onto the dark theme, so old saved
 *  preferences keep giving a dark UI instead of falling back to light. */
const LEGACY_DARK = new Set(["dark", "cyber", "emerald", "frost", "matrix"]);

function getInitialTheme(): ThemeId {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("voidchain-theme");
    if (stored === "dark" || LEGACY_DARK.has(stored || "")) return "web3";
    if (stored && THEMES.some((t) => t.id === stored)) return stored as ThemeId;
  }
  return "web3-light";
}

export default function ThemeSwitcher() {
  const [current, setCurrent] = useState<ThemeId>("web3-light");
  const [open, setOpen] = useState(false);
  const [perfLow, setPerfLow] = usePerfMode();

  useEffect(() => {
    const t = getInitialTheme();
    setCurrent(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const handleChange = (t: ThemeId) => {
    setCurrent(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("voidchain-theme", t);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
        }}
        title="Switch theme"
      >
        <span className="text-sm">{THEMES.find((t) => t.id === current)?.icon}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full right-0 mt-2 z-50 w-52 p-2 rounded-2xl shadow-2xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              backdropFilter: "blur(20px)",
            }}
          >
            <p className="text-[10px] font-mono px-2 py-1.5" style={{ color: "var(--text-quaternary)" }}>
              THEME
            </p>
            {THEMES.map((t) => {
              const active = current === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleChange(t.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                  style={{
                    background: active ? "var(--bg-strong)" : "transparent",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{
                      background: active
                        ? `color-mix(in srgb, ${t.preview} 15%, transparent)`
                        : "var(--bg-subtle)",
                      border: active ? `1px solid ${t.preview}44` : "1px solid var(--border-default)",
                    }}
                  >
                    {t.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: active ? "var(--text-bright)" : "var(--text-secondary)" }}
                    >
                      {t.label}
                    </div>
                    <div className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
                      {t.desc}
                    </div>
                  </div>
                  {active && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: `color-mix(in srgb, ${t.preview} 20%, transparent)`,
                        border: `1px solid ${t.preview}44`,
                      }}>
                      <svg className="w-3 h-3" style={{ color: t.preview }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}

            <div className="my-2 h-px" style={{ background: "var(--border-default)" }} />

            <p className="text-[10px] font-mono px-2 py-1.5" style={{ color: "var(--text-quaternary)" }}>
              PERFORMANCE
            </p>
            <button
              onClick={() => setPerfLow(!perfLow)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
              style={{ background: perfLow ? "var(--bg-strong)" : "transparent" }}
              title="Turn off the animated background and the frosted blur so the page stops using the CPU while you wait for transactions."
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: perfLow
                    ? "color-mix(in srgb, var(--accent) 18%, transparent)"
                    : "var(--bg-subtle)",
                  border: perfLow
                    ? "1px solid color-mix(in srgb, var(--accent) 45%, transparent)"
                    : "1px solid var(--border-default)",
                }}
              >
                <Zap
                  className="w-4 h-4"
                  style={{ color: perfLow ? "var(--accent)" : "var(--text-tertiary)" }}
                />
              </div>
              <div className="flex-1 text-left">
                <div className="text-xs font-semibold" style={{ color: "var(--text-bright)" }}>
                  Performance mode {perfLow ? "ON" : "OFF"}
                </div>
                <div className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
                  {perfLow ? "Background static, no blur" : "Animated + frosted panels"}
                </div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
