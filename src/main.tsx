/// <reference types="vite/client" />
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

import { baseChain, hyperEvmChain, unichainChain, tempoChain, robinhoodChain } from './config/chains';
import { mainnet, sepolia, baseSepolia } from 'viem/chains';
import { defineChain } from 'viem';

const giwaSepoliaChain = defineChain({
  id: 91342,
  name: 'GIWA Sepolia',
  nativeCurrency: { decimals: 18, name: 'Ethereum', symbol: 'ETH' },
  rpcUrls: { default: { http: ['https://sepolia-rpc.giwa.io'] }, public: { http: ['https://sepolia-rpc.giwa.io'] } },
  blockExplorers: { default: { name: 'GIWA Explorer', url: 'https://sepolia.giwa.io' } },
});
const liteforgeChain = defineChain({
  id: 4441,
  name: 'LitVM Liteforge',
  nativeCurrency: { decimals: 18, name: 'zkLTC', symbol: 'zkLTC' },
  rpcUrls: { default: { http: ['https://liteforge.rpc.caldera.xyz/http'] }, public: { http: ['https://liteforge.rpc.caldera.xyz/http'] } },
  blockExplorers: { default: { name: 'Liteforge Explorer', url: 'https://liteforge.explorer.caldera.xyz' } },
});
const arcTestChain = defineChain({
  id: 5042002,
  name: 'ARC Testnet',
  nativeCurrency: { decimals: 18, name: 'ARC', symbol: 'ARC' },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] }, public: { http: ['https://rpc.testnet.arc.network'] } },
  blockExplorers: { default: { name: 'ARC Scan', url: 'https://testnet.arcscan.app' } },
});
const simpleChain = defineChain({
  id: 1913,
  name: 'SimpleChain',
  nativeCurrency: { decimals: 18, name: 'Simple', symbol: 'SIM' },
  rpcUrls: { default: { http: ['https://prod-simple-abroad.qukuaicunzheng.top/rpc/'] }, public: { http: ['https://prod-simple-abroad.qukuaicunzheng.top/rpc/'] } },
  blockExplorers: { default: { name: 'SimpleChain Explorer', url: 'https://testnet-explorer.simplechain.com' } },
});

const queryClient = new QueryClient();

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (!projectId) {
  throw new Error("Missing VITE_WALLETCONNECT_PROJECT_ID env variable");
}

const config = getDefaultConfig({
  appName: 'DGDreams',
  projectId,
  chains: [mainnet, baseChain, hyperEvmChain, unichainChain, tempoChain, robinhoodChain, sepolia, baseSepolia, giwaSepoliaChain, liteforgeChain, arcTestChain, simpleChain],
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
