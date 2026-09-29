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
} from 'lucide-react';
import { mockProjectMetadata, mockRiskSummary, mockCryptoInventory, mockCBOM } from '../data/pqcMockData';

interface ReportsProps {
  onShowToast?: (message: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({ onShowToast }) => {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

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
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="title-level-1">Cryptographic & Security Reports</h1>
          <p className="subtitle-muted mt-1">
            Export post-quantum readiness assessments, CBOM documentation, and cryptographic audit records.
          </p>
        </div>

        {/* Action Buttons: Export PDF, Export JSON, Export CSV */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportPDF}
            className="btn-secondary px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2"
            title="Export executive PDF report (Backend placeholder)"
          >
            <FileText className="w-4 h-4 text-red-400" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="btn-secondary px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2"
            title="Export machine-readable JSON CBOM"
          >
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-teal px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm"
            title="Export tabular CSV Inventory"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {downloadNotice && (
        <div className="p-4 rounded-xl bg-slate-900 border border-teal-500/30 text-xs text-slate-200 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <span>{downloadNotice}</span>
          </div>
          <button
            onClick={() => setDownloadNotice(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 Summary Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Scan Summary */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Clock className="w-4 h-4" />
              <span>Scan Summary</span>
            </div>
            <div className="text-base font-bold text-slate-100">
              {mockProjectMetadata.projectName}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              Branch: {mockProjectMetadata.branch}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11.5px] text-slate-400 space-y-1">
            <div>Files: <strong className="text-slate-200">{mockProjectMetadata.totalFilesScanned}</strong></div>
            <div>Timestamp: <strong className="text-slate-200">{mockProjectMetadata.lastScanTimestamp}</strong></div>
            <div>Ruleset: <strong className="text-teal-300">{mockProjectMetadata.scanEngineVersion}</strong></div>
          </div>
        </div>

        {/* 2. Security Findings Summary */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldAlert className="w-4 h-4" />
              <span>Findings Summary</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-100">
              58
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Total Vulnerability Detections
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11.5px] flex items-center justify-between text-slate-400">
            <span className="text-red-400 font-semibold">5 Crit</span>
            <span className="text-orange-400 font-semibold">12 High</span>
            <span className="text-yellow-400 font-semibold">27 Med</span>
            <span className="text-teal-400 font-semibold">14 Low</span>
          </div>
        </div>

        {/* 3. PQC Risk Summary */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Atom className="w-4 h-4" />
              <span>PQC Risk Summary</span>
            </div>
            <div className="text-3xl font-extrabold text-teal-400">
              {mockRiskSummary.readinessPercentage}%
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Quantum Readiness Index
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11.5px] flex items-center justify-between text-slate-400">
            <span>High Risk: <strong className="text-red-400">{mockRiskSummary.high}</strong></span>
            <span>Med: <strong className="text-yellow-400">{mockRiskSummary.medium}</strong></span>
            <span>Low: <strong className="text-teal-400">{mockRiskSummary.low}</strong></span>
          </div>
        </div>

        {/* 4. Crypto Inventory Summary */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Cpu className="w-4 h-4" />
              <span>Crypto Inventory</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-100">
              25
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Discovered Cryptographic Assets
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11.5px] flex items-center justify-between text-slate-400">
            <span>Vulnerable: <strong className="text-rose-400">13</strong></span>
            <span>Candidates: <strong className="text-teal-400">7</strong></span>
          </div>
        </div>
      </div>

      {/* Compliance Standard References */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Post-Quantum Cryptography Compliance Standards</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="font-semibold text-teal-300 mb-1">NIST FIPS 203 / 204 / 205</div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              Final standards for ML-KEM (Kyber) and ML-DSA (Dilithium) replacement of classical RSA and ECC mechanisms.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="font-semibold text-teal-300 mb-1">CycloneDX CBOM Specification</div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              Industry standard format for inventorying algorithms, key sizes, classical/quantum status, and implementation origins.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="font-semibold text-teal-300 mb-1">Air-Gapped Assessment Policy</div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              Operates entirely offline without external SaaS telemetry, ensuring cryptographic code never leaves customer premises.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
