"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Globe, Loader2 } from "lucide-react";

import { BentoCard } from "@/components/ui/Bento";
import { NetworkMark } from "@/components/ritual/NetworkPicker";
import { useActiveNetwork } from "@/lib/activeNetwork";
import {
  NIKBASE_CONTRACTS,
  mainnetNetworks,
  testnetNetworks,
  type NetworkConfig,
} from "@/config/chains";

const ALL: NetworkConfig[] = [...mainnetNetworks, ...testnetNetworks];

/**
 * The network card — the one place the chains are listed, and the one place
 * they can be picked.
 *
 * Each chip is a button. Pressing it hands the chain to `selectNetwork`,
 * which does the same thing the hero's chip does: records the pick, and asks
 * the wallet to follow it. Tapping around the list does not open the connect
 * sheet — that is a deliberate choice, not a browse. So there is still
 * exactly one answer to "which network am I on?", with two doors into it.
 *
 * A brand colour is only ever a 16px mark, never a tinted background: twenty
 * tinted squares is most of the noise on the page. The active one is marked by
 * a stronger border and a filled dot, so it reads at a glance without colour.
 */
export default function NetworkStatusCard() {
  const { activeChainId, selectNetwork, switching } = useActiveNetwork();
  const [showAll, setShowAll] = useState(false);

  const live = ALL.filter((n) => !!NIKBASE_CONTRACTS[n.id]);
  const shown = showAll ? ALL : live;
  const active = ALL.find((n) => n.id === activeChainId);

  return (
    <BentoCard
      title="Networks"
      icon={<Globe className="w-4 h-4" strokeWidth={1.75} />}
      action={
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-[12px] font-medium hover:underline"
          style={{ color: "var(--text-tertiary)" }}
        >
          {showAll ? `Live only (${live.length})` : `All (${ALL.length})`}
        </button>
      }
    >
      <p className="text-[14px] mb-4" style={{ color: "var(--text-secondary)" }}>
        {live.length} of {ALL.length} networks have a NikBase contract.
        {active ? ` You are on ${active.name}.` : ""}{" "}
        <span style={{ color: "var(--text-faint)" }}>
          Tap any one to move — the wallet follows.
        </span>
      </p>

      <ul className="flex flex-wrap gap-1.5" role="group" aria-label="Pick a network">
        {shown.map((n) => {
          const isActive = n.id === activeChainId;
          const hasContract = !!NIKBASE_CONTRACTS[n.id];
          const isSwitching = switching && isActive;

          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => selectNetwork(n.id, { promptConnect: false })}
                disabled={switching}
                aria-pressed={isActive}
                title={
                  hasContract
                    ? `Switch to ${n.name}`
                    : `${n.name} — no NikBase contract yet`
                }
                className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-[10px] text-[12px] transition-colors disabled:cursor-wait"
                style={{
                  background: isActive ? "var(--bg-strong)" : "transparent",
                  border: `1px solid ${
                    isActive ? "var(--border-strong)" : "var(--border-default)"
                  }`,
                  color: isActive ? "var(--text-bright)" : "var(--text-tertiary)",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {isSwitching ? (
                  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <Loader2
                      className="w-3.5 h-3.5 animate-spin"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </span>
                ) : (
                  <NetworkMark network={n} size={14} />
                )}

                {n.shortName}

                {/* An inactive chip without a contract says so in the tooltip;
                    a hairline dot keeps the count honest without shouting. */}
                {!hasContract && !isActive ? (
                  <span
                    aria-hidden
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ background: "var(--warning)" }}
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <Link
        href="/run"
        className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium hover:underline"
        style={{ color: "var(--text-secondary)" }}
      >
        Run transactions
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </BentoCard>
  );
}
