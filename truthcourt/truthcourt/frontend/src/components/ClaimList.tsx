import type { Claim } from "../types";
import ClaimCard from "./ClaimCard";

interface Props {
  claims: Claim[];
  address: string;
  busy: string | null;
  onChallenge: (claim: Claim, urls: string[]) => Promise<void>;
  onResolve: (claim: Claim) => Promise<void>;
  onCancel: (claim: Claim) => Promise<void>;
}

export default function ClaimList({
  claims,
  address,
  busy,
  onChallenge,
  onResolve,
  onCancel,
}: Props) {
  if (claims.length === 0) {
    return <p className="muted">No claims yet. Post the first one above.</p>;
  }

  return (
    <div className="claims">
      {claims.map((c) => (
        <ClaimCard
          key={c.id}
          claim={c}
          address={address}
          busy={busy}
          onChallenge={onChallenge}
          onResolve={onResolve}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}
