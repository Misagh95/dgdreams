"use client";

import { useEffect, useRef } from "react";

// Frame budget for the ambient starfield. It drifts very slowly and is made of
// soft gradients, so 60fps bought nothing visible while tripling the per-second
// fill cost. 20fps is indistinguishable for this motion.
const TARGET_FPS = 20;
const MIN_FRAME_MS = 1000 / TARGET_FPS;
// Never drop below this: an 8fps background still beats a machine pinned at 100%.
const MAX_FRAME_MS = 1000 / 8;

export default function SpaceBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A weak machine should not pay for ambient motion at all.
    const weak = (navigator.hardwareConcurrency ?? 8) <= 2;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    let w = 0, h = 0, dpr = 1, raf = 0, t = 0, running = true, started = false;
    let last = 0;
    let frameBudget = MIN_FRAME_MS;
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };

    type Meteor = { x: number; y: number; vx: number; vy: number; len: number; life: number; max: number };
    let meteors: Meteor[] = [];
    let nextMeteor = 260;

    /**
     * The starfield is baked into two pre-composited skies (far/near) ONCE per
     * resize. Everything static — the soft nebula, the stars and the horizon
     * glow — used to be re-stamped hundreds of times per frame, plus a
     * full-screen radial gradient was allocated and evaluated every frame.
     * Now a frame is just two blits plus the meteors.
     */
    let skyFar: HTMLCanvasElement | null = null;
    let skyNear: HTMLCanvasElement | null = null;

    function paintStars(
      g: CanvasRenderingContext2D,
      count: number, rMin: number, rMax: number, glow: number, alpha: number
    ) {
      for (let i = 0; i < count; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = rand(rMin, rMax);
        const tint = Math.random();
        const col = tint > 0.9 ? "255,214,170" : tint > 0.75 ? "190,215,255" : "255,255,255";

        if (glow > 0) {
          const halo = g.createRadialGradient(x, y, 0, x, y, r * glow);
          halo.addColorStop(0, `rgba(${col},0.55)`);
          halo.addColorStop(1, `rgba(${col},0)`);
          g.fillStyle = halo;
          g.beginPath();
          g.arc(x, y, r * glow, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = `rgba(${col},${rand(0.55, 1) * alpha})`;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
    }
/** Soft nebula with the 40px blur applied ONCE, at viewport size. */
    function buildNebula(): HTMLCanvasElement {
      const c = document.createElement("canvas");
      c.width = Math.ceil(w * dpr);
      c.height = Math.ceil(h * dpr);
      const g = c.getContext("2d")!;
      g.scale(dpr, dpr);

      const blobs = [
        { x: 0.28, y: 0.3, r: 0.42, col: "56,120,255", a: 0.16 },
        { x: 0.74, y: 0.52, r: 0.36, col: "139,92,246", a: 0.13 },
        { x: 0.5, y: 0.82, r: 0.34, col: "34,228,250", a: 0.10 },
        { x: 0.12, y: 0.74, r: 0.26, col: "255,92,150", a: 0.06 },
      ];
      for (const b of blobs) {
        const grad = g.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, b.r * Math.max(w, h));
        grad.addColorStop(0, `rgba(${b.col},${b.a})`);
        grad.addColorStop(0.45, `rgba(${b.col},${b.a * 0.35})`);
        grad.addColorStop(1, `rgba(${b.col},0)`);
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
      }
      // One-time blur. Previously the source was 1.4x the largest side, so the
      // per-frame blit resampled ~7MP even though the blur itself was cached.
      g.filter = "blur(40px)";
      g.drawImage(c, 0, 0);
      return c;
    }

    function buildSketches() {
      const density = (w * h) / 1000;

      const far = document.createElement("canvas");
      far.width = Math.ceil(w * dpr);
      far.height = Math.ceil(h * dpr);
      const gf = far.getContext("2d")!;
      gf.scale(dpr, dpr);
      gf.drawImage(buildNebula(), 0, 0, w, h);
      paintStars(gf, Math.floor(density * 0.10), 0.3, 0.7, 0, 0.5);
      paintStars(gf, Math.floor(density * 0.045), 0.6, 1.1, 3, 0.8);
      // horizon glow is static, so it belongs in the bake, not the frame loop
      const horizon = gf.createRadialGradient(w / 2, h * 1.5, h * 0.55, w / 2, h * 1.5, h * 1.05);
      horizon.addColorStop(0, "rgba(34,228,250,0.10)");
      horizon.addColorStop(0.55, "rgba(70,90,220,0.05)");
      horizon.addColorStop(1, "rgba(0,0,0,0)");
      gf.fillStyle = horizon;
      gf.fillRect(0, 0, w, h);
      skyFar = far;

      const near = document.createElement("canvas");
      near.width = Math.ceil(w * dpr);
      near.height = Math.ceil(h * dpr);
      const gn = near.getContext("2d")!;
      gn.scale(dpr, dpr);
      paintStars(gn, Math.floor(density * 0.014), 1.0, 1.8, 5, 1.0);
      skyNear = near;
    }

    function spawnMeteor() {
      const fromLeft = Math.random() > 0.35;
      const speed = rand(7, 13);
      const ang = rand(0.28, 0.5) * (fromLeft ? 1 : -1);
      meteors.push({
        x: fromLeft ? rand(-100, w * 0.5) : rand(w * 0.5, w + 100),
        y: rand(-80, h * 0.35),
        vx: Math.cos(ang) * speed * (fromLeft ? 1 : -1),
        vy: Math.sin(Math.abs(ang)) * speed,
        len: rand(90, 210),
        life: 0,
        max: rand(50, 80),
      });
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      w = window.innerWidth;
      h = window.innerHeight;
      if (canvas) {
        canvas.width = Math.ceil(w * dpr);
        canvas.height = Math.ceil(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildSketches();
    }

    /** Draw a sky twice so its drift wraps seamlessly. */
    function blitWrapped(img: HTMLCanvasElement, ox: number, oy: number) {
      ctx!.drawImage(img, ox, oy, w, h);
      ctx!.drawImage(img, ox + w, oy, w, h);
    }

    function draw(ts: number) {
      if (!running) return;
      const t0 = performance.now();

      // Frame cap: rAF still fires at 60Hz, but the actual paint is throttled.
      if (last && ts - last < frameBudget) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = ts;

      ctx!.clearRect(0, 0, w, h);

      ptr.x += (ptr.tx - ptr.x) * 0.045;
      ptr.y += (ptr.ty - ptr.y) * 0.045;

      // Two full-screen blits instead of six + a rotated 7MP "screen" composite
      // + a freshly allocated full-screen radial gradient every frame.
      if (skyFar) {
        ctx!.globalAlpha = 0.82 + Math.sin(t * 0.012) * 0.18;
        const oxF = ((t * 0.004) % w + w) % w;
        blitWrapped(skyFar, -oxF + ptr.x * 12, ptr.y * 12);
      }
      if (skyNear) {
        ctx!.globalAlpha = 0.86 + Math.sin(t * 0.012 + 2.1) * 0.14;
        const oxN = ((t * 0.02) % w + w) % w;
        blitWrapped(skyNear, -oxN + ptr.x * 40, ptr.y * 40);
      }
      ctx!.globalAlpha = 1;

      if (!reduced) {
        if (--nextMeteor <= 0) {
          spawnMeteor();
          nextMeteor = Math.floor(rand(320, 900));
        }
        meteors = meteors.filter((m) => m.life < m.max);
        for (const m of meteors) {
          m.x += m.vx; m.y += m.vy; m.life++;
          const fade = Math.sin((m.life / m.max) * Math.PI);
          const tailX = m.x - m.vx * (m.len / 10);
          const tailY = m.y - m.vy * (m.len / 10);
          // Solid stroke + globalAlpha instead of allocating a linear gradient
          // for every meteor on every frame (a 1.6px line, visually identical).
          ctx!.globalAlpha = fade;
          ctx!.strokeStyle = "rgb(210,238,255)";
          ctx!.lineWidth = 1.6;
          ctx!.lineCap = "round";
          ctx!.beginPath();
          ctx!.moveTo(m.x, m.y);
          ctx!.lineTo(tailX, tailY);
          ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
      }

      t += reduced ? 0 : 1;

      // Adapt to what the machine can actually do: if our own paint is eating
      // the frame, back off instead of pinning a core at 100%.
      const spent = performance.now() - t0;
      if (spent > 12 && frameBudget < MAX_FRAME_MS) {
        frameBudget = Math.min(frameBudget * 1.5, MAX_FRAME_MS);
      } else if (spent < 4 && frameBudget > MIN_FRAME_MS) {
        frameBudget = Math.max(frameBudget / 1.25, MIN_FRAME_MS);
      }

      raf = requestAnimationFrame(draw);
    }

    const onMove = (e: MouseEvent) => {
      ptr.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onVis = () => {
      running = !document.hidden;
      if (running) {
        last = 0;
        raf = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    function paintStatic() {
      // reduced-motion / weak device: draw the sky once, no loop at all.
      ctx!.clearRect(0, 0, w, h);
      if (skyFar) ctx!.drawImage(skyFar, 0, 0, w, h);
      if (skyNear) ctx!.drawImage(skyNear, 0, 0, w, h);
    }

    function stop() {
      if (!started) return;
      started = false;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResizeThrottled);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      ctx!.clearRect(0, 0, w, h);
      skyFar = null;
      skyNear = null;
      meteors = [];
    }

    let resizeTimer = 0;
    function onResizeThrottled() {
      // Re-baking the skies is not free; a drag-resize would otherwise queue a
      // bake per event.
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!started) return;
        resize();
        if (isStaticOnly()) paintStatic();
      }, 200);
    }

    function start() {
      if (started) return;
      started = true;
      resize();
      if (isStaticOnly()) {
        paintStatic();
      } else {
        last = 0;
        raf = requestAnimationFrame(draw);
      }
      window.addEventListener("resize", onResizeThrottled);
      window.addEventListener("mousemove", onMove, { passive: true });
      document.addEventListener("visibilitychange", onVis);
    }

    const isLight = () =>
      document.documentElement.getAttribute("data-theme") === "web3-light";

    // Performance mode: same static frame as reduced-motion, and the loop is
    // not started at all, so the starfield costs zero CPU per second.
    const isStaticOnly = () =>
      reduced ||
      weak ||
      document.documentElement.getAttribute("data-perf") === "low";

    // The starfield is only designed for dark themes — never run on light.
    if (!isLight()) start();

    // react to both the theme switch and the performance-mode toggle
    const themeObs = new MutationObserver(() => {
      if (isLight()) stop();
      else start();
    });
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-perf"],
    });

    return () => {
      themeObs.disconnect();
      stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <canvas ref={ref} className="space-bg-canvas absolute inset-0" />
      <div className="cosmic-vignette" />
      <div className="cosmic-grain" />
    </div>
  );
}
