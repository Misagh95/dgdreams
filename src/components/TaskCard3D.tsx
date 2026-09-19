"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowUpRight, Sunrise, MoonStar } from "lucide-react";

/* ─────── 3D TASK CARDS ─────── */

export const DAILY_MISSIONS = [
  { id: "checkIn", title: "Daily Check", desc: "Start the day & build your streak", icon: CheckCircle2, color: "#00FF88" },
  { id: "gm", title: "GM", desc: "Say good morning on-chain", icon: Sunrise, color: "#FFAA00" },
  { id: "gn", title: "GN", desc: "Sign off for the night on-chain", icon: MoonStar, color: "#818CF8" },
];

export function TaskCard3D({
  title,
  desc,
  icon: Icon,
  color,
  onClick,
}: {
  title: string;
  desc: string;
  icon: typeof CheckCircle2;
  color: string;
  onClick?: () => void;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 12, y: px * 12, active: true });
  };

  const card = (
    <div style={{ perspective: "700px" }}>
      <div
        onMouseMove={handleMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0, active: false })}
        className="rounded-xl p-4 flex flex-col gap-3 h-full cursor-pointer"
        style={{
          background: "var(--bg-subtle)",
          border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${tilt.active ? "scale(1.02)" : "scale(1)"}`,
          transition: tilt.active ? "transform 0.12s ease-out" : "transform 0.6s ease",
          boxShadow: tilt.active
            ? `0 18px 40px -12px color-mix(in srgb, ${color} 35%, transparent), inset 0 0 20px color-mix(in srgb, ${color} 6%, transparent)`
            : `0 8px 24px -12px rgba(0,0,0,0.4), inset 0 0 12px color-mix(in srgb, ${color} 4%, transparent)`,
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            transform: "translateZ(30px)",
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
            boxShadow: `0 0 16px color-mix(in srgb, ${color} 20%, transparent)`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div style={{ transform: "translateZ(20px)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-bright)" }}>
            {title}
          </h3>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            {desc}
          </p>
        </div>
        <div className="flex items-center justify-between mt-auto" style={{ transform: "translateZ(15px)" }}>
          <span
            className="text-[9px] font-mono px-2 py-0.5 rounded-md"
            style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
          >
            1 tx / day
          </span>
          <ArrowUpRight className="w-3.5 h-3.5" style={{ color: "var(--text-quaternary)" }} />
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <div onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick()}>
        {card}
      </div>
    );
  }
  return (
    <Link href="/tasks" className="block">
      {card}
    </Link>
  );
}
