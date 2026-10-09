"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, useRef, MouseEvent } from "react";

/**
 * Enhanced Card with 3D tilt, glow effects, and micro-interactions
 */

interface EnhancedCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  enableTilt?: boolean;
  enableGlow?: boolean;
  onClick?: () => void;
  href?: string;
}

export function EnhancedCard({
  children,
  className = "",
  glowColor = "var(--accent)",
  enableTilt = true,
  enableGlow = true,
  onClick,
}: EnhancedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], ["7.5deg", "-7.5deg"]), {
    stiffness: 150,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], ["-7.5deg", "7.5deg"]), {
    stiffness: 150,
    damping: 20,
  });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !enableTilt) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;
    
    const xPct = mouseXPos / width - 0.5;
    const yPct = mouseYPos / height - 0.5;
    
    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        transformStyle: "preserve-3d",
        rotateX: enableTilt ? rotateX : undefined,
        rotateY: enableTilt ? rotateY : undefined,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{
        scale: 1.02,
        boxShadow: enableGlow
          ? `0 20px 60px -15px color-mix(in srgb, ${glowColor} 30%, transparent)`
          : "var(--shadow-lg)",
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Gradient overlay on hover */}
      {enableGlow && (
        <motion.div
          className="absolute inset-0 opacity-0 pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at ${mouseX}px ${mouseY}px, color-mix(in srgb, ${glowColor} 15%, transparent), transparent 40%)`,
          }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export function GlassCard({ 
  children, 
  className = "",
  spotlight = false 
}: { 
  children: ReactNode; 
  className?: string;
  spotlight?: boolean;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!spotlight) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <motion.div
      className={`glass-card glass-panel-hover relative ${className}`}
      onMouseMove={handleMouseMove}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {spotlight && (
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-0"
          style={{
            background: `radial-gradient(400px circle at ${mouseX}px ${mouseY}px, var(--accent-muted), transparent 60%)`,
          }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
