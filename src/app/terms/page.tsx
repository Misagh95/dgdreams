"use client";

import { motion } from "framer-motion";
import { FileText, Shield, AlertTriangle, UserCheck, Ban, Gavel } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const sections = [
  {
    icon: Shield,
    title: "1. Acceptance of Terms",
    content: "By accessing or using DGDreams, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform. We reserve the right to update these terms at any time; continued use constitutes acceptance of changes.",
    color: "#00d4ff",
  },
  {
    icon: UserCheck,
    title: "2. Wallet Responsibility",
    content: "You are solely responsible for your wallet, private keys, and all transactions signed through DGDreams. We never store or have access to your private keys. Always verify network, contract address, and transaction details before signing.",
    color: "#00ff88",
  },
  {
    icon: AlertTriangle,
    title: "3. Risk Disclosure",
    content: "Blockchain transactions are irreversible. Gas fees are paid to the network regardless of transaction success. Smart contract interactions carry inherent risks including but not limited to bugs, exploits, and total loss of funds. Use at your own risk.",
    color: "#ffaa00",
  },
  {
    icon: Ban,
    title: "4. Prohibited Activities",
    content: "You may not use DGDreams for any illegal activity, including money laundering, fraud, or sanctions violations. Automated scraping, DDoS attacks, and any activity that disrupts service for others is strictly prohibited.",
    color: "#ff6b6b",
  },
  {
    icon: Gavel,
    title: "5. Intellectual Property",
    content: "DGDreams brand, logo, UI/UX design, and code are the property of DGDreams. The underlying smart contracts are open-source. You may not reproduce, distribute, or create derivative works without explicit permission.",
    color: "#8b5cf6",
  },
  {
    icon: FileText,
    title: "6. Limitation of Liability",
    content: "DGDreams is provided 'as is' without warranty of any kind. We are not liable for any losses, damages, or issues arising from use of the platform, including but not limited to smart contract failures, network congestion, or user error.",
    color: "#627eea",
  },
];

export default function TermsPage() {
  return (
    <DashboardLayout title="Terms of Service" subtitle="// legal & usage agreement">
      <div className="max-w-3xl mx-auto space-y-4">
        <p className="text-xs text-[#475569] font-mono mb-6">
          Last updated: July 2026. By using DGDreams, you agree to the following terms.
        </p>

        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel p-5 rounded-xl"
              style={{ border: `1px solid ${section.color}15` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${section.color}18`, border: `1px solid ${section.color}33` }}>
                  <Icon className="w-4 h-4" style={{ color: section.color }} />
                </div>
                <h2 className="text-sm font-semibold text-[#e2e8f0]">{section.title}</h2>
              </div>
              <p className="text-xs text-[#64748b] leading-relaxed font-mono pl-11">
                {section.content}
              </p>
            </motion.div>
          );
        })}

        <p className="text-xs text-[#334155] font-mono text-center pt-4">
          For questions, contact us through the official DGDreams channels.
        </p>
      </div>
    </DashboardLayout>
  );
}
