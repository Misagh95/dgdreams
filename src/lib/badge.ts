import type { NetworkConfig } from "@/config/chains";

/**
 * The Grand Tour badge — one free, soulbound NFT per network.
 *
 * ChainBadge is deployed on every network the app supports (see
 * scripts/deploy-badges.mjs), with the network's name in the contract itself.
 * A wallet can mint exactly one badge per chain, for gas only, and the badge
 * can never leave that wallet. The metadata comes from the app's /api/badge
 * route, which serves the network's own logo as the image.
 *
 * The addresses live here so the gallery and any future page read the same
 * contract. A "" means "not deployed on this network yet" — the deploy script
 * fills rows in place (never appends duplicates).
 */
export const BADGE_ADDR: Record<number, `0x${string}` | ""> = {
  1: "", 8453: "0xe7c669815c21a6f626f69a0de373e12c725136c3", 999: "0xde0aebb9ec4c8047022586391def9ebd2c3715b8", 130: "0xe44e88f432ce74e3522a024ff5ed2c8393da93f9", 4217: "0x12d6cfc9659c613dae006072cf9f5524bf60055d", 4663: "0x3d4d0b96c33edcae617f42bfd51e4cdf0c668d81", 57073: "0x1fec47ed3850879f7bce8df4277355abf5dabfcb",
  5042: "0xcb1b3a864d384d5ad42b6f5b81825ab084444d9c", 56: "0x68bb9775b11551310d7a37aae52e6505a0e1e733", 204: "0x68bb9775b11551310d7a37aae52e6505a0e1e733", 42161: "0xff3a00cf7d83723f88097bcc8230ae37b3adf3ff", 10: "0xff3a00cf7d83723f88097bcc8230ae37b3adf3ff", 1868: "0xff3a00cf7d83723f88097bcc8230ae37b3adf3ff",
  11155111: "0xc288b68022e752d97e4395ecba61c2079ce692ad", 84532: "0x6e17e98ff56b12886636fa9ea3c17e0cd01d9790", 91342: "0x12d6cfc9659c613dae006072cf9f5524bf60055d", 4441: "0xa4561909dd4be271ed26b1f28b4cf16cff82fd1f", 5042002: "0xc288b68022e752d97e4395ecba61c2079ce692ad",
  1913: "0xa4561909dd4be271ed26b1f28b4cf16cff82fd1f", 4221: "0x9788FfAb8b6a0936C0D2f4F9138939C11913817E", 421614: "0xff3a00cf7d83723f88097bcc8230ae37b3adf3ff", 450815: "0xff3a00cf7d83723f88097bcc8230ae37b3adf3ff",
};

export const BADGE_ABI = [
  { inputs: [], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [{ name: "", type: "address" }],
    name: "userTokenId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  { inputs: [], name: "totalMinted", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

/** The badge address for a network, if one is deployed there. */
export function badgeAddress(
  network: NetworkConfig | undefined
): `0x${string}` | undefined {
  if (!network) return undefined;
  const addr = BADGE_ADDR[network.id];
  return addr && addr.length > 0 ? addr : undefined;
}

/**
 * Grand Tour artwork (`/public/output-premium`), per chain. Several chains
 * share the logo of their sibling (Sepolia wears the Ethereum mark, Base
 * Sepolia wears Base's, and so on). Anything not listed falls back to the
 * network's own `logo` from the network config.
 */
export const BADGE_IMAGE: Record<number, string> = {
  1: "/output-premium/ethereum.png",
  8453: "/output-premium/base.png",
  999: "/output-premium/hyperliquid.png",
  130: "/output-premium/unichain.png",
  4217: "/output-premium/tempo.png",
  4663: "/output-premium/robinhood.png",
  57073: "/output-premium/ink.png",
  5042: "/output-premium/arc.png",
  56: "/output-premium/bnb-chain.png",
  204: "/output-premium/opbnb.png",
  42161: "/output-premium/arbitrum.png",
  10: "/output-premium/optimism.png",
  1868: "/output-premium/soneium.png",
  11155111: "/output-premium/ethereum.png",
  84532: "/output-premium/base.png",
  91342: "/output-premium/giwa.png",
  4441: "/output-premium/litvm.png",
  5042002: "/output-premium/arc.png",
  1913: "/output-premium/simplechain.png",
  4221: "/output-premium/genlayer.png",
  421614: "/output-premium/arbitrum.png",
  450815: "/output-premium/maroo.png",
};

/** Absolute-able image path for a network's badge. */
export function badgeImage(network: NetworkConfig | undefined): string {
  if (!network) return "";
  return BADGE_IMAGE[network.id] ?? network.logo;
}
