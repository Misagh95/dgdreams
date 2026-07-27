"use client";

import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import type { Address } from "viem";

export const GENLAYER_CHAIN_ID = 4221;

let _readClient: ReturnType<typeof createClient> | null = null;
let _writeClient: ReturnType<typeof createClient> | null = null;

export function getGenLayerReadClient() {
  if (!_readClient) {
    _readClient = createClient({ chain: testnetBradbury });
  }
  return _readClient;
}

export function getGenLayerWriteClient(address?: Address) {
  if (!_writeClient && address && typeof window !== "undefined" && (window as any).ethereum) {
    _writeClient = createClient({
      chain: testnetBradbury,
      account: address,
      provider: (window as any).ethereum,
    });
  }
  return _writeClient;
}

export function isGenLayerChain(chainId: number) {
  return chainId === GENLAYER_CHAIN_ID;
}
