"use client";

import { m, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

/**
 * Animated counter component for stats
 */

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function AnimatedCounter({ 
  value, 
  duration = 1, 
  className = "",
  suffix = "",
  prefix = ""
}: AnimatedCounterProps) {
  const spring = useSpring(0, { 
    stiffness: 100, 
    damping: 30,
    duration: duration * 1000 
  });
  
  const display = useTransform(spring, (current) => 
    Math.round(current).toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <m.span className={className}>
      {prefix}
      <m.span>{display}</m.span>
      {suffix}
    </m.span>
  );
}

export function PulseIndicator({ 
  color = "var(--success)",
  size = "sm" 
}: { 
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <div className="relative flex items-center justify-center">
      <m.div
        className={`${sizes[size]} rounded-full`}
        style={{ background: color }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.7, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <m.div
        className={`absolute ${sizes[size]} rounded-full`}
        style={{ 
          background: color,
          opacity: 0.3,
        }}
        animate={{
          scale: [1, 2, 1],
          opacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
    </div>
  );
}
