"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import DashboardLayout from "@/components/DashboardLayout";
import GenLayerSpinner from "@/components/GenLayerSpinner";
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
  pending: "var(--warning)",
  active: "var(--success)",
  released: "var(--accent)",
  disputed: "var(--danger)",
  resolved: "var(--accent)",
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
    if (!address) return;
    await requireGenLayer();
    if (chainId !== 4221) { setCreateMsg("Switch to GenLayer first"); return; }
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
    if (!address) return;
    await requireGenLayer();
    if (chainId !== 4221) { setActionMsg("Switch to GenLayer first"); return; }
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

  const requireGenLayer = async () => {
    if (!onGenLayer) { try { await switchChainAsync({ chainId: 4221 } as any); } catch {} }
  };

  if (!isConnected) {
    return (
      <DashboardLayout title="AI Escrow">
        <div className="flex items-center justify-center h-64">
          <button onClick={openConnectModal} className="px-6 py-3 rounded-xl text-sm transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
            Connect Wallet
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="AI Escrow">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>AI Escrow</h1>
          <span className="text-[12px] px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent-text)" }}>
            GenLayer
          </span>
          {!onGenLayer && <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--danger) 15%, transparent)", color: "var(--danger)" }}>Requires GenLayer</span>}
        </div>

        <p className="text-xs mb-6" style={{ color: "var(--text-secondary)" }}>
          Contract: {ESCROW_CONTRACT.slice(0, 10)}...{ESCROW_CONTRACT.slice(-6)}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["create", "my"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="px-4 py-2 rounded-lg text-xs transition-all" style={{
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
              <label className="text-[12px] mb-2 block" style={{ color: "var(--text-quaternary)" }}>Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Freelance", terms: "Deliver smart contract code review by Friday", amount: "5" },
                  { label: "NFT Trade", terms: "Transfer ownership of NFT #123 after payment", amount: "10" },
                  { label: "DAO Grant", terms: "Complete milestone 3 of the DAO grant proposal", amount: "25" },
                  { label: "Domain Sale", terms: "Transfer domain ownership upon release", amount: "3" },
                ].map((p) => (
                  <button key={p.label} onClick={() => { setTerms(p.terms); setAmount(p.amount); }} className="px-3 py-1.5 rounded-lg text-[12px] transition-all hover:opacity-80" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent-text)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>Party B Address</label>
              <input value={partyB} onChange={(e) => setPartyB(e.target.value)} placeholder="0x..." className="w-full mt-1 px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>Terms</label>
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Describe the agreement..." rows={3} className="w-full mt-1 px-3 py-2 rounded-lg text-xs outline-none resize-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>Amount (GEN)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" min="0" className="w-full mt-1 px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <button onClick={handleCreate} disabled={creating || !partyB || !terms} className="px-6 py-2.5 rounded-xl text-xs transition-all hover:opacity-80 disabled:opacity-40" style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
              {creating ? "Creating..." : "Create Escrow"}
            </button>
            {createMsg && <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>{createMsg}</p>}
          </div>
        )}

        {tab === "my" && (
          <div>
            {loading ? (
              <div className="flex items-center gap-3"><GenLayerSpinner size={24} /><p className="text-xs" style={{ color: "var(--text-secondary)" }}>Loading escrows...</p></div>
            ) : escrows.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-quaternary)" }}>No escrows found for this wallet.</p>
            ) : (
              <div className="space-y-3">
                {escrows.map((esc) => (
                  <div key={esc.escrow_id} className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "var(--text-primary)" }}>Escrow #{esc.escrow_id}</span>
                      <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, " + (STATUS_COLORS[esc.status] || "#888") + " 15%, transparent)", color: STATUS_COLORS[esc.status] || "#888" }}>
                        {esc.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      <div>Party A: <span className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>{esc.party_a?.slice(0, 10)}...</span></div>
                      <div>Party B: <span className="text-[12px]" style={{ color: "var(--text-quaternary)" }}>{esc.party_b?.slice(0, 10)}...</span></div>
                      <div>Amount: {esc.amount} GEN</div>
                      <div>Winner: {esc.winner ? esc.winner.slice(0, 10) + "..." : "N/A"}</div>
                    </div>
                    <p className="text-[12px] italic" style={{ color: "var(--text-quaternary)" }}>Terms: {esc.terms}</p>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {esc.status === "pending" && address?.toLowerCase() === esc.party_b?.toLowerCase() && (
                        <button onClick={() => doAction("Accept", () => escrowAccept(address!, esc.escrow_id), esc.escrow_id)} className="px-3 py-1.5 rounded-lg text-[12px] transition-all hover:opacity-80" style={{ background: "var(--success)", color: "#fff", border: "none" }}>
                          Accept
                        </button>
                      )}
                      {esc.status === "active" && (address?.toLowerCase() === esc.party_a?.toLowerCase() || address?.toLowerCase() === esc.party_b?.toLowerCase()) && (
                        <>
                          <button onClick={() => doAction("Release", () => escrowRelease(address!, esc.escrow_id), esc.escrow_id)} className="px-3 py-1.5 rounded-lg text-[12px] transition-all hover:opacity-80" style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                            Release
                          </button>
                          <button onClick={() => {
                            const ev = disputeInputs[esc.escrow_id] || "";
                            if (!ev) return;
                            doAction("Dispute", () => escrowRaiseDispute(address!, esc.escrow_id, ev), esc.escrow_id);
                          }} className="px-3 py-1.5 rounded-lg text-[12px] transition-all hover:opacity-80" style={{ background: "var(--danger)", color: "#fff", border: "none" }}>
                            Raise Dispute
                          </button>
                        </>
                      )}
                      {(esc.status === "active" || esc.status === "disputed") && (
                        <div className="flex gap-2 items-center w-full mt-1">
                          <input value={disputeInputs[esc.escrow_id] || ""} onChange={(e) => setDisputeInputs((prev) => ({ ...prev, [esc.escrow_id]: e.target.value }))} placeholder="Your evidence..." className="flex-1 px-2 py-1.5 rounded-lg text-[12px] outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                        </div>
                      )}
                      {esc.status === "disputed" && (address?.toLowerCase() === esc.party_a?.toLowerCase() || address?.toLowerCase() === esc.party_b?.toLowerCase()) && (
                        <button onClick={() => doAction("Resolve", () => escrowResolve(address!, esc.escrow_id), esc.escrow_id)} className="px-3 py-1.5 rounded-lg text-[12px] transition-all hover:opacity-80" style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                          Resolve (AI Verdict)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {actionMsg && <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>{actionMsg}</p>}
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="mt-8">
            <p className="text-[12px] mb-2" style={{ color: "var(--text-quaternary)" }}>Transaction Log</p>
            <div className="rounded-xl p-3 max-h-32 overflow-y-auto" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
              {log.map((msg, i) => (
                <p key={i} className="text-[12px] leading-relaxed" style={{ color: "var(--text-quaternary)" }}>{msg}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
