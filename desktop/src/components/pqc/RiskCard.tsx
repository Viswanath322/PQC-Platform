import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { RiskLevel } from '../../types/pqc';
import { cn } from '@/lib/utils';

interface RiskCardProps {
  level: RiskLevel;
  count: number;
  label: string;
  subtext: string;
  percentage?: number;
  onClick?: () => void;
  isActive?: boolean;
}

export const RiskCard: React.FC<RiskCardProps> = ({
  level,
  count,
  label,
  subtext,
  percentage,
  onClick,
  isActive = false,
}) => {
  const config = {
    HIGH: {
      text: 'text-critical',
      bg: 'bg-critical/10',
      ring: 'ring-critical/25',
      icon: ShieldAlert,
    },
    MEDIUM: {
      text: 'text-medium',
      bg: 'bg-medium/10',
      ring: 'ring-medium/25',
      icon: AlertTriangle,
    },
    LOW: {
      text: 'text-low',
      bg: 'bg-low/10',
      ring: 'ring-low/25',
      icon: ShieldCheck,
    },
  }[level] || {
    text: 'text-muted-foreground',
    bg: 'bg-surface-2',
    ring: 'ring-border',
    icon: ShieldCheck,
  };

  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        'card card-hover flex min-w-0 flex-col justify-between p-5 cursor-pointer',
        isActive && 'ring-2 ring-primary border-primary/50'
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="eyebrow">{label}</span>
          <span className={cn('icon-tile grid h-8 w-8 place-items-center rounded-lg ring-1', config.bg, config.ring)}>
            <Icon className={cn('h-4 w-4', config.text)} aria-hidden />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className={cn('tabular text-[36px] font-semibold leading-none tracking-tight', config.text)}>
            {count}
          </span>
          {percentage !== undefined && (
            <span className="text-[12px] text-muted-foreground tabular">
              ({percentage}%)
            </span>
          )}
        </div>
      </div>
      <p className="mt-4 truncate text-[13px] text-muted-foreground">{subtext}</p>
    </div>
  );
};
