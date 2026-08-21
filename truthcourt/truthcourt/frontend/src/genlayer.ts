/**
 * GenLayer client setup (genlayer-js v1.x).
 *
 * Defaults to Testnet Bradbury (chain id 4221, https://rpc-bradbury.genlayer.com).
 * Override with VITE_GL_CHAIN=studio (Studionet) or =local (localnet) in a .env file.
 *
 * The private key is persisted in localStorage so the same identity survives
 * reloads. Fine for a testnet dApp — never do this on mainnet with real funds.
 */
import {
  createClient,
  createAccount,
  generatePrivateKey,
} from "genlayer-js";
import { testnetBradbury, studionet, localnet } from "genlayer-js/chains";

const STORAGE_KEY = "truthcourt.privateKey";

export type GenLayerClient = ReturnType<typeof createClient>;

function pickChain() {
  const choice = (import.meta.env.VITE_GL_CHAIN || "bradbury").toLowerCase();
  if (choice === "studio") return studionet;
  if (choice === "local") return localnet;
  return testnetBradbury;
}

let client: GenLayerClient | null = null;

function getOrCreatePrivateKey(): `0x${string}` {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing as `0x${string}`;
  const key = generatePrivateKey();
  localStorage.setItem(STORAGE_KEY, key);
  return key;
}

export function getAccount() {
  return createAccount(getOrCreatePrivateKey());
}

export function getAddress(): string {
  return getAccount().address;
}

export function resetAccount() {
  localStorage.removeItem(STORAGE_KEY);
  client = null;
}

export function getClient(): GenLayerClient {
  if (!client) {
    client = createClient({
      chain: pickChain(),
      account: getAccount(),
    });
  }
  return client;
}

/** GEN -> wei (18 decimals). */
export function toWei(amountGen: string): bigint {
  const [whole, frac = ""] = amountGen.trim().split(".");
  const fracPadded = (frac + "000000000000000000").slice(0, 18);
  return BigInt(whole || "0") * 10n ** 18n + BigInt(fracPadded || "0");
}

/** wei -> GEN string (for display). */
export function fromWei(wei: string | bigint | number): string {
  let w: bigint;
  if (typeof wei === "bigint") w = wei;
  else if (typeof wei === "number") w = BigInt(Math.round(wei));
  else w = BigInt(wei);
  const whole = w / 10n ** 18n;
  const frac = (w % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function shortAddr(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
