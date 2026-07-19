import { useState, useCallback, useRef } from 'react';
import { useWriteContract, useEstimateGas, useWaitForTransactionReceipt } from 'wagmi';
import type { Abi, Address } from 'abitype';
import { parseTxError, getExplorerUrl } from '../utils/transactions';
import type { NetworkConfig } from '../config/chains';

export type TxStatus = 'idle' | 'estimating' | 'awaiting_approval' | 'pending' | 'confirmed' | 'failed';

export interface SafeTxResult {
  write: (args?: { value?: bigint }) => void;
  status: TxStatus;
  txHash: `0x${string}` | undefined;
  error: string | null;
  explorerUrl: string;
  gasEstimate: bigint | undefined;
  reset: () => void;
}

export function useSafeContractWrite({
  address,
  abi,
  functionName,
  args,
  network,
  chainValidation,
  enabled = true,
}: {
  address: Address | undefined;
  abi: Abi;
  functionName: string;
  args?: unknown[];
  network: NetworkConfig | undefined;
  chainValidation: { isConnected: boolean; currentChainId: number | undefined; targetChainId: number | undefined };
  enabled?: boolean;
}): SafeTxResult {
  const [status, setStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [error, setError] = useState<string | null>(null);
  const nonceRef = useRef(0);

  const isReady = enabled && !!address && !!network
    && chainValidation.isConnected
    && chainValidation.currentChainId === chainValidation.targetChainId;

  const { writeContractAsync } = useWriteContract();

  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  const prevConfirmedRef = useRef(false);
  if (receipt?.status === 'success' && !prevConfirmedRef.current && status === 'pending') {
    prevConfirmedRef.current = true;
    setStatus('confirmed');
  } else if (receipt?.status === 'reverted' && !prevConfirmedRef.current && status === 'pending') {
    prevConfirmedRef.current = true;
    setStatus('failed');
    setError('Transaction was reverted by the network');
  }

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(undefined);
    setError(null);
    prevConfirmedRef.current = false;
  }, []);

  const write = useCallback((overrides?: { value?: bigint }) => {
    if (!isReady || !address) {
      setError('Not connected to the correct network');
      return;
    }

    const callNonce = ++nonceRef.current;
    setStatus('awaiting_approval');
    setError(null);
    prevConfirmedRef.current = false;

    writeContractAsync({
      address,
      abi,
      functionName,
      args,
      value: overrides?.value,
    })
      .then((hash) => {
        if (callNonce !== nonceRef.current) return;
        setTxHash(hash);
        setStatus('pending');
      })
      .catch((err: unknown) => {
        if (callNonce !== nonceRef.current) return;
        const parsed = parseTxError(err);
        if (parsed.toLowerCase().includes('rejected')) {
          setStatus('idle');
        } else {
          setStatus('failed');
        }
        setError(parsed);
      });
  }, [isReady, address, abi, functionName, args, writeContractAsync]);

  const explorerUrl = txHash && network
    ? getExplorerUrl(network, txHash)
    : '';

  return {
    write,
    status,
    txHash,
    error,
    explorerUrl,
    gasEstimate: undefined,
    reset,
  };
}
