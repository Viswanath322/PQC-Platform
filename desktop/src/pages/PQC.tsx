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
          <p className="subtitle-muted" style={{ fontSize: '14px', marginTop: '3px' }}>
            Quantum readiness and cryptographic inventory for your project
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onNavigateToInventory} className="btn-secondary">
            <Lock size={13} color="#252522" /> Full Inventory
          </button>
          <button onClick={onNavigateToReports} className="btn-primary">
            <FileSpreadsheet size={13} /> View Reports
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
            background: 'rgba(255, 255, 255, 0.58)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
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
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(200, 155, 85, 0.12)',
                  color: '#C89B55',
                }}
              >
                {mockRiskSummary.atRiskPercentage}% At Risk
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 600,
                  color: '#252522',
                  lineHeight: 1.1,
                }}
              >
                {mockRiskSummary.readinessPercentage}%
              </span>
              <span style={{ fontSize: '13px', color: '#718071', fontWeight: 600 }}>
                Quantum Resilient
              </span>
            </div>
          </div>

          {/* Thin Apple-style Progress Bar */}
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                height: '6px',
                width: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '9999px',
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              <div
                style={{
                  width: `${mockRiskSummary.readinessPercentage}%`,
                  backgroundColor: '#718071', // Muted sage, NO cyan
                  height: '100%',
                  borderRadius: '9999px',
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lightbulb size={17} color="#252522" />
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
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    {/* Small monochrome icons */}
                    {insight.category === 'critical' ? (
                      <ShieldAlert size={14} color="#252522" />
                    ) : insight.category === 'warning' ? (
                      <AlertTriangle size={14} color="#C89B55" />
                    ) : (
                      <CheckCircle2 size={14} color="#718071" />
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
              borderTop: '1px solid rgba(0, 0, 0, 0.04)',
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

          {/* View Mode Toggle Pill */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.04)', padding: '3px', borderRadius: 'var(--radius-full)' }}>
            <button
              onClick={() => setActiveTableTab('inventory')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                background: activeTableTab === 'inventory' ? '#ffffff' : 'transparent',
                color: activeTableTab === 'inventory' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeTableTab === 'inventory' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Lock size={12} />
              Inventory View
            </button>
            <button
              onClick={() => setActiveTableTab('cbom')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                background: activeTableTab === 'cbom' ? '#ffffff' : 'transparent',
                color: activeTableTab === 'cbom' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeTableTab === 'cbom' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={12} />
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
            backgroundColor: 'rgba(255, 255, 255, 0.58)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={17} color="#252522" />
                <h3 className="title-level-2">Compliance Reports</h3>
              </div>
              <MockDataBadge size="sm" />
            </div>
            <p className="subtitle-muted" style={{ marginBottom: '16px' }}>
              Export quantum risk assessments, CBOM documentation, and inventory audits
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mockReportOptions.map((opt) => (
                <div
                  key={opt.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
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
                            ? 'rgba(43, 43, 40, 0.06)'
                            : opt.format === 'JSON'
                            ? 'rgba(113, 128, 113, 0.1)'
                            : 'rgba(200, 155, 85, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {opt.format === 'PDF' ? (
                        <FileText size={17} color="#2B2B28" />
                      ) : opt.format === 'JSON' ? (
                        <Code size={17} color="#718071" />
                      ) : (
                        <FileSpreadsheet size={17} color="#C89B55" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {opt.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Format: {opt.format} • Approx: {opt.estimatedSize}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickExport(opt.format, opt.title)}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-md)', flexShrink: 0 }}
                  >
                    <Download size={12} />
                    Export {opt.format}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid rgba(0, 0, 0, 0.04)',
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
                color: '#718071',
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
