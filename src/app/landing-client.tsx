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
  ArrowRight,
  CheckCircle2,
  Sunrise,
  MoonStar,
  Trophy,
  Wallet,
  Sparkles,
} from "lucide-react";
import SpaceBackground from "@/components/SpaceBackground";

/* -------------------------------------------------------------
   Landing: hero, live stats, bento feature grid, how-it-works,
   network marquee and a closing call to action.
   ------------------------------------------------------------- */

const features = [
  {
    icon: Globe,
    title: "20 networks, one dashboard",
    desc: "Run the same daily tasks on Ethereum, Base, Arbitrum, BNB Chain, GenLayer and more without switching apps.",
    color: "#6F75E5",
    span: "lg:col-span-2",
  },
  {
    icon: Flame,
    title: "Streaks that pay off",
    desc: "Keep a daily streak. Hit 7 days to mint a soulbound badge that upgrades from Bronze to Legend.",
    color: "#F59E0B",
    span: "",
  },
  {
    icon: Shield,
    title: "GenLayer AI contracts",
    desc: "Python intelligent contracts with AI-validator consensus, price oracles and prediction markets.",
    color: "#3B82F6",
    span: "",
  },
  {
    icon: Gamepad2,
    title: "2048, on-chain",
    desc: "Play 2048, submit your score on-chain and climb the leaderboard.",
    color: "#00D4AA",
    span: "lg:col-span-2",
  },
];

const steps = [
  {
    icon: Wallet,
    title: "Connect",
    desc: "Link your wallet once. No sign-up, no email.",
  },
  {
    icon: CheckCircle2,
    title: "Check in",
    desc: "Run Daily Check, GM and GN on any supported network.",
  },
  {
    icon: Trophy,
    title: "Level up",
    desc: "Build your streak, mint your badge and climb the leaderboard.",
  },
];

const networks = [
  { name: "Ethereum", logo: "/logos/ethereum.png" },
  { name: "Base", logo: "/logos/base.svg" },
  { name: "Arbitrum", logo: "/logos/arbitrum.png" },
  { name: "OP Mainnet", logo: "/logos/optimism.png" },
  { name: "HyperEVM", logo: "/logos/hyperliquid.png" },
  { name: "BNB Chain", logo: "/logos/bnb.svg" },
  { name: "Unichain", logo: "/logos/unichain.png" },
  { name: "Arc", logo: "/logos/arc.png" },
  { name: "GenLayer", logo: "/logos/genlayer.svg" },
  { name: "Tempo", logo: "/logos/tempo.png" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const reduced = useReducedMotion();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <SpaceBackground />

      {/* Navbar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.svg" alt="DGDreams" width={32} height={32} />
          <span className="font-bold text-lg" style={{ color: "var(--text-bright)" }}>
            DGDreams
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1 text-sm">
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/tasks", label: "Tasks" },
            { href: "/leaderboard", label: "Leaderboard" },
            { href: "/faq", label: "FAQ" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-xl transition-colors hover:bg-[var(--bg-strong)] hover:text-[var(--text-bright)]"
              style={{ color: "var(--text-secondary)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="btn-primary text-sm px-5 py-2.5">
          Launch app
          <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-14 sm:pt-20 pb-16 max-w-4xl mx-auto">
        <motion.div {...fadeUp} transition={{ duration: 0.6 }}>
          <div
            className="inline-flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full text-xs font-medium mb-7"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
            >
              <Sparkles className="w-3 h-3" />
            </span>
            Daily on-chain activity, made fun
          </div>
        </motion.div>

        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6"
          style={{ color: "var(--text-bright)" }}
        >
          Your on-chain
          <br />
          <motion.span
            style={{
              background: "linear-gradient(90deg, #D0FF94 0%, #6F75E5 25%, #FF68F0 50%, #D0FF94 75%, #6F75E5 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            animate={reduced ? undefined : { backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            daily habit hub
          </motion.span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="text-base sm:text-lg max-w-2xl mb-10 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Connect once. Check in, say GM and GN across 20 networks, build a streak and
          unlock soulbound badges. Takes about a minute a day.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.24 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <Link href="/dashboard" className="btn-primary text-base px-8 py-3.5">
            Start your streak
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/faq" className="btn-ghost text-base px-8 py-3.5">
            How it works
          </Link>
        </motion.div>

        {/* Live stats */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.32 }}
          className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-xl mt-14"
        >
          {[
            { value: "20", label: "Networks" },
            { value: "3", label: "Daily tasks" },
            { value: "7d", label: "To first badge" },
          ].map((s) => (
            <div key={s.label} className="surface text-center py-4 px-2">
              <div className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text-bright)" }}>
                {s.value}
              </div>
              <div className="kicker mt-1 !text-[0.6rem] sm:!text-[0.68rem] !text-[var(--text-tertiary)]">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Network marquee */}
      <section className="relative z-10 py-8 overflow-hidden">
        <p className="kicker text-center mb-5" style={{ color: "var(--text-tertiary)" }}>
          Supported networks
        </p>
        <div
          className="flex gap-3 w-max"
          style={{
            animation: reduced ? undefined : "marquee 40s linear infinite",
          }}
        >
          {[...networks, ...networks].map((n, i) => (
            <div
              key={`${n.name}-${i}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
              }}
            >
              <Image
                src={n.logo}
                alt=""
                width={18}
                height={18}
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
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </section>

      {/* Bento features */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <p className="kicker mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: "var(--text-bright)" }}>
              Everything in one place
            </h2>
            <p className="text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
              A daily routine that is quick to finish and fun to keep up.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={reduced ? undefined : { opacity: 0, y: 20 }}
                  whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  whileHover={reduced ? undefined : { y: -4 }}
                  className={`surface p-6 relative overflow-hidden ${f.span}`}
                >
                  <div
                    className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none opacity-30"
                    style={{ background: `radial-gradient(circle, ${f.color} 0%, transparent 70%)` }}
                  />
                  <div
                    className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                    style={{
                      background: `color-mix(in srgb, ${f.color} 15%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${f.color} 30%, transparent)`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="relative font-bold text-lg mb-2" style={{ color: "var(--text-bright)" }}>
                    {f.title}
                  </h3>
                  <p className="relative text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {f.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <p className="kicker mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: "var(--text-bright)" }}>
              Three steps, every day
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.title}
                  initial={reduced ? undefined : { opacity: 0, y: 20 }}
                  whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="surface p-6 text-left"
                >
                  <div className="flex items-center justify-between mb-5">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    </span>
                    <span className="kicker !text-[var(--text-quaternary)]">0{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1.5" style={{ color: "var(--text-bright)" }}>
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {s.desc}
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
          initial={reduced ? undefined : { opacity: 0, y: 20 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center surface rounded-3xl p-10 sm:p-14 relative overflow-hidden"
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.12]"
            style={{ background: "var(--theme-gradient)" }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: "var(--text-bright)" }}>
              Ready to start your streak?
            </h2>
            <p className="text-sm sm:text-base mb-8" style={{ color: "var(--text-secondary)" }}>
              Connect your wallet and finish today&apos;s missions in under a minute.
            </p>
            <Link href="/dashboard" className="btn-primary text-base px-10 py-4">
              Launch dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-6" style={{ borderTop: "1px solid var(--border-default)" }}>
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
