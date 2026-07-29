"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import DashboardLayout from "@/components/DashboardLayout";
import { isGenLayerChain } from "@/lib/genlayer/client";
import {
  escrowGetByParty,
  escrowCreate,
  escrowAccept,
  escrowRelease,
  escrowRaiseDispute,
  escrowResolve,
  ESCROW_CONTRACT,
} from "@/lib/genlayer/escrow";

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  active: "#10B981",
  released: "#6366F1",
  disputed: "#EF4444",
  resolved: "#8B5CF6",
};

export default function GenLayerEscrowPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const onGenLayer = isGenLayerChain(chainId ?? 0);

  const [tab, setTab] = useState<"create" | "my">("create");

  const [partyB, setPartyB] = useState("");
  const [terms, setTerms] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [escrows, setEscrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [disputeInputs, setDisputeInputs] = useState<Record<number, string>>({});

  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [msg, ...prev.slice(0, 49)]);
  }, []);

  const handleCreate = async () => {
    if (!address || !onGenLayer) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      const tx = await escrowCreate(address, partyB, terms, Math.round(parseFloat(amount)));
      addLog(`createEscrow tx: ${tx}`);
      await new Promise((r) => setTimeout(r, 3000));
      setCreateMsg("Escrow created! Switch to My Escrows tab.");
      setPartyB("");
      setTerms("");
      setAmount("0.1");
    } catch (e: any) {
      setCreateMsg(`Error: ${e.message || e}`);
    } finally {
      setCreating(false);
    }
  };

  const fetchEscrows = useCallback(async () => {
    if (!address || !onGenLayer) return;
    setLoading(true);
    try {
      const data = await escrowGetByParty(address);
      setEscrows(data || []);
    } catch (e: any) {
      addLog(`fetch error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [address, onGenLayer, addLog]);

  useEffect(() => {
    if (tab === "my") fetchEscrows();
  }, [tab, fetchEscrows]);

  const doAction = async (label: string, fn: () => Promise<string>, escrowId: number) => {
    setActionMsg(null);
    try {
      const tx = await fn();
      addLog(`${label} escrow #${escrowId} tx: ${tx}`);
      await new Promise((r) => setTimeout(r, 3000));
      setActionMsg(`${label} successful!`);
      fetchEscrows();
    } catch (e: any) {
      setActionMsg(`Error: ${e.message || e}`);
    }
  };

  if (!isConnected) {
    return (
      <DashboardLayout title="AI Escrow">
        <div className="flex items-center justify-center h-64">
          <button onClick={openConnectModal} className="px-6 py-3 rounded-xl text-sm font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
            Connect Wallet
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!onGenLayer) {
    return (
      <DashboardLayout title="AI Escrow">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>Switch to GenLayer Bradbury</p>
          <button onClick={() => switchChainAsync({ chainId: 4221 }) as any} className="px-6 py-3 rounded-xl text-sm font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
            Switch Network
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="AI Escrow">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-3 h-3 rounded-full" style={{ background: "#8B5CF6" }} />
          <h1 className="text-lg font-mono font-semibold" style={{ color: "var(--text-primary)" }}>AI Escrow</h1>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: "color-mix(in srgb, #8B5CF6 15%, transparent)", color: "#8B5CF6" }}>
            GenLayer
          </span>
        </div>

        <p className="text-xs font-mono mb-6" style={{ color: "var(--text-secondary)" }}>
          Contract: {ESCROW_CONTRACT.slice(0, 10)}...{ESCROW_CONTRACT.slice(-6)}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["create", "my"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="px-4 py-2 rounded-lg text-xs font-mono transition-all" style={{
              background: tab === t ? "var(--bg-strong)" : "transparent",
              color: tab === t ? "var(--text-primary)" : "var(--text-secondary)",
              border: tab === t ? "1px solid var(--border)" : "1px solid transparent",
            }}>
              {t === "create" ? "Create Escrow" : "My Escrows"}
            </button>
          ))}
        </div>

        {tab === "create" && (
          <div className="rounded-xl p-6 space-y-4" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Party B Address</label>
              <input value={partyB} onChange={(e) => setPartyB(e.target.value)} placeholder="0x..." className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Terms</label>
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Describe the agreement..." rows={3} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none resize-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Amount (GEN)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" min="0" className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <button onClick={handleCreate} disabled={creating || !partyB || !terms} className="px-6 py-2.5 rounded-xl text-xs font-mono transition-all hover:opacity-80 disabled:opacity-40" style={{ background: "#8B5CF6", color: "#fff", border: "none" }}>
              {creating ? "Creating..." : "Create Escrow"}
            </button>
            {createMsg && <p className="text-xs font-mono mt-2" style={{ color: "var(--text-secondary)" }}>{createMsg}</p>}
          </div>
        )}

        {tab === "my" && (
          <div>
            {loading ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>Loading escrows...</p>
            ) : escrows.length === 0 ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>No escrows found for this wallet.</p>
            ) : (
              <div className="space-y-3">
                {escrows.map((esc) => (
                  <div key={esc.escrow_id} className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>Escrow #{esc.escrow_id}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: "color-mix(in srgb, " + (STATUS_COLORS[esc.status] || "#888") + " 15%, transparent)", color: STATUS_COLORS[esc.status] || "#888" }}>
                        {esc.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
                      <div>Party A: <span className="text-[9px]" style={{ color: "var(--text-quaternary)" }}>{esc.party_a?.slice(0, 10)}...</span></div>
                      <div>Party B: <span className="text-[9px]" style={{ color: "var(--text-quaternary)" }}>{esc.party_b?.slice(0, 10)}...</span></div>
                      <div>Amount: {esc.amount} GEN</div>
                      <div>Winner: {esc.winner ? esc.winner.slice(0, 10) + "..." : "N/A"}</div>
                    </div>
                    <p className="text-[10px] font-mono italic" style={{ color: "var(--text-quaternary)" }}>Terms: {esc.terms}</p>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {esc.status === "pending" && address?.toLowerCase() === esc.party_b?.toLowerCase() && (
                        <button onClick={() => doAction("Accept", () => escrowAccept(address!, esc.escrow_id), esc.escrow_id)} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#10B981", color: "#fff", border: "none" }}>
                          Accept
                        </button>
                      )}
                      {esc.status === "active" && (address?.toLowerCase() === esc.party_a?.toLowerCase() || address?.toLowerCase() === esc.party_b?.toLowerCase()) && (
                        <>
                          <button onClick={() => doAction("Release", () => escrowRelease(address!, esc.escrow_id), esc.escrow_id)} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#6366F1", color: "#fff", border: "none" }}>
                            Release
                          </button>
                          <button onClick={() => {
                            const ev = disputeInputs[esc.escrow_id] || "";
                            if (!ev) return;
                            doAction("Dispute", () => escrowRaiseDispute(address!, esc.escrow_id, ev), esc.escrow_id);
                          }} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#EF4444", color: "#fff", border: "none" }}>
                            Raise Dispute
                          </button>
                        </>
                      )}
                      {(esc.status === "active" || esc.status === "disputed") && (
                        <div className="flex gap-2 items-center w-full mt-1">
                          <input value={disputeInputs[esc.escrow_id] || ""} onChange={(e) => setDisputeInputs((prev) => ({ ...prev, [esc.escrow_id]: e.target.value }))} placeholder="Your evidence..." className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                        </div>
                      )}
                      {esc.status === "disputed" && (address?.toLowerCase() === esc.party_a?.toLowerCase() || address?.toLowerCase() === esc.party_b?.toLowerCase()) && (
                        <button onClick={() => doAction("Resolve", () => escrowResolve(address!, esc.escrow_id), esc.escrow_id)} className="px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: "#8B5CF6", color: "#fff", border: "none" }}>
                          Resolve (AI Verdict)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {actionMsg && <p className="text-xs font-mono mt-3" style={{ color: "var(--text-secondary)" }}>{actionMsg}</p>}
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="mt-8">
            <p className="text-[9px] font-mono tracking-wider uppercase mb-2" style={{ color: "var(--text-quaternary)" }}>Transaction Log</p>
            <div className="rounded-xl p-3 max-h-32 overflow-y-auto" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
              {log.map((msg, i) => (
                <p key={i} className="text-[9px] font-mono leading-relaxed" style={{ color: "var(--text-quaternary)" }}>{msg}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
