import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Lock,
  Layers,
  FileSpreadsheet,
  FileText,
  Code,
  Download,
  Clock,
  ArrowRight,
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
  mockReportOptions,
} from '../data/pqcMockData';

interface PQCPageProps {
  onNavigateToInventory?: () => void;
  onNavigateToReports?: () => void;
  onShowToast?: (message: string) => void;
}

export const PQC: React.FC<PQCPageProps> = ({
  onNavigateToInventory,
  onNavigateToReports,
  onShowToast,
}) => {
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [activeTableTab, setActiveTableTab] = useState<'inventory' | 'cbom'>('inventory');

  const handleRiskFilterChange = (risk: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') => {
    setSelectedRiskFilter(risk);
  };

  const handleQuickExport = (format: string, title: string) => {
    if (onShowToast) {
      onShowToast(`Report export (${format}) for "${title}" will be available in a later release.`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* 1. Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="title-level-1">PQC Security Overview</h1>
            <MockDataBadge />
          </div>
          <p className="subtitle-muted" style={{ fontSize: '14px', marginTop: '4px' }}>
            Quantum readiness and cryptographic inventory for the selected project
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onNavigateToInventory} className="btn-secondary">
            <Lock size={14} color="var(--color-graphite)" /> Full Inventory
          </button>
          <button onClick={onNavigateToReports} className="btn-sage">
            <FileSpreadsheet size={14} color="#ffffff" /> View Reports
          </button>
        </div>
      </div>

      {/* 2. Top Risk Cards Grid (High / Medium / Low + Quantum Readiness Summary) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
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
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '144px',
            background: 'rgba(255, 255, 255, 0.55)',
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
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'rgba(140, 106, 56, 0.12)',
                  color: 'var(--color-risk-medium)',
                  border: '1px solid rgba(140, 106, 56, 0.22)',
                }}
              >
                {mockRiskSummary.atRiskPercentage}% At Risk
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span
                style={{
                  fontSize: '34px',
                  fontWeight: 700,
                  color: 'var(--color-graphite)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                }}
              >
                {mockRiskSummary.readinessPercentage}%
              </span>
              <span style={{ fontSize: '13px', color: 'var(--color-muted-sage)', fontWeight: 600 }}>
                Quantum Resilient
              </span>
            </div>
          </div>

          {/* Simple Progress Bar */}
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                height: '7px',
                width: '100%',
                backgroundColor: 'rgba(41, 40, 36, 0.08)',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
                border: '1px solid rgba(255, 255, 255, 0.5)',
              }}
            >
              <div
                style={{
                  width: `${mockRiskSummary.readinessPercentage}%`,
                  backgroundColor: 'var(--color-muted-sage)',
                  height: '100%',
                }}
                title={`Resilient: ${mockRiskSummary.readinessPercentage}%`}
              />
            </div>
            <div
              style={{
                fontSize: '11.5px',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '18px',
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lightbulb size={18} color="var(--color-graphite)" />
                <h3 className="title-level-2">Key Insights</h3>
              </div>
              <MockDataBadge size="sm" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {mockKeyInsights.map((insight) => (
                <div
                  key={insight.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.55)',
                    border: '1px solid rgba(255, 255, 255, 0.75)',
                    boxShadow: '0 2px 6px rgba(41, 40, 36, 0.02)',
                  }}
                >
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    {insight.category === 'critical' ? (
                      <ShieldAlert size={15} color="var(--color-graphite)" strokeWidth={2} />
                    ) : insight.category === 'warning' ? (
                      <AlertTriangle size={15} color="var(--color-risk-medium)" strokeWidth={2} />
                    ) : (
                      <CheckCircle2 size={15} color="var(--color-muted-sage)" strokeWidth={2} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', color: 'var(--color-graphite)', lineHeight: 1.45, fontWeight: 500 }}>
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
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(41, 40, 36, 0.06)',
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
              <h2 className="title-level-2" style={{ fontSize: '18px' }}>
                Cryptographic Inventory & CBOM
              </h2>
              <MockDataBadge size="sm" />
            </div>
            <p className="subtitle-muted">
              Live components discovered across scanned source repositories
            </p>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: 'rgba(241, 237, 228, 0.8)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
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
                borderRadius: '8px',
                cursor: 'pointer',
                background: activeTableTab === 'inventory' ? '#ffffff' : 'transparent',
                color: 'var(--color-graphite)',
                boxShadow: activeTableTab === 'inventory' ? '0 2px 6px rgba(41,40,36,0.08)' : 'none',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
            >
              <Lock size={13} color="var(--color-graphite)" />
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
                borderRadius: '8px',
                cursor: 'pointer',
                background: activeTableTab === 'cbom' ? '#ffffff' : 'transparent',
                color: 'var(--color-graphite)',
                boxShadow: activeTableTab === 'cbom' ? '0 2px 6px rgba(41,40,36,0.08)' : 'none',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
            >
              <Layers size={13} color="var(--color-graphite)" />
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

      {/* 5. Bottom Section: Migration Candidates & Reports */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '18px',
          alignItems: 'start',
        }}
      >
        {/* Migration Candidates */}
        <div style={{ flex: 1 }}>
          <MigrationCandidates candidates={mockMigrationCandidates} />
        </div>

        {/* Quick Reports Section */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.55)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={18} color="var(--color-graphite)" />
                <h3 className="title-level-2">Compliance Reports</h3>
              </div>
              <MockDataBadge size="sm" />
            </div>
            <p className="subtitle-muted" style={{ marginBottom: '16px' }}>
              Export quantum risk assessments, CBOM documentation, and inventory audits
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mockReportOptions.map((opt) => (
                <div
                  key={opt.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 6px rgba(41, 40, 36, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background:
                          opt.format === 'PDF'
                            ? 'rgba(41, 40, 36, 0.08)'
                            : opt.format === 'JSON'
                            ? 'rgba(120, 135, 119, 0.14)'
                            : 'rgba(140, 106, 56, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(255, 255, 255, 0.6)',
                      }}
                    >
                      {opt.format === 'PDF' ? (
                        <FileText size={17} color="var(--color-graphite)" />
                      ) : opt.format === 'JSON' ? (
                        <Code size={17} color="var(--color-muted-sage)" />
                      ) : (
                        <FileSpreadsheet size={17} color="#8c6a38" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-graphite)' }}>
                        {opt.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Format: {opt.format} • Approx: {opt.estimatedSize}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickExport(opt.format, opt.title)}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}
                  >
                    <Download size={13} />
                    Export {opt.format}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid rgba(41, 40, 36, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
              <Clock size={12} />
              <span>Compilation ready on request</span>
            </div>

            <button
              onClick={onNavigateToReports}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-muted-sage)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Full Reports Page <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
