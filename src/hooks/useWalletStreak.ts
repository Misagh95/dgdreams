"use client";

import { useCallback, useState } from "react";
import { useSessionToken } from "@/lib/useSessionToken";
import { NIKBASE_CONTRACTS } from "@/config/chains";

export interface WalletStreak {
  chainId: number;
  chainName: string;
  streak: number;
  totalCheckIns: number;
  totalActions: number;
}

/**
 * Records a wallet's streak as a single record, against the chain that holds it.
 *
 * The wallet signs in once (a signature, no transaction, no gas) and the token is
 * cached, so later syncs are silent. The server then reads the streak straight
 * out of the NikBase contract for that address and rewrites the one row it
 * owns. The client never sends a streak number — only the network it is on — so
 * what gets stored is chain truth, owned by the wallet, and playing on a second
 * network updates the record rather than adding another one.
 *
 * @param address connected wallet address
 * @param chainId  network the user just completed missions on
 */
export function useWalletStreak(address?: string) {
  const getSessionToken = useSessionToken();
  const [streak, setStreak] = useState<WalletStreak | null>(null);
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(
    async (chainId?: number) => {
      if (!address) return null;
      setSyncing(true);
      try {
        // Reuses the cached token when there is one, so this is a no-op
        // signature-wise after the wallet's first sign-in.
        const token = await getSessionToken(address);
        if (!token) return null;

        const res = await fetch("/api/streaks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // Only the network to read; the server keeps one row per wallet.
          body: JSON.stringify(
            chainId && NIKBASE_CONTRACTS[chainId] ? { chainId } : {}
          ),
        });
        if (!res.ok) return null;

        const data = (await res.json()) as { streak: WalletStreak | null };
        setStreak(data.streak ?? null);
        return data.streak ?? null;
      } catch {
        return null;
      } finally {
        setSyncing(false);
      }
    },
    [address, getSessionToken]
  );

  return { streak, syncing, sync };
}

export default useWalletStreak;