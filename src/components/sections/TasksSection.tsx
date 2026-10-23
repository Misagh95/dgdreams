"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useConfig, useReadContract, useWriteContract } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { isAddress } from "viem";
import { Award, Loader2, Sparkles, Zap } from "lucide-react";

import FiveInOne from "@/components/FiveInOne";
import CounterSolo from "@/components/CounterSolo";
import NetworkStatusCard from "@/components/ritual/NetworkStatusCard";
import { NIKBASE_CONTRACTS, getNetworkConfig } from "@/config/chains";
import { canStillRunTask } from "@/lib/preflight";
import { useActiveNetwork } from "@/lib/activeNetwork";
import { SOULBOUND_ABI, SOULBOUND_ADDR, tierLabel } from "@/lib/soulbound";

const NIKBASE_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getActionCounts",
    outputs: [
      { name: "actCount", type: "uint256" },
      { name: "dose", type: "uint256" },
      { name: "mood", type: "uint256" },
      { name: "sanitize", type: "uint256" },
      { name: "counter", type: "uint256" },
      { name: "spin", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * The ritual, in depth.
 *
 * The three missions live in the hero. This is the rest of it: the run that
 * does all six in one pass, the standalone counter, and the badge.
 *
 * Everything here follows the one network picked in the hero. The old build
 * had a preview modal, a per-card network grid and a dropdown, so "which
 * chain am I on?" had four different answers on one screen. It has one now.
 */
export function TasksSection() {
  const { address, isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { activeChainId } = useActiveNetwork();
  const wagmiConfig = useConfig();

  const network = getNetworkConfig(chainId ?? activeChainId);

  const validatedAddr =
    address && isAddress(address) ? (address as `0x${string}`) : undefined;

  /**
   * Which of today's missions are already on chain. A reverted eth_call —
   * the same simulation the wallet runs — means "already done today".
   * Ids are chain-qualified so a mission completed on one chain can never
   * look completed on another.
   */
  const [onChainDoneIds, setOnChainDoneIds] = useState<Set<string>>(new Set());
  const [probeNonce, setProbeNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const contract = network ? NIKBASE_CONTRACTS[network.id] : undefined;
    const pub = network
      ? getPublicClient(wagmiConfig, { chainId: network.id })
      : undefined;

    if (!isConnected || !validatedAddr || !network || !contract || !pub) {
      setOnChainDoneIds(new Set());
      return;
    }

    (async () => {
      const done = new Set<string>();
      await Promise.all(
        (
          [
            { id: "checkIn", method: "dailyCheckIn" },
            { id: "gm", method: "gm" },
            { id: "gn", method: "gn" },
          ] as const
        ).map(async (t) => {
          const ok = await canStillRunTask(pub, {
            account: validatedAddr,
            contract: contract as `0x${string}`,
            method: t.method,
          });
          if (!ok) done.add(`${network.id}:${t.id}`);
        })
      );
      if (!cancelled) setOnChainDoneIds(done);
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, validatedAddr, network, wagmiConfig, probeNonce]);

  // ── the badge ────────────────────────────────────────────────────────
  const badgeAddress = network ? SOULBOUND_ADDR[network.id] : undefined;
  const validatedBadge =
    badgeAddress && isAddress(badgeAddress)
      ? (badgeAddress as `0x${string}`)
      : undefined;

  const nikBase = network ? NIKBASE_CONTRACTS[network.id] : undefined;
  const validatedNikBase =
    nikBase && isAddress(nikBase) ? (nikBase as `0x${string}`) : undefined;

  const { data: badgeCounts } = useReadContract({
    address: validatedNikBase,
    abi: NIKBASE_ABI,
    functionName: "getActionCounts",
    args: validatedAddr ? [validatedAddr] : undefined,
    query: { enabled: !!validatedNikBase && !!validatedAddr, refetchInterval: 30_000 },
  });

  const { data: badgeTokenId } = useReadContract({
    address: validatedBadge,
    abi: SOULBOUND_ABI,
    functionName: "userTokenId",
    args: validatedAddr ? [validatedAddr] : undefined,
    query: { enabled: !!validatedBadge && !!validatedAddr },
  });
  const hasBadge = badgeTokenId !== undefined && badgeTokenId > 0;

  const { data: badgeData } = useReadContract({
    address: validatedBadge,
    abi: SOULBOUND_ABI,
    functionName: "tokenData",
    args: hasBadge && badgeTokenId ? [badgeTokenId] : undefined,
    query: { enabled: hasBadge && !!validatedBadge && !!badgeTokenId },
  });

  const badgeTier = badgeData ? Number(badgeData[0]) : 0;
  const badgeStreak = badgeData ? Number(badgeData[1]) : 0;

  const doneActions = Math.max(
    badgeCounts ? Number(badgeCounts[0]) : 0,
    onChainDoneIds.size
  );
  const badgeUnlocked = doneActions >= 3;

  const { writeContract: writeMint, isPending: mintPending } = useWriteContract();
  const { writeContract: writeUpgrade, isPending: upgradePending } = useWriteContract();

  const handleMint = useCallback(() => {
    if (!validatedBadge) return;
    writeMint({ address: validatedBadge, abi: SOULBOUND_ABI, functionName: "mint" });
  }, [validatedBadge, writeMint]);

  const handleUpgrade = useCallback(() => {
    if (!validatedBadge) return;
    writeUpgrade({ address: validatedBadge, abi: SOULBOUND_ABI, functionName: "upgrade" });
  }, [validatedBadge, writeUpgrade]);

  return (
    <div className="space-y-4">
      <NetworkStatusCard />
      <FiveInOne
        network={network}
        isConnected={isConnected}
        account={address}
        onConnect={() => openConnectModal?.()}
        doneTaskIds={onChainDoneIds}
        onFinished={() => setProbeNonce((n) => n + 1)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CounterSolo
          network={network}
          isConnected={isConnected}
          account={validatedAddr}
          onConnect={() => openConnectModal?.()}
        />

        <section
          className="rounded-[20px] p-5 sm:p-6 flex flex-col"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <header className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
            >
              <Award className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h3
                className="text-[16px] font-semibold"
                style={{ color: "var(--text-bright)" }}
              >
                Badge
              </h3>
              <p className="text-[14px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Yours for good, once the streak earns it.
              </p>
            </div>
          </header>

          <div className="mt-5">
            {hasBadge ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-[32px] font-bold leading-none tabular-nums"
                    style={{ color: "var(--text-bright)" }}
                  >
                    {badgeStreak}
                  </span>
                  <span className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
                    day streak
                  </span>
                </div>
                <p
                  className="mt-2 text-[14px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span className="mark">{tierLabel(badgeTier)}</span> tier, minted on{" "}
                  {network?.name ?? "this network"}.
                </p>
              </>
            ) : (
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {!isConnected
                  ? "Connect a wallet to unlock the soulbound badge."
                  : !validatedBadge
                    ? `No badge contract on ${network?.name ?? "this network"} yet.`
                    : badgeUnlocked
                      ? "All three missions are done. Mint it — you only pay gas."
                      : `Finish Check in, GM and GN to unlock the mint (${Math.min(doneActions, 3)}/3).`}
              </p>
            )}

            {!hasBadge && isConnected && validatedBadge ? (
              <div className="mt-4 progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(Math.min(doneActions, 3) / 3) * 100}%` }}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-auto pt-5">
            {!isConnected ? (
              <button onClick={() => openConnectModal?.()} className="btn-ghost">
                Connect wallet
              </button>
            ) : !validatedBadge ? null : hasBadge ? (
              <button onClick={handleUpgrade} disabled={upgradePending} className="btn-ghost">
                {upgradePending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {upgradePending ? "Upgrading" : "Upgrade tier"}
              </button>
            ) : (
              <button
                onClick={handleMint}
                disabled={!badgeUnlocked || mintPending}
                title={
                  badgeUnlocked
                    ? "Mint your soulbound badge (gas only)"
                    : "Complete all three missions first"
                }
                className="btn-primary"
              >
                {mintPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {mintPending ? "Minting" : "Mint badge"}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
