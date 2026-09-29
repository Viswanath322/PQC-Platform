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
        padding: isSm ? '2px 8px' : '4px 10px',
        fontSize: isSm ? '10px' : '11px',
      }}
      title="This view uses realistic development mock telemetry. Real backend scanning and PQC classification will be integrated in subsequent releases."
    >
      <Database size={isSm ? 11 : 13} style={{ opacity: 0.8 }} />
      DEVELOPMENT / MOCK DATA
    </span>
  );
};
