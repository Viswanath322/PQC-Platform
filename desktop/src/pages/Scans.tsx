import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Scan as ScanIcon, RefreshCw, Filter, Search, X, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScanTable } from '@/components/scans/ScanTable';
import { NewScanModal } from '@/components/scans/NewScanModal';
import { ApiErrorBanner } from '@/components/common/ApiErrorBanner';
import { api, ApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { Scan, Project, Finding } from '@/types';

export const Scans: React.FC = () => {
  const navigate = useNavigate();
  const { handleUnauthorized } = useAuth();
  const [searchParams] = useSearchParams();
  const projectFilter = searchParams.get('project');

  const [scans, setScans] = useState<Scan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | Error | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewScanOpen, setIsNewScanOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedScanForDetails, setSelectedScanForDetails] = useState<Scan | null>(null);
  // BUG 7: cancel-scan failure must be surfaced to the user
  const [cancelError, setCancelError] = useState<string | null>(null);

  const enrichScans = (scanList: Scan[], projList: Project[], findingsList: Finding[]): Scan[] => {
    const projMap = new Map(projList.map((p) => [p.id, p.name]));
    return scanList.map((s) => {
      const scanFindings = findingsList.filter((f) => f.scan_id === s.id);
      const critical = scanFindings.filter((f) => (f.severity || '').toUpperCase() === 'CRITICAL').length;
      const high = scanFindings.filter((f) => (f.severity || '').toUpperCase() === 'HIGH').length;
      const medium = scanFindings.filter((f) => (f.severity || '').toUpperCase() === 'MEDIUM').length;
      const low = scanFindings.filter((f) => (f.severity || '').toUpperCase() === 'LOW').length;
      return {
        ...s,
        project_name: s.project_name || projMap.get(s.project_id) || 'Demo Banking Application',
        branch: s.branch || 'main',
        repository_name: s.repository_name || s.file_name || 'pqc_sample_banking_app.zip',
        total_findings: scanFindings.length,
        critical_count: critical,
        high_count: high,
        medium_count: medium,
        low_count: low,
      };
    });
  };

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [scanList, projList, findingsList] = await Promise.all([
        api.getScans(),
        api.getProjects(),
        api.getFindings().catch(() => []),
      ]);
      setScans(enrichScans(scanList, projList, findingsList));
      setProjects(projList);
    } catch (err) {
      // Surface real error — NEVER substitute mock data
      const apiErr = err instanceof ApiError ? err : new Error(String(err));
      setLoadError(apiErr);
      if (err instanceof ApiError && err.errorType === 'UNAUTHORIZED') {
        handleUnauthorized();
      }
      console.error('Failed to load scans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [scanList, projList, findingsList] = await Promise.all([
        api.getScans(),
        api.getProjects(),
        api.getFindings().catch(() => []),
      ]);
      setScans(enrichScans(scanList, projList, findingsList));
      setProjects(projList);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new Error(String(err));
      setLoadError(apiErr);
      if (err instanceof ApiError && err.errorType === 'UNAUTHORIZED') {
        handleUnauthorized();
      }
      console.error('Failed to refresh scans:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleScanCreated = (_newScan: Scan) => {
    loadData();
  };

  const handleCancelScan = async (scan: Scan) => {
    setCancelError(null);
    try {
      await api.cancelScan(scan.id);
      // Only update UI on confirmed API success
      setScans((prev) =>
        prev.map((s) => (s.id === scan.id ? { ...s, status: 'CANCELLED' } : s))
      );
    } catch (err) {
      // BUG 7: capture and display error — do NOT update scan to CANCELLED falsely
      const message =
        err instanceof ApiError
          ? err.userMessage
          : 'Unable to cancel scan. Please try again.';
      setCancelError(message);
      console.error('Failed to cancel scan:', err);
    }
  };

  const filteredScans = scans.filter((s) => {
    if (projectFilter && s.project_id !== projectFilter) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.id.toLowerCase().includes(q) ||
        s.project_name.toLowerCase().includes(q) ||
        s.repository_name.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      <PageHeader
        title="Cryptographic scans"
        description="Track ongoing and historical AST inspection runs, post-quantum classifications, and pipeline execution logs."
        actions={
          <>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn"
              title="Refresh scans status"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsNewScanOpen(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" />
              <span>New scan</span>
            </button>
          </>
        }
      />

      {/* BUG 7: Cancel-scan failure banner */}
      {cancelError && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] mb-1"
          style={{
            background: 'rgba(220, 38, 38, 0.07)',
            border: '1px solid rgba(220, 38, 38, 0.18)',
            color: '#dc2626',
          }}
        >
          <AlertCircle size={15} className="shrink-0" />
          <span><strong>Unable to cancel scan</strong> — {cancelError}</span>
          <button
            onClick={() => setCancelError(null)}
            className="ml-auto text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Filters Bar */}
        <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Scan ID, repository, project…"
              className="h-9 w-full rounded-lg border bg-surface pl-9 pr-4 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-lg border bg-surface px-2.5 text-[12px] text-foreground outline-none focus:border-primary/60"
              >
                <option value="ALL">All Statuses</option>
                <option value="QUEUED">QUEUED</option>
                <option value="INGESTING">INGESTING</option>
                <option value="ANALYZING">ANALYZING</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="AI_ANALYSIS">AI ANALYSIS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="FAILED">FAILED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="text-[12px] text-muted-foreground pl-3 border-l border-border">
              Showing <span className="tabular font-medium text-foreground">{filteredScans.length}</span> of{' '}
              <span className="tabular font-medium text-foreground">{scans.length}</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-16 skeleton" />
            ))}
          </div>
        ) : loadError ? (
          <ApiErrorBanner
            error={loadError}
            onRetry={loadData}
            onSignIn={loadError instanceof ApiError && loadError.errorType === 'UNAUTHORIZED' ? handleUnauthorized : undefined}
          />
        ) : filteredScans.length === 0 ? (
          <div className="card flex flex-col items-center justify-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-muted-foreground">
              <ScanIcon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-[16px] font-semibold">No cryptographic scans found</h3>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-sm">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or active status filter.'
                : 'Upload an air-gapped repository archive to trigger your first scan.'}
            </p>
            <button
              onClick={() => setIsNewScanOpen(true)}
              className="btn-primary mt-5"
            >
              <Plus className="h-4 w-4" />
              <span>Start First Scan</span>
            </button>
          </div>
        ) : (
          <ScanTable
            scans={filteredScans}
            onViewScan={(scan) => setSelectedScanForDetails(scan)}
            onCancelScan={handleCancelScan}
          />
        )}
      </div>

      {/* Details Flyout Modal */}
      {selectedScanForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <span className="eyebrow">Scan Telemetry</span>
                <h3 className="font-mono text-[20px] font-semibold text-purple-700 mt-0.5">
                  {selectedScanForDetails.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedScanForDetails(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border bg-surface hover:bg-surface-2"
                aria-label="Close scan details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-surface-2/60 p-3.5 border border-border">
                  <span className="text-[11px] text-muted-foreground uppercase">Target Project</span>
                  <div className="font-medium text-foreground mt-1">
                    {selectedScanForDetails.project_name}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <span>Branch:</span>
                    <span className="rounded bg-purple-100/70 border border-purple-200/80 px-1.5 font-mono text-[10.5px] text-purple-700 font-semibold">{selectedScanForDetails.branch}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-surface-2/60 p-3.5 border border-border">
                  <span className="text-[11px] text-muted-foreground uppercase">Execution Status</span>
                  <div className="font-semibold text-primary mt-1">
                    {selectedScanForDetails.status}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 tabular">
                    Total Findings: {selectedScanForDetails.total_findings}
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-surface-2/60 p-4 border border-border">
                <span className="text-[11px] text-muted-foreground uppercase">AST Ruleset & Execution Engine</span>
                <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                  Scanned repository file <code className="font-mono text-purple-700 bg-purple-50/70 border border-purple-200/60 px-1.5 py-0.5 rounded font-semibold text-[12px]">{selectedScanForDetails.repository_name}</code> using local AST static analyzer and NIST FIPS 203 / 204 detection heuristics.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  onClick={() => setSelectedScanForDetails(null)}
                  className="btn"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const scanId = selectedScanForDetails.id;
                    setSelectedScanForDetails(null);
                    navigate(`/findings?scan_id=${scanId}`);
                  }}
                  className="btn-primary flex items-center gap-1.5"
                >
                  <span>View Findings</span>
                  {selectedScanForDetails.total_findings > 0 && (
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
                      {selectedScanForDetails.total_findings}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Scan Modal */}
      <NewScanModal
        isOpen={isNewScanOpen}
        onClose={() => setIsNewScanOpen(false)}
        projects={projects}
        defaultProjectId={projectFilter || undefined}
        onScanCreated={handleScanCreated}
      />
    </>
  );
};

export default Scans;
