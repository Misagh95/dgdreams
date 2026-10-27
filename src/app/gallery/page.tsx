"use client";

import { useCallback, useEffect, useState } from "react";
import { m } from "framer-motion";
import { Compass, Lock, X } from "lucide-react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import DashboardLayout from "@/components/DashboardLayout";
import { mainnetNetworks, testnetNetworks, type NetworkConfig } from "@/config/chains";
import { BADGE_ABI, badgeAddress, badgeImage } from "@/lib/badge";
import { GENLAYER_BADGE_CONTRACT, genBadgeMint, genBadgeMintCount, genBadgeUserTokenId } from "@/lib/genlayer/badge";
import { waitForGenLayerTx } from "@/lib/genlayer/tasks";

/**
 * The Grand Tour — free, soulbound badges on every network.
 *
 * Twenty-four networks, unlimited badges. Each one is mintable by anyone, for
 * gas only, as many times as they like, and it can never leave that wallet.
 * The card grid mirrors the network pickers: same logos, same colors, so the
 * collection reads as "the tour", not as a foreign NFT page.
 */

const NETWORKS = [...mainnetNetworks, ...testnetNetworks];

// ERC-721 `Transfer(address,address,uint256)` — a mint is the log where `from`
// is the zero address, and its last topic is the token id (the edition number).
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function mintedTokenId(
  logs: readonly { address: string; topics: readonly string[] }[],
  contract: string
): number | undefined {
  const target = contract.toLowerCase();
  for (const log of logs) {
    if (log.address.toLowerCase() !== target) continue;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    if (log.topics.length < 4) continue;
    if (!/^0x0{64}$/.test(log.topics[1] ?? "")) continue; // not a mint
    try {
      return Number(BigInt(log.topics[3]));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

interface BadgeCardProps {
  network: NetworkConfig;
  address: `0x${string}` | undefined;
  onState: (chainId: number, minted: boolean) => void;
  onMinted: (network: NetworkConfig, tokenId: number) => void;
}

/**
 * The after-mint popup: the badge artwork at full size with the edition number
 * stamped on it, so the moment an unlimited mint lands has something to show
 * for it beyond a card flipping to "Collected".
 */
function MintedModal({
  network,
  tokenId,
  onClose,
}: {
  network: NetworkConfig;
  tokenId: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(4, 7, 14, 0.78)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-label={`Minted ${network.shortName} badge #${tokenId}`}
      onClick={onClose}
    >
      <m.div
        initial={{ opacity: 0, y: 16, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="relative w-full max-w-[380px] rounded-[24px] p-6 flex flex-col items-center gap-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: "var(--bg-strong)", color: "var(--text-secondary)" }}
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <p className="kicker" style={{ color: "var(--accent-text)" }}>
          Minted
        </p>

        {/* the badge artwork, with the freshly minted edition stamped on it */}
        <div
          className="relative rounded-[20px] flex items-center justify-center w-full"
          style={{ background: "var(--bg-strong)", aspectRatio: "1 / 1" }}
        >
          <img
            src={badgeImage(network)}
            alt={`${network.shortName} badge`}
            className="w-full h-full object-contain p-4"
            draggable={false}
          />
          <span
            className="absolute bottom-3 right-3 text-[14px] font-bold px-3 py-1 rounded-full tabular-nums"
            style={{ background: "#0A0E1A", color: "#FFFFFF", border: `1px solid ${network.color || "var(--border-default)"}` }}
          >
            #{tokenId}
          </span>
        </div>

        <div className="text-center">
          <p className="text-[16px] font-semibold" style={{ color: "var(--text-bright)" }}>
            DGDreams {network.shortName} Badge
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Edition #{tokenId} · {network.name}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-[13px] font-semibold py-2.5 rounded-full transition-opacity hover:opacity-85"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
        >
          Nice — keep going
        </button>
      </m.div>
    </m.div>
  );
}

function GenLayerBadgeCard({ network, address, onState, onMinted }: BadgeCardProps) {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const hasContract = GENLAYER_BADGE_CONTRACT.length > 0;

  const [count, setCount] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAny = count > 0;

  const refresh = useCallback(async () => {
    if (!address || !hasContract) return;
    try {
      const v = await genBadgeMintCount(address);
      setCount(v);
      onState(network.id, v > 0);
    } catch (e) {
      setError(String(e).split("\n")[0].slice(0, 80));
    } finally {
      setLoaded(true);
    }
  }, [address, hasContract, network.id, onState]);

  useEffect(() => {
    setLoaded(false);
    setError(null);
    refresh();
  }, [address, refresh]);

  useEffect(() => {
    if (loaded) onState(network.id, hasAny);
  }, [network.id, hasAny, loaded, onState]);

  const mint = useCallback(async () => {
    if (!address || !hasContract) return;
    setBusy(true);
    setError(null);
    try {
      if (chainId !== 4221) {
        await switchChainAsync({ chainId: 4221 });
      }
      const { hash: h } = await genBadgeMint(address);
      setHash(h);
      const r = await waitForGenLayerTx(h);
      if (!r.ok) {
        setError(r.reason);
        return;
      }
      const tokenId = await genBadgeUserTokenId(address);
      await refresh();
      if (tokenId > 0) onMinted(network, tokenId);
    } catch (e) {
      setError(String(e).split("\n")[0].slice(0, 80));
    } finally {
      setBusy(false);
      setHash(null);
    }
  }, [address, hasContract, refresh, chainId, switchChainAsync, network, onMinted]);

  if (!hasContract) {
    return (
      <div
        className="rounded-[16px] p-4 flex flex-col items-center gap-2 opacity-60"
        style={{ background: "var(--bg-card)", border: "1px dashed var(--border-default)" }}
      >
        <span
          className="flex items-center justify-center w-12 h-12 rounded-full"
          style={{ background: "var(--bg-strong)", color: "var(--text-faint)" }}
        >
          <Lock className="w-5 h-5" strokeWidth={1.75} />
        </span>
        <p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
          {network.shortName}
        </p>
        <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
          Coming soon
        </p>
      </div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-[16px] p-4 flex flex-col items-center gap-2.5"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${hasAny ? network.color || "var(--border-default)" : "var(--border-default)"}`,
        boxShadow: hasAny ? `0 0 0 1px ${network.color || "transparent"}22` : undefined,
      }}
    >
      <div
        className="flex items-center justify-center w-14 h-14 rounded-full overflow-hidden"
        style={{ background: "var(--bg-strong)" }}
        title={network.name}
      >
        <img
          src={badgeImage(network)}
          alt={network.shortName}
          className="w-8 h-8 object-contain"
          draggable={false}
        />
      </div>

      <div className="text-center min-w-0 w-full">
        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-bright)" }}>
          {network.shortName}
        </p>
        <p className="text-[11px] truncate" style={{ color: "var(--text-faint)" }}>
          {network.name}
        </p>
      </div>

      {hasAny ? (
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "var(--accent-muted)", color: "var(--accent-text)" }}
          title={`${count} soulbound badge${count === 1 ? "" : "s"} — they stay with this wallet`}
        >
          Collected ×{count}
        </span>
      ) : null}

      {hash ? (
        <span
          className="text-[11px] px-2.5 py-1 rounded-full animate-pulse"
          style={{ background: "var(--bg-strong)", color: "var(--text-tertiary)" }}
        >
          Minting…
        </span>
      ) : (
        <button
          type="button"
          onClick={mint}
          disabled={busy || !address || !loaded}
          title={
            !address
              ? "Connect your wallet to mint"
              : `Mint a ${network.shortName} badge on ${network.name} — free, gas only, unlimited`
          }
          className="text-[12px] font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{
            background: network.color || "var(--bg-strong)",
            color: network.color ? "#0A0E1A" : "var(--text-secondary)",
          }}
        >
          {busy ? "Confirm in wallet…" : hasAny ? "Mint another" : "Mint free"}
        </button>
      )}

      {error ? (
        <p className="text-[10px] text-center" style={{ color: "var(--danger, var(--text-secondary))" }}>
          {error}
        </p>
      ) : null}
    </m.div>
  );
}

interface BadgeCardProps {
  network: NetworkConfig;
  address: `0x${string}` | undefined;
  onState: (chainId: number, minted: boolean) => void;
  onMinted: (network: NetworkConfig, tokenId: number) => void;
}

function BadgeCard({ network, address, onState, onMinted }: BadgeCardProps) {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const contract = badgeAddress(network);

  // Read this chain's contract on this chain — not whatever network the
  // wallet happens to be connected to.
  const { data: mintCount, refetch } = useReadContract({
    address: contract,
    abi: BADGE_ABI,
    functionName: "mintCount",
    args: address ? [address] : undefined,
    chainId: network.id,
    query: { enabled: !!contract && !!address, refetchInterval: 60_000 },
  });

  const count = mintCount !== undefined ? Number(mintCount) : 0;
  const hasAny = count > 0;

  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    writeContractAsync,
    isPending,
  } = useWriteContract();

  const { data: receipt, isError: receiptFailed } = useWaitForTransactionReceipt({
    hash,
    chainId: network.id,
  });

  // Report the chain's state upward so the header counter stays live.
  useEffect(() => {
    if (mintCount !== undefined) onState(network.id, hasAny);
  }, [network.id, hasAny, mintCount, onState]);

  // Once the mint is mined, refresh the read from this chain and celebrate the
  // edition that just landed.
  useEffect(() => {
    if (!receipt || !hash) return;
    if (receipt.status === "success" && contract) {
      const tokenId = mintedTokenId(receipt.logs, contract);
      if (tokenId !== undefined) onMinted(network, tokenId);
    }
    refetch();
    setHash(undefined);
  }, [receipt, hash, refetch, contract, network, onMinted]);

  const mint = useCallback(async () => {
    if (!contract) return;
    setBusy(true);
    setError(null);
    try {
      if (chainId !== network.id) {
        await switchChainAsync({ chainId: network.id });
      }
      const extra: Record<string, unknown> = {};
      if (network.requiresLegacyGas && network.legacyGasPrice) {
        extra.gasPrice = BigInt(network.legacyGasPrice);
      }
      const h = await writeContractAsync({
        address: contract,
        abi: BADGE_ABI,
        functionName: "mint",
        chainId: network.id,
        ...extra,
      });
      setHash(h);
    } catch (e) {
      setError(String(e).split("\n")[0].slice(0, 120));
    } finally {
      setBusy(false);
    }
  }, [contract, writeContractAsync, network.id, network.requiresLegacyGas, network.legacyGasPrice, chainId, switchChainAsync]);

  if (!contract) {
    return (
      <div
        className="rounded-[16px] p-4 flex flex-col items-center gap-2 opacity-60"
        style={{
          background: "var(--bg-card)",
          border: "1px dashed var(--border-default)",
        }}
      >
        <span
          className="flex items-center justify-center w-12 h-12 rounded-full"
          style={{ background: "var(--bg-strong)", color: "var(--text-faint)" }}
        >
          <Lock className="w-5 h-5" strokeWidth={1.75} />
        </span>
        <p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
          {network.shortName}
        </p>
        <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
          Coming soon
        </p>
      </div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-[16px] p-4 flex flex-col items-center gap-2.5"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${hasAny ? network.color || "var(--border-default)" : "var(--border-default)"}`,
        boxShadow: hasAny ? `0 0 0 1px ${network.color || "transparent"}22` : undefined,
      }}
    >
      {/* the logo, framed the way the badge's metadata frames it */}
      <div
        className="flex items-center justify-center w-14 h-14 rounded-full overflow-hidden"
        style={{ background: "var(--bg-strong)" }}
        title={network.name}
      >
        <img
          src={badgeImage(network)}
          alt={network.shortName}
          className="w-8 h-8 object-contain"
          draggable={false}
        />
      </div>

      <div className="text-center min-w-0 w-full">
        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-bright)" }}>
          {network.shortName}
        </p>
        <p className="text-[11px] truncate" style={{ color: "var(--text-faint)" }}>
          {network.name}
        </p>
      </div>

      {hasAny ? (
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "var(--accent-muted)", color: "var(--accent-text)" }}
          title={`${count} soulbound badge${count === 1 ? "" : "s"} — they stay with this wallet`}
        >
          Collected ×{count}
        </span>
      ) : null}

      {hash ? (
        <span
          className={`text-[11px] px-2.5 py-1 rounded-full ${receiptFailed ? "font-semibold" : "animate-pulse"}`}
          style={{
            background: receiptFailed ? "var(--danger-muted, var(--bg-strong))" : "var(--bg-strong)",
            color: receiptFailed ? "var(--danger, var(--text-secondary))" : "var(--text-tertiary)",
          }}
        >
          {receiptFailed ? "Tx failed" : "Minting…"}
        </span>
      ) : (
        <button
          type="button"
          onClick={mint}
          disabled={isPending || !address}
          title={
            !address
              ? "Connect your wallet to mint"
              : `Mint a ${network.shortName} badge on ${network.name} — free, gas only, unlimited`
          }
          className="text-[12px] font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{
            background: network.color || "var(--bg-strong)",
            color: network.color ? "#0A0E1A" : "var(--text-secondary)",
          }}
        >
          {busy || isPending ? "Confirm in wallet…" : hasAny ? "Mint another" : "Mint free"}
        </button>
      )}

      {error ? (
        <p className="text-[10px] text-center" style={{ color: "var(--danger, var(--text-secondary))" }}>
          {error}
        </p>
      ) : null}
    </m.div>
  );
}

export default function GalleryPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [mintedMap, setMintedMap] = useState<Record<number, boolean>>({});
  const [celebrate, setCelebrate] = useState<{ network: NetworkConfig; tokenId: number } | null>(null);

  const onState = useCallback((chainId: number, minted: boolean) => {
    setMintedMap((prev) => (prev[chainId] === minted ? prev : { ...prev, [chainId]: minted }));
  }, []);

  const onMinted = useCallback((network: NetworkConfig, tokenId: number) => {
    setCelebrate({ network, tokenId });
  }, []);

  const deployedNetworks = NETWORKS.filter((n) => badgeAddress(n) !== undefined);
  const total = deployedNetworks.length;
  const collected = deployedNetworks.filter((n) => mintedMap[n.id]).length;
  const [collectedMainnet, collectedTestnet] = [
    deployedNetworks.filter((n) => !n.isTestnet && mintedMap[n.id]).length,
    deployedNetworks.filter((n) => n.isTestnet && mintedMap[n.id]).length,
  ];

  const renderGrid = (nets: NetworkConfig[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {nets.map((n) =>
        n.id === 4221 ? (
          <GenLayerBadgeCard key={n.id} network={n} address={address} onState={onState} onMinted={onMinted} />
        ) : (
          <BadgeCard key={n.id} network={n} address={address} onState={onState} onMinted={onMinted} />
        )
      )}
    </div>
  );

  return (
    <DashboardLayout wide>
      {celebrate ? (
        <MintedModal
          network={celebrate.network}
          tokenId={celebrate.tokenId}
          onClose={() => setCelebrate(null)}
        />
      ) : null}
      <div className="space-y-4 sm:space-y-6">
        {/* header */}
        <div>
          <p className="kicker flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" strokeWidth={1.75} />
            The Grand Tour
          </p>
          <h1
            className="mt-1 text-[20px] sm:text-[32px] font-bold"
            style={{ color: "var(--text-bright)" }}
          >
            Gallery
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "var(--text-secondary)" }}>
            Free soulbound badges, unlimited — mint as many as you like on any network.
            Transfers are blocked on chain, so each badge is proof you were there.
          </p>
        </div>

        {/* progress */}
        <section
          className="rounded-[20px] p-5"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                Chains visited
              </p>
              <p
                className="mt-0.5 text-[32px] font-bold leading-none tabular-nums"
                style={{ color: "var(--text-bright)" }}
              >
                {collected}
                <span className="text-[16px] font-normal ml-1" style={{ color: "var(--text-tertiary)" }}>
                  / {total} chains
                </span>
              </p>
            </div>
            {isConnected ? (
              <div className="text-right">
                <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                  Mainnet {collectedMainnet} · Testnet {collectedTestnet}
                </p>
                <p className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                  {collected === total ? "Full sweep — every badge is yours." : "Every badge is a free mint — gas only."}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openConnectModal?.()}
                className="text-[13px] font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-80"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
              >
                Connect wallet
              </button>
            )}
          </div>
          <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-strong)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: total === 0 ? "0%" : `${(collected / total) * 100}%`,
                background: "var(--accent)",
              }}
            />
          </div>
        </section>

        {/* the tour */}
        <div>
          <p className="kicker">Mainnet</p>
          <div className="mt-2">{renderGrid(NETWORKS.filter((n) => !n.isTestnet))}</div>
        </div>
        <div>
          <p className="kicker">Testnet</p>
          <div className="mt-2">{renderGrid(NETWORKS.filter((n) => n.isTestnet))}</div>
        </div>

        <p className="text-[12px] text-center" style={{ color: "var(--text-faint)" }}>
          Soulbound by contract: transfers, approvals and all — reverted. Unlimited mints,
          metadata served by this app, with each network&apos;s own logo as the image.
        </p>
      </div>
    </DashboardLayout>
  );
}
