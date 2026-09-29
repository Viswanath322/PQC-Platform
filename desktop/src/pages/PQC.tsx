import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Lock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { MockDataBadge } from '../components/pqc/MockDataBadge';
import { RiskCard } from '../components/pqc/RiskCard';
import { RiskDistribution } from '../components/pqc/RiskDistribution';
import { CryptoInventoryTable } from '../components/pqc/CryptoInventoryTable';
import { CBOMTable } from '../components/pqc/CBOMTable';
import { MigrationCandidates } from '../components/pqc/MigrationCandidates';
import {
  mockRiskSummary,
  mockKeyInsights,
  mockCryptoInventory,
  mockCBOM,
  mockMigrationCandidates,
} from '../data/pqcMockData';

interface PQCPageProps {
  onNavigateToInventory?: () => void;
  onNavigateToReports?: () => void;
}

export const PQC: React.FC<PQCPageProps> = ({
  onNavigateToInventory,
  onNavigateToReports,
}) => {
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [activeTableTab, setActiveTableTab] = useState<'inventory' | 'cbom'>('inventory');

  const handleRiskFilterChange = (risk: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') => {
    setSelectedRiskFilter(risk);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="title-level-1">PQC Security Overview</h1>
            <MockDataBadge />
          </div>
          <p className="subtitle-muted" style={{ fontSize: '14.5px', marginTop: '4px' }}>
            Quantum readiness and cryptographic inventory for your project
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onNavigateToInventory} className="btn-secondary">
            <Lock size={14} /> Full Inventory
          </button>
          <button onClick={onNavigateToReports} className="btn-teal">
            <FileSpreadsheet size={14} /> View Reports
          </button>
        </div>
      </div>

      {/* 2. Top Risk Cards Grid (High / Medium / Low + Quantum Readiness Summary) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
        }}
      >
        {/* High Risk Card */}
        <RiskCard
          level="HIGH"
          count={mockRiskSummary.high}
          label="HIGH QUANTUM RISK"
          subtext="Vulnerable components"
          percentage={Math.round((mockRiskSummary.high / mockRiskSummary.total) * 100)}
          isActive={selectedRiskFilter === 'HIGH'}
          onClick={() => handleRiskFilterChange(selectedRiskFilter === 'HIGH' ? 'ALL' : 'HIGH')}
        />

        {/* Medium Risk Card */}
        <RiskCard
          level="MEDIUM"
          count={mockRiskSummary.medium}
          label="MEDIUM QUANTUM RISK"
          subtext="Components requiring review"
          percentage={Math.round((mockRiskSummary.medium / mockRiskSummary.total) * 100)}
          isActive={selectedRiskFilter === 'MEDIUM'}
          onClick={() => handleRiskFilterChange(selectedRiskFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
        />

        {/* Low Risk Card */}
        <RiskCard
          level="LOW"
          count={mockRiskSummary.low}
          label="LOW QUANTUM RISK"
          subtext="Lower-risk components"
          percentage={Math.round((mockRiskSummary.low / mockRiskSummary.total) * 100)}
          isActive={selectedRiskFilter === 'LOW'}
          onClick={() => handleRiskFilterChange(selectedRiskFilter === 'LOW' ? 'ALL' : 'LOW')}
        />

        {/* Quantum Readiness Summary Card */}
        <div
          className="glass-panel"
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '140px',
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 246, 249, 0.8) 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Quantum Readiness
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(233, 162, 59, 0.15)',
                  color: 'var(--color-accent-dark)',
                }}
              >
                {mockRiskSummary.atRiskPercentage}% At Risk
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  lineHeight: 1.1,
                }}
              >
                {mockRiskSummary.readinessPercentage}%
              </span>
              <span style={{ fontSize: '13px', color: 'var(--color-secondary-dark)', fontWeight: 600 }}>
                Quantum Resilient
              </span>
            </div>
          </div>

          {/* Simple Progress Bar */}
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                height: '8px',
                width: '100%',
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              <div
                style={{
                  width: `${mockRiskSummary.readinessPercentage}%`,
                  backgroundColor: 'var(--color-secondary)',
                  height: '100%',
                }}
                title={`Resilient: ${mockRiskSummary.readinessPercentage}%`}
              />
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginTop: '6px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{mockRiskSummary.analyzedComponents} components analyzed</span>
              <span>Baseline NIST SP 800-208</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Risk Distribution & Key Insights */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Risk Distribution Card */}
        <RiskDistribution
          summary={mockRiskSummary}
          selectedRisk={selectedRiskFilter}
          onSelectRisk={handleRiskFilterChange}
        />

        {/* Key Insights Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lightbulb size={18} color="var(--color-accent-dark)" />
                <h3 className="title-level-2">Key Insights</h3>
              </div>
              <MockDataBadge size="sm" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mockKeyInsights.map((insight) => (
                <div
                  key={insight.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.65)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                  }}
                >
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    {insight.category === 'critical' ? (
                      <ShieldAlert size={15} color="var(--color-risk-high)" />
                    ) : insight.category === 'warning' ? (
                      <AlertTriangle size={15} color="var(--color-accent-dark)" />
                    ) : (
                      <CheckCircle2 size={15} color="var(--color-secondary-dark)" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.45, fontWeight: 500 }}>
                      {insight.text}
                    </p>
                    {insight.componentRef && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          fontFamily: 'monospace',
                          display: 'inline-block',
                          marginTop: '2px',
                        }}
                      >
                        Target: {insight.componentRef}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              marginTop: '14px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-glass)',
            }}
          >
            Insights generated from development AST rule engine ruleset v0.8.
          </div>
        </div>
      </div>

      {/* 4. Cryptographic Inventory / CBOM Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 className="title-level-2" style={{ fontSize: '19px' }}>
                Cryptographic Inventory & CBOM
              </h2>
              <MockDataBadge size="sm" />
            </div>
            <p className="subtitle-muted">
              Live components discovered across scanned source repositories
            </p>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTableTab('inventory')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: activeTableTab === 'inventory' ? '#ffffff' : 'transparent',
                color: activeTableTab === 'inventory' ? 'var(--color-primary)' : 'var(--text-secondary)',
                boxShadow: activeTableTab === 'inventory' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Lock size={13} />
              Inventory View
            </button>
            <button
              onClick={() => setActiveTableTab('cbom')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: activeTableTab === 'cbom' ? '#ffffff' : 'transparent',
                color: activeTableTab === 'cbom' ? 'var(--color-primary)' : 'var(--text-secondary)',
                boxShadow: activeTableTab === 'cbom' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={13} />
              CBOM View
            </button>
          </div>
        </div>

        {activeTableTab === 'inventory' ? (
          <CryptoInventoryTable
            data={mockCryptoInventory}
            initialRiskFilter={selectedRiskFilter}
          />
        ) : (
          <CBOMTable data={mockCBOM} />
        )}
      </div>

      {/* 5. Migration Candidates Section */}
      <MigrationCandidates candidates={mockMigrationCandidates} />
    </div>
  );
};
