/**
 * Per-wallet deployment cache for the 5-in-1 runner's three deployables.
 *
 * Plain `.ts` (no JSX) so Node scripts can import it for tests.
 *
 * The cache MUST be scoped by wallet: entries are keyed
 * `<chainId>:<wallet>:<artifact>` and each entry records its deployer. A bare
 * `<chainId>:<artifact>` key (the old v1 layout) leaks one wallet's deploys
 * into another wallet on the same browser — the runner then reports
 * "already deployed" for contracts the current wallet never deployed.
 * v1 entries are therefore never read back.
 */

export const DEPLOY_STORE_KEY = "dgdreams-deployments-v2";

export interface StoredDeployment {
  address: `0x${string}`;
  deployer: `0x${string}`;
  txHash?: `0x${string}`;
}

export type StoredDeployMap = Record<string, StoredDeployment>;

export function deploymentCacheKey(
  chainId: number,
  account: string,
  artifactKey: string
): string {
  return `${chainId}:${account.toLowerCase()}:${artifactKey}`;
}

function isHexAddress(v: unknown): v is `0x${string}` {
  return typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
}

export function readDeployStore(): StoredDeployMap {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return {};
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(DEPLOY_STORE_KEY) || "{}");
    if (!raw || typeof raw !== "object") return {};
    const out: StoredDeployMap = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue; // v1 string entries are ignored
      const rec = v as Record<string, unknown>;
      if (!isHexAddress(rec.address) || !isHexAddress(rec.deployer)) continue;
      out[k] = {
        address: rec.address,
        deployer: rec.deployer,
        ...(typeof rec.txHash === "string" && rec.txHash.startsWith("0x")
          ? { txHash: rec.txHash as `0x${string}` }
          : {}),
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function writeDeployStore(map: StoredDeployMap): void {
  try {
    localStorage.setItem(DEPLOY_STORE_KEY, JSON.stringify(map));
  } catch {
    /* private mode / quota */
  }
}

/**
 * Address strings per artifact key for display, for THIS wallet on THIS
 * chain only. Never returns another wallet's addresses.
 */
export function deployedAddressesFor(
  chainId: number,
  account: string | undefined,
  artifactKeys: string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!account) return out;
  const who = account.toLowerCase();
  const store = readDeployStore();
  for (const key of artifactKeys) {
    const entry = store[deploymentCacheKey(chainId, who, key)];
    if (entry && entry.deployer.toLowerCase() === who) out[key] = entry.address;
  }
  return out;
}
