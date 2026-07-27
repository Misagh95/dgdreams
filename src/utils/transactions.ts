import type { NetworkConfig } from "@/config/chains";

export function parseTxError(error: unknown): string {
  if (!error) return "Unknown error";
  const e = error as any;
  if (e?.shortMessage) return e.shortMessage;
  if (e?.reason) return e.reason;
  if (e?.message) {
    const msg = e.message as string;
    if (msg.includes("User rejected") || msg.includes("rejected")) return "Transaction rejected";
    if (msg.includes("insufficient funds")) return "Insufficient funds";
    return msg.slice(0, 120);
  }
  return "Unknown error";
}

export function getExplorerUrl(
  network: NetworkConfig,
  hash: string,
  type: "tx" | "address" = "tx"
): string {
  const base = network.blockExplorers?.default?.url || "";
  if (!base) return "#";
  return `${base}/${type === "tx" ? "tx" : "address"}/${hash}`;
}

export function getNativeSymbol(network: NetworkConfig): string {
  return network.nativeCurrency?.symbol || "ETH";
}

export function shortenHash(hash: string, chars = 6): string {
  if (!hash || hash.length < chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}
