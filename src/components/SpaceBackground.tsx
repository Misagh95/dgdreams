"use client";

import { useEffect, useRef } from "react";

export default function SpaceBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    let w = 0, h = 0, dpr = 1, raf = 0, t = 0, running = true;
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };

    type Layer = { c: HTMLCanvasElement; depth: number; alpha: number; phase: number; drift: number };
    let layers: Layer[] = [];
    let nebula: HTMLCanvasElement | null = null;

    function starLayer(count: number, rMin: number, rMax: number, glow: number): HTMLCanvasElement {
      const c = document.createElement("canvas");
      c.width = Math.ceil(w * dpr);
      c.height = Math.ceil(h * dpr);
      const g = c.getContext("2d")!;
      g.scale(dpr, dpr);

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
        g.fillStyle = `rgba(${col},${rand(0.55, 1)})`;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      return c;
    }

    function buildNebula(): HTMLCanvasElement {
      const c = document.createElement("canvas");
      const s = Math.ceil(Math.max(w, h) * 1.4);
      c.width = c.height = s;
      const g = c.getContext("2d")!;

      const blobs = [
        { x: 0.28, y: 0.3,  r: 0.42, col: "56,120,255",  a: 0.16 },
        { x: 0.74, y: 0.52, r: 0.36, col: "139,92,246",  a: 0.13 },
        { x: 0.5,  y: 0.82, r: 0.34, col: "34,228,250",  a: 0.10 },
        { x: 0.12, y: 0.74, r: 0.26, col: "255,92,150",  a: 0.06 },
      ];
      for (const b of blobs) {
        const grad = g.createRadialGradient(b.x * s, b.y * s, 0, b.x * s, b.y * s, b.r * s);
        grad.addColorStop(0, `rgba(${b.col},${b.a})`);
        grad.addColorStop(0.45, `rgba(${b.col},${b.a * 0.35})`);
        grad.addColorStop(1, `rgba(${b.col},0)`);
        g.fillStyle = grad;
        g.fillRect(0, 0, s, s);
      }
      g.filter = "blur(40px)";
      g.drawImage(c, 0, 0);
      return c;
    }

    type Meteor = { x: number; y: number; vx: number; vy: number; len: number; life: number; max: number };
    let meteors: Meteor[] = [];
    let nextMeteor = 260;

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
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      if (canvas) {
        canvas.width = Math.ceil(w * dpr);
        canvas.height = Math.ceil(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const density = (w * h) / 1000;
      layers = [
        { c: starLayer(Math.floor(density * 0.16), 0.3, 0.7, 0),  depth: 0.006, alpha: 0.5,  phase: 0,   drift: 0.004 },
        { c: starLayer(Math.floor(density * 0.07), 0.6, 1.1, 3),  depth: 0.018, alpha: 0.8,  phase: 2.1, drift: 0.010 },
        { c: starLayer(Math.floor(density * 0.02), 1.0, 1.8, 5),  depth: 0.040, alpha: 1.0,  phase: 4.2, drift: 0.020 },
      ];
      nebula = buildNebula();
    }

    function frame() {
      if (!running) return;
      ctx!.clearRect(0, 0, w, h);

      ptr.x += (ptr.tx - ptr.x) * 0.045;
      ptr.y += (ptr.ty - ptr.y) * 0.045;

      if (nebula) {
        const s = nebula.width;
        ctx!.save();
        ctx!.globalCompositeOperation = "screen";
        ctx!.translate(w / 2 + ptr.x * 12, h / 2 + ptr.y * 12);
        ctx!.rotate(t * 0.00004);
        ctx!.globalAlpha = 0.9 + Math.sin(t * 0.002) * 0.1;
        ctx!.drawImage(nebula, -s / 2, -s / 2);
        ctx!.restore();
      }

      for (const L of layers) {
        const ox = ((t * L.drift) % w + w) % w;
        const twinkle = L.alpha * (0.82 + Math.sin(t * 0.012 + L.phase) * 0.18);
        ctx!.save();
        ctx!.globalAlpha = twinkle;
        const dx = -ox + ptr.x * L.depth * 900;
        const dy = ptr.y * L.depth * 900;
        ctx!.drawImage(L.c, dx, dy, w, h);
        ctx!.drawImage(L.c, dx + w, dy, w, h);
        ctx!.restore();
      }

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
          const g = ctx!.createLinearGradient(m.x, m.y, tailX, tailY);
          g.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
          g.addColorStop(0.25, `rgba(150,220,255,${0.4 * fade})`);
          g.addColorStop(1, "rgba(150,220,255,0)");
          ctx!.strokeStyle = g;
          ctx!.lineWidth = 1.6;
          ctx!.lineCap = "round";
          ctx!.beginPath();
          ctx!.moveTo(m.x, m.y);
          ctx!.lineTo(tailX, tailY);
          ctx!.stroke();
        }
      }

      const horizon = ctx!.createRadialGradient(w / 2, h * 1.5, h * 0.55, w / 2, h * 1.5, h * 1.05);
      horizon.addColorStop(0, "rgba(34,228,250,0.10)");
      horizon.addColorStop(0.55, "rgba(70,90,220,0.05)");
      horizon.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = horizon;
      ctx!.fillRect(0, 0, w, h);

      t += reduced ? 0 : 1;
      raf = requestAnimationFrame(frame);
    }

    const onMove = (e: MouseEvent) => {
      ptr.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onVis = () => {
      running = !document.hidden;
      if (running) { raf = requestAnimationFrame(frame); } else { cancelAnimationFrame(raf); }
    };

    resize();
    frame();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVis);
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
