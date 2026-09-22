"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { getNetworkConfig } from "@/config/chains";

/* ─────────────────────────────────────────────
   NetworkSelect — custom dropdown that shows each
   network's logo next to its name (native <select>
   cannot render images inside <option>).
   ───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   LogoFallback — colored initial badge shown when
   a network has no logo asset.
   ───────────────────────────────────────────── */

const FALLBACK_COLORS = ["#6F75E5", "#00B17E", "#FF68F0", "#FFB020", "#00D4FF", "#FF6B6B"];

function LogoFallback({ id, name, color }: { id: number; name: string; color?: string }) {
  const bg = color || FALLBACK_COLORS[id % FALLBACK_COLORS.length];
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{
        background: `color-mix(in srgb, ${bg} 22%, transparent)`,
        border: `1px solid color-mix(in srgb, ${bg} 45%, transparent)`,
        color: bg,
        fontSize: 9,
        lineHeight: 1,
      }}
      aria-hidden
    >
      {letter}
    </span>
  );
}

export default function NetworkSelect({
  networks,
  value,
  onChange,
  placeholder = "Network",
  disabled = false,
}: {
  networks: { id: number; name: string }[];
  value: number;
  onChange: (id: number) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? networks.find((n) => n.id === value) : undefined;
  const selectedLogo = selected ? getNetworkConfig(selected.id)?.logo : undefined;

  // Close when clicking outside the dropdown
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger — logo + name of the selected network */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono outline-none transition-colors"
        style={{
          minWidth: 150,
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          color: "var(--text-secondary)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select network"
      >
        {selected ? (
          <>
            {selectedLogo ? (
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <Image
                  src={selectedLogo}
                  alt=""
                  width={16}
                  height={16}
                  style={{ objectFit: "contain" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </span>
            ) : (
              <LogoFallback id={selected.id} name={selected.name} />
            )}
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <span className="truncate">{placeholder}</span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel — logo + name per network */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-1 w-full min-w-[190px] max-h-64 overflow-y-auto rounded-xl shadow-2xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-strong)",
            }}
            role="listbox"
            aria-label="Networks"
          >
            {networks.map((n) => {
              const logo = getNetworkConfig(n.id)?.logo;
              const cfg = getNetworkConfig(n.id);
              const active = n.id === value;
              return (
                <button
                  key={n.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(n.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-left transition-colors"
                  style={{
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    background: active ? "var(--accent-muted)" : "transparent",
                  }}
                >
                  {logo ? (
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <Image
                        src={logo}
                        alt=""
                        width={16}
                        height={16}
                        style={{ objectFit: "contain" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </span>
                  ) : (
                    <LogoFallback id={n.id} name={n.name} color={cfg?.color} />
                  )}
                  <span className="truncate flex-1">{n.name}</span>
                  {active && <Check className="w-3 h-3 flex-shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
