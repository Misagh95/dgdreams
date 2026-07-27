"use client";

import { type ReactNode } from "react";
import { WagmiProvider, http, createConfig } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, walletConnectWallet, rainbowWallet, ledgerWallet } from "@rainbow-me/rainbowkit/wallets";
import { allChains } from "@/config/chains";

const queryClient = new QueryClient();

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

  const transports: Record<number, ReturnType<typeof http>> = {};
  for (const chain of allChains) {
    const url = chain.rpcUrls.default?.http?.[0];
    if (url) {
      transports[chain.id] = http(url);
    }
  }

  return createConfig({
    chains: allChains as any,
    connectors,
    transports,
    ssr: true,
  });
}

const _wagmiConfig = createWagmiConfig();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={_wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
