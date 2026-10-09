"use client";

import { motion } from "framer-motion";

/**
 * Enhanced Loading Skeleton with better animations and variety
 */

interface SkeletonProps {
  variant?: "card" | "stat" | "text" | "circle" | "button";
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ variant = "card", width, height, className = "" }: SkeletonProps) {
  const baseClasses = "rounded-lg overflow-hidden relative";
  
  const variants = {
    card: "w-full h-32",
    stat: "w-24 h-12",
    text: "w-full h-4",
    circle: "w-12 h-12 rounded-full",
    button: "w-32 h-10",
  };

  const finalWidth = width || "";
  const finalHeight = height || "";
  const variantClass = variants[variant];

  return (
    <div
      className={`${baseClasses} ${variantClass} ${className}`}
      style={{
        width: finalWidth || undefined,
        height: finalHeight || undefined,
        background: "var(--bg-subtle)",
      }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,.08) 50%, transparent 100%)",
        }}
        animate={{
          x: ["-100%", "200%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div
      className="rounded-xl p-5 space-y-3"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width="48px" height="48px" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height="12px" />
        </div>
      </div>
      <Skeleton variant="card" height="80px" />
      <div className="flex gap-2">
        <Skeleton variant="button" className="flex-1" />
        <Skeleton variant="button" className="flex-1" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton variant="card" height="120px" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} variant="card" height="80px" />
        ))}
      </div>
    </div>
  );
}
