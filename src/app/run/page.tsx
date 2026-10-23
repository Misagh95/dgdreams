"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useActiveNetwork } from "@/lib/activeNetwork";
import { getNetworkConfig } from "@/config/chains";
import type { NikBaseMethod, SequenceStepDef } from "@/lib/sequence";
import {
  deploymentCacheKey,
  deployedAddressesFor,
  readDeployStore,
  writeDeployStore,
} from "@/lib/deployStore";

import AppShell from "@/components/shell/AppShell";
import NetworkStatusCard from "@/components/ritual/NetworkStatusCard";
import ActionCard from "@/components/ActionCard";

const MISSIONS: { taskId: string; method: NikBaseMethod; label: string }[] = [
  { taskId: "checkIn", method: "dailyCheckIn", label: "Check-In" },
  { taskId: "gm", method: "gm", label: "GM" },
  { taskId: "gn", method: "gn", label: "GN" },
  { taskId: "counter", method: "incrementCounter", label: "Counter" },
];

const DEPLOY: {
  taskId: string;
  label: string;
  /** constructor arguments, encoded in ABI order */
  args: unknown[];
}[] = [
  { taskId: "DGDemo", label: "Simple", args: ["gm"] },
  {
    taskId: "DGLiteToken",
    label: "Token",
    args: ["Demo Token", "DEMO", (1_000_000n * 10n ** 18n).toString()],
  },
  { taskId: "DGLiteNft", label: "NFT", args: ["Demo Collection", "DEMO"] },
];

type Artifact = NonNullable<SequenceStepDef["artifact"]>;

export default function RunPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { activeChainId } = useActiveNetwork();
  const network = getNetworkConfig(activeChainId);

  // Shared busy state across all deploy cards so the 3 deploys can't run concurrently.
  const [deployBusy, setDeployBusy] = useState(false);
  /** compiled contracts fetched from /public/contracts/<taskId>.json */
  const [artifacts, setArtifacts] = useState<Record<string, Artifact>>({});
  /** addresses THIS wallet already deployed on this network, for "reuse, don't pay twice" */
  const [deployed, setDeployed] = useState<Record<string, string>>({});

  // Load the three deploy artifacts once. The JSON must supply abi + bytecode;
  // constructorInputs are overwritten with our default args below at render time.
  useEffect(() => {
    let alive = true;
    (async () => {
      const map: Record<string, Artifact> = {};
      await Promise.all(
        DEPLOY.map(async (d) => {
          try {
            const res = await fetch(`/contracts/${d.taskId}.json`);
            if (res.ok) {
              const json = (await res.json()) as Artifact;
              if (alive && json.bytecode?.startsWith("0x")) {
                map[d.taskId] = { ...json, constructorInputs: d.args };
              }
            }
          } catch {
            /* artifact unavailable — the deploy card shows its own error */
          }
        })
      );
      if (alive) setArtifacts(map);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** per-network + per-wallet cache, refreshed whenever either changes */
  const refreshDeployed = useCallback(() => {
    if (!network) return;
    setDeployed(deployedAddressesFor(network.id, address, DEPLOY.map((d) => d.taskId)));
  }, [network, address]);

  useEffect(() => {
    refreshDeployed();
  }, [refreshDeployed]);

  // Avoid firing refreshDeployed concurrently for finish events of several cards.
  const finishing = useRef(false);

  const handleFinished = useCallback(
    (taskId: string, result: { status: string; hash?: string; address?: string }) => {
      if (!network) return;
      // A fresh deploy: record address + deployer in the per-wallet store so the
      // next run (and a page reload) finds it and skips paying gas again.
      if (result.status === "done" && result.address && address) {
        const store = readDeployStore();
        const match = DEPLOY.find((d) => d.taskId === taskId);
        store[deploymentCacheKey(network.id, address, match?.taskId ?? taskId)] = {
          address: result.address as `0x${string}`,
          deployer: address,
          ...(result.hash?.startsWith("0x") ? { txHash: result.hash as `0x${string}` } : {}),
        };
        writeDeployStore(store);
      }
      if (!finishing.current) {
        finishing.current = true;
        refreshDeployed();
        finishing.current = false;
      }
    },
    [address, network, refreshDeployed]
  );

  return (
    <AppShell>
      <NetworkStatusCard />

      <div className="mt-6 space-y-4">
        {/* Missions — each runs independently */}
        {MISSIONS.map((m) => (
          <ActionCard
            key={m.taskId}
            network={network}
            isConnected={isConnected}
            account={address}
            onConnect={() => openConnectModal?.()}
            taskId={m.taskId}
            method={m.method}
            label={m.label}
            kind="mission"
          />
        ))}

        {/* Deploys — share a single busy gate so only one deploys at a time.
            Each gets the artifact fetched from /contracts plus the address this
            wallet already deployed (when it still has code), both per network. */}
        {DEPLOY.map((d) => (
          <ActionCard
            key={d.taskId}
            network={network}
            isConnected={isConnected}
            account={address}
            onConnect={() => openConnectModal?.()}
            taskId={d.taskId}
            method={undefined as NikBaseMethod | undefined}
            label={d.label}
            kind="deploy"
            artifact={
              artifacts[d.taskId]
                ? { ...artifacts[d.taskId], constructorInputs: d.args }
                : undefined
            }
            cachedAddress={
              deployed[d.taskId] ? (deployed[d.taskId] as `0x${string}`) : undefined
            }
            busy={deployBusy}
            onBusyChange={setDeployBusy}
            onFinished={(r) => handleFinished(d.taskId, r as { status: string; hash?: string; address?: string })}
          />
        ))}
      </div>
    </AppShell>
  );
}
