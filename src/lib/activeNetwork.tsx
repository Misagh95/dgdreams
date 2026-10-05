"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getNetworkConfig } from "@/config/chains";

const STORAGE_KEY = "dgdreams.activeNetwork";
const FALLBACK_CHAIN_ID = 8453; // Base

interface ActiveNetworkValue {
  /** The chain the user picked in the rail (may differ from the wallet chain). */
  activeChainId: number;
  /** Pick a network: updates the rail and asks the wallet to switch. */
  selectNetwork: (chainId: number) => void;
  /** True while the wallet is being asked to switch. */
  switching: boolean;
}

const ActiveNetworkContext = createContext<ActiveNetworkValue | null>(null);

export function ActiveNetworkProvider({ children }: { children: ReactNode }) {
  const { chainId: walletChainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const [activeChainId, setActiveChainId] = useState(FALLBACK_CHAIN_ID);
  const [ready, setReady] = useState(false);

  // Restore the last pick so a refresh keeps the same network.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed) && getNetworkConfig(parsed)) setActiveChainId(parsed);
    } catch {
      /* private mode / storage disabled — keep the fallback */
    }
    setReady(true);
  }, []);

  // Follow the wallet when it changes on its own (RainbowKit dropdown, dapp
  // deep link, or a switch we did not initiate).
  useEffect(() => {
    if (!walletChainId || !getNetworkConfig(walletChainId)) return;
    setActiveChainId(walletChainId);
  }, [walletChainId]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(activeChainId));
    } catch {
      /* ignore */
    }
  }, [activeChainId, ready]);

  const selectNetwork = useCallback(
    (next: number) => {
      setActiveChainId(next);
      if (typeof window === "undefined") return;
      if (!getNetworkConfig(next)) return;
      if (next === walletChainId) return;
      // No wallet yet: still record the pick, and offer the connect sheet.
      if (walletChainId === undefined) {
        openConnectModal?.();
        return;
      }
      void switchChainAsync({ chainId: next }).catch(() => {
        /* user rejected or the chain is not in the wallet */
      });
    },
    [walletChainId, switchChainAsync, openConnectModal]
  );

  const value = useMemo(
    () => ({ activeChainId, selectNetwork, switching: isPending }),
    [activeChainId, selectNetwork, isPending]
  );

  return <ActiveNetworkContext.Provider value={value}>{children}</ActiveNetworkContext.Provider>;
}

export function useActiveNetwork(): ActiveNetworkValue {
  const ctx = useContext(ActiveNetworkContext);
  if (!ctx) {
    // Used outside the provider (e.g. a page without DashboardLayout) — fall
    // back to an inert value so the component still renders.
    return { activeChainId: FALLBACK_CHAIN_ID, selectNetwork: () => {}, switching: false };
  }
  return ctx;
}
