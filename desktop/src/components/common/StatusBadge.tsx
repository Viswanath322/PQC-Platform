import React from 'react';
export { ScanStatusBadge } from '../scans/ScanStatusBadge';

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

  const getColors = () => {
    switch (norm) {
      case 'healthy':
      case 'active':
      case 'completed':
        return { bg: 'rgba(34, 197, 94, 0.14)', border: 'rgba(34, 197, 94, 0.3)', text: '#4ade80', dot: '#22c55e' };
      case 'offline':
      case 'failed':
      case 'error':
        return { bg: 'rgba(239, 68, 68, 0.14)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171', dot: '#ef4444' };
      case 'warning':
      case 'queued':
        return { bg: 'rgba(234, 179, 8, 0.14)', border: 'rgba(234, 179, 8, 0.3)', text: '#fde047', dot: '#eab308' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.14)', border: 'rgba(148, 163, 184, 0.3)', text: '#cbd5e1', dot: '#94a3b8' };
    }
  };

  const colors = getColors();

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5'
      }`}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.dot }} />
      <span>{label || status}</span>
    </span>
  );
};
