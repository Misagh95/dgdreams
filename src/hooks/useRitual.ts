"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useConfig, useReadContract, useWriteContract } from "wagmi";
import { getPublicClient } from "@wagmi/core";
import { isAddress } from "viem";

import { NIKBASE_CONTRACTS, getNetworkConfig } from "@/config/chains";
import { useActiveNetwork } from "@/lib/activeNetwork";
import { canStillRunTask } from "@/lib/preflight";
import {
  broadcastCall,
  encodeMission,
  getRawProvider,
  waitForReceipt,
} from "@/lib/missionSender";
import {
  MISSIONS,
  MISSION_BY_ID,
  markDayComplete,
  type MissionId,
} from "@/lib/ritual";
import { useUtcDay } from "@/hooks/useUtcDay";
import { utcDayKey } from "@/lib/utcDay";
import { parseTxError } from "@/utils/transactions";

const NIKBASE_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserData",
    outputs: [
      { name: "strk", type: "uint256" },
      { name: "totalCI", type: "uint256" },
      { name: "totalAct", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * useRitual — the state behind the "Today" hero.
 *
 * One network, one wallet, three missions. The hook answers three questions:
 *   - which of today's missions are already on chain (an eth_call, the same
 *     one the wallet would run, so a mission that is already done never
 *     shows the user a failed simulation);
 *   - what the streak and the point totals are (read straight from NikBase);
 *   - how to run one mission as exactly one transaction.
 *
 * The contract accepts each action once per UTC day, so everything is
 * dropped when the day rolls over.
 */
export function useRitual() {
  const { address, isConnected } = useAccount();
  const { activeChainId } = useActiveNetwork();
  const wagmiConfig = useConfig();
  const { writeContractAsync } = useWriteContract();

  const network = useMemo(
    () => getNetworkConfig(activeChainId),
    [activeChainId]
  );
  const contract = network ? NIKBASE_CONTRACTS[network.id] : undefined;
  const account = useMemo(
    () => (address && isAddress(address) ? (address as `0x${string}`) : undefined),
    [address]
  );

  const [doneIds, setDoneIds] = useState<Set<MissionId>>(new Set());
  const [probing, setProbing] = useState(false);
  const [busy, setBusy] = useState<MissionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [dayKey, setDayKey] = useState(() => utcDayKey());

  // The streak and the totals live in the contract, not in the browser.
  const { data: userData, refetch: refetchUser } = useReadContract({
    address: contract,
    abi: NIKBASE_ABI,
    functionName: "getUserData",
    args: account ? [account] : undefined,
    query: {
      enabled: !!contract && !!account && isConnected,
      refetchInterval: 30_000,
    },
  });

  const streak = userData ? Number(userData[0]) : 0;
  const totalCheckIns = userData ? Number(userData[1]) : 0;
  const totalActions = userData ? Number(userData[2]) : 0;

  // ── probe: which of today's three are already done ──────────────────
  const probe = useCallback(async () => {
    if (!isConnected || !account || !network || !contract) {
      setDoneIds(new Set());
      return;
    }
    setProbing(true);
    try {
      const pub = getPublicClient(wagmiConfig, { chainId: network.id });
      if (!pub) {
        setDoneIds(new Set());
        return;
      }
      const results = await Promise.all(
        MISSIONS.map(async (m) => {
          const runnable = await canStillRunTask(pub, {
            account,
            contract,
            method: m.method,
          });
          return { id: m.id, runnable };
        })
      );
      setDoneIds(
        new Set(results.filter((r) => !r.runnable).map((r) => r.id))
      );
    } catch {
      /* fail open — the wallet's own simulation is the final guard */
    } finally {
      setProbing(false);
    }
  }, [isConnected, account, network, contract, wagmiConfig]);

  useEffect(() => {
    void probe();
  }, [probe]);

  // ── UTC rollover: yesterday's flags are stale the moment it passes ───
  useUtcDay(
    useCallback(() => {
      setDoneIds(new Set());
      setDayKey(utcDayKey());
      setError(null);
      void refetchUser();
    }, [refetchUser])
  );

  // ── run one mission ─────────────────────────────────────────────────
  const runMission = useCallback(
    async (id: MissionId) => {
      if (!isConnected) return null;
      if (!account || !network || !contract) {
        setError(
          network
            ? `No NikBase contract on ${network.name} yet.`
            : "Pick a supported network first."
        );
        return null;
      }
      if (busy) return null;

      const mission = MISSION_BY_ID[id];
      setBusy(id);
      setError(null);

      try {
        const data = encodeMission(mission.method);

        const rawProvider = await getRawProvider(wagmiConfig);
        const hash = await broadcastCall({
          wagmiConfig,
          network,
          to: contract,
          data,
          address: account,
          method: mission.method,
          writeContractAsync: writeContractAsync as never,
        });
        setLastHash(hash);

        const receipt = await waitForReceipt({
          wagmiConfig,
          network,
          hash,
          rawProvider,
        });

        if (receipt.status === "reverted" || receipt.status === "0x0") {
          throw new Error("The contract rejected this mission.");
        }

        setDoneIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        markDayComplete(utcDayKey());
        void refetchUser();
        void probe();
        return hash;
      } catch (err) {
        setError(parseTxError(err));
        return null;
      } finally {
        setBusy(null);
      }
    },
    [
      isConnected,
      account,
      network,
      contract,
      busy,
      wagmiConfig,
      writeContractAsync,
      refetchUser,
      probe,
    ]
  );

  const doneCount = doneIds.size;
  const allDone = doneCount >= MISSIONS.length;

  return {
    network,
    contract,
    account,
    /** the three missions, flagged with what is already on chain */
    missions: MISSIONS.map((m) => ({
      ...m,
      done: doneIds.has(m.id),
    })),
    doneIds,
    doneCount,
    allDone,
    streak,
    totalCheckIns,
    totalActions,
    probing,
    busy,
    error,
    lastHash,
    dayKey,
    runMission,
    refresh: probe,
  };
}

export default useRitual;
