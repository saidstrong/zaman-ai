import { cn } from '../../lib/cn';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function Progress({ value, max = 100, className, showLabel = false }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between items-center mb-1">
        {showLabel && (
          <span className="text-sm text-z-ink-2">Прогресс</span>
        )}
        <span className="text-sm font-medium text-z-ink tabular-nums">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-z-muted rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-[var(--z-green)] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
