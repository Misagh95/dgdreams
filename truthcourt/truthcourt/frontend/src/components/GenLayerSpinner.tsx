import type { CSSProperties } from "react";

import "./styles.css";

interface GenLayerSpinnerProps {
  size?: number;
  color?: CSSProperties["color"];
  animated?: boolean;
  label?: string;
  className?: string;
}

export default function GenLayerSpinner({ size = 32, color = "#110fff", animated = true, label = "Loading", className }: GenLayerSpinnerProps) {
  const style = { "--genlayer-spinner-size": `${size}px`, color } as CSSProperties;

  return (
    <span
      className={["genlayer-spinner", !animated && "genlayer-spinner--static", className].filter(Boolean).join(" ")}
      style={style}
      role={animated ? "status" : "img"}
      aria-label={label}
    >
      <svg viewBox="0 0 98 92" aria-hidden="true" focusable="false">
        <polygon className="genlayer-spinner__wing genlayer-spinner__wing--left" points="44.26 32.35 27.72 67.12 43.29 74.9 0 91.93 44.26 0" />
        <polygon className="genlayer-spinner__wing genlayer-spinner__wing--right" points="53.5 32.35 70.04 67.12 54.47 74.9 97.76 91.93 53.5 0" />
        <polygon className="genlayer-spinner__core" points="48.64 43.78 58.33 62.94 48.64 67.69 39.47 62.92" />
      </svg>
      <span className="genlayer-sr-only">{label}</span>
    </span>
  );
}