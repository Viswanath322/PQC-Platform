import React from 'react';
import {
  Clock,
  Download,
  Loader2,
  Cpu,
  Sparkles,
  CheckCircle2,
  XCircle,
  Ban,
} from 'lucide-react';
import type { ScanStatus } from '../../types';

interface ScanStatusBadgeProps {
  status: ScanStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const ScanStatusBadge: React.FC<ScanStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const norm = (status || 'QUEUED').toUpperCase() as ScanStatus;

  const config: Record<
    ScanStatus,
    {
      label: string;
      bg: string;
      border: string;
      text: string;
      icon: React.ElementType;
      iconColor: string;
      spin?: boolean;
    }
  > = {
    QUEUED: {
      label: 'QUEUED',
      bg: 'rgba(234, 179, 8, 0.14)',
      border: 'rgba(234, 179, 8, 0.35)',
      text: '#fde047',
      icon: Clock,
      iconColor: '#facc15',
    },
    INGESTING: {
      label: 'INGESTING',
      bg: 'rgba(56, 189, 248, 0.14)',
      border: 'rgba(56, 189, 248, 0.35)',
      text: '#7dd3fc',
      icon: Download,
      iconColor: '#38bdf8',
      spin: true,
    },
    ANALYZING: {
      label: 'ANALYZING',
      bg: 'rgba(168, 85, 247, 0.15)',
      border: 'rgba(168, 85, 247, 0.35)',
      text: '#d8b4fe',
      icon: Loader2,
      iconColor: '#c084fc',
      spin: true,
    },
    PROCESSING: {
      label: 'PROCESSING',
      bg: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.35)',
      text: '#93c5fd',
      icon: Cpu,
      iconColor: '#60a5fa',
      spin: true,
    },
    AI_ANALYSIS: {
      label: 'AI ANALYSIS',
      bg: 'rgba(236, 72, 153, 0.15)',
      border: 'rgba(236, 72, 153, 0.35)',
      text: '#f472b6',
      icon: Sparkles,
      iconColor: '#f472b6',
      spin: true,
    },
    COMPLETED: {
      label: 'COMPLETED',
      bg: 'rgba(34, 197, 94, 0.14)',
      border: 'rgba(34, 197, 94, 0.35)',
      text: '#4ade80',
      icon: CheckCircle2,
      iconColor: '#22c55e',
    },
    FAILED: {
      label: 'FAILED',
      bg: 'rgba(239, 68, 68, 0.14)',
      border: 'rgba(239, 68, 68, 0.35)',
      text: '#f87171',
      icon: XCircle,
      iconColor: '#ef4444',
    },
    CANCELLED: {
      label: 'CANCELLED',
      bg: 'rgba(148, 163, 184, 0.14)',
      border: 'rgba(148, 163, 184, 0.3)',
      text: '#cbd5e1',
      icon: Ban,
      iconColor: '#94a3b8',
    },
  };

  const current = config[norm] || config.QUEUED;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'text-[10.5px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
    lg: 'text-xs px-3 py-1 gap-2 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full tracking-wide ${sizeClasses}`}
      style={{
        background: current.bg,
        border: `1px solid ${current.border}`,
        color: current.text,
      }}
    >
      <Icon
        size={size === 'sm' ? 11 : 13}
        color={current.iconColor}
        className={current.spin ? 'animate-spin' : ''}
      />
      <span>{current.label}</span>
    </span>
  );
};
