"use client";

import Image from "next/image";
import { Globe } from "lucide-react";
import { useActiveNetwork } from "@/lib/activeNetwork";
import { mainnetNetworks, testnetNetworks, getNetworkConfig } from "@/config/chains";

/* ---------------------------------------------
   NetworkRail — a horizontal row of network logos under
   the nav. There is no dropdown: press the chain you
   want and the whole page (tasks, swap, deploy) follows it.
   --------------------------------------------- */

const NETWORKS = [...mainnetNetworks, ...testnetNetworks];

export default function NetworkRail() {
  const { activeChainId, selectNetwork, switching } = useActiveNetwork();
  const active = getNetworkConfig(activeChainId);

  return (
    <nav
      aria-label="Network rail"
      className="w-full shrink-0 border-b"
      style={{
        background: "color-mix(in srgb, var(--bg-base) 92%, transparent)",
        backdropFilter: "blur(20px)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="flex items-center gap-3 px-4 lg:px-5 py-2.5">
        {/* Header — the network currently in use */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
          title={active?.name}
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

        <div className="shrink-0 leading-tight">
          <div className="text-[10px] font-mono font-bold" style={{ color: "var(--text-bright)" }}>
            {active?.shortName ?? "NET"}
          </div>
          <div className="text-[8px] font-mono" style={{ color: switching ? "var(--accent)" : "var(--text-quaternary)" }}>
            {switching ? "SWITCHING" : "#" + activeChainId}
          </div>
        </div>

        <span className="text-[9px] font-mono uppercase tracking-[0.2em] shrink-0" style={{ color: "var(--text-quaternary)" }}>
          Network
        </span>

        {/* The list — one logo per network, click to switch, laid out in a row
            and scrolling sideways so 20 chains never push the content down. */}
        <div
          className="flex gap-1.5 overflow-x-auto flex-1 min-w-0 py-0.5"
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
      </div>
    </nav>
  );
}
