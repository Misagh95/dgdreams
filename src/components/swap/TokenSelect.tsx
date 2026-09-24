"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown } from "lucide-react";
import type { LifiToken } from "@/lib/lifi";

export function TokenLogo({ t }: { t: LifiToken }) {
  return (
    <span
      className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ background: "var(--bg-subtle)" }}
    >
      {t.logoURI ? (
        <Image
          src={t.logoURI}
          alt=""
          width={20}
          height={20}
          style={{ objectFit: "contain" }}
          unoptimized
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <span className="text-[8px] font-bold" style={{ color: "var(--accent)" }}>
          {t.symbol.slice(0, 2)}
        </span>
      )}
    </span>
  );
}

export default function TokenSelect({
  tokens,
  value,
  onChange,
  label,
}: {
  tokens: LifiToken[];
  value: LifiToken | undefined;
  onChange: (t: LifiToken) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tokens.slice(0, 60);
    return tokens
      .filter(
        (t) =>
          t.symbol.toLowerCase().includes(s) ||
          t.name.toLowerCase().includes(s) ||
          t.address.toLowerCase().startsWith(s)
      )
      .slice(0, 60);
  }, [tokens, q]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
        style={{ background: "var(--bg-strong)", border: "1px solid var(--border-strong)" }}
        aria-label={label}
      >
        {value ? (
          <>
            <TokenLogo t={value} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-bright)" }}>{value.symbol}</span>
          </>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Select</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--text-tertiary)" }} />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 z-50 w-64 rounded-xl p-2"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-lg)" }}
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search symbol or address…"
            className="input-terminal w-full mb-2 px-3 py-2 text-xs"
          />
          <div className="max-h-64 overflow-y-auto flex flex-col">
            {filtered.map((t) => (
              <button
                key={t.address}
                type="button"
                onClick={() => { onChange(t); setOpen(false); setQ(""); }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:opacity-80"
                style={{ background: value?.address === t.address ? "var(--accent-muted)" : "transparent" }}
              >
                <TokenLogo t={t} />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold truncate" style={{ color: "var(--text-bright)" }}>{t.symbol}</span>
                  <span className="block text-[10px] font-mono truncate" style={{ color: "var(--text-quaternary)" }}>{t.name}</span>
                </span>
                {value?.address === t.address && <Check className="w-3 h-3 flex-shrink-0" style={{ color: "var(--accent)" }} />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: "var(--text-tertiary)" }}>No tokens found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
