import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div 
      className={cn(
        "rounded-[var(--radius-xl)] bg-white/95 dark:bg-z-muted/80 border border-[var(--z-border)] shadow-[var(--z-shadow)]",
        className
      )}
    >
      {children}
    </div>
  );
}
