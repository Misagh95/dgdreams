"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("DGDreams application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-base)]">
      <div className="max-w-md w-full glass-panel rounded-2xl p-8 text-center border border-[var(--border-default)]">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5 text-red-400">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold mb-2 text-[var(--text-bright)]">
          System Anomaly Detected
        </h2>
        
        <p className="text-sm font-mono text-[var(--text-secondary)] mb-6 leading-relaxed">
          {error?.message || "An unexpected error occurred while interacting with the network."}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="btn-primary w-full sm:w-auto px-5 py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <button className="btn-ghost w-full px-5 py-2.5 text-xs font-semibold flex items-center justify-center gap-2">
              <Home className="w-3.5 h-3.5" />
              Return to Mission Control
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
