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
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[rgba(6,13,26,0.8)] border border-[rgba(26,58,92,0.5)] text-[#94a3b8] outline-none transition-colors hover:border-[rgba(0,212,255,0.45)] disabled:opacity-50"
        style={{ minWidth: 150 }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select network"
      >
        {selected ? (
          <>
            {selectedLogo && (
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
            className="absolute right-0 z-50 mt-1 w-full min-w-[190px] max-h-64 overflow-y-auto rounded-xl border border-[rgba(26,58,92,0.6)] bg-[rgba(6,13,26,0.97)] backdrop-blur-sm shadow-2xl"
            role="listbox"
            aria-label="Networks"
          >
            {networks.map((n) => {
              const logo = getNetworkConfig(n.id)?.logo;
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-left transition-colors ${
                    active
                      ? "text-[#00d4ff] bg-[rgba(0,212,255,0.08)]"
                      : "text-[#94a3b8] hover:bg-[rgba(26,58,92,0.45)] hover:text-[#e2e8f0]"
                  }`}
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
                    <span className="w-4 h-4 flex-shrink-0" />
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
