"use client";

import Image from "next/image";
import { Globe } from "lucide-react";
import { useActiveNetwork } from "@/lib/activeNetwork";
import { mainnetNetworks, testnetNetworks, getNetworkConfig } from "@/config/chains";

/* ─────────────────────────────────────────────
   NetworkRail — a permanent strip of network
   logos down the left edge of the app. There is
   no dropdown: press the chain you want and the
   whole page (tasks, swap, deploy) follows it.
   ───────────────────────────────────────────── */

const NETWORKS = [...mainnetNetworks, ...testnetNetworks];

export default function NetworkRail() {
  const { activeChainId, selectNetwork, switching } = useActiveNetwork();
  const active = getNetworkConfig(activeChainId);

  return (
    <nav
      aria-label="Network rail"
      className="fixed left-0 lg:left-64 top-14 lg:top-0 bottom-0 z-40 w-full lg:w-[76px] flex flex-col"
      style={{
        background: "color-mix(in srgb, var(--bg-base) 92%, transparent)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid var(--border-default)",
      }}
    >
      {/* Header — the network currently in use */}
      <div className="shrink-0 px-2 py-3 text-center" style={{ borderBottom: "1px solid var(--border-default)" }}>
        <div
          className="mx-auto w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
          style={{
            background: `color-mix(in srgb, ${active?.color ?? "var(--accent)"} 22%, transparent)`,
            border: `1px solid color-mix(in srgb, ${active?.color ?? "var(--accent)"} 45%, transparent)`,
          }}
        >
          {active?.logo ? (
            <Image src={active.logo} alt="" width={20} height={20} style={{ objectFit: "contain" }} />
          ) : (
            <Globe className="w-4 h-4" style={{ color: active?.color }} />
          )}
        </div>
        <div
          className="mt-1.5 text-[9px] font-mono font-bold leading-tight"
          style={{ color: "var(--text-bright)" }}
        >
          {active?.shortName ?? "NET"}
        </div>
        <div className="text-[8px] font-mono" style={{ color: switching ? "var(--accent)" : "var(--text-quaternary)" }}>
          {switching ? "SWITCHING" : "#" + activeChainId}
        </div>
      </div>

      {/* The list — one logo per network, click to switch. Scrolls sideways on
          mobile (where there is no room for a column) and vertically on desktop. */}
      <div
        className="flex-1 flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto p-2"
        style={{ scrollbarWidth: "none" }}
      >
        {NETWORKS.map((n) => {
          const on = n.id === activeChainId;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => selectNetwork(n.id)}
              title={`${n.name}${n.isTestnet ? " (testnet)" : ""} — click to switch`}
              aria-label={`Switch to ${n.name}`}
              aria-current={on}
              className="relative flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-150"
              style={{
                background: on
                  ? `color-mix(in srgb, ${n.color} 26%, transparent)`
                  : "var(--bg-card)",
                border: `1px solid ${on ? n.color : "var(--border-default)"}`,
                boxShadow: on ? `0 0 10px color-mix(in srgb, ${n.color} 45%, transparent)` : undefined,
                transform: on ? "scale(1.06)" : undefined,
              }}
            >
              {n.logo ? (
                <Image
                  src={n.logo}
                  alt=""
                  width={20}
                  height={20}
                  style={{ objectFit: "contain" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span
                  className="text-[11px] font-bold"
                  style={{ color: n.color }}
                >
                  {(n.name || "?").charAt(0).toUpperCase()}
                </span>
              )}
              {/* testnet marker */}
              {n.isTestnet && (
                <span
                  className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full"
                  style={{ background: "#FFC24B" }}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
