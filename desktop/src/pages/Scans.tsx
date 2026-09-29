import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Scan as ScanIcon, RefreshCw, Filter, Search } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { ScanTable } from '../components/scans/ScanTable';
import { NewScanModal } from '../components/scans/NewScanModal';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import type { Scan, Project } from '../types';

export const Scans: React.FC = () => {
  const [searchParams] = useSearchParams();
  const projectFilter = searchParams.get('project');

  const [scans, setScans] = useState<Scan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewScanOpen, setIsNewScanOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedScanForDetails, setSelectedScanForDetails] = useState<Scan | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [scanList, projList] = await Promise.all([
        api.getScans(),
        api.getProjects(),
      ]);
      setScans(scanList);
      setProjects(projList);
    } catch (err) {
      console.error('Failed to load scans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updated = await api.getScans();
      setScans(updated);
    } catch (err) {
      console.error('Failed to refresh scans:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleScanCreated = (newScan: Scan) => {
    setScans((prev) => [newScan, ...prev]);
  };

  const handleCancelScan = async (scan: Scan) => {
    try {
      await api.cancelScan(scan.id);
      setScans((prev) =>
        prev.map((s) => (s.id === scan.id ? { ...s, status: 'CANCELLED' } : s))
      );
    } catch (err) {
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
    <PageContainer
      title="Cryptographic Scans & History"
      subtitle="Track ongoing and historical AST inspection runs, post-quantum classifications, and pipeline execution logs."
      actions={
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 rounded-lg"
            title="Refresh scans status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsNewScanOpen(true)}
            className="btn-teal px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Initiate Scan</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Scan ID (e.g. SCAN-001), repository, project..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
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

            <div className="text-xs text-slate-400 pl-3 border-l border-slate-800">
              Showing <strong className="text-slate-200">{filteredScans.length}</strong> of{' '}
              <strong className="text-slate-200">{scans.length}</strong>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <LoadingState message="Fetching cryptographic scans..." />
        ) : filteredScans.length === 0 ? (
          <EmptyState
            icon={ScanIcon}
            title="No scans found"
            description={
              searchQuery || statusFilter !== 'ALL'
                ? 'No scans match your current filter parameters.'
                : 'No cryptographic scans have been executed yet. Initiate a scan to assess your code against post-quantum baselines.'
            }
            actionText="Initiate Scan"
            onAction={() => setIsNewScanOpen(true)}
          />
        ) : (
          <ScanTable
            scans={filteredScans}
            onViewScan={(scan) => setSelectedScanForDetails(scan)}
            onCancelScan={handleCancelScan}
          />
        )}
      </div>

      {/* New Scan Modal */}
      <NewScanModal
        isOpen={isNewScanOpen}
        onClose={() => setIsNewScanOpen(false)}
        projects={projects}
        onScanCreated={handleScanCreated}
      />

      {/* Scan Quick Details Modal */}
      {selectedScanForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-base font-bold text-teal-300">
                  {selectedScanForDetails.id}
                </span>
                <span className="text-xs text-slate-400">
                  ({selectedScanForDetails.project_name})
                </span>
              </div>
              <button
                onClick={() => setSelectedScanForDetails(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">Repository Archive:</span>
                <span className="font-mono text-slate-200">{selectedScanForDetails.repository_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">Branch:</span>
                <span className="font-mono text-slate-200">{selectedScanForDetails.branch}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-teal-400">{selectedScanForDetails.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">PQC Readiness Score:</span>
                <span className="font-mono font-bold text-teal-400">{selectedScanForDetails.pqc_readiness_score}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">Total Findings:</span>
                <span className="font-semibold text-slate-100">{selectedScanForDetails.total_findings}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500">Created:</span>
                <span className="font-mono text-slate-400">{selectedScanForDetails.created_at}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedScanForDetails(null)}
                className="btn-secondary px-4 py-2 text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
