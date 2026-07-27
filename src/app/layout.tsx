import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "DGDreams — On-Chain Activity Terminal",
  description: "Track your daily on-chain streak, interact with multiple blockchain networks, and monitor your Web3 activity.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="cyber">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[var(--bg-base)] text-[var(--text-primary)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
