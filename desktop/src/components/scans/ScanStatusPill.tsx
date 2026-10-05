import React from 'react';
import type { ScanStatus } from '@/types/scan';
import { getScanStatusLabel } from '@/types/scan';
import { cn } from '@/lib/utils';

interface ScanStatusPillProps {
  status: ScanStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPing?: boolean;
}

export const ScanStatusPill: React.FC<ScanStatusPillProps> = ({
  status,
  size = 'md',
  className,
  showPing = true,
}) => {
  const label = getScanStatusLabel(status);

  // Status dot colors per Day 2 contract:
  // - amber dot for in-progress (QUEUED, INGESTING, ANALYZING, etc.)
  // - rose dot for FAILED
  // - accent/emerald dot for COMPLETED
  // - neutral slate dot for CANCELLED
  let dotColor = 'bg-amber-500';
  let dotRing = 'ring-amber-400/40';
  let isLive = false;

  switch (status) {
    case 'COMPLETED':
      dotColor = 'bg-emerald-500';
      dotRing = 'ring-emerald-400/40';
      break;
    case 'FAILED':
      dotColor = 'bg-rose-500';
      dotRing = 'ring-rose-400/40';
      break;
    case 'CANCELLED':
      dotColor = 'bg-slate-400';
      dotRing = 'ring-slate-300/40';
      break;
    case 'QUEUED':
    case 'INGESTING':
    case 'ANALYZING':
    case 'PROCESSING':
    case 'AI_ANALYSIS':
    default:
      dotColor = 'bg-amber-500';
      dotRing = 'ring-amber-400/40';
      isLive = true;
      break;
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-[12px] px-2.5 py-1 gap-2',
    lg: 'text-[13px] px-3 py-1.5 gap-2.5 font-medium',
  }[size];

  const dotSize = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  }[size];

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-surface/80 text-foreground font-medium shadow-xs backdrop-blur-md',
        sizeClasses,
        className
      )}
    >
      <span className="relative flex items-center justify-center">
        {isLive && showPing && (
          <span
            className={cn(
              'absolute inline-flex rounded-full opacity-75 animate-ping',
              dotColor,
              dotSize
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full ring-2',
            dotColor,
            dotRing,
            dotSize
          )}
        />
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
};
