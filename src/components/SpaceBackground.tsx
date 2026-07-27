"use client";

import { useEffect, useRef } from "react";

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let stars: { x: number; y: number; size: number; opacity: number; speed: number; twinkleSpeed: number; twinkleOffset: number }[] = [];
    let particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; color: string }[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    }

    function initStars() {
      if (!canvas) return;
      stars = [];
      const count = Math.floor((canvas.width * canvas.height) / 3000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.3,
          opacity: Math.random() * 0.7 + 0.1,
          speed: Math.random() * 0.3 + 0.05,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
      particles = [];
      for (let i = 0; i < 15; i++) {
        const colors = ["rgba(0,212,255,", "rgba(139,92,246,", "rgba(0,102,255,"];
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.4 + 0.1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    let time = 0;
    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep space gradient
      const bgGrad = ctx.createRadialGradient(
        canvas.width * 0.3, canvas.height * 0.2, 0,
        canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.8
      );
      bgGrad.addColorStop(0, "rgba(6,13,26,0)");
      bgGrad.addColorStop(0.5, "rgba(10,22,40,0)");
      bgGrad.addColorStop(1, "rgba(2,4,8,0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nebula blobs
      const nebulas = [
        { x: canvas.width * 0.15, y: canvas.height * 0.25, r: canvas.width * 0.25, color: "rgba(0,102,255," },
        { x: canvas.width * 0.8, y: canvas.height * 0.6, r: canvas.width * 0.2, color: "rgba(139,92,246," },
        { x: canvas.width * 0.5, y: canvas.height * 0.8, r: canvas.width * 0.18, color: "rgba(0,212,255," },
      ];

      nebulas.forEach((n, i) => {
        const pulse = Math.sin(time * 0.003 + i * 1.5) * 0.02 + 0.04;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, `${n.color}${pulse})`);
        grad.addColorStop(0.5, `${n.color}${pulse * 0.5})`);
        grad.addColorStop(1, `${n.color}0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Stars
      stars.forEach((star) => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
        ctx.save();
        ctx.globalAlpha = star.opacity * twinkle;
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = star.size * 3;
        ctx.shadowColor = "rgba(200,230,255,0.8)";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Floating particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = `${p.color}1)`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `${p.color}0.8)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Subtle grid lines
      ctx.save();
      ctx.strokeStyle = "rgba(26,58,92,0.06)";
      ctx.lineWidth = 0.5;
      const gridSpacing = 80;
      for (let x = 0; x < canvas.width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.restore();

      time++;
      animationId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 1 }}
    />
  );
}
