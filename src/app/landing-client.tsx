"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Zap,
  Globe,
  Flame,
  Shield,
  Gamepad2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import SpaceBackground from "@/components/SpaceBackground";

const features = [
  {
    icon: Globe,
    title: "17 Blockchain Networks",
    desc: "Execute daily tasks across Ethereum, Base, HyperEVM, BNB Chain, GenLayer and more — all from one dashboard.",
    color: "#6F75E5",
  },
  {
    icon: Flame,
    title: "Daily Streak Rewards",
    desc: "Build your on-chain streak. Mint soulbound NFTs at 7-day milestones — Bronze through Legend tier.",
    color: "#F59E0B",
  },
  {
    icon: Shield,
    title: "GenLayer AI Contracts",
    desc: "Python-based Intelligent Contracts with AI-validator consensus. Price oracles, prediction markets and more.",
    color: "#3B82F6",
  },
  {
    icon: Gamepad2,
    title: "2048 On-Chain Game",
    desc: "Play 2048, submit scores on-chain, climb the leaderboard and compete in tournaments.",
    color: "#00D4AA",
  },
];

const networkLogos = [
  { name: "Ethereum", logo: "/logos/ethereum.png", color: "#627eea" },
  { name: "Base", logo: "/logos/base.svg", color: "#0052ff" },
  { name: "HyperEVM", logo: "/logos/hyperliquid.png", color: "#FF6B6B" },
  { name: "BNB Chain", logo: "/logos/bnb.svg", color: "#F0B90B" },
  { name: "Unichain", logo: "/logos/unichain.png", color: "#FF007A" },
  { name: "Arc", logo: "/logos/arc.png", color: "#00D4AA" },
  { name: "GenLayer", logo: "/logos/genlayer.svg", color: "#110FFF" },
  { name: "Tempo", logo: "/logos/tempo.png", color: "#00D4AA" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const reduced = useReducedMotion();

  return (
    <div className="min-h-screen relative" style={{ background: "var(--bg-base)" }}>
      <SpaceBackground />

      {/* Navbar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.svg" alt="DGDreams" width={32} height={32} />
          <span className="font-bold text-lg" style={{ color: "var(--text-bright)" }}>
            DGDreams
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm" style={{ color: "var(--text-secondary)" }}>
          <Link href="/dashboard" className="hover:text-[var(--text-bright)] transition-colors">
            Dashboard
          </Link>
          <Link href="/tasks" className="hover:text-[var(--text-bright)] transition-colors">
            Tasks
          </Link>
          <Link href="/leaderboard" className="hover:text-[var(--text-bright)] transition-colors">
            Leaderboard
          </Link>
          <Link href="/faq" className="hover:text-[var(--text-bright)] transition-colors">
            FAQ
          </Link>
        </nav>
        <Link href="/dashboard">
          <button className="btn-primary text-sm px-5 py-2.5">
            Launch App
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 sm:pt-24 pb-20 max-w-4xl mx-auto">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6 }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{
              background: "color-mix(in srgb, var(--accent) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              color: "var(--accent)",
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            Multi-chain daily activity terminal
          </div>
        </motion.div>

        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6"
          style={{ color: "var(--text-bright)" }}
        >
          Your On-Chain{" "}
          <motion.span
            style={{
              background: "linear-gradient(90deg, #D0FF94 0%, #6F75E5 25%, #FF68F0 50%, #D0FF94 75%, #6F75E5 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            animate={{
              backgroundPosition: ["0% 0%", "200% 0%"],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            Activity Hub
          </motion.span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="text-base sm:text-lg max-w-2xl mb-10 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Connect your wallet once. Execute daily check-ins, GM and GN tasks across
          17 blockchain networks. Build streaks, earn soulbound NFTs, and climb the leaderboard.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.24 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link href="/dashboard">
            <button className="btn-primary text-base px-8 py-3.5">
              Get Started
              <ChevronRight className="w-5 h-5" />
            </button>
          </Link>
          <Link href="/faq">
            <button className="btn-ghost text-base px-8 py-3.5">
              Learn More
            </button>
          </Link>
        </motion.div>
      </section>

      {/* Supported Networks */}
      <section className="relative z-10 py-12 px-6">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-4xl mx-auto text-center"
        >
          <p
            className="text-xs font-mono uppercase tracking-widest mb-6"
            style={{ color: "var(--text-tertiary)" }}
          >
            Supported Networks
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {networkLogos.map((n) => (
              <div
                key={n.name}
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                style={{
                  background: "color-mix(in srgb, var(--bg-card) 80%, transparent)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <Image
                  src={n.logo}
                  alt={n.name}
                  width={20}
                  height={20}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {n.name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--text-bright)" }}>
              Everything You Need
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              One dashboard for all your daily on-chain activities
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={reduced ? undefined : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
                  className="glass-card glass-panel-hover spotlight rounded-2xl p-6 enhanced-card"
                  whileHover={reduced ? undefined : { 
                    scale: 1.03,
                    boxShadow: `0 20px 60px -15px color-mix(in srgb, ${f.color} 35%, transparent)`,
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: `color-mix(in srgb, ${f.color} 15%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${f.color} 30%, transparent)`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="font-semibold text-base mb-2" style={{ color: "var(--text-bright)" }}>
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {f.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-6">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center glass-panel rounded-3xl p-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: "var(--text-bright)" }}>
            Ready to Start?
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Connect your wallet and start building your on-chain streak today.
          </p>
          <Link href="/dashboard">
            <button className="btn-primary text-base px-10 py-4">
              Launch Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 text-center">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="DGDreams" width={20} height={20} />
            <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
              DGDreams v2.1
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">Terms</Link>
            <Link href="/license" className="hover:text-[var(--text-secondary)] transition-colors">License</Link>
            <Link href="/faq" className="hover:text-[var(--text-secondary)] transition-colors">FAQ</Link>
            <a
              href="https://github.com/Misagh95/dgdreams"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-secondary)] transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
