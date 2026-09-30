import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  FileCode,
  ShieldAlert,
  Atom,
  Cpu,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { mockProjectMetadata, mockCryptoInventory, mockCBOM } from '@/data/pqcMockData';
import { mockReport } from '@/data/mockData';

interface ReportsProps {
  onShowToast?: (message: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({ onShowToast }) => {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const criticalAndHigh = mockReport.summary.critical_findings + mockReport.summary.high_findings;
  const cryptoTotal = mockReport.crypto_inventory_summary.total_components;
  const vulnerableAlgorithms = mockReport.crypto_inventory_summary.vulnerable_algorithms;
  const exposureWidth = cryptoTotal > 0 ? Math.min((vulnerableAlgorithms / cryptoTotal) * 100, 100) : 0;

  const handleExportPDF = () => {
    setDownloadNotice('PDF Export: The server-side PDF generation worker (/api/v1/reports/{scan_id}/pdf) is not yet implemented on the backend. This is a Day 1 placeholder.');
    if (onShowToast) {
      onShowToast('PDF generation endpoint will be available once the report rendering backend is deployed.');
    }
  };

  const handleExportJSON = () => {
    // Generate realistic client-side JSON export of the CBOM
    const exportData = {
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      serialNumber: `urn:uuid:pqc-cbom-${Date.now()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        component: {
          name: mockProjectMetadata.projectName,
          version: '1.0.0',
          type: 'application',
        },
        properties: [
          { name: 'pqc:engineVersion', value: mockProjectMetadata.scanEngineVersion },
          { name: 'pqc:isMockData', value: 'true' },
        ],
      },
      cryptographicComponents: mockCryptoInventory,
      cbom: mockCBOM,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mockProjectMetadata.projectName}-pqc-cbom.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadNotice('Downloaded Client-Side CBOM JSON artifact (Mock Preview). Server-side async export queue remains pending.');
    if (onShowToast) {
      onShowToast('Downloaded client-side CBOM JSON schema preview.');
    }
  };

  const handleExportCSV = () => {
    // Generate CSV from mockCryptoInventory
    const headers = ['Algorithm', 'Library', 'Version', 'Location', 'Usage', 'Risk', 'Status'];
    const rows = mockCryptoInventory.map((item) => [
      `"${item.algorithm}"`,
      `"${item.library}"`,
      `"${item.version}"`,
      `"${item.location}"`,
      `"${item.usage}"`,
      `"${item.risk}"`,
      `"${item.status || (item.quantumVulnerable ? 'Quantum vulnerable' : 'Currently acceptable')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mockProjectMetadata.projectName}-crypto-inventory.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadNotice('Downloaded Client-Side Crypto Inventory CSV artifact (Mock Preview).');
    if (onShowToast) {
      onShowToast('Downloaded client-side CSV inventory preview.');
    }
  };

  return (
    <>
      <PageHeader
        title="Cryptographic & security reports"
        description="Export post-quantum readiness assessments, CBOM documentation, and cryptographic audit records."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportPDF}
              className="btn"
              title="Export executive PDF report (Backend placeholder)"
            >
              <FileText className="h-3.5 w-3.5 text-critical" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="btn"
              title="Export machine-readable JSON CBOM"
            >
              <FileCode className="h-3.5 w-3.5 text-primary" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="btn-primary"
              title="Export CSV inventory list"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        {/* Notice Banner */}
        {downloadNotice && (
          <div className="glass rounded-xl p-4 border-primary/30 text-[13px] flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span className="text-slate-700">{downloadNotice}</span>
            </div>
            <button
              onClick={() => setDownloadNotice(null)}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Dismiss notice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="reports-posture" aria-labelledby="reports-posture-heading">
          <div className="reports-posture-header">
            <div>
              <span className="reports-eyebrow">SECURITY POSTURE</span>
              <h2 id="reports-posture-heading">Executive security overview</h2>
              <p>{mockReport.project_name} <span aria-hidden="true">·</span> {mockReport.scan_id}</p>
            </div>
            <div className="reports-generated">
              <Clock className="h-3.5 w-3.5" />
              <span>Assessment snapshot</span>
              <strong>{mockReport.generated_at}</strong>
            </div>
          </div>

          <div className="reports-posture-grid">
            <article className="reports-posture-card reports-posture-lead">
              <div className="reports-card-label"><ShieldAlert aria-hidden="true" /> Overall findings</div>
              <div className="reports-lead-number">{mockReport.summary.total_findings}</div>
              <p>Total vulnerability detections</p>
              <div className="reports-severity-strip" aria-label={`Findings by severity: ${mockReport.summary.critical_findings} critical, ${mockReport.summary.high_findings} high, ${mockReport.summary.medium_findings} medium, ${mockReport.summary.low_findings} low`}>
                <span className="reports-severity-critical" style={{ width: `${mockReport.summary.total_findings ? mockReport.summary.critical_findings / mockReport.summary.total_findings * 100 : 0}%` }} />
                <span className="reports-severity-high" style={{ width: `${mockReport.summary.total_findings ? mockReport.summary.high_findings / mockReport.summary.total_findings * 100 : 0}%` }} />
                <span className="reports-severity-medium" style={{ width: `${mockReport.summary.total_findings ? mockReport.summary.medium_findings / mockReport.summary.total_findings * 100 : 0}%` }} />
                <span className="reports-severity-low" style={{ width: `${mockReport.summary.total_findings ? mockReport.summary.low_findings / mockReport.summary.total_findings * 100 : 0}%` }} />
              </div>
              <div className="reports-severity-legend">
                <span className="severity-critical">Critical <strong>{mockReport.summary.critical_findings}</strong></span>
                <span className="severity-high">High <strong>{mockReport.summary.high_findings}</strong></span>
                <span className="severity-medium">Medium <strong>{mockReport.summary.medium_findings}</strong></span>
                <span className="severity-low">Low <strong>{mockReport.summary.low_findings}</strong></span>
              </div>
            </article>

            <article className="reports-posture-card reports-critical-high">
              <div className="reports-card-label"><ShieldAlert aria-hidden="true" /> Critical / high findings</div>
              <div className="reports-metric-number">{criticalAndHigh}</div>
              <p>Priority findings requiring attention</p>
              <div className="reports-card-foot"><span>Critical <b>{mockReport.summary.critical_findings}</b></span><span>High <b>{mockReport.summary.high_findings}</b></span></div>
            </article>

            <article className="reports-posture-card reports-readiness">
              <div className="reports-card-label"><Atom aria-hidden="true" /> PQC readiness</div>
              <div className="reports-metric-number">{mockReport.pqc_risk_summary.overall_readiness_score}<small>%</small></div>
              <p>Quantum readiness index</p>
              <div className="reports-progress-track" aria-label={`PQC readiness ${mockReport.pqc_risk_summary.overall_readiness_score}%`}>
                <span style={{ width: `${mockReport.pqc_risk_summary.overall_readiness_score}%` }} />
              </div>
            </article>

            <article className="reports-posture-card reports-exposure">
              <div className="reports-card-label"><Cpu aria-hidden="true" /> Cryptographic exposure</div>
              <div className="reports-metric-number">{vulnerableAlgorithms}<small> / {cryptoTotal}</small></div>
              <p>Vulnerable algorithms / total assets</p>
              <div className="reports-progress-track reports-exposure-track" aria-label={`${vulnerableAlgorithms} vulnerable algorithms among ${cryptoTotal} assets`}>
                <span style={{ width: `${exposureWidth}%` }} />
              </div>
            </article>

            <article className="reports-posture-card reports-migrations">
              <div className="reports-card-label"><FileSpreadsheet aria-hidden="true" /> Migration candidates</div>
              <div className="reports-metric-number">{mockReport.crypto_inventory_summary.migration_candidates}</div>
              <p>Identified in the assessment</p>
              <div className="reports-card-foot"><span>Detected assets <b>{mockReport.crypto_inventory_summary.total_components}</b></span></div>
            </article>
          </div>

          <div className="reports-scan-context">
            <span><b>Project</b>{mockProjectMetadata.projectName}</span>
            <span><b>Branch</b><code>{mockProjectMetadata.branch}</code></span>
            <span><b>Files scanned</b>{mockProjectMetadata.totalFilesScanned}</span>
            <span><b>Scan timestamp</b>{mockProjectMetadata.lastScanTimestamp}</span>
            <span><b>Ruleset</b><code>{mockProjectMetadata.scanEngineVersion}</code></span>
          </div>
        </section>

        {/* Compliance Standard References */}
        <div className="card p-6">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Post-Quantum Cryptography Reporting Standards</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
            <div className="reports-standard-card p-4 rounded-lg bg-white/60 border border-slate-200/60">
              <div className="font-semibold text-primary mb-1">NIST FIPS 203 / 204 / 205</div>
              <p className="text-slate-600 leading-relaxed text-[12px]">
                Standardizes ML-KEM (Kyber) and ML-DSA (Dilithium) replacement of classical RSA and ECC mechanisms.
              </p>
            </div>
            <div className="reports-standard-card p-4 rounded-lg bg-white/60 border border-slate-200/60">
              <div className="font-semibold text-primary mb-1">CycloneDX CBOM Specification</div>
              <p className="text-slate-600 leading-relaxed text-[12px]">
                Industry standard format for inventorying algorithms, key sizes, quantum vulnerability, and implementations.
              </p>
            </div>
            <div className="reports-standard-card p-4 rounded-lg bg-white/60 border border-slate-200/60">
              <div className="font-semibold text-primary mb-1">Air-Gapped Assessment Policy</div>
              <p className="text-slate-600 leading-relaxed text-[12px]">
                Operates entirely offline without external SaaS telemetry, ensuring cryptographic code never leaves customer premises.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Reports;
