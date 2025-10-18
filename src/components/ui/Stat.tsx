import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface StatProps {
  label: string;
  value: string | number;
  className?: string;
}

export function Stat({ label, value, className }: StatProps) {
  return (
    <div className={cn("flex justify-between items-center", className)}>
      <span className="text-sm text-z-ink-2">{label}</span>
      <span className="text-sm font-medium tabular-nums text-z-ink">{value}</span>
    </div>
  );
}
