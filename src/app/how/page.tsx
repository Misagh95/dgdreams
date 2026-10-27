import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import TourFilm from "@/components/how/TourFilm";

export const metadata: Metadata = {
  title: "How DGDreams works — a 33-second tour",
  description:
    "Watch the console and the gallery run: the six-in-one mission run on /app, a LI.FI swap on the same page, then a free soulbound badge on /gallery.",
};

/**
 * The tour.
 *
 * A filmed walkthrough rather than a wall of steps: one screen, seven
 * chapters, the exact flow a first-time visitor goes through. Standalone like
 * the landing page — the app's rails would compete with the film.
 */
export default function HowPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-base)" }}
    >
      <header className="flex w-full max-w-6xl items-center justify-between mx-auto px-4 sm:px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="DGDreams" width={26} height={26} />
          <span
            className="text-[16px] font-bold"
            style={{ color: "var(--text-bright)" }}
          >
            DGDreams
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/faq" className="hidden sm:inline-flex btn-ghost">
            FAQ
          </Link>
          <Link href="/dashboard" className="btn-primary">
            Open the app
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
        </nav>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 pb-16">
        <section className="mx-auto max-w-4xl pt-6 sm:pt-10 pb-8 text-center">
          <p className="kicker">How it works</p>
          <h1
            className="mx-auto mt-2 max-w-[24ch] text-[32px] font-bold leading-[1.06] tracking-[-0.04em] sm:text-[48px] sm:leading-[1.02]"
            style={{ color: "var(--text-bright)" }}
          >
            The whole ritual, <span className="mark">in one loop</span>
          </h1>
          <p
            className="mx-auto mt-4 max-w-[56ch] text-[16px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Half a minute of the two pages that do the work: the console at
            /app, then the badge gallery at /gallery — same cards, same states,
            same order of operations as the live site.
          </p>
        </section>

        <TourFilm />

        <section className="mx-auto mt-14 max-w-4xl">
          <div
            className="flex flex-col gap-4 rounded-[20px] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div>
              <h2
                className="text-[16px] font-bold"
                style={{ color: "var(--text-bright)" }}
              >
                Prefer reading?
              </h2>
              <p
                className="mt-1 text-[14px]"
                style={{ color: "var(--text-secondary)" }}
              >
                The same two pages, open in a tab and ready to use.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { href: "/app", label: "/app" },
                { href: "/gallery", label: "/gallery" },
                { href: "/faq", label: "FAQ" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg-strong)]"
                  style={{
                    border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {l.label}
                  <ArrowRight className="w-3 h-3" strokeWidth={2} />
                </Link>
              ))}
            </div>
          </div>

          <div
            className="mt-6 flex flex-col items-center justify-between gap-3 pt-5 sm:flex-row"
            style={{ borderTop: "1px solid var(--border-default)" }}
          >
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="" width={18} height={18} />
              <span
                className="text-[12px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                DGDreams — a minute a day, on chain
              </span>
            </div>
            <div
              className="flex items-center gap-4 text-[12px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <Link href="/terms" className="hover:text-[var(--text-secondary)]">
                Terms
              </Link>
              <Link href="/license" className="hover:text-[var(--text-secondary)]">
                License
              </Link>
              <Link href="/" className="hover:text-[var(--text-secondary)]">
                Home
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
