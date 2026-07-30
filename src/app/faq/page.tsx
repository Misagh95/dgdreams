"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Wallet,
  Zap,
  Shield,
  Gamepad2,
  Globe,
  Star,
  BarChart3,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const faqs = [
  {
    category: "Getting Started",
    icon: Wallet,
    color: "#00d4ff",
    items: [
      { q: "What is DGDreams?", a: "DGDreams is a cross-chain on-chain operations dashboard that gamifies daily Web3 activity. It tracks your streaks, points, and transactions across 13 EVM networks through a unified mission-control interface." },
      { q: "How do I connect my wallet?", a: "Click the 'Connect Wallet' button in the top bar or profile page. DGDreams supports any wallet through RainbowKit — MetaMask, WalletConnect, Rainbow, Ledger, and more." },
      { q: "Which networks are supported?", a: "We support 7 mainnets (Base, HyperEVM, Unichain, Tempo, Robinhood Chain, Ethereum, Ink) and 6 testnets (Sepolia, Base Sepolia, GIWA Sepolia, LITVM Liteforge, ARC Testnet, SimpleChain)." },
    ],
  },
  {
    category: "Points & Streaks",
    icon: Star,
    color: "#ffaa00",
    items: [
      { q: "How do I earn points?", a: "Points are earned by completing on-chain actions: daily tasks (+10 pts each), maintaining streaks (+5 pts per day), playing 2048 (+50 pts per game), and high score bonuses." },
      { q: "What is the streak system?", a: "Your streak tracks consecutive days of on-chain activity. A 7-day streak unlocks soulbound NFT minting. Streaks are tracked per wallet on the NikBase contract." },
      { q: "How are LITVM points calculated?", a: "LITVM points combine: Task Actions (totalAct × 10), Streak Bonus (streak × 5), Game Plays (playCount × 50), and Score Bonus (highScore ÷ 100). Total is viewable at /litevm." },
    ],
  },
  {
    category: "Daily Tasks",
    icon: Zap,
    color: "#8b5cf6",
    items: [
      { q: "What are daily tasks?", a: "Daily tasks are on-chain actions you perform on supported networks. Each network has 9 tasks per day. Complete all 9 to mark the day as done. Tasks include check-ins, actions, and interactions with NikBase contracts." },
      { q: "How do I start a task?", a: "Go to /tasks, select a network, and click 'Start Daily Tasks'. The task panel will guide you through each action. You must be connected to the correct network." },
      { q: "What happens if I switch networks?", a: "You can switch networks at any time. Your progress is saved per network. Each network has its own 9-task counter and streak." },
    ],
  },
  {
    category: "2048 Game",
    icon: Gamepad2,
    color: "#a855f7",
    items: [
      { q: "How does on-chain 2048 work?", a: "Every game play records your score to the Game2048 contract. Scores are permanently stored on-chain. Your play count and high score are tracked across all supported networks." },
      { q: "What are the milestones?", a: "Milestones are unlocked at tile values: 16, 32, 64, 128, 256, 512, 1024, and 2048. Each milestone is recorded on-chain as a badge of achievement." },
      { q: "Can I play on any network?", a: "2048 is deployed on 11+ networks. Use the network selector in the game UI to choose which chain to record your score on." },
    ],
  },
  {
    category: "Security",
    icon: Shield,
    color: "#00ff88",
    items: [
      { q: "Is my wallet safe?", a: "DGDreams never holds your private keys. All transactions are signed by your wallet. Always verify the network and contract address before signing." },
      { q: "What contracts do you use?", a: "We use NikBase contracts for daily tasks and Game2048 contracts for game scoring. All contracts are open-source and verified on their respective block explorers." },
      { q: "How is my data stored?", a: "On-chain data (scores, streaks, actions) is stored permanently on the blockchain. Off-chain preferences (social links, settings) are stored in your browser's localStorage." },
    ],
  },
  {
    category: "Networks & Gas",
    icon: Globe,
    color: "#627eea",
    items: [
      { q: "How do I add a custom network?", a: "You can configure custom RPC URLs and chain IDs through your wallet provider. Popular EVM networks are supported out of the box." },
      { q: "Which network has the lowest gas?", a: "Base and most L2s (HyperEVM, Unichain, Tempo) have sub-cent gas fees. Ethereum mainnet gas varies based on network congestion." },
    ],
  },
];

export default function FaqPage() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  return (
    <DashboardLayout title="FAQ" subtitle="// frequently asked questions">
      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((cat) => {
          const Icon = cat.icon;
          const isOpen = openCategory === cat.category;

          return (
            <div key={cat.category} className="glass-panel rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenCategory(isOpen ? null : cat.category)}
                className="w-full flex items-center gap-3 p-4 hover:bg-[rgba(0,212,255,0.04)] transition-colors"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}33` }}>
                  <Icon className="w-4 h-4" style={{ color: cat.color }} />
                </div>
                <span className="flex-1 font-semibold text-sm text-[#e2e8f0] text-left">
                  {cat.category}
                </span>
                <span className="text-[10px] font-mono text-[#475569]">{cat.items.length} topics</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 flex flex-col gap-2 border-t border-[#1a3a5c]/30 pt-3">
                      {cat.items.map((item) => {
                        const qOpen = openQuestion === item.q;
                        return (
                          <div key={item.q} className="rounded-xl overflow-hidden"
                            style={{ background: "rgba(6,13,26,0.6)", border: "1px solid rgba(26,58,92,0.3)" }}>
                            <button
                              onClick={() => setOpenQuestion(qOpen ? null : item.q)}
                              className="w-full flex items-center justify-between p-3 text-left"
                            >
                              <span className="text-sm text-[#94a3b8] font-medium">{item.q}</span>
                              {qOpen ? <ChevronUp className="w-3.5 h-3.5 text-[#475569] shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[#475569] shrink-0" />}
                            </button>
                            <AnimatePresence>
                              {qOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <p className="px-3 pb-3 text-xs text-[#64748b] leading-relaxed font-mono">
                                    {item.a}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
