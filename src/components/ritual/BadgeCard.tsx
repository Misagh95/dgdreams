"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { isAddress } from "viem";
import { Award, ChevronRight } from "lucide-react";

import { BentoCard } from "@/components/ui/Bento";
import { useActiveNetwork } from "@/lib/activeNetwork";
import { useRitual } from "@/hooks/useRitual";
import {
  BADGE_TIERS,
  SOULBOUND_ABI,
  soulboundAddress,
  tierLabel,
} from "@/lib/soulbound";
import { getNetworkConfig } from "@/config/chains";

/**
 * The badge card.
 *
 * A soulbound badge is minted once all three daily missions land on a
 * network, and it climbs a tier as the streak grows. The card only reports
 * state — the mint itself lives on the ritual page.
 */
export default function BadgeCard() {
  const { address, isConnected, chainId } = useAccount();
  const { activeChainId } = useActiveNetwork();
  const { doneCount } = useRitual();

  // The badge lives on the wallet's chain; the ritual runs on the picked one.
  const badgeNetwork =
    getNetworkConfig(chainId ?? activeChainId) ??
    getNetworkConfig(activeChainId);
  const address_ = soulboundAddress(badgeNetwork);
  const account =
    address && isAddress(address) ? (address as `0x${string}`) : undefined;

  const { data: tokenId } = useReadContract({
    address: address_,
    abi: SOULBOUND_ABI,
    functionName: "userTokenId",
    args: account ? [account] : undefined,
    query: { enabled: !!address_ && !!account, refetchInterval: 60_000 },
  });

  const hasBadge = tokenId !== undefined && tokenId > 0n;

  const { data: tokenData } = useReadContract({
    address: address_,
    abi: SOULBOUND_ABI,
    functionName: "tokenData",
    args: hasBadge && tokenId ? [tokenId] : undefined,
    query: { enabled: hasBadge && !!address_ && !!tokenId },
  });

  const tier = tokenData ? Number(tokenData[0]) : 0;
  const badgeStreak = tokenData ? Number(tokenData[1]) : 0;
  const nextTier = BADGE_TIERS[tier] ?? null;

  return (
    <BentoCard title="Badge" icon={<Award className="w-4 h-4" strokeWidth={1.75} />}>
      {!isConnected ? (
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Connect a wallet to mint the soulbound badge for your streak.
        </p>
      ) : !address_ ? (
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          No badge contract on {badgeNetwork?.name ?? "this network"} yet.
        </p>
      ) : hasBadge ? (
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[32px] font-bold leading-none"
              style={{ color: "var(--text-bright)" }}
            >
              {badgeStreak}
            </span>
            <span className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
              day streak
            </span>
          </div>
          <p className="mt-2 text-[14px]" style={{ color: "var(--text-secondary)" }}>
            <span className="mark" style={{ color: "var(--text-bright)" }}>
              {tierLabel(tier)}
            </span>{" "}
            tier, minted on {badgeNetwork?.name}.
          </p>
          {nextTier ? (
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-faint)" }}>
              {nextTier.threshold - badgeStreak} more days to {nextTier.label}
            </p>
          ) : null}
        </div>
      ) : (
        <div>
          <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
            Finish all three missions to mint your badge. Gas only.
          </p>
          <div className="mt-3 progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(doneCount / 3) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[12px]" style={{ color: "var(--text-faint)" }}>
            {doneCount}/3 today
          </p>
        </div>
      )}

      <Link
        href="/tasks"
        className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium hover:underline"
        style={{ color: "var(--text-secondary)" }}
      >
        Open the ritual
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </BentoCard>
  );
}
