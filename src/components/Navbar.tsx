"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/2048", label: "2048" },
];

const MORE_LINKS = [
  { href: "/litevm", label: "LiteVM Hub" },
  { href: "/genlayer", label: "GenLayer Hub" },
  { href: "/truthcourt", label: "TruthCourt" },
  { href: "/activity", label: "Activity" },
  { href: "/profile", label: "Profile" },
  { href: "/faq", label: "FAQ" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <nav className="nav-bar">
      <div className="nav-left">
        <Link href="/dashboard" className="nav-logo">
          DG<span>Dreams</span>
        </Link>
      </div>

      <div className="nav-center">
        {NAV_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`nav-link ${pathname === l.href ? "active" : ""}`}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="nav-right" ref={menuRef}>
        <div className="nav-more">
          <button className="nav-more-btn" onClick={() => setMenuOpen(!menuOpen)}>
            ≡
          </button>
          {menuOpen && (
            <div className="nav-more-drop">
              {MORE_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`nav-link ${pathname === l.href ? "active" : ""}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="nav-wallet">
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus="address"
          />
        </div>
      </div>
    </nav>
  );
}
