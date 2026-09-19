"use client";

import Image from "next/image";

/* ─────── 3D NETWORK CUBE ─────── */

const CUBE_SIZE = 120;
const CUBE_HALF = CUBE_SIZE / 2;

const CUBE_FACES = [
  `rotateY(0deg) translateZ(${CUBE_HALF}px)`,
  `rotateY(90deg) translateZ(${CUBE_HALF}px)`,
  `rotateY(180deg) translateZ(${CUBE_HALF}px)`,
  `rotateY(-90deg) translateZ(${CUBE_HALF}px)`,
  `rotateX(90deg) translateZ(${CUBE_HALF}px)`,
  `rotateX(-90deg) translateZ(${CUBE_HALF}px)`,
];

export function NetworkCube({ logo, color, name }: { logo: string; color: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="dg-cube-float" style={{ perspective: "900px" }}>
        <div
          className="dg-cube-spin"
          style={{
            width: CUBE_SIZE,
            height: CUBE_SIZE,
            position: "relative",
            transformStyle: "preserve-3d",
          }}
        >
          {CUBE_FACES.map((transform, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-xl flex items-center justify-center"
              style={{
                transform,
                background: `color-mix(in srgb, ${color} 10%, var(--bg-card))`,
                border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
                boxShadow: `inset 0 0 30px color-mix(in srgb, ${color} 15%, transparent)`,
              }}
            >
              <Image
                src={logo}
                alt={name}
                width={48}
                height={48}
                style={{ filter: `drop-shadow(0 0 8px color-mix(in srgb, ${color} 60%, transparent))` }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ))}
        </div>
      </div>
      <div
        className="rounded-full"
        style={{
          width: 90,
          height: 14,
          background: `radial-gradient(ellipse, color-mix(in srgb, ${color} 45%, transparent), transparent 70%)`,
          filter: "blur(4px)",
          marginTop: -6,
        }}
      />
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
        <span className="text-[10px] font-mono font-semibold" style={{ color: "var(--text-tertiary)" }}>
          {name}
        </span>
      </div>
    </div>
  );
}
