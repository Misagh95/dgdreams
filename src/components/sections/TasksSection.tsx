"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSwitchChain, useReadContract, useWriteContract, useConfig } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { isAddress } from "viem";
import Image from "next/image";
import { Award, Loader2, Sparkles, Zap } from "lucide-react";

import DailyTaskPanel, { CONTRACTS, canStillRunTask } from "@/components/DailyTaskPanel";
import FiveInOne from "@/components/FiveInOne";
import { NIKBASE_CONTRACTS, type NetworkConfig, getNetworkConfig } from "@/config/chains";
import { getNativeSymbol, shortenHash, getExplorerUrl } from "@/utils/transactions";
import { genLayerReadContract, isGenLayer } from "@/lib/genlayer/tasks";
import { useOptimisticTasks } from "@/hooks/useOptimisticTasks";
import { useUtcDay } from "@/hooks/useUtcDay";
import { useWalletStreak } from "@/hooks/useWalletStreak";

const SOULBOUND_ADDR: Record<number, `0x${string}` | ""> = {
  8453: "", 999: "", 130: "", 4217: "", 4663: "", 1: "",
  11155111: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  84532: "0xC288b68022e752d97E4395ECbA61C2079CE692Ad",
  91342: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  4441: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  5042002: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  1913: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
   57073: "",
   5042: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
// SoulboundStreak ? verified; wired to this chain's NikBase (0x94e067F6?)
  204: "0x92783e87c0F00c3B58597efee4F2743395e526af",
// SoulboundStreak ? verified; wired to this chain's NikBase (0x4AE47749?)
  56: "0x7Ac043C44b4BCEac7ccd8FdD5906b2EF8B93ee05",
  421614: "0x344ad6a0d3aeb4baa8d853c932fbebeb4e798e3b",
  42161: "0x344ad6a0d3aeb4baa8d853c932fbebeb4e798e3b",
  10: "0x344ad6a0d3aeb4baa8d853c932fbebeb4e798e3b",
};

const SOULBOUND_ABI = [
  { inputs: [], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "upgrade", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "", type: "address" }], name: "userTokenId", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "uint256" }], name: "tokenData", outputs: [{ name: "tier", type: "uint8" }, { name: "streak", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const NIKBASE_ABI = [
  { inputs: [{ name: "user", type: "address" }], name: "getActionCounts", outputs: [
    { name: "actCount", type: "uint256" }, { name: "dose", type: "uint256" },
    { name: "mood", type: "uint256" }, { name: "sanitize", type: "uint256" },
    { name: "counter", type: "uint256" }, { name: "spin", type: "uint256" },
  ], stateMutability: "view", type: "function" },
  { inputs: [{ name: "user", type: "address" }], name: "getUserData", outputs: [
    { name: "strk", type: "uint256" }, { name: "totalCI", type: "uint256" },
    { name: "totalAct", type: "uint256" },
  ], stateMutability: "view", type: "function" },
] as const;

const TIER_INFO: Record<number, { label: string; icon: string }> = {
  1: { label: "Bronze", icon: "??" },
  2: { label: "Silver", icon: "??" },
  3: { label: "Gold", icon: "??" },
  4: { label: "Diamond", icon: "??" },
  5: { label: "Legend", icon: "??" },
};

export function TasksSection() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [panelAutoStart, setPanelAutoStart] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<
    { block: number; streak: number; date: string }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const optimistic = useOptimisticTasks();
  const wagmiConfig = useConfig();

  // Which of today's tasks are already recorded on-chain. The NikBase contract
  // accepts each action once per UTC day; probing with eth_call (same call the
  // wallet simulates) lets the cards show "done today" instead of letting the
  // user hit "Simulation Failed (execution revert)".
  const [onChainDoneIds, setOnChainDoneIds] = useState<Set<string>>(new Set());
  const [probeNonce, setProbeNonce] = useState(0);
  // When the last probe finished, so DailyTaskPanel can skip its own redundant
  // pre-flight eth_call while the answer is still fresh.
  const [probeAt, setProbeAt] = useState(0);

  // Deep links from the dashboard mission cards: /tasks?mission=gm|checkIn|gn
  const [pendingMission, setPendingMission] = useState<"gm" | "checkIn" | "gn" | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mission = new URLSearchParams(window.location.search).get("mission");
    if (mission === "gm" || mission === "checkIn" || mission === "gn") {
      setPendingMission(mission);
    }
  }, []);

  const validatedAddr =
    address && isAddress(address) ? (address as `0x${string}`) : undefined;

  const targetContract = selectedNetwork
    ? (CONTRACTS[selectedNetwork.id] || undefined)
    : undefined;
  const validatedContract =
    targetContract && isAddress(targetContract)
      ? (targetContract as `0x${string}`)
      : undefined;
  const onRightChain = selectedNetwork ? chainId === selectedNetwork.id : false;

  const isGen = selectedNetwork && isGenLayer(selectedNetwork.id);

  const { data: countsData, refetch: refetchCounts } = useReadContract({
    address: isGen ? undefined : validatedContract,
    abi: NIKBASE_ABI,
    functionName: "getActionCounts",
    args: validatedAddr ? [validatedAddr] : undefined,
    query: {
      enabled: !!validatedContract && !!validatedAddr && onRightChain && !isGen,
      refetchInterval: 30_000,
    },
  });

  const { data: userData, refetch: refetchUser } = useReadContract({
    address: isGen ? undefined : validatedContract,
    abi: NIKBASE_ABI,
    functionName: "getUserData",
    args: validatedAddr ? [validatedAddr] : undefined,
    query: {
      enabled: !!validatedContract && !!validatedAddr && onRightChain && !isGen,
    },
  });

  // The contracts roll over at 00:00 UTC. Every cached "already done today"
  // flag is stale the moment that passes, so drop the whole per-day state and
  // re-probe ? otherwise an open tab would keep locking the user out until a
  // hard refresh. `countdown` drives the "new day in ?" label below.
  const { countdown } = useUtcDay(
    useCallback(() => {
      setOnChainDoneIds(new Set());
      setProbeAt(0);
      optimistic.resetAll();
      setHistoryEvents([]);
      setProbeNonce((n) => n + 1);
      refetchCounts();
      refetchUser();
    }, [optimistic, refetchCounts, refetchUser])
  );

  const [genActionCount, setGenActionCount] = useState(0);
  const [genStreak, setGenStreak] = useState(0);
  const [genTotalActions, setGenTotalActions] = useState(0);

  // Register this wallet's streak as its single record. The wallet signs in once
  // (no gas, token cached) and the server reads the real value off NikBase, so
  // the streak is recorded *by the wallet*, not claimed by it. Verifying from
  // another network rewrites the same record instead of adding a second one.
  const { streak: walletStreak, syncing: streakSyncing, sync: syncStreak } =
    useWalletStreak(validatedAddr);

  // Re-verify the recorded streak whenever the missions change, so what is
  // stored matches the chain rather than trailing it.
  useEffect(() => {
    if (!isConnected || !validatedAddr || !onRightChain || !selectedNetwork) return;
    void syncStreak(selectedNetwork.id);
  }, [isConnected, validatedAddr, onRightChain, selectedNetwork, onChainDoneIds, syncStreak]);

  useEffect(() => {
    if (isGen && validatedAddr && onRightChain) {
      genLayerReadContract("getActionCounts", [validatedAddr]).then((raw) => {
        try { const a = JSON.parse(raw); setGenActionCount(Number(a[0])); } catch {}
      });
      genLayerReadContract("getUserData", [validatedAddr]).then((raw) => {
        try { const a = JSON.parse(raw); setGenStreak(Number(a[0])); setGenTotalActions(Number(a[2])); } catch {}
      });
      const interval = setInterval(() => {
        genLayerReadContract("getActionCounts", [validatedAddr]).then((raw) => {
          try { const a = JSON.parse(raw); setGenActionCount(Number(a[0])); } catch {}
        });
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isGen, validatedAddr, onRightChain]);

  const actionCount = isGen ? genActionCount : (countsData ? Number(countsData[0]) : 0);
  const streak = isGen ? genStreak : (userData ? Number(userData[0]) : 0);
  const totalActions = isGen ? genTotalActions : (userData ? Number(userData[2]) : 0);

  // -- Soulbound badge ------------------------------------------------
  // Lives on the wallet's current network; minting costs network gas only.
  const nftNetwork = chainId ? getNetworkConfig(chainId) : selectedNetwork;
  const nftAddress = nftNetwork
    ? (SOULBOUND_ADDR[nftNetwork.id] || undefined)
    : undefined;
  const validatedNft =
    nftAddress && isAddress(nftAddress)
      ? (nftAddress as `0x${string}`)
      : undefined;

  // Daily-mission completion on that same network (0..3) ? unlocks the mint
  const nftNikBaseRaw = nftNetwork ? NIKBASE_CONTRACTS[nftNetwork.id] : undefined;
  const nftNikBase =
    nftNikBaseRaw && isAddress(nftNikBaseRaw)
      ? (nftNikBaseRaw as `0x${string}`)
      : undefined;
  const { data: nftCounts } = useReadContract({
    address: nftNikBase,
    abi: NIKBASE_ABI,
    functionName: "getActionCounts",
    args: validatedAddr ? [validatedAddr] : undefined,
    query: { enabled: !!nftNikBase && !!validatedAddr, refetchInterval: 30_000 },
  });
  const nftActionsDone = Math.max(
    nftCounts ? Number(nftCounts[0]) : 0,
    onChainDoneIds.size,
    optimistic.optimisticActionCount(0)
  );
  const nftUnlocked = nftActionsDone >= 3;

  const { data: nftTokenId } = useReadContract({
    address: validatedNft,
    abi: SOULBOUND_ABI,
    functionName: "userTokenId",
    args: validatedAddr ? [validatedAddr] : undefined,
    query: { enabled: !!validatedNft && !!validatedAddr },
  });
  const hasNft = nftTokenId !== undefined && nftTokenId > 0;

  const { data: nftData } = useReadContract({
    address: validatedNft,
    abi: SOULBOUND_ABI,
    functionName: "tokenData",
    args: hasNft && nftTokenId ? [nftTokenId] : undefined,
    query: { enabled: hasNft && !!validatedNft && !!nftTokenId },
  });

  const nftTier = nftData ? Number(nftData[0]) : 0;
  const nftStreak = nftData ? Number(nftData[1]) : 0;

  const { writeContract: writeMint, isPending: mintPending } = useWriteContract();
  const { writeContract: writeUpgrade, isPending: upgradePending } = useWriteContract();

  const handleMint = useCallback(() => {
    if (!validatedNft || !validatedAddr) return;
    writeMint({
      address: validatedNft,
      abi: SOULBOUND_ABI,
      functionName: "mint",
    });
  }, [validatedNft, validatedAddr, writeMint]);

  const handleUpgrade = useCallback(() => {
    if (!validatedNft || !validatedAddr) return;
    writeUpgrade({
      address: validatedNft,
      abi: SOULBOUND_ABI,
      functionName: "upgrade",
    });
  }, [validatedNft, validatedAddr, writeUpgrade]);

  const handleOpenNetwork = useCallback(
    async (network: NetworkConfig) => {
      if (!isConnected) {
        openConnectModal?.();
        return;
      }

      setSelectedNetwork(network);
      setShowPreview(true);
      optimistic.resetAll();
    },
    [isConnected, openConnectModal, optimistic]
  );

  // Deep-linked mission: open the preview as soon as a supported chain is active
  useEffect(() => {
    if (!pendingMission) return;
    const net = chainId ? getNetworkConfig(chainId) : undefined;
    if (!isConnected || !net) return;
    setSelectedMissionId(pendingMission);
    setPendingMission(null);
    handleOpenNetwork(net);
  }, [pendingMission, isConnected, chainId, handleOpenNetwork]);

  const unsupportedChainId =
    isConnected && chainId && !getNetworkConfig(chainId) ? chainId : undefined;
  const deckNotice = unsupportedChainId
    ? `Your wallet is on Chain #${unsupportedChainId}, which isn't supported yet. Switch to one of the 15 supported networks in your wallet, then press the mission button again.`
    : undefined;

  const handleStartExecution = useCallback(async () => {
    if (!selectedNetwork) return;
    setShowPreview(false);
    if (chainId !== selectedNetwork.id) {
      try {
        await switchChainAsync({ chainId: selectedNetwork.id });
      } catch {
        return;
      }
    }
    setShowTaskPanel(true);
    setPanelAutoStart(true);
  }, [selectedNetwork, chainId, switchChainAsync]);

  const handleTaskComplete = useCallback(() => {
    refetchCounts();
    refetchUser();
    setProbeNonce((n) => n + 1); // re-probe which actions are done today
  }, [refetchCounts, refetchUser]);

  const handleSingleTaskComplete = useCallback(
    (taskId: string) => {
      optimistic.markTaskConfirmed(taskId as "checkIn" | "gm" | "gn");
    },
    [optimistic]
  );

  const handleSingleTaskStart = useCallback(
    (taskId: string) => {
      optimistic.markTaskPending(taskId as "checkIn" | "gm" | "gn");
    },
    [optimistic]
  );

  const handleSingleTaskFailed = useCallback(
    (taskId: string) => {
      optimistic.markTaskFailed(taskId as "checkIn" | "gm" | "gn");
    },
    [optimistic]
  );

  const handleClosePanel = useCallback(() => {
    setShowTaskPanel(false);
    setShowPreview(false);
    setSelectedNetwork(null);
    setPanelAutoStart(false);
    setSelectedMissionId(null);
  }, []);

  const knownProgress = selectedNetwork && onRightChain ? actionCount : 0;

  // Hero values ? follow the wallet's currently connected network
  const connectedNetwork = chainId ? getNetworkConfig(chainId) : undefined;

  // Probe the active chain for the three actions: a reverted eth_call means
  // "already done today" (UTC). Cheap, batched, and never blocks the UI.
  useEffect(() => {
    let cancelled = false;
    const contract = connectedNetwork ? CONTRACTS[connectedNetwork.id] : undefined;
    const pub = connectedNetwork
      ? getPublicClient(wagmiConfig, { chainId: connectedNetwork.id })
      : undefined;
    if (
      !isConnected ||
      !validatedAddr ||
      !connectedNetwork ||
      !contract ||
      isGenLayer(connectedNetwork.id) ||
      !pub
    ) {
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
          if (!ok) done.add(t.id);
        })
      );
      if (!cancelled) {
        setOnChainDoneIds(done);
        setProbeAt(Date.now());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, validatedAddr, connectedNetwork, wagmiConfig, probeNonce]);
  return (
    <>
      <FiveInOne
        network={connectedNetwork}
        isConnected={isConnected && !isGen}
        account={address}
        onConnect={() => openConnectModal?.()}
        doneTaskIds={onChainDoneIds}
        onFinished={() => setProbeNonce((n) => n + 1)}
      />

      {/* --- SOULBOUND BADGE ? mint after finishing all 3 daily missions --- */}
      <div
        className="mt-6 rounded-2xl p-5 sm:p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
              }}
            >
              <Award className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-bright)" }}>
                Soulbound streak badge
                {hasNft && (
                  <span
                    className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-md align-middle"
                    style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" }}
                  >
                    {TIER_INFO[nftTier]?.label ?? "Minted"} ? {nftStreak}d
                  </span>
                )}
              </h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                {!isConnected
                  ? "Connect your wallet to unlock your soulbound badge."
                  : !validatedNft
                  ? `Soulbound badges aren't deployed on ${nftNetwork?.name ?? "this network"} yet ? mint on Base, Ethereum, ARC or GIWA in the meantime.`
                  : hasNft
                  ? `Badge minted on ${nftNetwork?.name}. Keep the streak alive and upgrade to the next tier.`
                  : nftUnlocked
                  ? `All 3 daily missions done on ${nftNetwork?.name}. Mint your badge now ? you only pay network gas.`
                  : `Finish GM + Check + GN on this network to unlock the mint (${Math.min(nftActionsDone, 3)}/3).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected && validatedNft && !hasNft && (
              <button
                onClick={handleMint}
                disabled={!nftUnlocked || mintPending}
                title={nftUnlocked ? "Mint your soulbound badge (gas only)" : "Complete all 3 daily missions first"}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:brightness-110 focus:outline-none focus-visible:ring-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                {mintPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {mintPending ? "Minting?" : "Mint NFT"}
              </button>
            )}
            {isConnected && validatedNft && hasNft && (
              <button
                onClick={handleUpgrade}
                disabled={upgradePending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-85 focus:outline-none focus-visible:ring-2 disabled:opacity-40"
                style={{ background: "var(--bg-strong)", color: "var(--text-bright)", border: "1px solid var(--border-strong)" }}
              >
                {upgradePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {upgradePending ? "Upgrading?" : "Upgrade tier"}
              </button>
            )}
            {!isConnected && (
              <button
                onClick={() => openConnectModal?.()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:brightness-110"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                Connect wallet
              </button>
            )}
          </div>
        </div>

        {isConnected && validatedNft && !hasNft && (
          <div className="mt-4">
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(Math.min(nftActionsDone, 3) / 3) * 100}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--success))",
                }}
              />
            </div>
            <p className="text-[10px] font-mono mt-2" style={{ color: "var(--text-quaternary)" }}>
              {Math.min(nftActionsDone, 3)}/3 daily missions ? gas-only mint, no fee
            </p>
          </div>
        )}
      </div>

      {/* Preview Modal — network selection before executing */}
      {showPreview && selectedNetwork && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowPreview(false)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
                style={{ background: `color-mix(in srgb, ${selectedNetwork.color} 20%, transparent)` }}
              >
                <Image src={selectedNetwork.logo} alt={selectedNetwork.name} width={26} height={26}
                  style={{ objectFit: "contain" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-bright)" }}>
                  {selectedNetwork.name}
                </h3>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {CONTRACTS[selectedNetwork.id] ? "NikBase contract ready" : "Not deployed"}
                </p>
              </div>
            </div>

            <div className="rounded-lg p-3 mb-4 text-xs space-y-1.5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex justify-between" style={{ color: "var(--text-tertiary)" }}>
                <span>Transaction</span>
                <span style={{ color: "var(--text-bright)" }}>
                  {selectedMissionId
                    ? ({ gm: "GM (+25 pts)", checkIn: "Daily Check (+15 pts)", gn: "GN (+25 pts)" } as Record<string, string>)[selectedMissionId] || selectedMissionId
                    : "3 tasks"}
                </span>
              </div>
              <div className="flex justify-between" style={{ color: "var(--text-tertiary)" }}>
                <span>Frequency</span>
                <span style={{ color: "var(--text-bright)" }}>Once per UTC day</span>
              </div>
              <div className="flex justify-between" style={{ color: "var(--text-tertiary)" }}>
                <span>Next day</span>
                <span style={{ color: "var(--accent)" }}>{countdown}</span>
              </div>
              <div className="flex justify-between" style={{ color: "var(--text-tertiary)" }}>
                <span>Recorded streak</span>
                <span style={{ color: walletStreak ? "var(--success)" : "var(--text-bright)" }}>
                  {streakSyncing
                    ? "verifying?"
                    : walletStreak
                      ? `${walletStreak.streak}d on ${walletStreak.chainName}`
                      : "?"}
                </span>
              </div>
              {walletStreak && (
                <p className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
                  One record per wallet, read from NikBase. Signed in once ? no
                  re-signing on another network.
                </p>
              )}
            </div>

            {!CONTRACTS[selectedNetwork.id] ? (
              <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>
                No contract deployed on this network yet.
              </p>
            ) : (
              <p className="text-xs mb-3" style={{ color: "var(--text-quaternary)" }}>
                You&apos;ll sign each transaction in your wallet after switching to this network.
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{ background: "var(--bg-strong)", border: "1px solid var(--border-strong)", color: "var(--text-bright)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleStartExecution}
                disabled={!CONTRACTS[selectedNetwork.id]}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                Start Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Panel Modal */}
      {showTaskPanel && selectedNetwork && validatedAddr && validatedContract && (
        <DailyTaskPanel
          network={selectedNetwork}
          address={validatedAddr}
          contractAddress={validatedContract}
          onClose={handleClosePanel}
          onTaskComplete={handleSingleTaskComplete}
          onTaskStart={handleSingleTaskStart}
          onTaskFailed={handleSingleTaskFailed}
          only={(selectedMissionId as "gm" | "checkIn" | "gn" | undefined) ?? undefined}
          knownDoneIds={onChainDoneIds}
          probeAt={probeAt || undefined}
          onComplete={handleTaskComplete}
          autoStart={panelAutoStart}
        />
      )}
    </>
  );
}

