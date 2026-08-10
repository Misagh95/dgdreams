"use client";

import { useCallback } from "react";
import { useSignMessage } from "wagmi";

const SESSION_TOKEN_KEY = "dgdreams-session-token";

/** Clear the cached session token from localStorage (e.g. on 401). */
export function clearCachedSessionToken(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {}
}

/**
 * Mint (or reuse) a session token for the connected wallet.
 * The token is cached in localStorage keyed by wallet address (7-day expiry).
 * Calls `clearCachedSessionToken()` to invalidate before re-signing.
 */
export function useSessionToken() {
  const { signMessageAsync } = useSignMessage();

  return useCallback(
    async (addr: string): Promise<string | null> => {
      // Reuse a cached token minted for the same wallet.
      try {
        const cached = localStorage.getItem(SESSION_TOKEN_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as {
            address?: string;
            token?: string;
          };
          if (
            parsed.address?.toLowerCase() === addr.toLowerCase() &&
            parsed.token
          ) {
            return parsed.token;
          }
        }
      } catch {}

      // Mint a fresh token.
      try {
        const nonceRes = await fetch(
          `/api/auth/nonce?address=${encodeURIComponent(addr)}`
        );
        if (!nonceRes.ok) return null;
        const { message } = (await nonceRes.json()) as { message: string };
        const signature = await signMessageAsync({ message });
        const verifyRes = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: addr, message, signature }),
        });
        if (!verifyRes.ok) return null;
        const { token } = (await verifyRes.json()) as { token: string };
        localStorage.setItem(
          SESSION_TOKEN_KEY,
          JSON.stringify({ address: addr, token })
        );
        return token;
      } catch {
        return null;
      }
    },
    [signMessageAsync]
  );
}