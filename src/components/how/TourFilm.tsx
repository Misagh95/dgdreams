"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { CHAPTERS, SceneView } from "./scenes";

/**
 * The player.
 *
 * One clock drives everything: the scenes, the chapter strip, the time code.
 * Scenes are rendered as pure functions of their local progress, so pausing,
 * seeking and rewinding all land on a frame that was already reachable — no
 * animation state to unwind, no timers to clear.
 *
 * Chapters crossfade across a 260ms window that straddles the boundary, so
 * there is never a blank frame between two scenes.
 */

const STARTS: number[] = [];
let acc = 0;
for (const c of CHAPTERS) {
  STARTS.push(acc);
  acc += c.dur;
}
const TOTAL = acc;
const FADE = 260;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

const fmt = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(
    Math.floor((ms % 60000) / 1000)
  ).padStart(2, "0")}`;

function chapterAt(clock: number) {
  let index = 0;
  for (let i = 0; i < CHAPTERS.length; i++) if (clock >= STARTS[i]) index = i;
  return index;
}

export default function TourFilm() {
  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(false);
  const clockRef = useRef(0);
  const reduced = useReducedMotion();

  /* the film starts by itself, unless the visitor asked motion to stop */
  useEffect(() => {
    if (!reduced) setPlaying(true);
  }, [reduced]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      // clamp the delta so a backgrounded tab resumes smoothly instead of
      // jumping several chapters at once
      const dt = Math.min(64, now - last);
      last = now;
      const next = Math.min(TOTAL, clockRef.current + dt);
      clockRef.current = next;
      setClock(next);
      if (next >= TOTAL) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const seek = useCallback((ms: number) => {
    const next = Math.max(0, Math.min(TOTAL, ms));
    clockRef.current = next;
    setClock(next);
    if (next >= TOTAL) setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (p) return false;
      if (clockRef.current >= TOTAL) {
        clockRef.current = 0;
        setClock(0);
      }
      return true;
    });
  }, []);

  const goChapter = useCallback(
    (i: number) => {
      seek(STARTS[i]);
      setPlaying(true);
    },
    [seek]
  );

  /* TEMP-CAPTURE: deterministic seek used by the frame grabber */
  useEffect(() => {
    (window as unknown as { __seek: (ms: number) => void }).__seek = (ms) => {
      setPlaying(false);
      seek(ms);
    };
  }, [seek]);

  /* arrow keys walk the chapters, like every other player */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const current = chapterAt(clockRef.current);
      const target =
        e.key === "ArrowRight"
          ? Math.min(CHAPTERS.length - 1, current + 1)
          : Math.max(0, current - 1);
      e.preventDefault();
      goChapter(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goChapter]);

  const index = chapterAt(clock);
  const chapter = CHAPTERS[index];
  const local = clock - STARTS[index];
  const caption = ramp(local, 40, 260);
  const atEnd = clock >= TOTAL - 1;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* the screen */}
      <div
        className="relative overflow-hidden rounded-[20px] sm:rounded-[24px]"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* window chrome */}
        <div
          className="flex items-center gap-3 px-3 sm:px-4"
          style={{
            height: 42,
            borderBottom: "1px solid var(--border-default)",
            background: "var(--bg-card)",
          }}
        >
          <div className="flex items-center gap-1.5">
            {["#e5695b", "#e6b34a", "#8fbf52"].map((c) => (
              <span
                key={c}
                className="rounded-full"
                style={{ width: 8, height: 8, background: c, opacity: 0.75 }}
              />
            ))}
          </div>
          <div
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-3 py-1"
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-default)",
              maxWidth: 320,
            }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: "var(--success)" }}
            />
            <span
              className="truncate font-mono text-[12px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              dgdreams.space
              <span style={{ color: "var(--text-secondary)" }}>
                {chapter.path}
              </span>
            </span>
          </div>
          <span
            className="ml-auto shrink-0 font-mono text-[12px]"
            style={{ color: "var(--text-faint)" }}
          >
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(CHAPTERS.length).padStart(2, "0")}
          </span>
        </div>

        {/* the stage */}
        <div
          className="relative overflow-hidden"
          style={{
            height: "clamp(380px, 62vh, 520px)",
            backgroundColor: "var(--bg-base)",
            backgroundImage:
              "linear-gradient(color-mix(in srgb, var(--border-default) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border-default) 55%, transparent) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        >
          {CHAPTERS.map((c, i) => {
            const l = clock - STARTS[i];
            const dur = c.dur;
            const visible = l > -FADE && l < dur + FADE;
            // the opening chapter does not fade in from nothing — a film that
            // starts on an empty frame reads as a loading state
            const opacity = !visible
              ? 0
              : Math.min(
                  i === 0 ? 1 : ramp(l, -FADE, FADE),
                  1 - ramp(l, dur - FADE, dur + FADE)
                );

            return (
              <div
                key={c.id}
                className="absolute inset-0"
                aria-hidden={opacity < 0.5}
                style={{
                  opacity,
                  pointerEvents: opacity > 0.5 ? "auto" : "none",
                  // keeps a hidden chapter's links out of the tab order while
                  // still allowing the crossfade at the boundary
                  visibility: opacity > 0.01 ? "visible" : "hidden",
                  willChange: "opacity",
                }}
              >
                {/* only the chapters on screen are rendered: at 60fps there is
                    no reason to keep five off-screen scenes in the tree */}
                {visible ? <SceneView index={i} t={clamp01(l / dur)} /> : null}
              </div>
            );
          })}

          {/* a soft vignette, so the mock UI sits inside the frame */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 0%, transparent 55%, var(--bg-base) 130%)",
              opacity: 0.55,
            }}
          />
        </div>

        {/* segmented progress — one segment per chapter */}
        <div
          className="flex gap-1 px-3 py-2"
          style={{ background: "var(--bg-card)" }}
        >
          {CHAPTERS.map((c, i) => {
            const fill = clamp01((clock - STARTS[i]) / c.dur);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => goChapter(i)}
                aria-label={`Jump to ${c.label}`}
                aria-current={i === index ? "true" : undefined}
                className="group relative h-2 flex-1 overflow-hidden rounded-full"
                style={{
                  background: "var(--bg-strong)",
                  cursor: "pointer",
                }}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${fill * 100}%`,
                    background: i === index ? "var(--accent)" : "var(--border-hover)",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* captions + transport */}
      <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <div style={{ opacity: 0.35 + caption * 0.65 }}>
          <div className="kicker">{chapter.kicker}</div>
          <h2
            className="mt-1.5 text-[20px] font-bold leading-tight tracking-[-0.02em] sm:text-[24px]"
            style={{ color: "var(--text-bright)" }}
          >
            {chapter.title}
          </h2>
          <p
            className="mt-1.5 max-w-[52ch] text-[14px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {chapter.blurb}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause the tour" : atEnd ? "Watch again" : "Play the tour"}
            className="grid place-items-center rounded-full transition-colors"
            style={{
              width: 44,
              height: 44,
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {playing ? (
              <Pause className="w-[18px] h-[18px]" strokeWidth={2.4} />
            ) : (
              <Play className="w-[18px] h-[18px] translate-x-[1px]" strokeWidth={2.4} />
            )}
          </button>
          <span
            className="font-mono text-[12px] tabular-nums"
            style={{ color: "var(--text-tertiary)" }}
          >
            {fmt(clock)} / {fmt(TOTAL)}
          </span>
        </div>
      </div>

      {/* chapter strip */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {CHAPTERS.map((c, i) => {
          const active = i === index;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => goChapter(i)}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors"
              style={{
                background: active ? "var(--accent-muted)" : "var(--bg-card)",
                border: `1px solid ${
                  active
                    ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                    : "var(--border-default)"
                }`,
                color: active ? "var(--text-bright)" : "var(--text-tertiary)",
              }}
            >
              <span
                className="font-mono"
                style={{
                  color: active ? "var(--accent-text)" : "var(--text-faint)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
