"use client";

import { m } from "framer-motion";
import { Scale, Code, Lock, CopyCheck, Eye, GitBranch } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function LicensePage() {
  return (
    <DashboardLayout title="License" subtitle="// open-source & usage rights">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* MIT License Box */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-6 relative overflow-hidden"
          style={{ border: "1px solid rgba(0,212,255,0.15)" }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.03]"
            style={{ background: "radial-gradient(circle at top right, var(--accent), transparent 70%)" }} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)" }}>
                <Scale className="w-5 h-5 text-[var(--accent-text)]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-bright)]">MIT License</h2>
                <p className="text-[12px] text-[var(--text-tertiary)]">Copyright (c) 2026 DGDreams</p>
              </div>
            </div>

            <div className="p-4 rounded-xl text-xs leading-relaxed whitespace-pre-line"
              style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(26,58,92,0.4)", color: "var(--text-secondary)" }}>
{`Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
            </div>
          </div>
        </m.div>

        {/* What This Means */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: CopyCheck, title: "Free to Use", desc: "You can use this software for commercial and private projects, modify it, and distribute it freely.", color: "var(--success)" },
            { icon: Lock, title: "No Warranty", desc: "The software is provided 'as is' with no warranty. The authors are not liable for any claims or damages.", color: "var(--warning)" },
            { icon: Code, title: "Attribution", desc: "You must include the original copyright notice in all copies or substantial portions of the software.", color: "var(--accent-text)" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <m.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-4 rounded-xl"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${item.color}18`, border: `1px solid ${item.color}33` }}>
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-bright)] mb-1">{item.title}</h3>
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{item.desc}</p>
              </m.div>
            );
          })}
        </div>

        {/* Smart Contract License */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)" }}>
              <GitBranch className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--text-bright)]">Smart Contracts</h2>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
            The smart contracts used by DGDreams (NikBase, Game2048, Soulbound NFT) are open-source
            and verified on their respective block explorers. They are licensed under MIT unless
            otherwise specified. Contract source code is available on GitHub for audit and review.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--text-tertiary)]">
            <Eye className="w-3 h-3" />
            <span>Always verify contract addresses match the official ones listed on DGDreams.</span>
          </div>
        </m.div>
      </div>
    </DashboardLayout>
  );
}
