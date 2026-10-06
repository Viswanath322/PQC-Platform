import React from 'react';
export { ScanStatusBadge } from '../scans/ScanStatusBadge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'healthy' | 'offline' | 'active' | 'inactive' | 'warning' | string;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
}) => {
  const norm = status.toLowerCase();

  const getClasses = (): string => {
    switch (norm) {
      case 'healthy':
      case 'active':
      case 'completed':
        return 'bg-success/10 text-success ring-1 ring-success/25';
      case 'offline':
      case 'failed':
      case 'error':
        return 'bg-critical/10 text-critical ring-1 ring-critical/25';
      case 'warning':
      case 'queued':
        return 'bg-medium/10 text-medium ring-1 ring-medium/25';
      default:
        return 'bg-slate-100 text-slate-600 ring-1 ring-slate-300/50';
    }
  };

  const getDotClass = (): string => {
    switch (norm) {
      case 'healthy': case 'active': case 'completed': return 'bg-success';
      case 'offline': case 'failed': case 'error': return 'bg-critical';
      case 'warning': case 'queued': return 'bg-medium';
      default: return 'bg-slate-400';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5',
        getClasses()
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', getDotClass())} />
      <span>{label || status}</span>
    </span>
  );
};
