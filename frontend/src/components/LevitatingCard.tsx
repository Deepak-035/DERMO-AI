import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LevitatingCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function LevitatingCard({ children, className, hoverEffect = false }: LevitatingCardProps) {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      whileHover={hoverEffect ? { y: -20, boxShadow: "0 25px 50px -12px rgba(6, 182, 212, 0.4)" } : undefined}
      className={cn(
        "backdrop-blur-2xl border border-white/10 shadow-2xl shadow-cyan-500/20 bg-slate-950/40 rounded-xl p-6 relative z-10",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
