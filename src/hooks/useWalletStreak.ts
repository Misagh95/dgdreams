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
 * Records a wallet's streak against the chain that actually holds it.
 *
 * The wallet signs in once (a signature, no transaction, no gas), and the
 * server then reads the streak straight out of the NikBase contract for that
 * address. The client never sends a streak number — it only says *which
 * networks to check* — so what gets stored is chain truth, owned by the wallet.
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
        const token = await getSessionToken(address);
        if (!token) return null;

        // Only networks that actually have a NikBase can answer.
        const chainIds =
          chainId && NIKBASE_CONTRACTS[chainId]
            ? [chainId]
            : Object.keys(NIKBASE_CONTRACTS)
                .map((id) => parseInt(id, 10))
                .filter((id) => NIKBASE_CONTRACTS[id])
                .slice(0, 10);

        const res = await fetch("/api/streaks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ chainIds }),
        });
        if (!res.ok) return null;

        const data = (await res.json()) as { streaks: WalletStreak[] };
        // The best streak across the networks just verified.
        const best = data.streaks.reduce<WalletStreak | null>(
          (acc, s) => (!acc || s.streak > acc.streak ? s : acc),
          null
        );
        setStreak(best);
        return best;
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