"use client";

import { useCallback, useState } from "react";
import { useConfig, useSwitchChain } from "wagmi";
import { encodeFunctionData, isAddress } from "viem";
import { CheckCircle2, ExternalLink, Loader2, MousePointerClick } from "lucide-react";
import type { NetworkConfig } from "@/config/chains";

/**
 * Free-form interaction with the three contracts the 6-in-1 runner deployed.
 *
 * Unlike the daily missions (Check-In / GM / GN on NikBase, once per UTC day),
 * these contracts enforce NO time limit: DGDemo.gm(), DGLiteToken.transfer()
 * and DGLiteNft.mint() can be called as often as the wallet likes — each call
 * is just a normal transaction the user signs. This panel shows one row per
 * deployed contract with a single action button, so the user can poke their
 * own contracts any time after the run, not only once per 24h.
 */

const DGDEMO_ABI = [
  { type: "function", name: "gm", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "string" }] },
] as const;

const TOKEN_ABI = [
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

const NFT_ABI = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

type PendingMap = Record<string, boolean>;
type TxMap = Record<string, `0x${string}`>;
type ErrMap = Record<string, string>;

export function DeployedContractActions({
  target,
  account,
  deployed,
}: {
  target: NetworkConfig | undefined;
  account: `0x${string}` | undefined;
  /** artifact key -> contract address, for THIS wallet on THIS chain */
  deployed: Record<string, string>;
}) {
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const [tokenTo, setTokenTo] = useState("");
  const [tokenAmount, setTokenAmount] = useState("1");
  const [pending, setPending] = useState<PendingMap>({});
  const [txs, setTxs] = useState<TxMap>({});
  const [errors, setErrors] = useState<ErrMap>({});

  const send = useCallback(
    async (key: string, to: string, data: `0x${string}`) => {
      if (!target || !account) return;
      setPending((p) => ({ ...p, [key]: true }));
      setErrors((e) => ({ ...e, [key]: "" }));
      try {
        const state = wagmiConfig.state;
        const conn = state.current ? state.connections.get(state.current) : undefined;
        const provider = (await conn?.connector?.getProvider()) as
          | { request: (a: { method: string; params?: readonly unknown[] }) => Promise<unknown> }
          | undefined;
        if (!provider?.request) throw new Error("No wallet provider available");
        // make sure the wallet is on the chain the contract lives on
        try {
          const chainIdHex = (await provider.request({ method: "eth_chainId" })) as string;
          if (parseInt(chainIdHex, 16) !== target.id) {
            await switchChainAsync({ chainId: target.id });
          }
        } catch {
          try {
            await switchChainAsync({ chainId: target.id });
          } catch {
            /* user rejected the switch; the send below will surface it */
          }
        }
        const hash = (await provider.request({
          method: "eth_sendTransaction",
          params: [{ from: account, to, data }],
        })) as `0x${string}`;
        setTxs((t) => ({ ...t, [key]: hash }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setErrors((prev) => ({
          ...prev,
          [key]: /user rejected|denied/i.test(msg) ? "Rejected in wallet" : msg.slice(0, 140),
        }));
      } finally {
        setPending((p) => ({ ...p, [key]: false }));
      }
    },
    [target, account, wagmiConfig, switchChainAsync]
  );

  const sayGm = () =>
    send("DGDemo", deployed["DGDemo"], encodeFunctionData({ abi: DGDEMO_ABI, functionName: "gm", args: [] }));

  const transferToken = () => {
    if (!isAddress(tokenTo) || !tokenValid) return;
    const [whole = "0", frac = ""] = tokenAmount.split(".");
    if (!/^\d+$/.test(whole) || !/^\d*$/.test(frac)) return;
    const value = BigInt(whole || "0") * 10n ** 18n + BigInt((frac + "0".repeat(18)).slice(0, 18) || "0");
    send(
      "DGLiteToken",
      deployed["DGLiteToken"],
      encodeFunctionData({ abi: TOKEN_ABI, functionName: "transfer", args: [tokenTo as `0x${string}`, value] })
    );
  };

  const mintNft = () =>
    send(
      "DGLiteNft",
      deployed["DGLiteNft"],
      encodeFunctionData({ abi: NFT_ABI, functionName: "mint", args: [account as `0x${string}`] })
    );

  const tokenValid = isAddress(tokenTo) && Number(tokenAmount) > 0 && Number.isFinite(Number(tokenAmount));

  const rows = [
    { key: "DGDemo", label: "Simple", action: "Say gm", hint: "calls gm() — no limit", addr: deployed["DGDemo"], valid: true, run: sayGm, busy: !!pending["DGDemo"] },
    { key: "DGLiteToken", label: "Token", action: "Transfer", hint: "calls transfer(to, amount) — no limit", addr: deployed["DGLiteToken"], valid: tokenValid, run: transferToken, busy: !!pending["DGLiteToken"] },
    { key: "DGLiteNft", label: "NFT", action: "Mint to me", hint: "calls mint(me) — no limit", addr: deployed["DGLiteNft"], valid: !!account, run: mintNft, busy: !!pending["DGLiteNft"] },
  ].filter((r) => r.addr && isAddress(r.addr));
  if (rows.length === 0 || !account) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
        Transact any time — these contracts have no daily limit:
      </p>
      {rows.map((r) => (
        <div
          key={r.key}
          className="px-2.5 py-2 rounded-lg"
          style={{ background: "var(--bg-subtle)", border: "1px solid color-mix(in srgb, var(--success) 22%, transparent)" }}
        >
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span className="text-[11px] font-mono font-semibold" style={{ color: "var(--text-secondary)" }}>
              {r.label}
            </span>
            <span className="text-[9px] font-mono" style={{ color: "var(--text-quaternary)" }}>
              {r.hint}
            </span>
            <span className="flex-1" />
            <a
              href={`${target?.blockExplorers.default.url}/address/${r.addr}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono truncate max-w-[90px]"
              style={{ color: "var(--accent)" }}
            >
              {r.addr!.slice(0, 10)}...
            </a>
            <button
              type="button"
              onClick={r.run}
              disabled={r.busy || !r.valid}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all disabled:opacity-40"
              style={{ background: "var(--success)", color: "#000" }}
            >
              {r.busy && <Loader2 className="w-3 h-3 animate-spin" />}
              {r.busy ? "Signing…" : r.action}
            </button>
          </div>
          {r.key === "DGLiteToken" && (
            <div className="flex gap-1.5 mt-1.5">
              <input
                value={tokenTo}
                onChange={(e) => setTokenTo(e.target.value.trim())}
                placeholder="to 0x…"
                spellCheck={false}
                className="flex-1 min-w-0 px-2 py-1 rounded-md text-[10px] font-mono outline-none"
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${tokenTo && !isAddress(tokenTo) ? "#ff4444" : "var(--border-default)"}`,
                  color: "var(--text-primary)",
                }}
              />
              <input
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value.trim())}
                placeholder="1"
                inputMode="decimal"
                className="w-16 px-2 py-1 rounded-md text-[10px] font-mono outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              />
            </div>
          )}
          {txs[r.key] && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: "var(--success)" }} />
              <a
                href={`${target?.blockExplorers.default.url}/tx/${txs[r.key]}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-mono"
                style={{ color: "var(--accent)" }}
              >
                {txs[r.key].slice(0, 14)}... <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {errors[r.key] && (
            <p className="text-[10px] font-mono mt-1.5" style={{ color: "#ff9a9a" }}>
              {errors[r.key]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default DeployedContractActions;
