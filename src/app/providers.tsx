"use client";

import { type ReactNode } from "react";
import { LazyMotion, m } from "framer-motion";
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
  const projectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id-for-dev";
  // The placeholder is rejected by walletconnect's cloud (403/400 in the
  // console, the wallet modal falls back to defaults). Warn once so the fix
  // — a real project id from cloud.walletconnect.com in .env.local — is
  // visible instead of silent.
  if (typeof window !== "undefined" && projectId === "demo-project-id-for-dev") {
    console.warn(
      "[walletconnect] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set —" +
        " the demo id is rejected by cloud.walletconnect.com (403)." +
        " Create a project at https://cloud.walletconnect.com and set the id in .env.local."
    );
  }

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

/**
 * framer-motion ships its animation engine in one big module. `LazyMotion` +
 * `m` (used everywhere in this codebase) defer that module until the first `m`
 * component animates, instead of paying for it on the initial page load.
 * `strict` makes any stray full `motion` import a hard error, so nobody can
 * quietly drag the fat bundle back in.
 */
const loadMotionFeatures = () => import("framer-motion").then((res) => res.domMax);

function DynamicRainbowKitProvider({ children }: { children: ReactNode }) {
  const isLight = useIsLightTheme();

  // RainbowKit ships its own default theme — a blue that appears nowhere else
  // in this palette. Both themes are rebuilt from the app's tokens so the
  // wallet button and its modal look like part of the product.
  const theme = isLight
    ? lightTheme({
        accentColor: "#c6f24e",
        accentColorForeground: "#12100e",
        borderRadius: "medium",
        fontStack: "system",
        overlayBlur: "small",
      })
    : darkTheme({
        accentColor: "#c6f24e",
        accentColorForeground: "#12100e",
        borderRadius: "medium",
        fontStack: "system",
        overlayBlur: "small",
      });

  return <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={_wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={loadMotionFeatures} strict>
          <DynamicRainbowKitProvider>{children}</DynamicRainbowKitProvider>
        </LazyMotion>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
