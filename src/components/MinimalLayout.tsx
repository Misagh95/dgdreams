"use client";

import type { ReactNode } from "react";
import Navbar from "./Navbar";
import SessionLog from "./SessionLog";
import SpaceBackground from "./SpaceBackground";

export default function MinimalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SpaceBackground />
      <Navbar />
      <main className="wrap">{children}</main>
      <footer className="site-footer">
        <div className="footer-main">
          <a href="https://dgdreams.space" className="footer-x">DGDreams</a>
          {" "}v2.1
        </div>
        <div className="footer-disclaimer">
          Track your daily on-chain streak across multiple networks. Always verify transactions before signing.
        </div>
      </footer>
      <SessionLog />
    </>
  );
}
