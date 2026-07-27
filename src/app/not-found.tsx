"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SpaceBackground from "@/components/SpaceBackground";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020408] flex items-center justify-center relative">
      <SpaceBackground />
      <div className="relative z-10 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-8xl font-black gradient-text-cyan mb-4">404</div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-2">Sector Not Found</h1>
          <p className="text-[#475569] font-mono mb-8">The coordinates you entered don&apos;t exist in this dimension.</p>
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="btn-primary px-8 py-3"
            >
              Return to Mission Control
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
