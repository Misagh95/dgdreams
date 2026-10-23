import type { NetworkConfig } from "@/config/chains";

/**
 * The soulbound streak badge.
 *
 * A badge is minted after all three daily missions land on a network, and it
 * upgrades as the streak grows. The addresses live here so the "Today" page
 * and the ritual page read the same contract.
 */

export const SOULBOUND_ADDR: Record<number, `0x${string}` | ""> = {
  8453: "", 999: "", 130: "", 4217: "", 4663: "", 1: "",
  11155111: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  84532: "0xC288b68022e752d97E4395ECbA61C2079CE692Ad",
  91342: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  4441: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  5042002: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  1913: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  57073: "",
  5042: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  1868: "0x344ad6a0d3aeb4baa8d853c932fbebeb4e798e3b",
  204: "0x92783e87c0F00c3B58597efee4F2743395e526af",
  56: "0x7Ac043C44b4BCEac7ccd8FdD5906b2EF8B93ee05",
  421614: "0x344ad6a0d3aeb4baa8d853c932fbebeb4e798e3b",
  42161: "0x344ad6a0d3aeb4baa8d853c932fbebeb4e798e3b",
  10: "0x344ad6a0d3aeb4baa8d853c932fbebeb4e798e3b",
  450815: "0x344ad6a0d3aeb4baa8d853c932fbebeb4e798e3b",
};

export const SOULBOUND_ABI = [
  { inputs: [], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "upgrade", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "", type: "address" }], name: "userTokenId", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "uint256" }], name: "tokenData", outputs: [{ name: "tier", type: "uint8" }, { name: "streak", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export interface BadgeTier {
  label: string;
  /** the streak that unlocks this tier */
  threshold: number;
}

export const BADGE_TIERS: BadgeTier[] = [
  { label: "Bronze", threshold: 3 },
  { label: "Silver", threshold: 7 },
  { label: "Gold", threshold: 30 },
  { label: "Diamond", threshold: 100 },
  { label: "Legend", threshold: 365 },
];

export function tierLabel(tier: number): string {
  return BADGE_TIERS[tier - 1]?.label ?? "Minted";
}

/** The badge address for a network, if one is deployed there. */
export function soulboundAddress(
  network: NetworkConfig | undefined
): `0x${string}` | undefined {
  if (!network) return undefined;
  const addr = SOULBOUND_ADDR[network.id];
  return addr && addr.length > 0 ? addr : undefined;
}
