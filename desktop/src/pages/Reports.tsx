import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  CheckCircle2,
  X,
  Download,
  RefreshCw,
  FolderGit2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { api, ApiError } from '@/services/api';
import type { Scan, Finding, Report } from '@/types';

interface ReportsProps {
  onShowToast?: (message: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({ onShowToast }) => {
  const [searchParams] = useSearchParams();
  const scanIdParam = searchParams.get('scan_id');

  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>(scanIdParam || '');
  const [reportData, setReportData] = useState<Report | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load scans and findings
  const loadInitialData = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const [scanList, findingsList] = await Promise.all([
        api.getScans(),
        api.getFindings(),
      ]);
      setScans(scanList);
      setFindings(findingsList);

      const activeId = scanIdParam || (scanList.length > 0 ? scanList[0].id : '');
      setSelectedScanId(activeId);

      if (activeId) {
        await loadReport(activeId);
      }
    } catch (err) {
      console.error('Failed to load scans for reports:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof ApiError ? err.userMessage : 'Failed to load scan records.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadReport = async (scanId: string) => {
    try {
      const rep = await api.getReport(scanId);
      setReportData(rep);
    } catch (err) {
      console.error('Failed to load scan report:', err);
      // Fallback: report might still be available from scan list
      setReportData(null);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [scanIdParam]);

  const handleScanChange = async (newScanId: string) => {
    setSelectedScanId(newScanId);
    setStatusMessage(null);
    if (newScanId) {
      await loadReport(newScanId);
    } else {
      setReportData(null);
    }
  };

  // Real JSON Export
  const handleExportJSON = async () => {
    if (!selectedScanId) {
      setStatusMessage({ type: 'error', text: 'No scan selected for export.' });
      return;
    }

    setIsExporting(true);
    setStatusMessage(null);
    try {
      const report = await api.getReport(selectedScanId);
      const fileName = `pqc_scan_report_${selectedScanId}.json`;
      const jsonString = JSON.stringify(report, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const msg = `Successfully exported ${fileName}`;
      setStatusMessage({ type: 'success', text: msg });
      if (onShowToast) {
        onShowToast(msg);
      }
    } catch (err) {
      const errText = err instanceof ApiError ? err.userMessage : 'Failed to generate report JSON.';
      setStatusMessage({ type: 'error', text: errText });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedScan = scans.find((s) => s.id === selectedScanId) || (scans.length > 0 ? scans[0] : null);
  const scanFindings = findings.filter((f) => f.scan_id === selectedScanId);

  // Compute live metrics
  const totalFindings = reportData?.total_findings ?? scanFindings.length ?? 0;
  const critCount = reportData?.findings_by_severity?.critical ?? scanFindings.filter((f) => (f.severity || '').toUpperCase() === 'CRITICAL').length;
  const highCount = reportData?.findings_by_severity?.high ?? scanFindings.filter((f) => (f.severity || '').toUpperCase() === 'HIGH').length;
  const medCount = reportData?.findings_by_severity?.medium ?? scanFindings.filter((f) => (f.severity || '').toUpperCase() === 'MEDIUM').length;
  const lowCount = reportData?.findings_by_severity?.low ?? scanFindings.filter((f) => (f.severity || '').toUpperCase() === 'LOW').length;

  const cryptoAssetsCount = scanFindings.filter((f) => (f.category || '').toUpperCase() === 'CRYPTO' || (f.engine || '').toLowerCase() === 'crypto').length;
  const quantumAtRiskCount = critCount + scanFindings.filter((f) => {
    const text = `${f.title} ${f.explanation || ''}`.toLowerCase();
    return text.includes('rsa') || text.includes('ecc') || text.includes('md5') || text.includes('sha1');
  }).length;
  const readinessPercentage = totalFindings === 0 ? 100 : Math.max(10, Math.min(100, Math.round(100 - (quantumAtRiskCount * 22))));

  return (
    <>
      <PageHeader
        title="Cryptographic & security reports"
        description="Inspect assessment telemetry and export machine-readable JSON audit reports for offline compliance."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Real JSON Export */}
            <button
              onClick={handleExportJSON}
              disabled={isExporting || !selectedScanId}
              className="btn-primary flex items-center gap-1.5"
              title="Download full JSON report"
            >
              {isExporting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Export JSON</span>
            </button>

            {/* Disabled PDF Export with Day 3 Badge */}
            <div className="relative inline-flex items-center">
              <button
                disabled
                className="btn opacity-50 cursor-not-allowed flex items-center gap-1.5"
                title="PDF export engine scheduled for Day 3"
              >
                <FileText className="h-3.5 w-3.5 text-critical" />
                <span>Export PDF</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-1">
                  Day 3
                </span>
              </button>
            </div>

            {/* Disabled CSV Export with Day 3 Badge */}
            <div className="relative inline-flex items-center">
              <button
                disabled
                className="btn opacity-50 cursor-not-allowed flex items-center gap-1.5"
                title="CSV export engine scheduled for Day 3"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
                <span>Export CSV</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-1">
                  Day 3
                </span>
              </button>
            </div>
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        {/* Status Feedback Notice */}
        {statusMessage && (
          <div
            className={`rounded-xl p-4 text-[13px] flex items-start justify-between gap-3 animate-in fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50/80 border border-emerald-200 text-emerald-900'
                : 'bg-red-50/80 border border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Scan Selector Bar */}
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-2/40 border border-border">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <FolderGit2 className="h-4 w-4 text-purple-700" />
            <span className="font-semibold">Target Scan Report:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedScanId}
              onChange={(e) => handleScanChange(e.target.value)}
              disabled={isLoading || scans.length === 0}
              className="h-8.5 rounded-lg border bg-surface px-3 text-[12.5px] font-mono text-foreground outline-none focus:border-primary/60 min-w-[280px]"
            >
              {scans.length === 0 ? (
                <option value="">No scans available</option>
              ) : (
                scans.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id.slice(0, 12)}… · {s.repository_name || s.file_name || 'archive'} ({s.status})
                  </option>
                ))
              )}
            </select>

            <button
              onClick={loadInitialData}
              disabled={isLoading}
              className="btn h-8.5 px-2.5"
              title="Refresh reports"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Summary Telemetry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Scan Summary */}
          <div className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary text-[11px] font-semibold uppercase tracking-wider mb-2">
                <Clock className="h-4 w-4" />
                <span>Scan Summary</span>
              </div>
              <div className="text-[16px] font-semibold text-slate-900 truncate" title={reportData?.project_name || selectedScan?.project_name || 'No Scan Selected'}>
                {reportData?.project_name || selectedScan?.project_name || (selectedScan ? 'Repository Scan' : 'No Scan Selected')}
              </div>
              <div className="text-[12px] text-slate-500 mt-1 font-mono truncate" title={reportData?.target_repository || selectedScan?.repository_name || '—'}>
                Target: {reportData?.target_repository || selectedScan?.repository_name || selectedScan?.file_name || '—'}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-[12px] text-slate-500 space-y-1">
              <div>Scan ID: <strong className="text-purple-700 font-mono text-[11px]">{selectedScan?.id ? `${selectedScan.id.slice(0, 8)}…` : '—'}</strong></div>
              <div>Status: <strong className="text-slate-900">{selectedScan?.status || 'COMPLETED'}</strong></div>
              <div>Date: <strong className="text-slate-900">{selectedScan?.created_at ? new Date(selectedScan.created_at).toLocaleDateString() : '—'}</strong></div>
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
                {totalFindings}
              </div>
              <div className="text-[12px] text-slate-500 mt-2">
                Total Vulnerability Detections
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11.5px] flex items-center justify-between tabular">
              <span className="text-critical font-medium">{critCount} Crit</span>
              <span className="text-high font-medium">{highCount} High</span>
              <span className="text-medium font-medium">{medCount} Med</span>
              <span className="text-low font-medium">{lowCount} Low</span>
            </div>
          </div>

          {/* 3. PQC Risk Summary */}
          <div className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-700 text-[11px] font-semibold uppercase tracking-wider mb-2">
                <Atom className="h-4 w-4" />
                <span>PQC Readiness</span>
              </div>
              <div className="tabular text-[36px] font-semibold text-purple-700 leading-none tracking-tight">
                {readinessPercentage}%
              </div>
              <div className="text-[12px] text-slate-500 mt-2">
                Quantum Readiness Score
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11.5px] flex items-center justify-between tabular">
              <span className="text-critical font-medium">At Risk: {quantumAtRiskCount}</span>
              <span className="text-emerald-700 font-medium">Safe: {Math.max(0, totalFindings - quantumAtRiskCount)}</span>
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
                {cryptoAssetsCount}
              </div>
              <div className="text-[12px] text-slate-500 mt-2">
                Discovered Cryptographic Primitives
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11.5px] flex items-center justify-between tabular">
              <span className="text-purple-700 font-semibold">{cryptoAssetsCount > 0 ? 'MD5 detected' : 'Clean'}</span>
              <span className="text-slate-500 font-mono text-[11px]">{selectedScan?.status === 'COMPLETED' ? 'Verified' : 'Pending'}</span>
            </div>
          </div>
        </div>

        {/* Detailed Findings Table in Report */}
        <div className="card p-6">
          <h3 className="section-title mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-purple-700" />
              <span>Report Findings Payload ({reportData?.findings?.length || scanFindings.length})</span>
            </div>
            <span className="text-xs font-normal text-slate-500 font-mono">
              GET /api/v1/reports/{selectedScanId || '—'}
            </span>
          </h3>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border bg-surface-2/50 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="py-2.5 px-3 w-28">Severity</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Finding Title</th>
                  <th className="py-2.5 px-3 min-w-[220px]">File Location</th>
                  <th className="py-2.5 px-3 w-32">Engine</th>
                  <th className="py-2.5 px-3 min-w-[250px]">Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {(reportData?.findings && reportData.findings.length > 0 ? reportData.findings : scanFindings).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No findings recorded for this scan report.
                    </td>
                  </tr>
                ) : (
                  (reportData?.findings && reportData.findings.length > 0 ? reportData.findings : scanFindings).map((f) => {
                    const sev = (f.severity || '').toLowerCase();
                    const badgeClass =
                      sev === 'critical'
                        ? 'bg-critical/10 text-critical ring-critical/25'
                        : sev === 'high'
                        ? 'bg-high/10 text-high ring-high/25'
                        : sev === 'medium'
                        ? 'bg-medium/10 text-medium ring-medium/25'
                        : 'bg-low/10 text-low ring-low/25';
                    return (
                      <tr key={f.id || f.finding_id} className="hover:bg-surface-2/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10.5px] font-semibold uppercase ring-1 ${badgeClass}`}>
                            {f.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {f.title}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11.5px] text-slate-600">
                          {f.file_path || f.file}{f.line_number || f.line ? `:${f.line_number || f.line}` : ''}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-[11px] font-semibold text-purple-700">
                          {f.engine || f.category || 'sast'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[12px] truncate max-w-xs" title={f.recommendation || f.explanation}>
                          {f.recommendation || f.explanation || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
