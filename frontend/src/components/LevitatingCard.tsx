import React from 'react';
import { cn } from '@/lib/utils';

interface LevitatingCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

/**
 * LevitatingCard — now renders as a flat 1px-border card surface.
 * On hover: border accent color (no glow, no float, no gradient).
 */
export function LevitatingCard({ children, className, hoverEffect = false }: LevitatingCardProps) {
  return (
    <div
      className={cn(
        'card-surface p-6',
        hoverEffect && 'hover:shadow-hard-accent-sm hover:-translate-y-0.5 transition-all duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}
