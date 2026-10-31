import type { NetworkConfig } from "@/config/chains";

/**
 * The Grand Tour badge — free, soulbound NFTs per network.
 *
 * ChainBadge is deployed on every network the app supports (see
 * scripts/deploy-badges.mjs), with the network's name in the contract itself.
 * A wallet can mint as many badges as it likes on any chain, for gas only,
 * and the badge can never leave that wallet. The metadata comes from the
 * app's /api/badge route, which serves the network's own logo as the image.
 *
 * The addresses live here so the gallery and any future page read the same
 * contract. A "" means "not deployed on this network yet" — the deploy script
 * fills rows in place (never appends duplicates).
 */
export const BADGE_ADDR: Record<number, `0x${string}` | ""> = {
  1: "", 8453: "0x1ac291f30c47dac23f4b7afab07913cadbf43be2", 999: "0x554489d9661335dcfa1518771100616795078683", 130: "0x141583a61a394580fec9219342f9b7cd9cdef3df", 4217: "0xc50304759389cbc684a0f6dd4eb6d0332e70aac9", 4663: "0x672828daa4652c87117a3f91f3cb7c80afd218c3", 57073: "0x0e273271d389b5d187817ee1b173c7ec54a2d341",
  5042: "0xbb123f450822a42aeda8e71af3534d7dc84627f7", 56: "0x344ad6a0d3aeb4baa8d853c932fbebeb4e798e3b", 204: "0xaf1f1ec78f94bf9b6facf876c77a51562b7ebab0", 42161: "0xc288b68022e752d97e4395ecba61c2079ce692ad", 10: "0xc288b68022e752d97e4395ecba61c2079ce692ad", 1868: "0xc288b68022e752d97e4395ecba61c2079ce692ad",
  11155111: "0xdbee9ea39fedd197d224ea7520a20b4434635a6a", 84532: "0xd08e9bb972dc4e8bff1a6bb50fa75c86fb470346", 91342: "0xc50304759389cbc684a0f6dd4eb6d0332e70aac9", 4441: "0x58420b248ef127c796992c04cabf123a72bcd1b3", 5042002: "0xdbee9ea39fedd197d224ea7520a20b4434635a6a",
  1913: "0x58420b248ef127c796992c04cabf123a72bcd1b3", 4221: "0x8A32da709dA16DF8c7039dA22d0688a6817587E4", 421614: "0xc288b68022e752d97e4395ecba61c2079ce692ad", 450815: "0xc288b68022e752d97e4395ecba61c2079ce692ad",
  6281971: "0xff3a00cf7d83723f88097bcc8230ae37b3adf3ff",
  99801: "0xff3a00cf7d83723f88097bcc8230ae37b3adf3ff",
  1440000: "0xff3a00cf7d83723f88097bcc8230ae37b3adf3ff",
};

export const BADGE_ABI = [
  { inputs: [], name: "mint", outputs: [{ name: "", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [{ name: "count", type: "uint256" }],
    name: "mintBatch",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "userTokenId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "mintCount",
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
  6281971: "/output-premium/dogeos.png",
  99801: "/output-premium/elysium.png",
  1440000: "/output-premium/xrplevm.png",
};

/** Absolute-able image path for a network's badge. */
export function badgeImage(network: NetworkConfig | undefined): string {
  if (!network) return "";
  return BADGE_IMAGE[network.id] ?? network.logo;
}
