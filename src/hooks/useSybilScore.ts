"use client";

import { useCallback, useState } from "react";
import { useSessionToken } from "@/lib/useSessionToken";
import type { SybilReport } from "@/lib/sybil/types";

/**
 * Fetches the connected wallet's Sybil Risk Score.
 *
 * Reuses the cached session token, so after the wallet's first sign-in this is
 * a plain GET with no new signature and no gas. The server recomputes from
 * scratch on every call and never accepts a score from the client.
 */
export function useSybilScore(address?: string) {
  const getSessionToken = useSessionToken();
  const [report, setReport] = useState<SybilReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) {
      setReport(null);
      setError(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getSessionToken(address);
      if (!token) {
        setError("Could not verify this wallet. Try signing in again.");
        return null;
      }
      const res = await fetch("/api/sybil", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(
          res.status === 429
            ? "Too many requests. Give it a minute and retry."
            : "Could not load the risk score."
        );
        return null;
      }
      const data = (await res.json()) as { report: SybilReport };
      setReport(data.report);
      return data.report;
    } catch {
      setError("Network error while loading the risk score.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [address, getSessionToken]);

  return { report, loading, error, load };
}

export default useSybilScore;
