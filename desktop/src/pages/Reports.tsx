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
import { MockDataBadge } from '@/components/pqc/MockDataBadge';
import { mockProjectMetadata, mockRiskSummary } from '@/data/pqcMockData';

interface ReportsProps {
  onShowToast?: (message: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({ onShowToast }) => {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const handleExportPDF = () => {
    const message = 'PDF export is not implemented yet. This is a Day 1 UI placeholder.';
    setDownloadNotice(message);
    if (onShowToast) {
      onShowToast(message);
    }
  };

  const handleExportJSON = () => {
    const message = 'JSON export is not implemented yet. This is a Day 1 UI placeholder.';
    setDownloadNotice(message);
    if (onShowToast) {
      onShowToast(message);
    }
  };

  const handleExportCSV = () => {
    const message = 'CSV export is not implemented yet. This is a Day 1 UI placeholder.';
    setDownloadNotice(message);
    if (onShowToast) {
      onShowToast(message);
    }
  };

  return (
    <>
      <PageHeader
        title="Cryptographic & security reports"
        badge={<MockDataBadge label="DEVELOPMENT / MOCK DATA" />}
        description="Development / Mock Data: Sample post-quantum readiness assessments, CBOM documentation, and cryptographic audit records. (Export engines are currently in development as Day 1 UI placeholders)."

        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportPDF}
              className="btn"
              title="PDF export (Day 1 UI placeholder)"
            >
              <FileText className="h-3.5 w-3.5 text-critical" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="btn"
              title="JSON export (Day 1 UI placeholder)"
            >
              <FileCode className="h-3.5 w-3.5 text-primary" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="btn-primary"
              title="CSV export (Day 1 UI placeholder)"
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

        {/* Summary Sections Header */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-foreground">Assessment Telemetry Summary</span>
            <MockDataBadge size="xs" label="Development / Mock Data" />
          </div>
          <span className="text-[12px] text-muted-foreground">Demo Project Baseline</span>
        </div>

        {/* 4 Summary Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Scan Summary */}
          <div className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary text-[11px] font-semibold uppercase tracking-wider mb-2">
                <Clock className="h-4 w-4" />
                <span>Scan Summary</span>
              </div>
              <div className="text-[16px] font-semibold text-slate-900 truncate">
                {mockProjectMetadata.projectName}
              </div>
              <div className="text-[12px] text-slate-500 mt-1 font-mono">
                Branch: {mockProjectMetadata.branch}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-[12px] text-slate-500 space-y-1">
              <div>Files: <strong className="text-slate-900 tabular">{mockProjectMetadata.totalFilesScanned}</strong></div>
              <div>Timestamp: <strong className="text-slate-900">{mockProjectMetadata.lastScanTimestamp}</strong></div>
              <div>Ruleset: <strong className="text-purple-700 font-mono font-semibold">{mockProjectMetadata.scanEngineVersion}</strong></div>
            </div>
          </div>

          {/* 2. Security Findings Summary */}
          <div className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-critical text-[11px] font-semibold uppercase tracking-wider mb-2">
                <ShieldAlert className="h-4 w-4" />
                <span>Findings Summary</span>
              </div>
              <div className="tabular text-[36px] font-semibold text-slate-900 leading-none tracking-tight">
                58
              </div>
              <div className="text-[12px] text-slate-500 mt-2">
                Total Vulnerability Detections
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11.5px] flex items-center justify-between tabular">
              <span className="text-critical font-medium">5 Crit</span>
              <span className="text-high font-medium">12 High</span>
              <span className="text-medium font-medium">27 Med</span>
              <span className="text-low font-medium">14 Low</span>
            </div>
          </div>

          {/* 3. PQC Risk Summary */}
          <div className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-700 text-[11px] font-semibold uppercase tracking-wider mb-2">
                <Atom className="h-4 w-4" />
                <span>PQC Risk Summary</span>
              </div>
              <div className="tabular text-[36px] font-semibold text-purple-700 leading-none tracking-tight">
                {mockRiskSummary.readinessPercentage}%
              </div>
              <div className="text-[12px] text-slate-500 mt-2">
                Quantum Readiness Index
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11.5px] flex items-center justify-between tabular">
              <span className="text-critical font-medium">High: {mockRiskSummary.high}</span>
              <span className="text-medium font-medium">Med: {mockRiskSummary.medium}</span>
              <span className="text-low font-medium">Low: {mockRiskSummary.low}</span>
            </div>
          </div>

          {/* 4. Crypto Inventory Summary */}
          <div className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-violet-600 text-[11px] font-semibold uppercase tracking-wider mb-2">
                <Cpu className="h-4 w-4" />
                <span>Crypto Inventory</span>
              </div>
              <div className="tabular text-[36px] font-semibold text-slate-900 leading-none tracking-tight">
                25
              </div>
              <div className="text-[12px] text-slate-500 mt-2">
                Discovered Cryptographic Assets
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11.5px] flex items-center justify-between tabular">
              <span className="text-critical font-medium">Vulnerable: 13</span>
              <span className="text-purple-700 font-semibold">Candidates: 7</span>
            </div>
          </div>
        </div>

        {/* Compliance Standard References */}
        <div className="card p-6">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Post-Quantum Cryptography Reporting Standards</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
            <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60">
              <div className="font-semibold text-purple-700 mb-1">NIST FIPS 203 / 204 / 205</div>
              <p className="text-slate-600 leading-relaxed text-[12px]">
                Standardizes ML-KEM (Kyber) and ML-DSA (Dilithium) replacement of classical RSA and ECC mechanisms.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60">
              <div className="font-semibold text-purple-700 mb-1">CycloneDX CBOM Specification</div>
              <p className="text-slate-600 leading-relaxed text-[12px]">
                Industry standard format for inventorying algorithms, key sizes, quantum vulnerability, and implementations.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60">
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
