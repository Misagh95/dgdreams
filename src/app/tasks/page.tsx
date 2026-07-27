"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSwitchChain, useReadContract, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { isAddress } from "viem";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import DailyTaskPanel, { CONTRACTS } from "@/components/DailyTaskPanel";
import { mainnetNetworks, testnetNetworks, type NetworkConfig, getNetworkConfig } from "@/config/chains";
import { cn } from "@/utils/cn";
import { getNativeSymbol, shortenHash, getExplorerUrl } from "@/utils/transactions";
import { genLayerReadContract, isGenLayer } from "@/lib/genlayer/tasks";

const SOULBOUND_ADDR: Record<number, `0x${string}` | ""> = {
  8453: "", 999: "", 130: "", 4217: "", 4663: "", 1: "",
  11155111: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  84532: "0xC288b68022e752d97E4395ECbA61C2079CE692Ad",
  91342: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  4441: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  5042002: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  1913: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  57073: "",
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
  1: { label: "Bronze", icon: "🥉" },
  2: { label: "Silver", icon: "🥈" },
  3: { label: "Gold", icon: "🥇" },
  4: { label: "Diamond", icon: "💎" },
  5: { label: "Legend", icon: "🏆" },
};

function NetworkBlock({
  network,
  isConnected,
  chainId,
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
  actionCount: number;
  onStart: () => void;
  isSelected: boolean;
  isDisabled: boolean;
  isEnabled: boolean;
  onToggle: (id: number) => void;
}) {
  const contractAddr = CONTRACTS[network.id];
  const hasContract = !!contractAddr;
  const completed = actionCount >= 9;
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
          {completed ? "9/9 ✓" : `${actionCount}/9`}
        </span>
      </div>

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
  const [panelAutoStart, setPanelAutoStart] = useState(false);
  const [executingNetworkId, setExecutingNetworkId] = useState<number | null>(null);
  const [netFilter, setNetFilter] = useState<"all" | "selected">("all");
  const [enabledNetworks, setEnabledNetworks] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set<number>();
    try {
      const v = JSON.parse(localStorage.getItem("voidchain-enabled-nets") || "null");
      return v ? new Set(v) : new Set();
    } catch {
      return new Set();
    }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<
    { block: number; streak: number; date: string }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const validatedAddr =
    address && isAddress(address) ? (address as `0x${string}`) : undefined;

  const allNetworks = [...mainnetNetworks, ...testnetNetworks];

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

      if (chainId !== network.id) {
        try {
          await switchChainAsync({ chainId: network.id });
        } catch {
          return;
        }
      }

      setShowTaskPanel(true);
      setPanelAutoStart(true);
      setExecutingNetworkId(network.id);
    },
    [isConnected, chainId, switchChainAsync, openConnectModal]
  );

  const handleTaskComplete = useCallback(() => {
    refetchCounts();
    refetchUser();
    setExecutingNetworkId(null);
  }, [refetchCounts, refetchUser]);

  const handleClosePanel = useCallback(() => {
    setShowTaskPanel(false);
    setSelectedNetwork(null);
    setPanelAutoStart(false);
    setExecutingNetworkId(null);
  }, []);

  const handleToggleNetwork = useCallback((id: number) => {
    setEnabledNetworks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(
        "voidchain-enabled-nets",
        JSON.stringify([...next])
      );
      return next;
    });
  }, []);

  const knownProgress = selectedNetwork && onRightChain ? actionCount : 0;

  return (
    <DashboardLayout title="Daily Tasks" subtitle="// execute on-chain actions across 14 networks">
      <div className="space-y-6">
        {/* Security Notice */}
        <div
          className="px-4 py-2 rounded-lg text-xs flex items-center gap-2"
          style={{
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-tertiary)",
          }}
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span>
            Always verify the network and contract address before signing. Transactions are irreversible.
          </span>
        </div>

        {/* Network Filter Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNetFilter((n) => (n === "all" ? "selected" : "all"))}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
                netFilter === "all"
                  ? "border-[var(--accent)]"
                  : "border-[var(--border-strong)]"
              )}
              style={{
                ...(netFilter === "all"
                  ? { background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }
                  : { background: "var(--bg-strong)", color: "var(--text-secondary)" }),
              }}
            >
              {netFilter === "all" ? "All Networks" : "Selected Only"}
            </button>
            {enabledNetworks.size > 0 && (
              <button
                onClick={() => {
                  setEnabledNetworks(new Set());
                  localStorage.removeItem("voidchain-enabled-nets");
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200"
                style={{
                  background: "var(--bg-strong)",
                  color: "var(--text-quaternary)",
                  borderColor: "var(--border-strong)",
                }}
              >
                Clear
              </button>
            )}
            <button
              onClick={() => {
                const all = [...mainnetNetworks, ...testnetNetworks].map((n) => n.id);
                setEnabledNetworks(new Set(all));
                localStorage.setItem(
                  "voidchain-enabled-nets",
                  JSON.stringify(all)
                );
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200"
              style={{
                background: "var(--bg-strong)",
                color: "var(--text-quaternary)",
                borderColor: "var(--border-strong)",
              }}
            >
              Select All
            </button>
          </div>
          <span className="text-xs" style={{ color: "var(--text-quaternary)" }}>
            {enabledNetworks.size || "no"}/{allNetworks.length} selected
          </span>
        </div>

        {/* Mainnet */}
        <div>
          <h2
            className="text-sm font-semibold mb-4 uppercase tracking-wider"
            style={{ color: "var(--text-bright)" }}
          >
            Mainnet
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mainnetNetworks
              .filter((n) => netFilter === "all" || enabledNetworks.has(n.id))
              .map((net) => {
                const p =
                  selectedNetwork?.id === net.id && onRightChain
                    ? actionCount
                    : 0;
                return (
                  <NetworkBlock
                    key={net.id}
                    network={net}
                    isConnected={isConnected}
                    chainId={chainId}
                    actionCount={p}
                    onStart={() => handleOpenNetwork(net)}
                    isSelected={selectedNetwork?.id === net.id}
                    isDisabled={
                      executingNetworkId !== null &&
                      executingNetworkId !== net.id
                    }
                    isEnabled={enabledNetworks.has(net.id)}
                    onToggle={handleToggleNetwork}
                  />
                );
              })}
          </div>
        </div>

        {/* Testnet */}
        <div>
          <h2
            className="text-sm font-semibold mb-4 uppercase tracking-wider"
            style={{ color: "var(--accent)" }}
          >
            Testnet
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {testnetNetworks
              .filter((n) => netFilter === "all" || enabledNetworks.has(n.id))
              .map((net) => {
                const p =
                  selectedNetwork?.id === net.id && onRightChain
                    ? actionCount
                    : 0;
                return (
                  <NetworkBlock
                    key={net.id}
                    network={net}
                    isConnected={isConnected}
                    chainId={chainId}
                    actionCount={p}
                    onStart={() => handleOpenNetwork(net)}
                    isSelected={selectedNetwork?.id === net.id}
                    isDisabled={
                      executingNetworkId !== null &&
                      executingNetworkId !== net.id
                    }
                    isEnabled={enabledNetworks.has(net.id)}
                    onToggle={handleToggleNetwork}
                  />
                );
              })}
          </div>
        </div>

        {/* Side Panel - selected network details */}
        {selectedNetwork && (
          <div
            className="p-5 rounded-xl sticky top-8"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                style={{
                  background: `color-mix(in srgb, ${selectedNetwork.color} 20%, transparent)`,
                }}
              >
                <Image src={selectedNetwork.logo} alt={selectedNetwork.name} width={22} height={22}
                  style={{ objectFit: "contain" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-bright)" }}>
                  {selectedNetwork.name}
                </h3>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {streak > 0 ? `Streak: ${streak}` : "No streak"}
                </p>
              </div>
            </div>

            {streak >= 7 && validatedNft && (
              <div
                className="mb-4 p-3 rounded-lg"
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {hasNft ? TIER_INFO[nftTier]?.icon : "🎫"}
                  </span>
                  <div className="text-xs">
                    {hasNft ? (
                      <p style={{ color: "var(--text-secondary)" }}>
                        {TIER_INFO[nftTier]?.label} &middot; {nftStreak}d
                      </p>
                    ) : (
                      <p style={{ color: "var(--text-secondary)" }}>
                        Mint available
                      </p>
                    )}
                  </div>
                </div>
                {!hasNft && streak >= 7 && (
                  <button
                    onClick={handleMint}
                    disabled={mintPending}
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-40"
                    style={{
                      background: "var(--bg-strong)",
                      color: "var(--text-bright)",
                    }}
                  >
                    {mintPending ? "Minting..." : "Mint NFT"}
                  </button>
                )}
                {hasNft && streak > nftStreak && (
                  <button
                    onClick={handleUpgrade}
                    disabled={upgradePending}
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-40"
                    style={{
                      background: "var(--bg-strong)",
                      color: "var(--text-bright)",
                    }}
                  >
                    {upgradePending ? "Upgrading..." : "Upgrade"}
                  </button>
                )}
              </div>
            )}

            <div
              className="text-xs space-y-1.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              <div className="flex justify-between">
                <span>Daily progress</span>
                <span className="font-medium" style={{ color: "var(--text-bright)" }}>
                  {actionCount}/9
                </span>
              </div>
              {onRightChain && validatedContract && (
                <div className="flex justify-between">
                  <span>Contract</span>
                  <a
                    href={getExplorerUrl(selectedNetwork, validatedContract, "address")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 transition-colors"
                    style={{ color: "var(--text-quaternary)" }}
                  >
                    <svg
                      className="w-3 h-3"
                      style={{ color: "var(--success)" }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                      />
                    </svg>
                    <span className="font-mono" style={{ color: "var(--text-secondary)" }}>
                      {shortenHash(validatedContract)}
                    </span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Panel Modal */}
      {showTaskPanel && selectedNetwork && validatedAddr && validatedContract && (
        <DailyTaskPanel
          network={selectedNetwork}
          address={validatedAddr}
          contractAddress={validatedContract}
          onClose={handleClosePanel}
          onComplete={handleTaskComplete}
          autoStart={panelAutoStart}
        />
      )}
    </DashboardLayout>
  );
}
