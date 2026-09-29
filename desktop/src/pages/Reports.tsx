import React from 'react';
import {
  FileBarChart,
  ShieldCheck,
} from 'lucide-react';
import { MockDataBadge } from '../components/pqc/MockDataBadge';
import { ReportExportCard } from '../components/reports/ReportExportCard';
import { mockReportOptions, mockProjectMetadata } from '../data/pqcMockData';

interface ReportsProps {
  onShowToast: (message: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({ onShowToast }) => {
  const handleExport = (format: string, title: string) => {
    onShowToast(`Report export (${format}) for "${title}" will be available in a later release.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="title-level-1">Security Reports</h1>
            <MockDataBadge />
          </div>
          <p className="subtitle-muted" style={{ fontSize: '14px', marginTop: '4px' }}>
            Export quantum risk assessments, CBOM documentation, and inventory audits
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(120, 135, 119, 0.14)',
              color: 'var(--color-muted-sage)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(120, 135, 119, 0.28)',
            }}
          >
            <ShieldCheck size={14} /> Ready for Generation
          </span>
        </div>
      </div>

      {/* Overview Info Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid var(--color-muted-sage)',
          backgroundColor: 'rgba(255, 255, 255, 0.52)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(120, 135, 119, 0.14)',
              border: '1px solid rgba(120, 135, 119, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileBarChart size={20} color="var(--color-muted-sage)" />
          </div>
          <div>
            <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--color-graphite)' }}>
              Artifact Compilation Target: {mockProjectMetadata.projectName}
            </h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Branch: <code style={{ color: 'var(--color-graphite)', background: 'rgba(41, 40, 36, 0.06)', padding: '2px 6px', borderRadius: '4px' }}>{mockProjectMetadata.branch}</code> • Scanned Files: {mockProjectMetadata.totalFilesScanned} • AST Ruleset v0.8.4
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              background: 'rgba(41, 40, 36, 0.05)',
              border: '1px solid rgba(41, 40, 36, 0.08)',
              padding: '5px 10px',
              borderRadius: '6px',
              fontWeight: 500,
            }}
          >
            Format Schemas: NIST / CycloneDX 1.6
          </span>
        </div>
      </div>

      {/* 3 Report Export Cards */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 className="title-level-2">Standard Export Formats</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>3 report templates available</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {mockReportOptions.map((opt) => (
            <ReportExportCard key={opt.id} option={opt} onExport={handleExport} />
          ))}
        </div>
      </div>

      {/* Compliance Standard References */}
      <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'rgba(255, 255, 255, 0.52)' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-graphite)', marginBottom: '14px' }}>
          Post-Quantum Cryptography Reporting Standards
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.45)',
              border: '1px solid var(--border-glass)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-muted-sage)', marginBottom: '6px' }}>
              NIST FIPS 203, 204, 205
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Standardizes Module-Lattice Key Encapsulation Mechanism (ML-KEM) and Digital Signature Algorithms (ML-DSA / SLH-DSA).
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.45)',
              border: '1px solid var(--border-glass)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-muted-sage)', marginBottom: '6px' }}>
              CycloneDX Cryptographic BOM (CBOM)
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Standardized format to document cryptographic dependencies, quantum vulnerability ratings, and key lifecycles.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.45)',
              border: '1px solid var(--border-glass)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-muted-sage)', marginBottom: '6px' }}>
              BSI Technical Guideline TR-02102
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Cryptographic mechanisms recommendation guidance for long-term security and quantum-resistant hybrid transitions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
