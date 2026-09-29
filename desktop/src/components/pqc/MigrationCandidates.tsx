import React from 'react';
import { ArrowRight, ShieldAlert, Cpu, GitBranch, CheckCircle2 } from 'lucide-react';
import type { MigrationCandidate } from '../../types/pqc';
import { MockDataBadge } from './MockDataBadge';

interface MigrationCandidatesProps {
  candidates: MigrationCandidate[];
  onAssessCandidate?: (candidate: MigrationCandidate) => void;
}

export const MigrationCandidates: React.FC<MigrationCandidatesProps> = ({
  candidates,
  onAssessCandidate,
}) => {
  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 className="title-level-2">PQC Migration Candidates</h3>
            <MockDataBadge size="sm" />
          </div>
          <p className="subtitle-muted">
            High-priority quantum-vulnerable primitives and recommended post-quantum replacements
          </p>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Showing <strong>{candidates.length}</strong> prioritized candidates
        </div>
      </div>

      {/* Candidate Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {candidates.map((item) => (
          <div
            key={item.id}
            className="glass-panel-subtle"
            style={{
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              borderLeft: '4px solid var(--color-risk-high)',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            {/* Header info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      display: 'block',
                    }}
                  >
                    {item.algorithm}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Location:</span>
                    <code
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--color-primary)',
                        background: 'rgba(36, 52, 71, 0.05)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      {item.location}
                    </code>
                  </div>
                </div>

                <span className="badge-risk-high" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  <ShieldAlert size={11} />
                  {item.risk}
                </span>
              </div>

              {/* Rationale if available */}
              {item.rationale && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.45 }}>
                  {item.rationale}
                </p>
              )}
            </div>

            {/* Recommendation Box */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(42, 157, 143, 0.08)',
                border: '1px solid rgba(42, 157, 143, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Cpu size={13} color="var(--color-secondary-dark)" />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--color-secondary-dark)',
                  }}
                >
                  Recommended Migration:
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>
                {item.recommendation}
              </div>

              {item.nistStandard && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
                  <CheckCircle2 size={11} color="var(--color-secondary-dark)" />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Standard: {item.nistStandard}
                  </span>
                </div>
              )}
            </div>

            {/* Protocols / Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '6px',
                borderTop: '1px solid rgba(226, 232, 240, 0.7)',
                fontSize: '11.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <GitBranch size={12} />
                <span>Impact: {item.estimatedEffort || 'Medium'} effort</span>
              </div>

              <button
                onClick={() => onAssessCandidate && onAssessCandidate(item)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-secondary-dark)',
                  fontWeight: 600,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                Plan Migration <ArrowRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Development Notice */}
      <div
        style={{
          fontSize: '11.5px',
          color: 'var(--text-muted)',
          backgroundColor: 'rgba(36, 52, 71, 0.03)',
          padding: '8px 14px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontWeight: 600 }}>Note:</span>
        These migration recommendations reflect development mock references based on NIST FIPS 203/204/205 standards.
      </div>
    </div>
  );
};
