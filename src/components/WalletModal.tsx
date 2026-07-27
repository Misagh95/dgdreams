"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
}

const walletOptions = [
  { id: "metamask", name: "MetaMask", icon: "🦊", description: "Browser extension wallet", popular: true },
  { id: "walletconnect", name: "WalletConnect", icon: "🔗", description: "Scan QR with mobile wallet", popular: true },
  { id: "coinbase", name: "Coinbase Wallet", icon: "🔵", description: "Self-custody wallet by Coinbase", popular: false },
  { id: "rainbow", name: "Rainbow", icon: "🌈", description: "A fun, simple Ethereum wallet", popular: false },
  { id: "ledger", name: "Ledger", icon: "🔐", description: "Hardware wallet for maximum security", popular: false },
  { id: "phantom", name: "Phantom", icon: "👻", description: "Multi-chain wallet for Solana & EVM", popular: false },
];

type ConnectionState = "idle" | "connecting" | "success" | "error";

export default function WalletModal({ open, onClose }: WalletModalProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConnect = async (walletId: string) => {
    setSelectedWallet(walletId);
    setConnectionState("connecting");
    setErrorMsg("");

    // Simulate connection
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate random success/fail for demo
    if (walletId === "ledger") {
      setConnectionState("error");
      setErrorMsg("Hardware wallet not detected. Please connect your device and try again.");
    } else {
      setConnectionState("success");
      setTimeout(() => {
        onClose();
        setConnectionState("idle");
        setSelectedWallet(null);
      }, 1500);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setConnectionState("idle");
      setSelectedWallet(null);
      setErrorMsg("");
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
          >
            <div className="glass-panel rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(0,212,255,0.2)", boxShadow: "0 0 60px rgba(0,212,255,0.1), 0 25px 50px rgba(0,0,0,0.5)" }}>

              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-[#1a3a5c]/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(0,212,255,0.15)", border: "1px solid rgba(0,212,255,0.3)" }}>
                    <Wallet className="w-5 h-5 text-[#00d4ff]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#e2e8f0]">Connect Wallet</h2>
                    <p className="text-xs text-[#475569] font-mono">Select your preferred wallet</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#475569] hover:text-[#e2e8f0] hover:bg-[rgba(26,58,92,0.4)] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5">
                {connectionState === "idle" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-[#475569] font-mono mb-2 uppercase tracking-widest">Popular</p>
                    {walletOptions.filter((w) => w.popular).map((wallet) => (
                      <motion.button
                        key={wallet.id}
                        whileHover={{ x: 4 }}
                        onClick={() => handleConnect(wallet.id)}
                        className="flex items-center gap-3 p-3 rounded-xl text-left transition-all w-full"
                        style={{
                          background: "rgba(6,13,26,0.8)",
                          border: "1px solid rgba(26,58,92,0.5)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "rgba(0,212,255,0.3)";
                          e.currentTarget.style.background = "rgba(0,212,255,0.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "rgba(26,58,92,0.5)";
                          e.currentTarget.style.background = "rgba(6,13,26,0.8)";
                        }}
                      >
                        <span className="text-2xl w-8 h-8 flex items-center justify-center">{wallet.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-[#e2e8f0]">{wallet.name}</div>
                          <div className="text-xs text-[#475569]">{wallet.description}</div>
                        </div>
                        <span className="badge-cyan text-[10px]">Popular</span>
                      </motion.button>
                    ))}

                    <p className="text-xs text-[#475569] font-mono mt-2 mb-2 uppercase tracking-widest">Others</p>
                    {walletOptions.filter((w) => !w.popular).map((wallet) => (
                      <motion.button
                        key={wallet.id}
                        whileHover={{ x: 4 }}
                        onClick={() => handleConnect(wallet.id)}
                        className="flex items-center gap-3 p-3 rounded-xl text-left transition-all w-full"
                        style={{
                          background: "rgba(6,13,26,0.6)",
                          border: "1px solid rgba(26,58,92,0.3)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "rgba(0,212,255,0.2)";
                          e.currentTarget.style.background = "rgba(0,212,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "rgba(26,58,92,0.3)";
                          e.currentTarget.style.background = "rgba(6,13,26,0.6)";
                        }}
                      >
                        <span className="text-xl w-8 h-8 flex items-center justify-center">{wallet.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-[#94a3b8]">{wallet.name}</div>
                          <div className="text-xs text-[#334155]">{wallet.description}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {connectionState === "connecting" && (
                  <div className="flex flex-col items-center justify-center py-10 gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                        style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)" }}>
                        {walletOptions.find((w) => w.id === selectedWallet)?.icon}
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00d4ff] animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-[#e2e8f0]">Connecting to {walletOptions.find((w) => w.id === selectedWallet)?.name}</p>
                      <p className="text-sm text-[#475569] font-mono mt-1">Waiting for wallet approval...</p>
                    </div>
                    <Loader2 className="w-5 h-5 text-[#00d4ff] animate-spin" />
                  </div>
                )}

                {connectionState === "success" && (
                  <div className="flex flex-col items-center justify-center py-10 gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                    >
                      <CheckCircle2 className="w-16 h-16 text-[#00ff88]" style={{ filter: "drop-shadow(0 0 12px rgba(0,255,136,0.5))" }} />
                    </motion.div>
                    <div className="text-center">
                      <p className="font-bold text-[#e2e8f0]">Wallet Connected!</p>
                      <p className="text-sm text-[#475569] font-mono mt-1">0x742d...Cd5</p>
                    </div>
                  </div>
                )}

                {connectionState === "error" && (
                  <div className="flex flex-col items-center justify-center py-8 gap-4">
                    <AlertCircle className="w-14 h-14 text-[#ff4444]" style={{ filter: "drop-shadow(0 0 10px rgba(255,68,68,0.4))" }} />
                    <div className="text-center">
                      <p className="font-bold text-[#e2e8f0]">Connection Failed</p>
                      <p className="text-sm text-[#475569] font-mono mt-1 max-w-xs">{errorMsg}</p>
                    </div>
                    <button
                      onClick={() => setConnectionState("idle")}
                      className="btn-primary px-6"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              {connectionState === "idle" && (
                <div className="px-5 pb-5">
                  <div className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(6,13,26,0.6)", border: "1px solid rgba(26,58,92,0.3)" }}>
                    <p className="text-xs text-[#334155] font-mono">
                      🔒 Connections are encrypted and secured. We never store your private keys.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
