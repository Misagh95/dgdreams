"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/**
 * Animated gradient text component for Hero sections
 */

interface AnimatedGradientTextProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

export function AnimatedGradientText({ 
  children, 
  className = "",
  animate = true 
}: AnimatedGradientTextProps) {
  return (
    <motion.span
      className={className}
      style={{
        background: animate 
          ? "linear-gradient(90deg, var(--accent) 0%, #6F75E5 25%, #FF68F0 50%, var(--accent) 75%, #6F75E5 100%)"
          : "var(--theme-gradient)",
        backgroundSize: animate ? "200% 100%" : "100% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
      animate={animate ? {
        backgroundPosition: ["0% 0%", "200% 0%"],
      } : undefined}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {children}
    </motion.span>
  );
}

export function PulsingBadge({ 
  children, 
  color = "var(--accent)",
  className = "" 
}: { 
  children: ReactNode; 
  color?: string;
  className?: string;
}) {
  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${className}`}
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        color: color,
      }}
      animate={{
        boxShadow: [
          `0 0 0px ${color}`,
          `0 0 20px color-mix(in srgb, ${color} 40%, transparent)`,
          `0 0 0px ${color}`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}
