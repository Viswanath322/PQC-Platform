import React from 'react';
import { Database } from 'lucide-react';

interface MockDataBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export const MockDataBadge: React.FC<MockDataBadgeProps> = ({ size = 'md', className = '' }) => {
  const isSm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider rounded-md ${
        isSm ? 'text-[9.5px] px-2 py-0.5' : 'text-[10.5px] px-2.5 py-0.5'
      } ${className}`}
      style={{
        background: 'rgba(45, 212, 191, 0.08)',
        color: '#2dd4bf',
        border: '1px solid rgba(45, 212, 191, 0.2)',
      }}
      title="Air-gapped development baseline mode. Real backend scanning and PQC classification will be integrated in subsequent releases."
    >
      <Database size={isSm ? 10 : 12} className="opacity-75" />
      <span>Demo Telemetry</span>
    </span>
  );
};
