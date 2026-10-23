"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";

import { PRIMARY_NAV } from "@/lib/nav";
import MoreSheet, { MoreGlyph } from "@/components/shell/MoreSheet";
import ThemeSwitcher from "@/components/ThemeSwitcher";

/**
 * The phone chrome: a slim top bar and a bottom tab bar.
 *
 * The old build shipped a full-height drawer with fourteen entries and a
 * duplicated logo. Five tabs plus "More" is enough, and the wallet button
 * lives in exactly one place on every screen size.
 */
/**
 * The phone wallet button.
 *
 * RainbowKit's default is a ~150px blue pill, which on a 390px screen pushed
 * the theme control off the bar and read as a third-party advert. One quiet
 * chip instead: "Connect", or the address once connected.
 */
function PhoneWallet() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();

  const connected = !!isConnected && !!address;

  return (
    <button
      type="button"
      onClick={() => (connected ? disconnect() : openConnectModal?.())}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[12px] text-[12px] font-semibold transition-colors"
      style={{
        background: isConnected ? "var(--bg-strong)" : "var(--accent)",
        color: isConnected ? "var(--text-primary)" : "var(--accent-contrast)",
        border: isConnected ? "1px solid var(--border-default)" : "none",
      }}
    >
      <Wallet className="w-4 h-4" strokeWidth={2} />
      {isConnected && address
        ? `${address.slice(0, 6)}…${address.slice(-4)}`
        : "Connect"}
    </button>
  );
}

export default function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Top bar */}
      <header
        className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14"
        style={{
          background: "color-mix(in srgb, var(--bg-base) 88%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="DGDreams" width={24} height={24} />
          <span
            className="text-[14px] font-semibold"
            style={{ color: "var(--text-bright)" }}
          >
            DGDreams
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <PhoneWallet />
        </div>
      </header>

      {/* Bottom tabs */}
      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2"
        style={{
          background: "color-mix(in srgb, var(--bg-base) 92%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid var(--border-default)",
        }}
      >
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-[12px]"
              style={{ color: active ? "var(--text-bright)" : "var(--text-faint)" }}
            >
              <span
                className="flex items-center justify-center w-8 h-8 rounded-[10px]"
                style={{
                  background: active ? "var(--accent-muted)" : "transparent",
                }}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </span>
              <span className="text-[12px] leading-none font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}

        <MoreSheet
          trigger={(open) => (
            <button
              type="button"
              onClick={open}
              aria-label="More"
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-[12px]"
              style={{ color: "var(--text-faint)" }}
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-[10px]">
                <MoreGlyph />
              </span>
              <span className="text-[12px] leading-none font-medium">More</span>
            </button>
          )}
        />
      </nav>
    </>
  );
}
