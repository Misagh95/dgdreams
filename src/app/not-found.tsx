"use client";

import Link from "next/link";
import { m } from "framer-motion";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="text-center max-w-md">
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="kicker mb-3">404</p>
          <h1
            className="text-[32px] font-bold mb-3"
            style={{ color: "var(--text-bright)" }}
          >
            This page does not exist
          </h1>
          <p
            className="text-[16px] mb-8 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            The link may be old, or the page may have moved. Today&apos;s rituals
            are where it all happens.
          </p>
          <Link href="/dashboard" className="btn-primary">
            Go to Today
          </Link>
        </m.div>
      </div>
    </div>
  );
}
