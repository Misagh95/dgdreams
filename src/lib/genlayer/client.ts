"use client";

// genlayer-js is a heavy dependency only the GenLayer path needs, so the SDK is
// pulled in on first use and cached. The client getters stay synchronous (so all
// existing callers keep working) by returning a thin proxy that awaits the real
// client internally — this keeps genlayer-js out of the shared page bundle.
import type { Address } from "viem";
import type { Hash } from "genlayer-js/types";

export const GENLAYER_CHAIN_ID = 4221;

type AnyClient = any;
type Sdk = typeof import("genlayer-js");

let _readClient: AnyClient | null = null;
let _writeClient: AnyClient | null = null;

let _sdkPromise: Promise<Sdk> | null = null;
function loadSdk(): Promise<Sdk> {
  if (!_sdkPromise) _sdkPromise = import("genlayer-js");
  return _sdkPromise;
}

async function resolveClient(isWrite: boolean, address?: Address): Promise<AnyClient | null> {
  const [{ createClient }, { testnetBradbury }] = await Promise.all([
    loadSdk(),
    import("genlayer-js/chains"),
  ]);
  if (isWrite) {
    if (address && typeof window !== "undefined" && (window as any).ethereum) {
      _writeClient ||= createClient({
        chain: testnetBradbury,
        account: address,
        provider: (window as any).ethereum,
      });
    }
    return _writeClient;
  }
  _readClient ||= createClient({ chain: testnetBradbury });
  return _readClient;
}

/**
 * Synchronous facade: every method returns a promise that first waits for the
 * lazily-loaded SDK, then forwards to the real client. Keeps genlayer-js out of
 * the initial page bundle without changing any call sites.
 */
function makeProxy(get: () => Promise<AnyClient | null>): AnyClient {
  return new Proxy(
    {},
    {
      get(_, prop: string) {
        return async (...args: unknown[]) => {
          const client = await get();
          if (!client) throw new Error("GenLayer client unavailable");
          return (client as any)[prop](...args);
        };
      },
    }
  ) as AnyClient;
}

const _readProxy = makeProxy(() => resolveClient(false));
const _writeProxy = makeProxy(() => resolveClient(true, undefined));

export function getGenLayerReadClient() {
  return _readProxy;
}

export function getGenLayerWriteClient(address?: Address) {
  return makeProxy(() => resolveClient(true, address));
}

export function isGenLayerChain(chainId: number) {
  return chainId === GENLAYER_CHAIN_ID;
}

export type { Hash };
