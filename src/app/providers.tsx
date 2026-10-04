"use client";

import { type ReactNode } from "react";
import { WagmiProvider, http, fallback, createConfig, type Transport } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, walletConnectWallet, rainbowWallet, ledgerWallet } from "@rainbow-me/rainbowkit/wallets";
import { allChains } from "@/config/chains";
import { useIsLightTheme } from "@/hooks/useIsLightTheme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // RPC calls are slow (200ms-1s). Without these, every mount, window
      // focus and reconnect refires every read hook on the page.
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: 800,
    },
  },
});

function createWagmiConfig() {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id-for-dev";

  const connectors = connectorsForWallets(
    [
      {
        groupName: "Popular",
        wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet, ledgerWallet],
      },
    ],
    { appName: "DGDreams", projectId }
  );

  const transports: Record<number, Transport> = {};
  for (const chain of allChains) {
    const urls: readonly string[] = chain.rpcUrls.default?.http ?? [];
    const primary = urls[0];
    if (!primary) continue;

    // batch:true collapses the page's concurrent reads into one JSON-RPC
    // batch per tick instead of one HTTP request each (big win on the tasks
    // page, which fires several reads at once). A short timeout keeps a
    // hanging endpoint from stalling the wallet popup.
    const opts = { batch: true, timeout: 10_000, retryCount: 2 } as const;

    // Chains with more than one RPC (e.g. Arc, opBNB, BNB) get a fallback
    // transport, so a single unresponsive/blocked endpoint never takes the
    // network down.
    transports[chain.id] =
      urls.length === 1
        ? http(primary, opts)
        : fallback(urls.map((url) => http(url, opts)));
  }

  return createConfig({
    chains: allChains as any,
    connectors,
    transports,
    ssr: true,
  });
}

const _wagmiConfig = createWagmiConfig();

function DynamicRainbowKitProvider({ children }: { children: ReactNode }) {
  const isLight = useIsLightTheme();
  return (
    <RainbowKitProvider theme={isLight ? lightTheme() : darkTheme()}>
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={_wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <DynamicRainbowKitProvider>{children}</DynamicRainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
