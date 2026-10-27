"use client";

import Link from "next/link";
import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";
import {
  Globe,
  Flame,
  Shield,
  Gamepad2,
  ArrowRight,
  CheckCircle2,
  Trophy,
  Wallet,
} from "lucide-react";

/* -------------------------------------------------------------
   Landing: hero, the numbers, what it does, how it works, the
   networks it runs on, and a closing call to action.

   The tone is the same as the app: warm paper, one lime accent,
   and nothing moving that does not need to move.
   ------------------------------------------------------------- */

const features = [
  {
    icon: Globe,
    title: "23 networks, one place",
    desc: "Run the same daily rituals on Ethereum, Base, Arbitrum, BNB Chain, GenLayer and more without switching apps.",
    span: "lg:col-span-2",
  },
  {
    icon: Flame,
    title: "Streaks that pay off",
    desc: "Keep a daily streak. Hit seven days to mint a soulbound badge that climbs from Bronze to Legend.",
    span: "",
  },
  {
    icon: Shield,
    title: "GenLayer contracts",
    desc: "AI-validated price oracles and prediction markets, next to the EVM chains.",
    span: "",
  },
  {
    icon: Gamepad2,
    title: "2048, on chain",
    desc: "Play 2048, submit your score on chain and climb the leaderboard.",
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
    desc: "Run Check in, GM and GN on any supported network.",
  },
  {
    icon: Trophy,
    title: "Keep it up",
    desc: "Build your streak, mint your badge, climb the leaderboard.",
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
  { name: "Maroo", logo: "/logos/maroo.png" },
  { name: "DogeOS", logo: "/logos/dogeos.svg" },
  { name: "Elysium", logo: "/logos/elysium.svg" },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const reduced = useReducedMotion();

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Navbar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="DGDreams" width={28} height={28} />
          <span className="font-bold text-[16px]" style={{ color: "var(--text-bright)" }}>
            DGDreams
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1 text-[14px]">
          {[
            { href: "/dashboard", label: "Today" },
            { href: "/tasks", label: "Ritual" },
            { href: "/leaderboard", label: "Leaderboard" },
            { href: "/faq", label: "FAQ" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-[10px] transition-colors hover:bg-[var(--bg-strong)]"
              style={{ color: "var(--text-secondary)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="btn-primary">
          Open the app
          <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 sm:pt-24 pb-16 max-w-4xl mx-auto">
        <m.div {...fadeUp} transition={{ duration: 0.5 }}>
          <span
            className="inline-flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full text-[14px] font-medium"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
            }}
          >
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-contrast)]" />
            </span>
            A minute a day, on chain
          </span>
        </m.div>

        <m.h1
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="mt-7 mb-6 text-[32px] sm:text-[72px] font-bold leading-[1.04] tracking-[-0.04em]"
          style={{ color: "var(--text-bright)" }}
        >
          Your daily
          <br />
          <span className="mark">on-chain habit</span>
        </m.h1>

        <m.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="text-[16px] sm:text-[20px] max-w-2xl mb-9 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Connect once. Check in, say GM and GN across 23 networks, keep a
          streak and unlock soulbound badges.
        </m.p>

        <m.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <Link href="/dashboard" className="btn-primary">
            Start your streak
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/how" className="btn-ghost">
            How it works
          </Link>
        </m.div>

        {/* The numbers */}
        <m.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-lg mt-14"
        >
          {[
            { value: "23", label: "Networks" },
            { value: "3", label: "Daily rituals" },
            { value: "7d", label: "To first badge" },
          ].map((s) => (
            <div key={s.label} className="surface text-center py-4 px-2">
              <div
                className="text-[20px] sm:text-[32px] font-bold leading-none"
                style={{ color: "var(--text-bright)" }}
              >
                {s.value}
              </div>
              <div className="kicker mt-2">{s.label}</div>
            </div>
          ))}
        </m.div>
      </section>

      {/* The networks — a quiet, static strip */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="kicker text-center mb-5">Runs on</p>
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {networks.map((n) => (
              <li
                key={n.name}
                className="flex items-center gap-2 px-3 py-2 rounded-[12px] text-[14px] font-medium"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                }}
              >
                <Image
                  src={n.logo}
                  alt=""
                  width={16}
                  height={16}
                  // Both dimensions pinned so a non-square intrinsic ratio
                  // (GenLayer's viewBox is 97.76 x 91.93) can never trip
                  // next/image's "width or height modified" layout warning.
                  style={{ objectFit: "contain", width: "16px", height: "16px" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {n.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What it does */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <m.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <p className="kicker mb-3">What it does</p>
            <h2
              className="text-[20px] sm:text-[32px] font-bold mb-3"
              style={{ color: "var(--text-bright)" }}
            >
              Everything in one place
            </h2>
            <p className="text-[16px]" style={{ color: "var(--text-secondary)" }}>
              A daily routine that is quick to finish and easy to keep.
            </p>
          </m.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <m.div
                  key={f.title}
                  initial={reduced ? undefined : { opacity: 0, y: 16 }}
                  whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.05 }}
                  className={`surface p-6 ${f.span}`}
                >
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-[12px] mb-5"
                    style={{
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border-default)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </span>
                  <h3
                    className="font-bold text-[16px] mb-2"
                    style={{ color: "var(--text-bright)" }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="text-[14px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {f.desc}
                  </p>
                </m.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <m.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <p className="kicker mb-3">How it works</p>
            <h2
              className="text-[20px] sm:text-[32px] font-bold"
              style={{ color: "var(--text-bright)" }}
            >
              Three steps, every day
            </h2>
          </m.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <m.div
                  key={s.title}
                  initial={reduced ? undefined : { opacity: 0, y: 16 }}
                  whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="surface p-6 text-left"
                >
                  <div className="flex items-center justify-between mb-5">
                    <span
                      className="inline-flex items-center justify-center w-10 h-10 rounded-[12px]"
                      style={{
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <Icon className="w-5 h-5" strokeWidth={1.75} />
                    </span>
                    <span className="kicker">0{i + 1}</span>
                  </div>
                  <h3
                    className="font-bold text-[16px] mb-1.5"
                    style={{ color: "var(--text-bright)" }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="text-[14px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.desc}
                  </p>
                </m.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-16 px-6">
        <m.div
          initial={reduced ? undefined : { opacity: 0, y: 16 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="max-w-3xl mx-auto text-center surface rounded-[24px] p-10 sm:p-14"
        >
          <h2
            className="text-[20px] sm:text-[32px] font-bold mb-4"
            style={{ color: "var(--text-bright)" }}
          >
            Ready to start your streak?
          </h2>
          <p className="text-[16px] mb-8" style={{ color: "var(--text-secondary)" }}>
            Connect your wallet and finish today&apos;s rituals in under a minute.
          </p>
          <Link href="/dashboard" className="btn-primary">
            Open the app
            <ArrowRight className="w-4 h-4" />
          </Link>
        </m.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6">
        <div
          className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-6"
          style={{ borderTop: "1px solid var(--border-default)" }}
        >
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="DGDreams" width={20} height={20} />
            <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              DGDreams
            </span>
          </div>
          <div
            className="flex items-center gap-4 text-[12px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">
              Terms
            </Link>
            <Link href="/license" className="hover:text-[var(--text-secondary)] transition-colors">
              License
            </Link>
            <Link href="/faq" className="hover:text-[var(--text-secondary)] transition-colors">
              FAQ
            </Link>
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
