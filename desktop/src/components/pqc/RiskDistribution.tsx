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
          <p className="subtitle-muted">Categorization of identified cryptographic assets</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Total Components
          </span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-graphite)', letterSpacing: '-0.02em' }}>
            {summary.total}
          </div>
        </div>
      </div>

      {/* Horizontal Stacked Distribution Bar */}
      <div
        style={{
          height: '20px',
          width: '100%',
          backgroundColor: 'rgba(41, 40, 36, 0.08)',
          borderRadius: '10px',
          overflow: 'hidden',
          display: 'flex',
          marginBottom: '20px',
          boxShadow: 'inset 0 1px 2px rgba(41, 40, 36, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
        }}
        title={`High: ${summary.high} (${highPercent}%), Medium: ${summary.medium} (${mediumPercent}%), Low: ${summary.low} (${lowPercent}%)`}
      >
        <div
          style={{
            width: `${highPercent}%`,
            backgroundColor: 'var(--color-graphite)',
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
            backgroundColor: 'var(--color-risk-medium)',
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
            backgroundColor: 'var(--color-muted-sage)',
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
        {/* High Risk Item (Graphite) */}
        <div
          onClick={() => onSelectRisk && onSelectRisk(selectedRisk === 'HIGH' ? 'ALL' : 'HIGH')}
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: selectedRisk === 'HIGH' ? 'rgba(41, 40, 36, 0.12)' : 'rgba(255, 255, 255, 0.45)',
            border: selectedRisk === 'HIGH' ? '1px solid var(--color-graphite)' : '1px solid rgba(255, 255, 255, 0.65)',
            boxShadow: '0 2px 8px rgba(41, 40, 36, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            cursor: onSelectRisk ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-graphite)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>High</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ fontSize: '19px', fontWeight: 700, color: 'var(--color-graphite)' }}>{summary.high}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{highPercent}%</span>
          </div>
        </div>

        {/* Medium Risk Item (Muted Amber) */}
        <div
          onClick={() => onSelectRisk && onSelectRisk(selectedRisk === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: selectedRisk === 'MEDIUM' ? 'rgba(140, 106, 56, 0.14)' : 'rgba(255, 255, 255, 0.45)',
            border: selectedRisk === 'MEDIUM' ? '1px solid var(--color-risk-medium)' : '1px solid rgba(255, 255, 255, 0.65)',
            boxShadow: '0 2px 8px rgba(41, 40, 36, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            cursor: onSelectRisk ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-risk-medium)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Medium</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ fontSize: '19px', fontWeight: 700, color: 'var(--color-risk-medium)' }}>{summary.medium}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{mediumPercent}%</span>
          </div>
        </div>

        {/* Low Risk Item (Muted Sage) */}
        <div
          onClick={() => onSelectRisk && onSelectRisk(selectedRisk === 'LOW' ? 'ALL' : 'LOW')}
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: selectedRisk === 'LOW' ? 'rgba(120, 135, 119, 0.18)' : 'rgba(255, 255, 255, 0.45)',
            border: selectedRisk === 'LOW' ? '1px solid var(--color-muted-sage)' : '1px solid rgba(255, 255, 255, 0.65)',
            boxShadow: '0 2px 8px rgba(41, 40, 36, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            cursor: onSelectRisk ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-muted-sage)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Low</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ fontSize: '19px', fontWeight: 700, color: 'var(--color-muted-sage)' }}>{summary.low}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lowPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
