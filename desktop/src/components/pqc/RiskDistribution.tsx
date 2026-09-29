import React from 'react';
import type { PQCRiskSummary } from '../../types/pqc';
import { SegmentBar } from '../dashboard/SegmentBar';

interface RiskDistributionProps {
  summary: PQCRiskSummary;
  onSelectRisk?: (risk: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') => void;
  selectedRisk?: string;
}

export const RiskDistribution: React.FC<RiskDistributionProps> = ({
  summary,
}) => {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title">Cryptographic risk distribution</h3>
          <p className="section-sub mt-0.5">Categorization of identified cryptographic assets by quantum exposure</p>
        </div>
        <div className="text-right">
          <span className="eyebrow">Total Components</span>
          <div className="text-[20px] font-semibold text-foreground tabular leading-none mt-1">
            {summary.total}
          </div>
        </div>
      </div>

      <SegmentBar
        cols={2}
        segments={[
          { label: 'High · Shor Vulnerable (RSA / ECC)', value: summary.high, color: 'bg-critical' },
          { label: 'Medium · Hybrid / Legacy TLS', value: summary.medium, color: 'bg-medium' },
          { label: 'Low · Quantum Resistant (AES-256 / SHA-384)', value: summary.low, color: 'bg-low' },
        ]}
      />
    </div>
  );
};
