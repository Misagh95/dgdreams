import { fromWei } from "../genlayer";
import type { Claim } from "../types";

interface Props {
  claims: Claim[];
}

export default function StatsBar({ claims }: Props) {
  const open = claims.filter((c) => c.status === "open").length;
  const contested = claims.filter((c) => c.status === "contested").length;
  const resolved = claims.filter((c) => c.status === "resolved").length;
  const total = claims.length;
  const atRisk = claims
    .filter((c) => c.status === "open" || c.status === "contested")
    .reduce((s, c) => s + BigInt(c.bond), 0n);

  const slice = (n: number) => (total === 0 ? 0 : (n / total) * 360);
  const donut = total
    ? `conic-gradient(
        var(--accent) 0deg ${slice(open)}deg,
        var(--warn) ${slice(open)}deg ${slice(open + contested)}deg,
        var(--ok) ${slice(open + contested)}deg 360deg
      )`
    : "var(--panel-2)";

  return (
    <section className="stats card">
      <div className="donut" style={{ background: donut }}>
        <div className="donut-hole">
          <strong>{total}</strong>
          <span>claims</span>
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat">
          <span className="dot dot-open" />
          <span>Open</span>
          <b>{open}</b>
        </div>
        <div className="stat">
          <span className="dot dot-contested" />
          <span>Contested</span>
          <b>{contested}</b>
        </div>
        <div className="stat">
          <span className="dot dot-resolved" />
          <span>Resolved</span>
          <b>{resolved}</b>
        </div>
        <div className="stat">
          <span className="dot dot-coin" />
          <span>In play</span>
          <b>{fromWei(atRisk)} GEN</b>
        </div>
      </div>
    </section>
  );
}