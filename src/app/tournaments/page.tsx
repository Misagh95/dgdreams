"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import DashboardLayout from "@/components/DashboardLayout";
import { shortenAddress } from "@/lib/utils";

interface Tournament {
  id: number;
  name: string;
  gameType: string;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  status: string;
  startsAt: string;
  endsAt: string;
  createdBy: string;
}

interface Entry {
  id: number;
  walletAddress: string;
  score: number;
  bestTile: number;
  rank: number | null;
  prize: number;
}

export default function TournamentsPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", entryFee: "0", maxPlayers: "100", durationHours: "24" });

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json();
      setTournaments(data.tournaments || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchEntries = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/tournaments/${id}/entries`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  useEffect(() => {
    if (selectedId) fetchEntries(selectedId);
  }, [selectedId, fetchEntries]);

  const handleCreate = async () => {
    if (!address) return;
    setMsg(null);
    const startsAt = new Date();
    const endsAt = new Date(Date.now() + parseInt(form.durationHours) * 3600000);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          entryFee: parseInt(form.entryFee) || 0,
          maxPlayers: parseInt(form.maxPlayers) || 100,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          createdBy: address,
        }),
      });
      const data = await res.json();
      if (data.error) { setMsg(data.error); return; }
      setMsg(`Tournament "${form.name}" created!`);
      setShowCreate(false);
      setForm({ name: "", entryFee: "0", maxPlayers: "100", durationHours: "24" });
      fetchTournaments();
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  if (!isConnected) {
    return (
      <DashboardLayout title="Tournaments">
        <div className="flex items-center justify-center h-64">
          <button onClick={openConnectModal} className="px-6 py-3 rounded-xl text-sm font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
            Connect Wallet
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tournaments">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: "#F59E0B" }} />
            <h1 className="text-lg font-mono font-semibold" style={{ color: "var(--text-primary)" }}>2048 Tournaments</h1>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 rounded-xl text-xs font-mono transition-all hover:opacity-80" style={{ background: "var(--bg-strong)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
            {showCreate ? "Cancel" : "+ New Tournament"}
          </button>
        </div>

        {showCreate && (
          <div className="rounded-xl p-6 mb-6 space-y-3" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Weekend Showdown" className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Entry Fee (pts)</label>
                <input type="number" value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Max Players</label>
                <input type="number" value={form.maxPlayers} onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Duration (hrs)</label>
                <input type="number" value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-mono outline-none" style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
              </div>
            </div>
            <button onClick={handleCreate} disabled={!form.name} className="px-6 py-2.5 rounded-xl text-xs font-mono transition-all hover:opacity-80 disabled:opacity-40" style={{ background: "#F59E0B", color: "#000", border: "none" }}>
              Create Tournament
            </button>
            {msg && <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{msg}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h2 className="text-xs font-mono mb-3" style={{ color: "var(--text-secondary)" }}>Active Tournaments</h2>
            {loading ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>Loading...</p>
            ) : tournaments.length === 0 ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>No active tournaments. Create one!</p>
            ) : (
              <div className="space-y-2">
                {tournaments.map((t) => {
                  const endsAt = new Date(t.endsAt);
                  const remaining = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 3600000));
                  return (
                    <button key={t.id} onClick={() => setSelectedId(t.id)} className="w-full text-left rounded-xl p-4 transition-all" style={{
                      background: selectedId === t.id ? "var(--bg-strong)" : "transparent",
                      border: selectedId === t.id ? "1px solid var(--border)" : "1px solid transparent",
                    }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>{t.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, #10B981 15%, transparent)", color: "#10B981" }}>
                          {remaining}h left
                        </span>
                      </div>
                      <div className="flex gap-3 text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
                        <span>Prize: {t.prizePool} pts</span>
                        <span>Entry: {t.entryFee} pts</span>
                        <span>Players: {t.maxPlayers}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xs font-mono mb-3" style={{ color: "var(--text-secondary)" }}>
              {selectedId ? "Leaderboard" : "Select a tournament"}
            </h2>
            {selectedId && entries.length > 0 ? (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr style={{ background: "var(--bg-strong)" }}>
                      <th className="py-2 px-3 text-left" style={{ color: "var(--text-quaternary)" }}>#</th>
                      <th className="py-2 px-3 text-left" style={{ color: "var(--text-quaternary)" }}>Player</th>
                      <th className="py-2 px-3 text-right" style={{ color: "var(--text-quaternary)" }}>Score</th>
                      <th className="py-2 px-3 text-right" style={{ color: "var(--text-quaternary)" }}>Tile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={e.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{i + 1}</td>
                        <td className="py-2 px-3" style={{ color: "var(--text-primary)" }}>{shortenAddress(e.walletAddress)}</td>
                        <td className="py-2 px-3 text-right" style={{ color: e.walletAddress === address ? "#F59E0B" : "var(--text-primary)" }}>{e.score.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right" style={{ color: "var(--text-secondary)" }}>{e.bestTile}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : selectedId ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-quaternary)" }}>No entries yet. Go play 2048!</p>
            ) : null}
          </div>
        </div>

        <div className="mt-8 rounded-xl p-4" style={{ background: "var(--bg-strong)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "#F59E0B" }}>&#9654;</span> Play 2048 during an active tournament to submit your score.
            Your best score is automatically recorded. Higher score = better rank!
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
