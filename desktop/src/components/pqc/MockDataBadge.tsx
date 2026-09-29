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
      className={`badge-dev-mock ${className}`}
      style={{
        padding: isSm ? '2px 8px' : '4px 11px',
        fontSize: isSm ? '10px' : '11px',
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: '#718071',
        border: '1px solid rgba(113, 128, 113, 0.28)',
        borderRadius: '9999px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      }}
      title="This view uses realistic development mock telemetry. Real backend scanning and PQC classification will be integrated in subsequent releases."
    >
      <Database size={isSm ? 10 : 12} color="#718071" style={{ opacity: 0.85 }} />
      DEVELOPMENT / MOCK DATA
    </span>
  );
};
