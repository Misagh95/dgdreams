"use client";

import { useState, useEffect } from "react";

const THEMES = [
  { id: "cyber", label: "Cyber Neon", icon: "⚡", desc: "Default cyan-purple", preview: "#00F2FE" },
  { id: "emerald", label: "Emerald", icon: "👑", desc: "Dark forest luxury", preview: "#50E3C2" },
  { id: "frost", label: "Frost", icon: "❄️", desc: "Obsidian minimal", preview: "#E8E8F0" },
  { id: "matrix", label: "Matrix", icon: "💻", desc: "Hacker terminal", preview: "#00FF41" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

function getInitialTheme(): ThemeId {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("voidchain-theme");
    if (stored === "dark" || stored === "cyber") return "cyber";
    if (stored && THEMES.some((t) => t.id === stored)) return stored as ThemeId;
  }
  return "cyber";
}

export default function ThemeSwitcher() {
  const [current, setCurrent] = useState<ThemeId>("cyber");
  const [open, setOpen] = useState(false);

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
          </div>
        </>
      )}
    </div>
  );
}
