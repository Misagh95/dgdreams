import { isAddress as viemIsAddress } from 'viem';
import type { NetworkConfig } from '../config/chains';

export { viemIsAddress as isAddress };

export function getExplorerUrl(network: NetworkConfig, hash: string, type: 'tx' | 'address' = 'tx'): string {
  const base = network.chain.blockExplorers?.default?.url;
  if (!base) return '#';
  return `${base}/${type === 'tx' ? 'tx' : 'address'}/${hash}`;
}

export function getNativeSymbol(network: NetworkConfig): string {
  return network.chain.nativeCurrency?.symbol || 'ETH';
}

export function formatGas(gas: bigint | undefined): string {
  if (!gas) return '—';
  const gwei = Number(gas) / 1e9;
  if (gwei < 0.001) return '<0.001 Gwei';
  if (gwei < 1) return `${gwei.toFixed(3)} Gwei`;
  if (gwei < 1000) return `${gwei.toFixed(2)} Gwei`;
  return `${(gwei / 1000).toFixed(2)} μETH`;
}

export const TX_ERROR_MESSAGES: Record<string, string> = {
  'action rejected': 'Transaction was rejected in your wallet',
  'user rejected': 'Transaction was rejected in your wallet',
  'user rejected operation': 'Transaction was rejected in your wallet',
  'insufficient funds': 'Insufficient funds for this transaction',
  'insufficient balance': 'Insufficient balance to complete this transaction',
  'execution reverted': 'Transaction failed – the contract reverted the operation',
  'gas required exceeds allowance': 'Gas limit too low or insufficient funds',
  'nonce too low': 'Please reset your wallet (nonce error)',
  'already known': 'Transaction is already pending',
  'replacement transaction underpriced': 'A pending transaction needs to be replaced with higher gas',
  'network does not support': 'This network does not support this operation',
  'already': 'Already done today',
  'caller is not the owner': 'You are not authorized to perform this action',
  'daily limit': 'Daily limit reached for this action',
};

export function parseTxError(error: unknown): string {
  if (!error) return 'Unknown error';
  const msg = typeof error === 'string' ? error : (error as any)?.shortMessage || (error as any)?.message || String(error);
  const lower = msg.toLowerCase();
  for (const [key, friendly] of Object.entries(TX_ERROR_MESSAGES)) {
    if (lower.includes(key)) return friendly;
  }
  const clean = msg.replace(/^.*\(reason="(.*?)".*$/, '$1').replace(/^.*\[.*?\]\s*/, '').slice(0, 120);
  return clean || 'Transaction failed';
}

export function shortenHash(hash: string, chars = 6): string {
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}
