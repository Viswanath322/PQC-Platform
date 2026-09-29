import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { FindingSeverity } from '../../types';

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
      bg: 'rgba(239, 68, 68, 0.16)',
      border: 'rgba(239, 68, 68, 0.35)',
      text: '#fca5a5',
      icon: ShieldAlert,
      iconColor: '#f87171',
    },
    HIGH: {
      bg: 'rgba(249, 115, 22, 0.16)',
      border: 'rgba(249, 115, 22, 0.35)',
      text: '#fdba74',
      icon: AlertTriangle,
      iconColor: '#fb923c',
    },
    MEDIUM: {
      bg: 'rgba(234, 179, 8, 0.16)',
      border: 'rgba(234, 179, 8, 0.35)',
      text: '#fde047',
      icon: AlertCircle,
      iconColor: '#facc15',
    },
    LOW: {
      bg: 'rgba(42, 157, 143, 0.16)',
      border: 'rgba(42, 157, 143, 0.35)',
      text: '#5eead4',
      icon: Info,
      iconColor: '#2dd4bf',
    },
  }[norm] || {
    bg: 'rgba(148, 163, 184, 0.16)',
    border: 'rgba(148, 163, 184, 0.35)',
    text: '#cbd5e1',
    icon: Info,
    iconColor: '#94a3b8',
  };

  const Icon = styles.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-[11.5px] px-2 py-0.5 gap-1.5',
    lg: 'text-xs px-2.5 py-1 gap-2 font-semibold',
  }[size];

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 15,
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md tracking-wide uppercase ${sizeClasses}`}
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.text,
      }}
    >
      {showIcon && <Icon size={iconSizes} color={styles.iconColor} />}
      <span>{norm}</span>
    </span>
  );
};
