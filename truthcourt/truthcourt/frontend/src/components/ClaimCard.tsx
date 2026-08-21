import { useState } from "react";
import { fromWei, shortAddr } from "../genlayer";
import type { Claim } from "../types";
import GenLayerSpinner from "./GenLayerSpinner";

interface Props {
  claim: Claim;
  address: string;
  busy: string | null;
  onChallenge: (claim: Claim, urls: string[]) => Promise<void>;
  onResolve: (claim: Claim) => Promise<void>;
  onCancel: (claim: Claim) => Promise<void>;
}

const STATUS_LABEL: Record<string, { text: string; icon: string }> = {
  open: { text: "Open", icon: "◉" },
  contested: { text: "Contested", icon: "⚔" },
  resolved: { text: "Resolved", icon: "✓" },
};

const VERDICT_LABEL: Record<string, { text: string; icon: string }> = {
  true: { text: "TRUE", icon: "✅" },
  false: { text: "FALSE", icon: "❌" },
  unverifiable: { text: "UNVERIFIABLE", icon: "⚠️" },
  cancelled: { text: "CANCELLED", icon: "↩️" },
};

export default function ClaimCard({
  claim,
  address,
  busy,
  onChallenge,
  onResolve,
  onCancel,
}: Props) {
  const [urls, setUrls] = useState("");
  const isPoster = claim.poster.toLowerCase() === address.toLowerCase();
  const isChallenger =
    !!claim.challenger &&
    claim.challenger.toLowerCase() === address.toLowerCase();
  const acting = busy !== null;

  const status = STATUS_LABEL[claim.status] ?? { text: claim.status, icon: "" };
  const verdict = claim.verdict
    ? VERDICT_LABEL[claim.verdict] ?? { text: claim.verdict, icon: "" }
    : null;

  return (
    <article className={`claim status-${claim.status}`}>
      <div className="claim-head">
        <span className="id">#{claim.id}</span>
        <span className={`status-pill status-${claim.status}`}>
          {status.icon} {status.text}
        </span>
        {verdict && (
          <span className={`verdict verdict-${claim.verdict}`}>
            {verdict.icon} {verdict.text}
          </span>
        )}
      </div>

      <p className="claim-text">{claim.text}</p>

      <div className="meta">
        <span className="bond-chip">⛁ Bond {fromWei(claim.bond)} GEN</span>
        <span title={claim.poster}>
          <span className="roll">Poster</span> {shortAddr(claim.poster)}
          {isPoster && <em className="you">you</em>}
        </span>
        {claim.challenger && (
          <span title={claim.challenger}>
            <span className="roll">Challenger</span> {shortAddr(claim.challenger)}
            {isChallenger && <em className="you">you</em>}
          </span>
        )}
      </div>

      <ul className="links">
        {claim.evidence_urls.map((u) => (
          <li key={u}>
            <span className="link-tag">P</span>
            <a href={u} target="_blank" rel="noreferrer">
              {u}
            </a>
          </li>
        ))}
        {claim.challenger_urls.map((u) => (
          <li key={u}>
            <span className="link-tag tag-challenger">C</span>
            <a href={u} target="_blank" rel="noreferrer">
              {u}
            </a>
          </li>
        ))}
      </ul>

      {claim.reasoning && <blockquote className="reasoning">“{claim.reasoning}”</blockquote>}

      <div className="actions">
        {claim.status === "open" && !isPoster && (
          <div className="challenge-box">
            <input
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="Your evidence URLs (one per line)"
            />
            <button
              className="danger-ghost"
              disabled={acting || !urls.trim()}
              onClick={() =>
                onChallenge(
                  claim,
                  urls.split("\n").map((u) => u.trim()).filter(Boolean)
                )
              }
            >
              ⚔ Challenge
            </button>
          </div>
        )}
        {claim.status === "open" && isPoster && (
          <button className="ghost" disabled={acting} onClick={() => onCancel(claim)}>
            ↩ Cancel & refund
          </button>
        )}
        {claim.status === "contested" && (
          <button className="primary" disabled={acting} onClick={() => onResolve(claim)}>
            {acting ? (
              <>
                <GenLayerSpinner size={15} color="#fff" label="Resolving" />
                Resolving…
              </>
            ) : (
              "⚖ Resolve with AI"
            )}
          </button>
        )}
      </div>
    </article>
  );
}