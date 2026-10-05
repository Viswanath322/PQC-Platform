import React from 'react';
import { Database } from 'lucide-react';

interface MockDataBadgeProps {
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const MockDataBadge: React.FC<MockDataBadgeProps> = ({
  label = 'DEVELOPMENT / MOCK DATA',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.5 tracking-wider',
    sm: 'text-[10px] px-2 py-0.5 tracking-wide',
    md: 'text-[11px] px-2.5 py-0.5 tracking-wide',
  };

  const iconSizes = {
    xs: 10,
    sm: 11,
    md: 12,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold uppercase rounded-md shadow-2xs ${sizeStyles[size]} ${className}`}
      style={{
        background: 'rgba(245, 158, 11, 0.10)',
        color: '#b45309',
        border: '1px solid rgba(245, 158, 11, 0.30)',
      }}
      title="Development / Mock Data: Not generated from an actual backend scan."
    >
      <Database size={iconSizes[size]} className="opacity-80 shrink-0" />
      <span>{label}</span>
    </span>
  );
};

