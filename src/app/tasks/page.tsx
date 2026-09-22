"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSwitchChain, useReadContract, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { isAddress } from "viem";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import DailyTaskPanel, { CONTRACTS } from "@/components/DailyTaskPanel";
import { NetworkCube } from "@/components/NetworkCube";
import { TaskCard3D, DAILY_MISSIONS } from "@/components/TaskCard3D";
import DailyMissionDeck from "@/components/DailyMissionDeck";
import { mainnetNetworks, testnetNetworks, type NetworkConfig, getNetworkConfig } from "@/config/chains";
import { cn } from "@/utils/cn";
import { getNativeSymbol, shortenHash, getExplorerUrl } from "@/utils/transactions";
import { genLayerReadContract, isGenLayer } from "@/lib/genlayer/tasks";
import { useOptimisticTasks } from "@/hooks/useOptimisticTasks";

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
  1: { label: "Bronze", icon: "ðŸ¥‰" },
  2: { label: "Silver", icon: "ðŸ¥ˆ" },
  3: { label: "Gold", icon: "ðŸ¥‡" },
  4: { label: "Diamond", icon: "ðŸ’Ž" },
  5: { label: "Legend", icon: "ðŸ†" },
};

function NetworkBlock({
  network,
  isConnected,
  chainId,
  connectedChain,
  actionCount,
  onStart,
  isSelected,
  isDisabled,
  isEnabled,
  onToggle,
}: {
  network: NetworkConfig;
  isConnected: boolean;
  chainId?: number;
  connectedChain?: NetworkConfig;
  actionCount: number;
  onStart: () => void;
  isSelected: boolean;
  isDisabled: boolean;
  isEnabled: boolean;
  onToggle: (id: number) => void;
}) {
  const contractAddr = CONTRACTS[network.id];
  const hasContract = !!contractAddr;
  const completed = actionCount >= 3;
  const canInteract = hasContract && !completed && !isDisabled && isEnabled;

  return (
    <div
      onClick={canInteract ? onStart : undefined}
      className={cn(
        "p-5 rounded-xl transition-all duration-200 relative",
        isSelected
          ? "ring-1"
          : "hover:opacity-80",
        !isEnabled ? "opacity-40" : "",
        canInteract ? "cursor-pointer" : ""
      )}
      style={{
        background: "var(--bg-card)",
        border: isSelected
          ? `1px solid var(--accent)`
          : `1px solid var(--border-default)`,
        ...(isSelected ? { boxShadow: `0 0 12px color-mix(in srgb, var(--accent) 20%, transparent)` } : {}),
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(network.id);
        }}
        className={cn(
          "absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200",
          isEnabled
            ? "border-transparent"
            : "border-[var(--border-strong)]"
        )}
        style={isEnabled ? { background: "var(--accent)" } : { background: "transparent" }}
      >
        {isEnabled && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
          style={{ background: `color-mix(in srgb, ${network.color} 20%, transparent)` }}
        >
          <Image src={network.logo} alt={network.name} width={22} height={22}
            style={{ objectFit: "contain" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-bright)" }}>
            {network.name}
          </h3>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {getNativeSymbol(network)}
          </p>
        </div>
        <span
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-medium",
            completed
              ? "bg-green/10"
              : "bg-subtle"
          )}
          style={{
            ...(completed
              ? { background: "color-mix(in srgb, var(--success) 10%, transparent)", color: "var(--success)" }
              : { background: "var(--bg-subtle)", color: "var(--text-secondary)" }),
          }}
        >
          {completed ? "3/3 âœ“" : `${actionCount}/3`}
        </span>
      </div>

      {isConnected && connectedChain && (
        <p className="text-[10px] mt-1 truncate" style={{ color: "var(--text-quaternary)" }}>
          Wallet: {connectedChain.name} (Chain #{connectedChain.id})
        </p>
      )}

      {!isConnected ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          className="w-full py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            background: "var(--bg-strong)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-bright)",
          }}
        >
          Start Daily Tasks
        </button>
      ) : !hasContract ? (
        <p className="text-xs" style={{ color: "var(--text-quaternary)" }}>
          Not deployed
        </p>
      ) : completed ? (
        <p className="text-xs" style={{ color: "var(--success)" }}>
          Completed today
        </p>
      ) : !isEnabled ? (
        <p className="text-xs" style={{ color: "var(--text-quaternary)" }}>
          Disabled - toggle to enable
        </p>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          disabled={isDisabled}
          className={cn(
            "w-full py-2 rounded-lg text-sm font-medium transition-all duration-200",
            isDisabled ? "opacity-40 cursor-not-allowed" : ""
          )}
          style={{
            background: "var(--bg-strong)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-bright)",
          }}
        >
          Start Daily Tasks
        </button>
      )}
    </div>
  );
}

export default function TasksPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [panelAutoStart, setPanelAutoStart] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [executingNetworkId, setExecutingNetworkId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<
    { block: number; streak: number; date: string }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const optimistic = useOptimisticTasks();

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
      refetchInterval: 10_000,
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

  const [genActionCount, setGenActionCount] = useState(0);
  const [genStreak, setGenStreak] = useState(0);
  const [genTotalActions, setGenTotalActions] = useState(0);

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

  const nftAddress = selectedNetwork
    ? (SOULBOUND_ADDR[selectedNetwork.id] || undefined)
    : undefined;
  const validatedNft =
    nftAddress && isAddress(nftAddress)
      ? (nftAddress as `0x${string}`)
      : undefined;

  const { data: nftTokenId } = useReadContract({
    address: validatedNft,
    abi: SOULBOUND_ABI,
    functionName: "userTokenId",
    args: validatedAddr ? [validatedAddr] : undefined,
    query: { enabled: !!validatedNft && !!validatedAddr && onRightChain },
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
    setExecutingNetworkId(selectedNetwork.id);
  }, [selectedNetwork, chainId, switchChainAsync]);

  const handleTaskComplete = useCallback(() => {
    refetchCounts();
    refetchUser();
    setExecutingNetworkId(null);
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
    setExecutingNetworkId(null);
    setSelectedMissionId(null);
  }, []);

  const knownProgress = selectedNetwork && onRightChain ? actionCount : 0;

  // Hero values — follow the wallet's currently connected network
  const connectedNetwork = chainId ? getNetworkConfig(chainId) : undefined;
  const heroNetwork = selectedNetwork ?? connectedNetwork ?? mainnetNetworks[0];
  const heroLogo = heroNetwork.logo;
  const heroColor = heroNetwork.color;
  const heroName = heroNetwork.name;
  const heroActionCount = (selectedNetwork ?? connectedNetwork) && onRightChain ? actionCount : 0;

  // Clicking a mission card → open preview for the wallet's current network
  // and remember which single task the user wants to run
  const handleMissionClick = useCallback(
    (missionId: string) => {
      if (!isConnected) {
        openConnectModal?.();
        return;
      }
      const net = chainId ? getNetworkConfig(chainId) : undefined;
      if (!net) return;
      setSelectedMissionId(missionId);
      handleOpenNetwork(net);
    },
    [isConnected, chainId, openConnectModal, handleOpenNetwork]
  );


  return (
    <DashboardLayout title="Daily Tasks" subtitle="// your daily on-chain ritual">
      <div className="flex flex-col items-center gap-4 mb-6">
        <NetworkCube
          logo={heroNetwork.logo}
          color={heroNetwork.color}
          name={heroNetwork.name}
        />
        <div className="text-[11px] font-mono" style={{ color: "var(--text-quaternary)" }}>
          {connectedNetwork && isConnected
            ? `Connected: ${heroNetwork.name} (Chain #${chainId})`
            : "Wallet disconnected"}
        </div>
      </div>
      <DailyMissionDeck
        network={connectedNetwork}
        chainId={chainId}
        isConnected={isConnected}
        loading={isConnected && countsData === undefined && !isGen}
        completedCount={optimistic.optimisticActionCount(heroActionCount)}
        completedTaskIds={optimistic.getOptimisticCompletedIds(new Set())}
        onConnect={() => openConnectModal?.()}
        onMission={handleMissionClick}
        contextText={`Execute GM, CHECK and GN on ${heroName} — one transaction each, once per day.`}
        notice={deckNotice}
      />

      {/* Preview Modal â€” network selection before executing */}
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
          onComplete={handleTaskComplete}
          autoStart={panelAutoStart}
        />
      )}
    </DashboardLayout>
  );
}

