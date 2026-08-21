import { useState } from "react";
import GenLayerSpinner from "./GenLayerSpinner";

interface Props {
  address: string;
  onNewAccount: () => void;
}

export default function Header({ address, onNewAccount }: Props) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; fall back to no-op
    }
  };

  return (
    <header>
      <div className="brand">
        <GenLayerSpinner
          size={38}
          color="#5c9dff"
          animated={false}
          label="GenLayer mark"
        />
        <div>
          <h1>TruthCourt</h1>
          <p className="muted">Decentralized fact-check bounty market</p>
          <span className="network-tag">
            <span className="pulse" /> Testnet · Bradbury
          </span>
        </div>
      </div>
      <div className="account">
        <span className="chip" title={address || undefined}>
          {address || "no account"}
        </span>
        <button className="ghost" onClick={copyAddress}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button className="ghost" onClick={onNewAccount}>
          New account
        </button>
      </div>
    </header>
  );
}