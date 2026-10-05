import React from 'react';
import { cn } from '@/lib/utils';
import type { ScanFindingsSummary } from '@/types/scan';

interface SeveritySummaryProps {
  summary: ScanFindingsSummary | null;
  isLoading?: boolean;
  emptyLabel?: string;
  className?: string;
}

export const SeveritySummary: React.FC<SeveritySummaryProps> = ({
  summary,
  isLoading = false,
  emptyLabel = 'Findings will appear after analysis',
  className,
}) => {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-24 skeleton" />
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div
        className={cn(
          'card flex items-center justify-center p-6 text-center text-muted-foreground text-[13px]',
          className
        )}
      >
        <span>{emptyLabel}</span>
      </div>
    );
  }

  const { critical, high, medium, low, total } = summary;

  const items = [
    {
      label: 'Critical',
      count: critical,
      dotColor: 'bg-critical',
      textColor: 'text-critical',
      barColor: 'bg-critical',
      description: 'Immediate quantum break',
    },
    {
      label: 'High',
      count: high,
      dotColor: 'bg-high',
      textColor: 'text-high',
      barColor: 'bg-high',
      description: 'Harvest-now-decrypt-later',
    },
    {
      label: 'Medium',
      count: medium,
      dotColor: 'bg-medium',
      textColor: 'text-medium',
      barColor: 'bg-medium',
      description: 'Legacy padding & modes',
    },
    {
      label: 'Low',
      count: low,
      dotColor: 'bg-low',
      textColor: 'text-low',
      barColor: 'bg-low',
      description: 'Cryptographic hygiene',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;

        return (
          <div
            key={item.label}
            className="card p-4 transition-all duration-200 hover:shadow-sm"
          >
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <span className={cn('h-2 w-2 rounded-full shrink-0', item.dotColor)} />
                {item.label}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground tabular">
                {pct}%
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <span className={cn('tabular font-mono text-[26px] font-semibold tracking-tight', item.textColor)}>
                {item.count}
              </span>
            </div>

            {/* Thin proportional bar with accessible aria label */}
            <div
              role="progressbar"
              aria-valuenow={item.count}
              aria-valuemin={0}
              aria-valuemax={total > 0 ? total : 1}
              aria-label={`${item.label} findings: ${item.count} of ${total} total (${pct}%)`}
              className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/70"
            >
              <div
                className={cn('h-full transition-all duration-300', item.barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>

            <p className="mt-2 truncate text-[11px] text-muted-foreground">
              {item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
};
