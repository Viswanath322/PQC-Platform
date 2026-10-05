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
import { cn } from '@/lib/utils';

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
      styles: string;
      icon: React.ElementType;
      spin?: boolean;
    }
  > = {
    QUEUED: {
      label: 'Queued',
      styles: 'bg-medium/10 text-medium ring-medium/25',
      icon: Clock,
    },
    INGESTING: {
      label: 'Ingesting',
      styles: 'bg-sky-500/10 text-sky-700 ring-sky-500/25',
      icon: Download,
      spin: true,
    },
    ANALYZING: {
      label: 'Analyzing',
      styles: 'bg-purple-100/70 text-purple-700 ring-1 ring-purple-300/60',
      icon: Loader2,
      spin: true,
    },
    PROCESSING: {
      label: 'Processing',
      styles: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/25',
      icon: Cpu,
      spin: true,
    },
    AI_ANALYSIS: {
      label: 'AI Verification',
      styles: 'bg-purple-100/80 text-purple-700 ring-1 ring-purple-300/70',
      icon: Sparkles,
      spin: true,
    },
    COMPLETED: {
      label: 'Completed',
      styles: 'bg-success/10 text-success ring-success/25',
      icon: CheckCircle2,
    },
    FAILED: {
      label: 'Failed',
      styles: 'bg-critical/10 text-critical ring-critical/25',
      icon: XCircle,
    },
    CANCELLED: {
      label: 'Cancelled',
      styles: 'bg-slate-100 text-slate-500 ring-slate-300/50',
      icon: Ban,
    },
  };

  const item = config[norm] || config.QUEUED;
  const Icon = item.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-[12px] px-2.5 py-1 gap-1.5',
    lg: 'text-[13px] px-3 py-1.5 gap-2 font-medium',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium ring-1',
        item.styles,
        sizeClasses
      )}
    >
      <Icon className={cn(iconSizes, item.spin && 'animate-spin')} />
      <span>{item.label}</span>
    </span>
  );
};
