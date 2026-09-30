import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { FindingSeverity } from '../../types';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
  severity: FindingSeverity | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  showIcon = true,
}) => {
  const norm = (severity || 'LOW').toUpperCase();

  const styles = {
    CRITICAL: {
      label: 'Critical',
      classes: 'bg-critical/10 text-critical ring-critical/25',
      icon: ShieldAlert,
    },
    HIGH: {
      label: 'High',
      classes: 'bg-high/10 text-high ring-high/25',
      icon: AlertTriangle,
    },
    MEDIUM: {
      label: 'Medium',
      classes: 'bg-medium/10 text-medium ring-medium/25',
      icon: AlertCircle,
    },
    LOW: {
      label: 'Low',
      classes: 'bg-low/10 text-low ring-low/25', // Sky blue, strictly not teal
      icon: Info,
    },
  }[norm] || {
    label: norm,
    classes: 'bg-surface-2 text-muted-foreground ring-border',
    icon: Info,
  };

  const Icon = styles.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-[12px] px-2.5 py-0.5 gap-1.5',
    lg: 'text-[13px] px-3 py-1 gap-2 font-medium',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={cn(
        'severity-badge inline-flex items-center rounded-full font-medium ring-1',
        styles.classes,
        sizeClasses
      )}
    >
      {showIcon && <Icon className={iconSizes} aria-hidden />}
      <span>{styles.label}</span>
    </span>
  );
};
