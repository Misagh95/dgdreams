"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, m,  useReducedMotion } from "framer-motion";
import { Check, Globe, X } from "lucide-react";

import { useActiveNetwork } from "@/lib/activeNetwork";
import {
  NIKBASE_CONTRACTS,
  getNetworkConfig,
  mainnetNetworks,
  testnetNetworks,
  type NetworkConfig,
} from "@/config/chains";

const ALL_NETWORKS: NetworkConfig[] = [...mainnetNetworks, ...testnetNetworks];

/**
 * The network list.
 *
 * There is exactly one of these in the whole app. The old build showed the
 * chains three times — a rail under the header, a grid on the 6-in-1 card
 * and a dropdown on the counter card — so the same question had three
 * answers. Now the active network is one piece of state, and this sheet is
 * the only place it can be changed.
 */
export function NetworkSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { activeChainId, selectNetwork, switching } = useActiveNetwork();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(12,10,8,.45)" }}
            onClick={onClose}
          />
          <m.div
            role="dialog"
            aria-label="Choose a network"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed z-50 left-1/2 -translate-x-1/2 bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 w-full sm:w-[680px] max-h-[80vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px]"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 sticky top-0"
              style={{
                background: "var(--bg-elevated)",
                borderBottom: "1px solid var(--border-default)",
              }}
            >
              <div>
                <h2
                  className="text-[16px] font-semibold"
                  style={{ color: "var(--text-bright)" }}
                >
                  Choose a network
                </h2>
                <p
                  className="text-[12px] mt-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  The wallet follows your choice.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{ color: "var(--text-tertiary)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {(["Mainnet", "Testnet"] as const).map((group) => {
                const list = ALL_NETWORKS.filter((n) =>
                  group === "Testnet" ? n.isTestnet : !n.isTestnet
                );
                if (list.length === 0) return null;
                return (
                  <div key={group} className="mb-4 last:mb-0">
                    <p className="kicker px-1 mb-2">{group}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {list.map((n) => {
                        const on = n.id === activeChainId;
                        const hasContract = !!NIKBASE_CONTRACTS[n.id];
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              selectNetwork(n.id);
                              onClose();
                            }}
                            aria-pressed={on}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-left transition-colors"
                            style={{
                              background: on
                                ? "var(--accent-muted)"
                                : "var(--bg-card)",
                              border: `1px solid ${
                                on
                                  ? "color-mix(in srgb, var(--accent) 40%, transparent)"
                                  : "var(--border-default)"
                              }`,
                            }}
                          >
                            <span className="w-4 h-4 flex-shrink-0">
                              {n.logo ? (
                                <Image
                                  src={n.logo}
                                  alt=""
                                  width={16}
                                  height={16}
                                  style={{ objectFit: "contain", width: "16px", height: "16px" }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display =
                                      "none";
                                  }}
                                />
                              ) : (
                                <Globe
                                  className="w-4 h-4"
                                  style={{ color: "var(--text-faint)" }}
                                />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className="block text-[14px] font-medium truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {n.name}
                              </span>
                              <span
                                className="block text-[12px] truncate"
                                style={{
                                  color: hasContract
                                    ? "var(--text-faint)"
                                    : "var(--warning)",
                                }}
                              >
                                {hasContract ? "Ready" : "No contract"}
                              </span>
                            </span>
                            {on ? (
                              <Check
                                className="w-4 h-4 flex-shrink-0"
                                strokeWidth={2.5}
                                style={{ color: "var(--text-bright)" }}
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {switching ? (
              <p
                className="px-5 pb-4 text-[12px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Switching the wallet to the new network…
              </p>
            ) : null}
          </m.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * The compact network chip.
 *
 * Shows the active chain and opens the sheet. The brand colour of a network
 * is never used as a background — only the 16px mark carries it.
 */
export function NetworkChip({
  className = "",
  showName = true,
}: {
  className?: string;
  showName?: boolean;
}) {
  const { activeChainId, switching } = useActiveNetwork();
  const [open, setOpen] = useState(false);
  const active = getNetworkConfig(activeChainId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Change network"
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[12px] transition-colors hover:bg-[var(--bg-strong)] ${className}`}
        style={{
          border: "1px solid var(--border-default)",
          background: "var(--bg-card)",
        }}
      >
        <span className="w-4 h-4 flex-shrink-0">
          {active?.logo ? (
            <Image
              src={active.logo}
              alt=""
              width={16}
              height={16}
              style={{ objectFit: "contain", width: "16px", height: "16px" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Globe className="w-4 h-4" style={{ color: "var(--text-faint)" }} />
          )}
        </span>
        {showName ? (
          <span
            className="text-[14px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {active?.name ?? `Chain #${activeChainId}`}
          </span>
        ) : null}
        <span
          className="text-[12px]"
          style={{ color: "var(--text-faint)" }}
        >
          {switching ? "…" : `#${activeChainId}`}
        </span>
      </button>

      <NetworkSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** A bare network mark, 16px, no tint. */
export function NetworkMark({
  network,
  size = 16,
}: {
  network: NetworkConfig;
  size?: number;
}) {
  if (!network.logo) {
    return (
      <Globe
        className="flex-shrink-0"
        style={{ width: size, height: size, color: "var(--text-faint)" }}
      />
    );
  }
  return (
    <Image
      src={network.logo}
      alt={network.name}
      width={size}
      height={size}
      className="flex-shrink-0"
      style={{ objectFit: "contain", width: `${size}px`, height: `${size}px` }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
