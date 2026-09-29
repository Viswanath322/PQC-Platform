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
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {summary.total}
          </div>
        </div>
      </div>

      {/* Horizontal Stacked Distribution Bar */}
      <div
        style={{
          height: '14px',
          width: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          borderRadius: '9999px',
          overflow: 'hidden',
          display: 'flex',
          marginBottom: '20px',
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
        }}
        title={`High: ${summary.high} (${highPercent}%), Medium: ${summary.medium} (${mediumPercent}%), Low: ${summary.low} (${lowPercent}%)`}
      >
        {/* High Risk: Graphite */}
        <div
          style={{
            width: `${highPercent}%`,
            backgroundColor: '#2B2B28',
            height: '100%',
            transition: 'width 0.4s ease',
          }}
        />
        {/* Medium Risk: Warm Amber */}
        <div
          style={{
            width: `${mediumPercent}%`,
            backgroundColor: '#C89B55',
            height: '100%',
            transition: 'width 0.4s ease',
          }}
        />
        {/* Low Risk: Muted Sage */}
        <div
          style={{
            width: `${lowPercent}%`,
            backgroundColor: '#718071',
            height: '100%',
            transition: 'width 0.4s ease',
          }}
        />
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
            borderRadius: '12px',
            background: selectedRisk === 'HIGH' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.48)',
            border: selectedRisk === 'HIGH' ? '1.5px solid #2B2B28' : '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            cursor: onSelectRisk ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2B2B28' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>High Risk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{summary.high}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{highPercent}%</span>
          </div>
        </div>

        {/* Medium Risk Item */}
        <div
          onClick={() => onSelectRisk && onSelectRisk(selectedRisk === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: selectedRisk === 'MEDIUM' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.48)',
            border: selectedRisk === 'MEDIUM' ? '1.5px solid #C89B55' : '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            cursor: onSelectRisk ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C89B55' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Medium Risk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{summary.medium}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{mediumPercent}%</span>
          </div>
        </div>

        {/* Low Risk Item */}
        <div
          onClick={() => onSelectRisk && onSelectRisk(selectedRisk === 'LOW' ? 'ALL' : 'LOW')}
          style={{
            padding: '12px 14px',
            borderRadius: '12px',
            background: selectedRisk === 'LOW' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.48)',
            border: selectedRisk === 'LOW' ? '1.5px solid #718071' : '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            cursor: onSelectRisk ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#718071' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Low Risk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{summary.low}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lowPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
