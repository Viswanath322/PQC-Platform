import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Scan as ScanIcon, RefreshCw, Filter, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScanTable } from '@/components/scans/ScanTable';
import { NewScanModal } from '@/components/scans/NewScanModal';
import { api } from '@/services/api';
import type { Scan, Project } from '@/types';
import { isTerminalStatus } from '@/types/scan';

export const Scans: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectFilter = searchParams.get('project');

  const [scans, setScans] = useState<Scan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewScanOpen, setIsNewScanOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [scanList, projList] = await Promise.all([
        api.getScans(),
        api.getProjects().catch(() => []),
      ]);
      setScans(scanList);
      setProjects(projList);
    } catch (err) {
      console.error('[Scans] Failed to load scans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Poll the scans list lightly (every 10s) only while any scan row is non-terminal
  useEffect(() => {
    const hasActiveScans = scans.some((s) => !isTerminalStatus(s.status));
    if (!hasActiveScans) return;

    const interval = setInterval(async () => {
      try {
        const updated = await api.getScans();
        setScans(updated);
      } catch (err) {
        console.warn('[Scans] Light background poll failed:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [scans]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updated = await api.getScans();
      setScans(updated);
    } catch (err) {
      console.error('[Scans] Failed to refresh scans:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleScanCreated = (newScan: Scan) => {
    setScans((prev) => [newScan, ...prev]);
    // Optionally navigate immediately to inspect the new scan
    navigate(`/scans/${newScan.id}`);
  };

  const handleCancelScan = async (scan: Scan) => {
    try {
      await api.cancelScan(scan.id);
      setScans((prev) =>
        prev.map((s) => (s.id === scan.id ? { ...s, status: 'CANCELLED' } : s))
      );
    } catch (err) {
      console.error('[Scans] Failed to cancel scan:', err);
    }
  };

  const handleViewScan = (scan: Scan) => {
    navigate(`/scans/${scan.id}`);
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
              className="btn transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
              title="Refresh scans status"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsNewScanOpen(true)}
              className="btn-primary transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New scan</span>
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Filters Bar */}
        <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Scan ID (e.g. SCAN-001), repository, project…"
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
            onViewScan={handleViewScan}
            onCancelScan={handleCancelScan}
          />
        )}
      </div>

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
