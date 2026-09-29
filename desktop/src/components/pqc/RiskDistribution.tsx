import React from 'react';
import type { PQCRiskSummary } from '../../types/pqc';

interface RiskDistributionProps {
  summary: PQCRiskSummary;
  onSelectRisk?: (risk: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') => void;
  selectedRisk?: string;
}

export const RiskDistribution: React.FC<RiskDistributionProps> = ({
  summary,
  onSelectRisk,
  selectedRisk = 'ALL',
}) => {
  const highPercent = Math.round((summary.high / summary.total) * 100);
  const mediumPercent = Math.round((summary.medium / summary.total) * 100);
  const lowPercent = 100 - highPercent - mediumPercent;

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <h3 className="title-level-2">Risk Distribution</h3>
          <p className="subtitle-muted">Categorization of identified cryptographic assets by quantum exposure</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Total Components
          </span>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {summary.total}
          </div>
        </div>
      </div>

      {/* Horizontal Stacked Distribution Bar */}
      <div
        style={{
          height: '24px',
          width: '100%',
          backgroundColor: '#e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          marginBottom: '20px',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08)',
        }}
        title={`High: ${summary.high} (${highPercent}%), Medium: ${summary.medium} (${mediumPercent}%), Low: ${summary.low} (${lowPercent}%)`}
      >
        <div
          style={{
            width: `${highPercent}%`,
            backgroundColor: 'var(--color-risk-high)',
            height: '100%',
            transition: 'width 0.4s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          {highPercent > 10 && `${highPercent}%`}
        </div>
        <div
          style={{
            width: `${mediumPercent}%`,
            backgroundColor: 'var(--color-accent)',
            height: '100%',
            transition: 'width 0.4s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          {mediumPercent > 10 && `${mediumPercent}%`}
        </div>
        <div
          style={{
            width: `${lowPercent}%`,
            backgroundColor: 'var(--color-secondary)',
            height: '100%',
            transition: 'width 0.4s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          {lowPercent > 10 && `${lowPercent}%`}
        </div>
      </div>

      {/* Breakdown Grid / Legend */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
        }}
      >
        {/* High Risk Item */}
        <div
          onClick={() => onSelectRisk && onSelectRisk(selectedRisk === 'HIGH' ? 'ALL' : 'HIGH')}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: selectedRisk === 'HIGH' ? 'rgba(254, 242, 242, 0.9)' : 'rgba(248, 250, 252, 0.8)',
            border: selectedRisk === 'HIGH' ? '1px solid var(--color-risk-high)' : '1px solid var(--border-glass)',
            cursor: onSelectRisk ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--color-risk-high)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>High Risk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-risk-high)' }}>{summary.high}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{highPercent}%</span>
          </div>
        </div>

        {/* Medium Risk Item */}
        <div
          onClick={() => onSelectRisk && onSelectRisk(selectedRisk === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: selectedRisk === 'MEDIUM' ? 'rgba(254, 247, 236, 0.9)' : 'rgba(248, 250, 252, 0.8)',
            border: selectedRisk === 'MEDIUM' ? '1px solid var(--color-accent)' : '1px solid var(--border-glass)',
            cursor: onSelectRisk ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--color-accent)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Medium Risk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-accent-dark)' }}>{summary.medium}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{mediumPercent}%</span>
          </div>
        </div>

        {/* Low Risk Item */}
        <div
          onClick={() => onSelectRisk && onSelectRisk(selectedRisk === 'LOW' ? 'ALL' : 'LOW')}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: selectedRisk === 'LOW' ? 'rgba(232, 245, 244, 0.9)' : 'rgba(248, 250, 252, 0.8)',
            border: selectedRisk === 'LOW' ? '1px solid var(--color-secondary)' : '1px solid var(--border-glass)',
            cursor: onSelectRisk ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--color-secondary)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Low Risk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-secondary-dark)' }}>{summary.low}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lowPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
