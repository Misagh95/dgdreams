import { useCallback, useEffect, useState } from "react";
import { TransactionStatus } from "genlayer-js/types";
import {
  getAddress,
  getClient,
  resetAccount,
  shortAddr,
  toWei,
} from "./genlayer";
import type { Claim, Config } from "./types";
import Header from "./components/Header";
import StatsBar from "./components/StatsBar";
import SubmitForm from "./components/SubmitForm";
import ClaimList from "./components/ClaimList";
import GenLayerSpinner from "./components/GenLayerSpinner";

export default function App() {
  const [address, setAddress] = useState("");
  const [contractAddress, setContractAddress] = useState(
    localStorage.getItem("truthcourt.contractAddress") ??
      "0x999Fc79026afdF38472c5E15970AF454F13Ddbc1"
  );
  const [claims, setClaims] = useState<Claim[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // id of the claim being acted on
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    setAddress(getAddress());
  }, []);

  const saveContract = (addr: string) => {
    localStorage.setItem("truthcourt.contractAddress", addr);
    setContractAddress(addr);
  };

  const refresh = useCallback(async () => {
    if (!contractAddress) return;
    try {
      const client = getClient();
      const [countRaw, cfgRaw] = await Promise.all([
        client.readContract({
          address: contractAddress as `0x${string}`,
          functionName: "get_claim_count",
          args: [],
          jsonSafeReturn: true,
        }),
        client.readContract({
          address: contractAddress as `0x${string}`,
          functionName: "get_config",
          args: [],
          jsonSafeReturn: true,
        }),
      ]);
      setConfig(JSON.parse(cfgRaw as string) as Config);
      const count = Number(countRaw as string | number | bigint);
      if (count > 0) {
        const page = (await client.readContract({
          address: contractAddress as `0x${string}`,
          functionName: "get_claims",
          args: [0, Math.min(count, 100)],
          jsonSafeReturn: true,
        })) as string[];
        setClaims(
          Array.isArray(page) ? page.map((c) => JSON.parse(c)) : []
        );
      } else {
        setClaims([]);
      }
      setNotice("");
    } catch (e) {
      setNotice(
        "Could not read from the contract. Check the contract address and chain."
      );
      console.error(e);
    }
  }, [contractAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Wrap a write with the full transaction lifecycle + status updates. */
  const runWrite = async (
    label: string,
    params: {
      functionName: string;
      args: any[];
      value?: bigint;
    }
  ) => {
    setBusy(label);
    setNotice("");
    try {
      const client = getClient();
      const hash = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: params.functionName,
        args: params.args,
        value: params.value ?? 0n,
      });
      setNotice(`Transaction submitted: ${shortAddr(hash)}`);

      const tx = (await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        retries: 120,
        interval: 3000,
      })) as unknown as {
        resultName?: string;
        statusName?: string;
        txExecutionResultName?: string;
      };
      if (tx.resultName === "FAILURE") {
        throw new Error(tx.txExecutionResultName ?? "transaction failed");
      }
      setNotice(`✓ ${label} finalized`);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Timed out")) {
        setNotice(`submitted, still finalizing — refresh to see the result`);
      } else {
        setNotice(`✗ ${label} failed: ${msg}`);
      }
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async (text: string, urls: string[], bondGen: string) => {
    await runWrite("submit_claim", {
      functionName: "submit_claim",
      args: [text, urls],
      value: toWei(bondGen),
    });
  };

  const handleChallenge = async (claim: Claim, urls: string[]) => {
    await runWrite("challenge_claim", {
      functionName: "challenge_claim",
      args: [claim.id, urls],
      value: BigInt(claim.bond), // must match exactly
    });
  };

  const handleResolve = async (claim: Claim) => {
    await runWrite("resolve_claim", {
      functionName: "resolve_claim",
      args: [claim.id],
    });
  };

  const handleCancel = async (claim: Claim) => {
    await runWrite("cancel_claim", {
      functionName: "cancel_claim",
      args: [claim.id],
    });
  };

  const handleWithdraw = async () => {
    await runWrite("withdraw", {
      functionName: "withdraw",
      args: [],
    });
  };

  return (
    <div className="app">
      <Header
        address={address}
        onNewAccount={() => {
          resetAccount();
          setAddress(getAddress());
        }}
      />

      <main>
        <section className="setup card">
          <h2>Connect to your contract</h2>
          <div className="row">
            <input
              value={contractAddress}
              onChange={(e) => saveContract(e.target.value)}
              placeholder="Deployed TruthCourt contract address"
              spellCheck={false}
            />
            <button onClick={refresh} disabled={busy !== null}>
              Refresh
            </button>
          </div>
          {config && (
            <p className="muted">
              Treasury {shortAddr(config.treasury)} · fee{" "}
              {((config.fee_bps ?? 0) / 100).toFixed(2)}%
            </p>
          )}
        </section>

        {contractAddress && (
          <>
            <StatsBar claims={claims} />

            <SubmitForm onSubmit={handleSubmit} disabled={busy !== null} />

            <section className="card">
              <div className="section-head">
                <h2>Claims</h2>
                <button onClick={handleWithdraw} disabled={busy !== null}>
                  Withdraw winnings
                </button>
              </div>
              <ClaimList
                claims={claims}
                address={address}
                busy={busy}
                onChallenge={handleChallenge}
                onResolve={handleResolve}
                onCancel={handleCancel}
              />
            </section>
          </>
        )}
      </main>

      {busy && (
        <div className="busy-bar" role="status">
          <GenLayerSpinner size={20} color="#5c9dff" label="Working" />
          <span>{busy} in progress…</span>
        </div>
      )}
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
