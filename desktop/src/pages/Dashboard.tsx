import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  Plus,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  FileArchive,
  Layers,
  Database,
  WifiOff,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Panel } from '@/components/dashboard/Panel';
import { SegmentBar } from '@/components/dashboard/SegmentBar';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { MockDataBadge } from '@/components/pqc/MockDataBadge';
import { NewScanModal } from '@/components/scans/NewScanModal';
import { ScanStatusPill } from '@/components/scans/ScanStatusPill';
import { EmptyState } from '@/components/common/EmptyState';
import { useScanPolling } from '@/hooks/useScanPolling';
import { api, ApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { isTerminalStatus, type ScanOut, type ScanStatus } from '@/types/scan';
import type { Project } from '@/types';
import { mockScans, mockProjects } from '@/data/mockData';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { handleUnauthorized } = useAuth();
  const [loadError, setLoadError] = useState<ApiError | Error | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<ScanOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewScanOpen, setIsNewScanOpen] = useState(false);
  const [isBackendOffline, setIsBackendOffline] = useState(false);

  // Load telemetry from backend
  const loadData = async () => {
    setLoadError(null);
    try {
      const [projList, scanList] = await Promise.all([
        api.getProjects().catch(() => []),
        api.listScans(),
      ]);
      setProjects(projList);
      setScans(scanList);
      setIsBackendOffline(false);
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : new Error(String(err));
      setLoadError(apiErr);
      if (err instanceof ApiError && err.errorType === 'UNAUTHORIZED') {
        handleUnauthorized();
      }
      console.warn('[Dashboard] Backend unavailable, loading development data:', err);
      setIsBackendOffline(true);
      // Fallback only when backend is offline, clearly labeled as Development data
      setProjects(mockProjects);
      setScans(
        mockScans.map((s) => ({
          id: s.id,
          project_id: s.project_id,
          status: s.status,
          created_at: s.created_at,
          started_at: null,
          completed_at: s.completed_at || null,
          project_name: s.project_name,
          repository_name: s.repository_name,
          files_analyzed: null,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Find target scan for active observation: prefer in-progress scan, else latest scan
  const activeOrLatestScan = useMemo(() => {
    if (!scans.length) return null;
    return scans.find((s) => !isTerminalStatus(s.status)) || scans[0];
  }, [scans]);

  // Hook connects to active scan for bounded real-time polling
  const {
    scan: polledScan,
    findingsSummary,
    status: polledStatus,
  } = useScanPolling(activeOrLatestScan?.id, {
    enabled: Boolean(activeOrLatestScan?.id) && !isBackendOffline,
    initialScan: activeOrLatestScan,
  });

  const displayScan = polledScan || activeOrLatestScan;
  const currentStatus: ScanStatus = polledStatus || displayScan?.status || 'QUEUED';

  // We derive severity counts from the latest completed scan's report/findings summary,
  // as each scan represents the verified state of the target codebase,
  // and the backend endpoint /reports/{scan_id} provides authoritative per-scan counts.
  const latestCompletedScan = useMemo(() => {
    return scans.find((s) => s.status === 'COMPLETED');
  }, [scans]);

  // Findings summary resolution
  const severityCounts = useMemo(() => {
    if (displayScan?.status === 'COMPLETED' && findingsSummary) {
      return findingsSummary;
    }
    return {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0,
    };
  }, [displayScan, findingsSummary]);

  const hasScans = scans.length > 0;
  const isCompletedWithZeroFindings =
    displayScan?.status === 'COMPLETED' &&
    findingsSummary !== null &&
    findingsSummary.total === 0;

  const filesAnalyzedDisplay =
    displayScan?.files_analyzed !== undefined && displayScan?.files_analyzed !== null
      ? displayScan.files_analyzed
      : 'Not reported';

  return (
    <>
      <PageHeader
        title="Security overview"
        badge={<MockDataBadge size="sm" label="DEVELOPMENT / MOCK DATA" />}
        description="Development / Mock Data: Application vulnerabilities, post-quantum readiness, and cryptographic inventory in one view."
        actions={
          <>
            {isBackendOffline && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50/90 px-3 py-1 text-[11.5px] font-semibold text-amber-900 shadow-2xs">
                <Database className="h-3 w-3 text-amber-700" />
                <span>Development data · Backend offline</span>
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
              title="Refresh telemetry"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  isRefreshing ? 'animate-spin text-primary' : ''
                }`}
              />
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

      {/* Backend error notice — shown when API unreachable, metrics show development data */}
      {loadError && !isRefreshing && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] mb-4"
          style={{
            background: 'rgba(71, 85, 105, 0.07)',
            border: '1px solid rgba(71, 85, 105, 0.18)',
            color: '#475569',
          }}
        >
          <WifiOff size={15} className="shrink-0" />
          <span>
            <strong>Backend unavailable</strong> — viewing development data.{' '}
            {loadError instanceof ApiError ? loadError.userMessage : ''}
          </span>
          <button
            onClick={loadData}
            className="ml-auto text-xs font-semibold hover:underline"
            style={{ color: '#2A9D8F' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card h-32 skeleton" />
          ))}
        </div>
      ) : !hasScans ? (
        /* Empty State: No scans yet */
        <EmptyState
          icon={ShieldCheck}
          title="No cryptographic assessments yet"
          description="Create a project and upload an air-gapped repository archive to trigger your first AST post-quantum scan."
          actionText="Create Project / Start Scan"
          onAction={() => setIsNewScanOpen(true)}
        />
      ) : (
        /* 5 Equal KPI Cards */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div
            className="cursor-pointer"
            onClick={() => navigate('/findings?severity=CRITICAL')}
          >
            <StatCard
              level="critical"
              label="Critical"
              value={severityCounts.critical}
              delta={latestCompletedScan ? 'Verified' : 'Pending'}
              deltaDir="flat"
              hint="Immediate Shor risk"
              icon={AlertOctagon}
            />
          </div>
          <div
            className="cursor-pointer"
            onClick={() => navigate('/findings?severity=HIGH')}
          >
            <StatCard
              level="high"
              label="High"
              value={severityCounts.high}
              delta={latestCompletedScan ? 'Verified' : 'Pending'}
              deltaDir="flat"
              hint="HNDL vulnerability"
              icon={AlertTriangle}
            />
          </div>
          <div
            className="cursor-pointer"
            onClick={() => navigate('/findings?severity=MEDIUM')}
          >
            <StatCard
              level="medium"
              label="Medium"
              value={severityCounts.medium}
              delta={latestCompletedScan ? 'Verified' : 'Pending'}
              hint="Config & padding flaws"
              icon={AlertCircle}
            />
          </div>
          <div
            className="cursor-pointer"
            onClick={() => navigate('/findings?severity=LOW')}
          >
            <StatCard
              level="low"
              label="Low"
              value={severityCounts.low}
              delta={latestCompletedScan ? 'Verified' : 'Pending'}
              hint="Informational hygiene"
              icon={Info}
            />
          </div>

          {/* Latest Scan / Active Assessment Card */}
          <div className="card min-w-0 border-purple-200/80 bg-gradient-to-br from-purple-100/50 via-white/70 to-sky-100/40 p-5 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
              <span className="eyebrow text-purple-700 font-semibold">
                Latest scan
              </span>
              <ScanStatusPill status={currentStatus} size="sm" />
            </div>

            <div className="mt-2.5 font-mono text-[20px] font-bold tracking-tight text-purple-800 select-all truncate">
              {displayScan ? displayScan.id : '—'}
            </div>

            <div className="mt-1 flex items-center gap-1.5 font-mono text-[11.5px] text-slate-600 truncate">
              <FileArchive className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">
                {displayScan?.repository_name || 'repository.zip'}
              </span>
            </div>

            {/* Files analyzed & Findings summary */}
            <div className="mt-3 pt-2.5 border-t border-purple-200/60 text-[11.5px] text-slate-600 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3 text-slate-400" />
                  <span>Files analyzed:</span>
                </span>
                <span className="font-mono font-medium text-foreground">
                  {filesAnalyzedDisplay}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Findings:</span>
                <span className="font-mono font-medium text-purple-700">
                  {displayScan?.status === 'COMPLETED'
                    ? isCompletedWithZeroFindings
                      ? '0 (Clean)'
                      : `${severityCounts.total} detected`
                    : 'Pending analysis'}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end">
              {displayScan ? (
                <button
                  onClick={() => navigate(`/scans/${displayScan.id}`)}
                  className="cursor-pointer text-[12px] font-semibold text-purple-700 hover:text-purple-900 hover:underline bg-transparent border-0 p-0 inline-flex items-center gap-1"
                >
                  <span>Inspect scan</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/scans')}
                  className="cursor-pointer text-[12px] font-semibold text-purple-700 hover:text-purple-900 hover:underline bg-transparent border-0 p-0"
                >
                  View all →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Row 1: [Security score | PQC readiness] */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Overall security score"
          sub={
            isBackendOffline
              ? "Development / Mock Data — AST syntax validation, dependency CVEs and configuration exposure."
              : "AST syntax validation, dependency CVEs and configuration exposure."
          }
          right={isBackendOffline ? <MockDataBadge size="xs" label="DEVELOPMENT / MOCK DATA" /> : undefined}
        >
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="tabular text-[48px] font-semibold leading-none tracking-tight text-foreground">
                {displayScan?.status === 'COMPLETED'
                  ? isCompletedWithZeroFindings
                    ? 100
                    : Math.max(20, 100 - severityCounts.critical * 15 - severityCounts.high * 8)
                  : 74}
                <span className="text-[20px] text-muted-foreground"> / 100</span>
              </div>
              <p className="mt-2 text-[13px] text-emerald-700 font-medium">
                {displayScan?.status === 'COMPLETED'
                  ? 'Calculated from completed scan findings'
                  : '▲ 3 pts vs last scan'}
              </p>
            </div>
            <ScoreRing
              value={
                displayScan?.status === 'COMPLETED'
                  ? isCompletedWithZeroFindings
                    ? 100
                    : Math.max(20, 100 - severityCounts.critical * 15 - severityCounts.high * 8)
                  : 74
              }
            />
          </div>
        </Panel>

        <Panel
          title="PQC readiness index"
          sub={
            isBackendOffline
              ? "Development / Mock Data — NIST FIPS 203 / 204 readiness baseline."
              : "NIST FIPS 203 / 204 readiness heuristics."
          }
          right={
            <div className="flex items-center gap-2">
              {isBackendOffline && <MockDataBadge size="xs" label="DEVELOPMENT / MOCK DATA" />}
              <span className="tabular font-semibold text-purple-700">
                58% quantum safe
              </span>
            </div>
          }
        >
          <SegmentBar
            segments={[
              {
                label: 'Resistant · AES-256 / SHA-384',
                value: 58,
                color: 'bg-primary',
              },
              {
                label: 'Shor at-risk · RSA / ECC',
                value: 42,
                color: 'bg-critical',
              },
            ]}
            cols={1}
          />
        </Panel>
      </div>

      {/* Row 2: [Findings by severity | Findings by category] */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Findings by severity"
          right={`Total ${severityCounts.total}`}
          footer={
            <span className="text-muted-foreground">
              SLA · Critical 24h · High 7d · Medium 30d · Low 90d
            </span>
          }
        >
          <SegmentBar
            segments={[
              {
                label: 'Critical',
                value: severityCounts.critical,
                color: 'bg-critical',
              },
              { label: 'High', value: severityCounts.high, color: 'bg-high' },
              {
                label: 'Medium',
                value: severityCounts.medium,
                color: 'bg-medium',
              },
              { label: 'Low', value: severityCounts.low, color: 'bg-low' },
            ]}
          />
        </Panel>

        <Panel
          title="Findings by category"
          right="Total 58"
          footer={
            <span className="text-muted-foreground">
              Source: AST rules, dependency manifests, TLS configs
            </span>
          }
        >
          <SegmentBar
            segments={[
              { label: 'Cryptographic', value: 21, color: 'bg-violet-500' },
              { label: 'SAST code', value: 18, color: 'bg-sky-500' },
              { label: 'Dependency', value: 11, color: 'bg-cyan-500' },
              { label: 'Configuration', value: 8, color: 'bg-amber-500' },
            ]}
          />
        </Panel>
      </div>

      {/* Row 3: [Post-quantum risk | Recent scan activity] */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Post-quantum cryptographic risk"
          sub={
            isBackendOffline
              ? "Development / Mock Data — Components classified against Shor and Grover threats."
              : "Components classified against Shor and Grover threats."
          }
          right={
            <div className="flex items-center gap-2">
              {isBackendOffline && <MockDataBadge size="xs" label="DEVELOPMENT / MOCK DATA" />}
              <span className="tabular font-semibold text-purple-700">
                25 components
              </span>
            </div>
          }
          footer={
            <button
              onClick={() => navigate('/pqc')}
              className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline bg-transparent border-0 p-0 text-[13px]"
            >
              Explore PQC assessment <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          <SegmentBar
            cols={1}
            segments={[
              {
                label: 'High · Shor vulnerable (RSA / ECC)',
                value: 5,
                color: 'bg-critical',
              },
              {
                label: 'Medium · Hybrid / legacy TLS',
                value: 8,
                color: 'bg-medium',
              },
              {
                label: 'Low · AES-256 / SHA-384',
                value: 12,
                color: 'bg-primary',
              },
            ]}
          />
        </Panel>

        <Panel
          title="Recent scans"
          sub="Audit trail of cryptographic scans and pipeline execution runs."
          right={`${scans.length} total`}
          footer={
            <button
              onClick={() => navigate('/scans')}
              className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline bg-transparent border-0 p-0 text-[13px]"
            >
              View all scans <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          <ul className="space-y-3">
            {scans.slice(0, 4).map((s) => (
              <li
                key={s.id}
                onClick={() => navigate(`/scans/${s.id}`)}
                className="flex items-center justify-between gap-4 text-[13px] hover:bg-white/60 p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      s.status === 'COMPLETED'
                        ? 'bg-emerald-500'
                        : s.status === 'FAILED'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-mono text-[12px] font-semibold text-purple-700">
                    {s.id}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {s.repository_name || 'repository.zip'}
                  </span>
                </span>
                <span className="shrink-0 text-[11.5px] text-muted-foreground tabular">
                  {new Date(s.created_at).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* New Scan Modal */}
      <NewScanModal
        isOpen={isNewScanOpen}
        onClose={() => setIsNewScanOpen(false)}
        projects={projects}
        onScanCreated={(newScan) => {
          setScans((prev) => [
            {
              id: newScan.id,
              project_id: newScan.project_id,
              status: newScan.status,
              created_at: newScan.created_at,
              started_at: null,
              completed_at: null,
              repository_name: newScan.repository_name,
            },
            ...prev,
          ]);
        }}
      />
    </>
  );
};

export default Dashboard;
