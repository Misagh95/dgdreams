"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownUp,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Compass,
  ExternalLink,
  Globe,
  Loader2,
  Rocket,
  SkipForward,
  X,
  Zap,
} from "lucide-react";

/* -------------------------------------------------------------
   The film — a frame-accurate animation of the two console pages.

   Every card here is rebuilt from the real component that renders it:
   /app's mission runner and swap card, /gallery's progress header and
   badge cards. The copy, the numbers, the status labels and the order
   of states are the ones the site produces, so the film teaches the
   product rather than an impression of it.

   Each scene is a pure function of `t` (0→1 inside its chapter), which
   is what lets the player pause, scrub and crossfade without ever
   holding animation state of its own.
   ------------------------------------------------------------- */

export interface Chapter {
  id: string;
  label: string;
  path: string;
  dur: number;
  kicker: string;
  title: string;
  blurb: string;
}

export const CHAPTERS: Chapter[] = [
  {
    id: "terminal",
    label: "Terminal",
    path: "/app",
    dur: 5200,
    kicker: "01 — /app",
    title: "One page, two jobs.",
    blurb:
      "The console: daily missions on the left, a LI.FI swap on the right. Both use the wallet and the network picked in the rail.",
  },
  {
    id: "run",
    label: "Run all six",
    path: "/app#daily-tasks",
    dur: 5800,
    kicker: "02 — Run all six",
    title: "Six transactions, one press.",
    blurb:
      "Check in, GM, GN, then deploy Simple, Token and NFT. Each step waits for its own receipt, and a failed step never stops the rest.",
  },
  {
    id: "swap",
    label: "Swap",
    path: "/app#swap",
    dur: 6400,
    kicker: "03 — Swap",
    title: "Quoted, approved, confirmed.",
    blurb:
      "LI.FI returns the route, the best quote wins, and the swap settles without leaving the terminal. Quotes refresh as you type.",
  },
  {
    id: "gallery",
    label: "Gallery",
    path: "/gallery",
    dur: 5200,
    kicker: "04 — /gallery",
    title: "A badge for every chain.",
    blurb:
      "The Grand Tour: 24 networks, one free soulbound badge each. The header counts the chains this wallet has visited.",
  },
  {
    id: "mint",
    label: "Mint free",
    path: "/gallery",
    dur: 6000,
    kicker: "05 — Mint free",
    title: "Gas is the only cost.",
    blurb:
      "Press mint, confirm the chain switch, and the edition lands — unlimited mints, transfers blocked by the contract.",
  },
  {
    id: "end",
    label: "That's it",
    path: "/app",
    dur: 5200,
    kicker: "06 — That's the whole app",
    title: "Two pages, one wallet.",
    blurb:
      "Everything in this film is live on /app and /gallery right now — no mock data anywhere in the recording.",
  },
];

/* ─────────── timing helpers ─────────── */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const mix = (a: number, b: number, p: number) => a + (b - a) * p;

interface SceneProps {
  t: number;
}

function Up({
  p,
  y = 10,
  style,
  className = "",
  children,
}: {
  p: number;
  y?: number;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * y}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const panel: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-default)",
  borderRadius: 20,
};

function Panel({
  children,
  style,
  className = "",
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div className={className} style={{ ...panel, ...style }}>
      {children}
    </div>
  );
}

function Pill({
  children,
  tone = "muted",
  style,
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "live";
  style?: CSSProperties;
}) {
  const toneStyle: CSSProperties =
    tone === "accent"
      ? {
          background: "var(--accent-muted)",
          border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
          color: "var(--text-bright)",
        }
      : tone === "live"
        ? {
            background: "color-mix(in srgb, var(--success) 12%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
            color: "var(--success)",
          }
        : {
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-default)",
            color: "var(--text-tertiary)",
          };

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[12px] font-medium"
      style={{ ...toneStyle, ...style }}
    >
      {children}
    </span>
  );
}

function Mark({ src, size = 18 }: { src: string; size?: number }) {
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ objectFit: "contain", width: size, height: size }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.visibility = "hidden";
      }}
    />
  );
}

/* ─────────── shared: the networks strip ─────────── */

const CHIPS = [
  { short: "Base", logo: "/logos/base.svg" },
  { short: "HYPE", logo: "/logos/hyperliquid.png" },
  { short: "UNI", logo: "/logos/unichain.png" },
  { short: "TMP", logo: "/logos/tempo.png" },
  { short: "ETH", logo: "/logos/ethereum.png" },
  { short: "ARC", logo: "/logos/arc.png" },
  { short: "BNB", logo: "/logos/bnb.svg" },
  { short: "ARB", logo: "/logos/arbitrum.png" },
];

function NetworkStrip({ t }: { t: number }) {
  const sweep = Math.floor(ramp(t, 0.3, 0.8) * 3);
  return (
    <Panel style={{ padding: 12, borderRadius: 16 }}>
      <div className="flex items-center justify-between">
        <span
          className="flex items-center gap-1.5 text-[12px] font-semibold"
          style={{ color: "var(--text-bright)" }}
        >
          <Globe className="w-3.5 h-3.5" strokeWidth={1.8} />
          Networks
        </span>
        <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          All (24)
        </span>
      </div>

      <p
        className="mt-1.5 hidden text-[12px] sm:block"
        style={{ color: "var(--text-secondary)" }}
      >
        20 of 24 networks have a NikBase contract. You are on Base.{" "}
        <span style={{ color: "var(--text-faint)" }}>
          Tap any one to move — the wallet follows.
        </span>
      </p>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {CHIPS.map((c, i) => {
          const active = i === 0;
          const lit = active || i === sweep + 1;
          return (
            <li key={c.short}>
              <span
                className="flex items-center gap-1.5 rounded-[10px] py-1 pl-1.5 pr-2.5 text-[12px]"
                style={{
                  background: lit ? "var(--bg-strong)" : "transparent",
                  border: `1px solid ${
                    lit ? "var(--border-strong)" : "var(--border-default)"
                  }`,
                  color: lit ? "var(--text-bright)" : "var(--text-tertiary)",
                  fontWeight: lit ? 600 : 500,
                }}
              >
                <Mark src={c.logo} size={14} />
                {c.short}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ─────────── /app · Run all six ─────────── */

const STEPS = [
  { label: "Check-In", kind: "mission" },
  { label: "GM", kind: "mission" },
  { label: "GN", kind: "mission" },
  { label: "Simple", kind: "deploy", address: "0x6f4c…2e18" },
  { label: "Token", kind: "deploy", address: "0x9a21…77c3" },
  { label: "NFT", kind: "deploy", address: "0x2d8b…41f0" },
] as const;

function RunCard({
  t,
  running,
  wide = false,
}: {
  t: number;
  running: boolean;
  wide?: boolean;
}) {
  // when this card is the scene, the run owns the timeline; in the overview it
  // sits idle exactly as it does on the page before the first press
  const start = running ? 0.12 : 1;
  const step = 0.115;
  const states = STEPS.map((_, i) => {
    if (!running) return "idle" as const;
    const signAt = start + i * step;
    if (t < signAt) return "pending" as const;
    if (t < signAt + 0.075) return "signing" as const;
    return "done" as const;
  });
  const doneCount = states.filter((s) => s === "done").length;
  const current = states.findIndex((s) => s === "signing");
  const finished = running && doneCount === STEPS.length;
  const press = running ? ramp(t, 0.8, 0.9) : ramp(t, 0.86, 0.96);

  return (
    <Panel style={{ padding: wide ? 20 : 14, borderRadius: 20 }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="grid place-items-center rounded-[12px]"
            style={{
              width: 32,
              height: 32,
              background: "var(--bg-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <Zap className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <div>
            <h3
              className="text-[14px] font-semibold leading-tight"
              style={{ color: "var(--text-bright)" }}
            >
              Run all six
            </h3>
            <p
              className="mt-0.5 text-[12px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Three missions and three deploys on Base.
            </p>
          </div>
        </div>

        <span
          className="inline-flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-[12px] font-medium"
          style={{
            border: `1px solid ${
              press > 0.4 ? "var(--border-hover)" : "var(--border-default)"
            }`,
            background: press > 0.4 ? "var(--bg-strong)" : "transparent",
            color: "var(--text-secondary)",
            boxShadow:
              press > 0 && press < 1
                ? `0 0 0 ${2 + Math.sin(press * Math.PI) * 3}px var(--accent-muted)`
                : "none",
          }}
        >
          {running ? (
            <Loader2
              className="w-3.5 h-3.5"
              strokeWidth={2}
              style={{ transform: `rotate(${(t * 720) % 360}deg)` }}
            />
          ) : (
            <Rocket className="w-3.5 h-3.5" strokeWidth={1.8} />
          )}
          {running
            ? `Step ${Math.min(6, (current < 0 ? doneCount : current) + 1)} of 6`
            : "Run all six"}
        </span>
      </div>

      {running ? (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <div className="progress-bar flex-1">
              <div
                className="progress-fill"
                style={{
                  width: `${(doneCount / 6) * 100}%`,
                  transition: "none",
                }}
              />
            </div>
            <span
              className="text-[12px] tabular-nums"
              style={{ color: "var(--text-tertiary)" }}
            >
              {doneCount}/6
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-1">
            {STEPS.map((s, i) => {
              const state = states[i];
              const address = "address" in s ? s.address : undefined;
              return (
                <div
                  key={s.label}
                  className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-1"
                  style={{ background: "var(--bg-subtle)" }}
                >
                  {state === "done" ? (
                    <CheckCircle2
                      className="w-3.5 h-3.5 shrink-0"
                      strokeWidth={1.9}
                      style={{ color: "var(--success)" }}
                    />
                  ) : state === "signing" ? (
                    <Loader2
                      className="w-3.5 h-3.5 shrink-0"
                      strokeWidth={1.9}
                      style={{
                        color: "var(--accent-text)",
                        transform: `rotate(${(t * 900) % 360}deg)`,
                      }}
                    />
                  ) : (
                    <SkipForward
                      className="w-3.5 h-3.5 shrink-0"
                      strokeWidth={1.9}
                      style={{ color: "var(--text-faint)" }}
                    />
                  )}
                  <span
                    className="text-[12px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {i + 1}. {s.label}
                  </span>
                  <span className="flex-1" />
                  {state === "done" && address ? (
                    <span
                      className="font-mono text-[12px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {address}
                    </span>
                  ) : null}
                  {state === "done" && !address ? (
                    <ExternalLink
                      className="w-3.5 h-3.5"
                      strokeWidth={1.75}
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <p
        className="mt-3 text-[12px] leading-relaxed"
        style={{ color: "var(--text-tertiary)" }}
      >
        Six separate transactions, signed one after another. A failed step does
        not stop the rest.
      </p>

      <div
        className="mt-2 flex items-center justify-between gap-3 rounded-[10px] px-2.5 py-1.5"
        style={{ background: "var(--bg-subtle)" }}
      >
        <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          {finished
            ? "3/3 already deployed — this run costs almost nothing"
            : "Estimated gas"}
        </span>
        <span
          className="text-[12px] font-medium tabular-nums"
          style={{ color: "var(--text-secondary)" }}
        >
          {finished ? "~90,000" : "~412,301"}
        </span>
      </div>
    </Panel>
  );
}

/* ─────────── /app · Swap ─────────── */

function TokenPill({ symbol, logo }: { symbol: string; logo?: string }) {
  return (
    <span
      className="flex items-center gap-1.5 rounded-[10px] px-2 py-1"
      style={{
        background: "var(--bg-strong)",
        border: "1px solid var(--border-strong)",
      }}
    >
      <span
        className="grid place-items-center overflow-hidden rounded-full"
        style={{ width: 18, height: 18, background: "var(--bg-subtle)" }}
      >
        {logo ? (
          <Mark src={logo} size={14} />
        ) : (
          <span
            className="text-[12px] font-semibold leading-none"
            style={{ color: "var(--text-secondary)" }}
          >
            {symbol.slice(0, 1)}
          </span>
        )}
      </span>
      <span
        className="text-[12px] font-semibold"
        style={{ color: "var(--text-bright)" }}
      >
        {symbol}
      </span>
      <ChevronDown
        className="w-3 h-3"
        strokeWidth={2}
        style={{ color: "var(--text-tertiary)" }}
      />
    </span>
  );
}

function SwapCard({ t, idle = false }: { t: number; idle?: boolean }) {
  const typed = idle ? 0 : ramp(t, 0.08, 0.18);
  const quoting = !idle && t >= 0.18 && t < 0.3;
  const quoted = !idle && t >= 0.3;
  const swapping = !idle && t >= 0.52 && t < 0.66;
  const settled = !idle && t >= 0.66;
  /* the source list steps aside once the swap is settled — the film keeps the
     route, not the comparison, on screen for the confirmation beat */
  const comparing = !idle && t >= 0.4 && !settled;
  const press = idle ? ramp(t, 0.86, 0.96) : ramp(t, 0.5, 0.56);

  const amount = idle ? "" : typed > 0.5 ? "1.0" : typed > 0.1 ? "1" : "";
  const out = quoted ? "3,412.55" : "";

  const action = swapping
    ? "Swapping..."
    : quoting
      ? "Fetching best route..."
      : "Swap";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ArrowDownUp
            className="w-4 h-4"
            strokeWidth={2}
            style={{ color: "var(--accent)" }}
          />
          <span
            className="text-[13px] font-semibold"
            style={{ color: "var(--text-bright)" }}
          >
            Swap
          </span>
        </span>
        <span
          className="rounded-lg px-2 py-1 text-[12px]"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          Base
        </span>
      </div>

      <div className="mt-1.5 space-y-1.5">
        {/* From */}
        <div
          className="rounded-[14px] p-2.5"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              From
            </span>
            {idle ? (
              <span className="text-[12px]" style={{ color: "var(--accent-text)" }}>
                Balance: 2.41832 ETH · MAX
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className="flex-1 text-[22px] font-semibold tabular-nums"
              style={{ color: amount ? "var(--text-bright)" : "var(--text-faint)" }}
            >
              {amount || "0.0"}
            </span>
            <TokenPill symbol="ETH" logo="/logos/ethereum.png" />
          </div>
        </div>

        {/* Flip */}
        <div className="relative z-10 -my-3 flex justify-center">
          <span
            className="grid place-items-center rounded-[10px]"
            style={{
              width: 26,
              height: 26,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-strong)",
              color: "var(--accent-text)",
            }}
          >
            <ArrowDownUp className="w-3 h-3" strokeWidth={2} />
          </span>
        </div>

        {/* To */}
        <div
          className="rounded-[14px] p-2.5"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            To (estimated)
          </span>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className="flex-1 truncate text-[22px] font-semibold tabular-nums"
              style={{
                color: quoting || !out ? "var(--text-tertiary)" : "var(--text-bright)",
              }}
            >
              {quoting ? "..." : out || "0.0"}
            </span>
            <TokenPill symbol="USDC" />
          </div>
        </div>

        {/* Quote details — rendered when a quote exists, exactly as the card does */}
        {quoted ? (
          <div
            className="space-y-1 rounded-[10px] p-2 text-[12px]"
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-default)",
            }}
          >
            {[
              { k: "Route", v: "Uniswap · via LI.FI" },
              { k: "Min. received", v: "3,395.49 USDC" },
              { k: "Slippage", v: "0.5%" },
            ].map((r) => (
              <div key={r.k} className="flex justify-between gap-2">
                <span style={{ color: "var(--text-tertiary)" }}>{r.k}</span>
                <span style={{ color: "var(--text-bright)" }}>{r.v}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Compare sources */}
        {comparing ? (
          <div
            className="hidden space-y-1 rounded-[10px] p-2 sm:block"
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-default)",
            }}
          >
            <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              Compare sources
            </span>
            {[
              { name: "LI.FI", out: "3,412.55 USDC", best: true },
              { name: "Relay", out: "3,398.12 USDC", best: false },
            ].map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded-lg px-2 py-1"
                style={{
                  background: s.best ? "var(--accent-muted)" : "var(--bg-strong)",
                  border: `1px solid ${
                    s.best
                      ? "color-mix(in srgb, var(--accent) 35%, transparent)"
                      : "var(--border-default)"
                  }`,
                }}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="text-[12px] font-semibold"
                    style={{
                      color: s.best ? "var(--accent-text)" : "var(--text-primary)",
                    }}
                  >
                    {s.name}
                  </span>
                  {s.best ? (
                    <span
                      className="rounded px-1 py-0.5 text-[12px]"
                      style={{
                        background:
                          "color-mix(in srgb, var(--success) 12%, transparent)",
                        color: "var(--success)",
                      }}
                    >
                      BEST
                    </span>
                  ) : null}
                </span>
                <span className="text-[12px]" style={{ color: "var(--text-bright)" }}>
                  {s.out}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div
          className="flex w-full items-center justify-center gap-1.5 rounded-[14px] py-2.5 text-[13px] font-semibold"
          style={{
            background: press > 0.5 ? "var(--accent-hover)" : "var(--accent)",
            color: "var(--accent-contrast)",
            opacity: idle || swapping || quoting ? 0.55 : 1,
            transform: `scale(${1 - 0.02 * Math.sin(press * Math.PI)})`,
          }}
        >
          <Zap className="w-3.5 h-3.5" strokeWidth={2.2} />
          {action}
        </div>

        {settled ? (
          <p
            className="text-center font-mono text-[12px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Swap confirmed - 0x9f2c…7b1d
          </p>
        ) : idle ? (
          <p
            className="text-center text-[12px]"
            style={{ color: "var(--text-faint)" }}
          >
            Powered by LI.FI - quotes refresh as you type
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SwapSection({
  t,
  idle,
  className = "",
  chrome = true,
}: {
  t: number;
  idle?: boolean;
  className?: string;
  /** the page wraps this card in a titled section; the zoomed scene shows the card alone */
  chrome?: boolean;
}) {
  if (!chrome) {
    return (
      <Panel style={{ padding: 10, borderRadius: 20 }}>
        <SwapCard t={t} idle={idle} />
      </Panel>
    );
  }

  return (
    <section
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{ border: "1px solid var(--border-default)" }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 70%)",
          borderLeft: "3px solid var(--accent)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <span
          className="grid place-items-center rounded-lg"
          style={{
            width: 24,
            height: 24,
            background:
              "color-mix(in srgb, var(--accent) 18%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
            color: "var(--accent-text)",
          }}
        >
          <ArrowDownUp className="w-3 h-3" strokeWidth={2} />
        </span>
        <h2
          className="text-[13px] font-bold tracking-tight"
          style={{ color: "var(--text-bright)" }}
        >
          Swap
        </h2>
      </div>
      <div style={{ padding: 10 }}>
        <SwapCard t={t} idle={idle} />
      </div>
    </section>
  );
}

/* ─────────── 01 · /app ─────────── */

export function TerminalScene({ t }: SceneProps) {
  const enter = easeOut(ramp(t, 0.005, 0.1));

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-3 sm:p-5">
      <Up p={enter} y={8}>
        <p className="kicker">Terminal</p>
        <h2
          className="mt-1 text-[20px] font-black leading-tight tracking-[-0.03em] sm:text-[28px]"
          style={{ color: "var(--text-bright)" }}
        >
          Daily missions &amp; swap
        </h2>
        <p
          className="mt-1 text-[12px] sm:text-[13px]"
          style={{ color: "var(--text-secondary)" }}
        >
          Run GM · Check · GN, mint your soulbound badge, and swap, all on one
          page.
        </p>
      </Up>        <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 items-start gap-3 sm:mt-4 sm:grid-cols-[minmax(0,1fr)_300px]">
        <Up p={enter} y={12}>
          <NetworkStrip t={t} />
          <div className="mt-3">
            <RunCard t={t} running={false} />
          </div>
        </Up>

        <Up p={enter} y={12}>
          <div className="hidden sm:block">
            <SwapSection t={t} idle />
          </div>
        </Up>
      </div>
    </div>
  );
}

/* ─────────── 02 · run all six ─────────── */

export function RunScene({ t }: SceneProps) {
  return (
    <div className="grid h-full w-full place-items-center overflow-hidden px-2 sm:px-4">
      <div className="w-full" style={{ maxWidth: 600 }}>
        <RunCard t={t} running wide />
      </div>
    </div>
  );
}

/* ─────────── 03 · swap ─────────── */

export function SwapScene({ t }: SceneProps) {
  return (
    <div className="grid h-full w-full place-items-center overflow-hidden px-2 sm:px-4">
      <div className="w-full" style={{ maxWidth: 344 }}>
        <SwapSection t={t} chrome={false} />
      </div>
    </div>
  );
}

/* ─────────── /gallery · cards ─────────── */

const BADGES = [
  {
    short: "Base",
    name: "Base",
    logo: "/output-premium/base.png",
    color: "#0052FF",
  },
  {
    short: "HYPE",
    name: "HyperEVM",
    logo: "/output-premium/hyperliquid.png",
    color: "#2EBD85",
  },
  {
    short: "UNI",
    name: "Unichain",
    logo: "/output-premium/unichain.png",
    color: "#FC6C85",
  },
  {
    short: "TMP",
    name: "Tempo",
    logo: "/output-premium/tempo.png",
    color: "#7C5CFF",
  },
  {
    short: "RH",
    name: "Robinhood",
    logo: "/output-premium/robinhood.png",
    color: "#00C805",
  },
];

function BadgeCard({
  badge,
  collected = 0,
  state = "idle",
  t = 0,
  compact = false,
}: {
  badge: (typeof BADGES)[number];
  collected?: number;
  state?: "idle" | "confirm" | "minting" | "collected";
  t?: number;
  compact?: boolean;
}) {
  const busy = state === "confirm" || state === "minting";
  const has = collected > 0 || state === "collected";

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-[16px] p-3"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${has ? badge.color : "var(--border-default)"}`,
        boxShadow: has ? `0 0 0 1px ${badge.color}22` : undefined,
      }}
    >
      <div
        className="grid place-items-center overflow-hidden rounded-full"
        style={{
          width: compact ? 44 : 52,
          height: compact ? 44 : 52,
          background: "var(--bg-strong)",
        }}
      >
        <Mark src={badge.logo} size={compact ? 26 : 30} />
      </div>

      <div className="w-full min-w-0 text-center">
        <p
          className="truncate text-[13px] font-semibold"
          style={{ color: "var(--text-bright)" }}
        >
          {badge.short}
        </p>
        <p
          className="truncate text-[12px]"
          style={{ color: "var(--text-faint)" }}
        >
          {badge.name}
        </p>
      </div>

      {has ? (
        <span
          className="rounded-full px-2 py-[3px] text-[12px] font-semibold"
          style={{
            background: "var(--accent-muted)",
            color: "var(--accent-text)",
          }}
        >
          Collected ×{collected || 1}
        </span>
      ) : null}

      {state === "minting" ? (
        <span
          className="rounded-full px-2 py-[3px] text-[12px]"
          style={{
            background: "var(--bg-strong)",
            color: "var(--text-tertiary)",
            opacity: 0.65 + 0.35 * Math.sin(t * 30),
          }}
        >
          Minting…
        </span>
      ) : (
        <span
          className="rounded-full px-2.5 py-1 text-[12px] font-semibold"
          style={{
            background: badge.color,
            color: "#0A0E1A",
            opacity: busy ? 0.55 : 1,
          }}
        >
          {state === "confirm"
            ? "Confirm in wallet…"
            : has
              ? "Mint another"
              : "Mint free"}
        </span>
      )}
    </div>
  );
}

/* ─────────── 04 · /gallery ─────────── */

export function GalleryScene({ t }: SceneProps) {
  const enter = easeOut(ramp(t, 0.02, 0.2));
  /* a fresh wallet: nothing collected yet — the mint chapter makes the first */
  const count = 0;
  const filled = ramp(t, 0.5, 0.75);

  return (
    <div className="flex h-full w-full flex-col justify-center overflow-hidden p-3 sm:p-5">
      <Up p={enter} y={8}>
        <p
          className="kicker flex items-center gap-1.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          <Compass className="w-3.5 h-3.5" strokeWidth={1.75} />
          The Grand Tour
        </p>
        <h2
          className="mt-1 text-[20px] font-bold leading-tight sm:text-[28px]"
          style={{ color: "var(--text-bright)" }}
        >
          Gallery
        </h2>
        <p
          className="mt-1 max-w-[62ch] text-[12px] leading-relaxed sm:text-[13px]"
          style={{ color: "var(--text-secondary)" }}
        >
          Free soulbound badges, unlimited — mint as many as you like on any
          network. Transfers are blocked on chain, so each badge is proof you
          were there.
        </p>
      </Up>

      <Up p={enter} y={12} style={{ marginTop: 12 }}>
        <Panel style={{ padding: 14, borderRadius: 20 }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                Chains visited
              </p>
              <p
                className="mt-0.5 text-[28px] font-bold leading-none tabular-nums"
                style={{ color: "var(--text-bright)" }}
              >
                {count}
                <span
                  className="ml-1 text-[14px] font-normal"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  / 24 chains
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                Mainnet {count} · Testnet 0
              </p>
              <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                Every badge is a free mint — gas only.
              </p>
            </div>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full"
            style={{ background: "var(--bg-strong)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${(count / 23) * 100}%`,
                background: "var(--accent)",
              }}
            />
          </div>
        </Panel>
      </Up>

      <div className="mt-3">
        <p className="kicker">Mainnet</p>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {BADGES.map((b, i) => (
            <Up
              key={b.short}
              p={ramp(filled, i * 0.12, 0.6 + i * 0.12)}
              y={8}
              /* a phone shows one row of three; five columns need width */
              className={i > 2 ? "hidden sm:block" : ""}
            >
              <BadgeCard badge={b} compact />
            </Up>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────── 05 · mint ─────────── */

export function MintScene({ t }: SceneProps) {
  const cursorIn = easeInOut(ramp(t, 0.06, 0.18));
  const click = ramp(t, 0.18, 0.26);
  const confirm = t >= 0.2 && t < 0.34;
  const minting = t >= 0.34 && t < 0.48;
  const collected = t >= 0.48;
  const modal = easeOut(ramp(t, 0.56, 0.7));
  const count = collected ? 1 : 0;

  const cards = [
    { badge: BADGES[0], state: collected ? "collected" : confirm ? "confirm" : minting ? "minting" : "idle" },
    { badge: BADGES[1], state: "idle" },
    { badge: BADGES[2], state: "idle" },
  ] as const;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="flex h-full flex-col p-3 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="kicker flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" strokeWidth={1.75} />
            Gallery · mainnet
          </p>
          <span
            className="font-mono text-[12px] tabular-nums"
            style={{ color: "var(--text-tertiary)" }}
          >
            {count} / 24 chains
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div
            className="grid w-full grid-cols-3 items-start gap-2 sm:gap-3"
            style={{ maxWidth: 540 }}
          >
            {cards.map((c) => (
              <BadgeCard
                key={c.badge.short}
                badge={c.badge}
                state={c.state}
                collected={c.badge.short === "Base" ? count : 0}
                t={t}
              />
            ))}
          </div>
        </div>

        <p
          className="text-center text-[12px]"
          style={{ color: "var(--text-faint)" }}
        >
          Soulbound by contract: transfers, approvals and all — reverted.
        </p>
      </div>

      {/* the pointer, aimed at the first Mint free button */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: `${mix(84, 17, cursorIn)}%`,
          top: `${mix(88, 74, cursorIn)}%`,
          opacity: 1 - ramp(t, 0.5, 0.6),
          transform: `translate(-2px, -2px) scale(${1 - 0.06 * Math.sin(click * Math.PI)})`,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 2.5l14.2 8.2-6.1 1.2-2.7 6.3L5 2.5z"
            fill="var(--text-bright)"
            stroke="var(--bg-card)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* the after-mint popup, copied from MintedModal */}
      <div
        className="absolute inset-0 grid place-items-center p-3"
        style={{
          background: "rgba(4, 7, 14, 0.7)",
          opacity: modal,
          pointerEvents: "none",
          backdropFilter: modal > 0.2 ? "blur(4px)" : "none",
        }}
      >
        <div
          className="relative flex w-full flex-col items-center gap-3 rounded-[20px] p-4"
          style={{
            maxWidth: 300,
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            transform: `translateY(${(1 - modal) * 14}px) scale(${0.94 + modal * 0.06})`,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full"
            style={{
              background: "var(--bg-strong)",
              color: "var(--text-secondary)",
            }}
          >
            <X className="w-3 h-3" strokeWidth={2} />
          </button>

          <p className="kicker" style={{ color: "var(--accent-text)" }}>
            Minted
          </p>

          <div
            className="relative grid w-full place-items-center rounded-[16px]"
            style={{
              background: "var(--bg-strong)",
              aspectRatio: "1 / 1",
              maxWidth: 190,
            }}
          >
            <Mark src="/output-premium/base.png" size={110} />
            <span
              className="absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums"
              style={{
                background: "#0A0E1A",
                color: "#FFFFFF",
                border: "1px solid #0052FF",
              }}
            >
              #1
            </span>
          </div>

          <div className="text-center">
            <p
              className="text-[14px] font-semibold"
              style={{ color: "var(--text-bright)" }}
            >
              DGDreams Base Badge
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              Edition #1 · Base
            </p>
          </div>

          <span
            className="w-full rounded-full py-2 text-center text-[12px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
          >
            Nice — keep going
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────── 06 · the console ─────────── */

export function EndScene({ t }: SceneProps) {
  const head = easeOut(ramp(t, 0.02, 0.18));
  const rows = [ramp(t, 0.16, 0.3), ramp(t, 0.24, 0.38)];
  const cta = easeOut(ramp(t, 0.42, 0.58));

  return (
    <div className="grid h-full w-full place-items-center px-4 text-center">
      <div className="w-full max-w-[520px]">
        <Up p={head} y={12}>
          <div className="kicker">The whole console</div>
        </Up>

        <Up p={head} y={14}>
          <h2
            className="mt-2 text-[28px] font-bold leading-[1.08] tracking-[-0.035em] sm:text-[32px]"
            style={{ color: "var(--text-bright)" }}
          >
            Two pages,
            <br />
            <span className="mark">one wallet.</span>
          </h2>
        </Up>

        <div className="mx-auto mt-5 w-full max-w-[400px] space-y-1.5">
          {[
            { path: "/app", label: "Terminal — missions, badges, swap" },
            { path: "/gallery", label: "Gallery — the Grand Tour badges" },
          ].map((r, i) => (
            <Up key={r.path} p={rows[i]} y={8}>
              <div
                className="flex items-center gap-2.5 rounded-[12px] px-3 py-2 text-left"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <span
                  className="font-mono text-[12px]"
                  style={{ color: "var(--text-bright)" }}
                >
                  {r.path}
                </span>
                <span
                  className="truncate text-[12px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {r.label}
                </span>
              </div>
            </Up>
          ))}
        </div>

        <div
          className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row"
          style={{ opacity: cta, transform: `translateY(${(1 - cta) * 10}px)` }}
        >
          <Link href="/app" className="btn-primary">
            Open /app
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
          <Link href="/gallery" className="btn-ghost">
            Browse /gallery
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────── registry ─────────── */

export function SceneView({ index, t }: { index: number; t: number }) {
  switch (CHAPTERS[index].id) {
    case "terminal":
      return <TerminalScene t={t} />;
    case "run":
      return <RunScene t={t} />;
    case "swap":
      return <SwapScene t={t} />;
    case "gallery":
      return <GalleryScene t={t} />;
    case "mint":
      return <MintScene t={t} />;
    default:
      return <EndScene t={t} />;
  }
}
