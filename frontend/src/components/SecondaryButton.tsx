import React from 'react';
import { cn } from '@/lib/utils';

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function SecondaryButton({ children, className, ...props }: SecondaryButtonProps) {
  return (
    <button
      className={cn('btn-primary', className)}
      {...props}
    >
      {children}
    </button>
  );
}
