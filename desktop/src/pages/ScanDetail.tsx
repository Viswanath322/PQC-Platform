import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Ban,
  FileArchive,
  FolderGit2,
  Calendar,
  Layers,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { useScanPolling } from '@/hooks/useScanPolling';
import { ScanStatusPill } from '@/components/scans/ScanStatusPill';
import { ScanStepper } from '@/components/scans/ScanStepper';
import { SeveritySummary } from '@/components/common/SeveritySummary';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { LastUpdated } from '@/components/common/LastUpdated';
import { EmptyState } from '@/components/common/EmptyState';
import { api, ApiError } from '@/services/api';
import type { Project } from '@/types';
import { isTerminalStatus } from '@/types/scan';

export const ScanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Polling hook manages scan lifecycle, intervals, backoff, and terminal stopping
  const {
    scan,
    findingsSummary,
    status,
    error,
    isPolling,
    isPaused,
    pauseReason,
    lastUpdated,
    refresh,
    resume,
    retry,
  } = useScanPolling(id);

  // Fetch project metadata once scan.project_id is available
  useEffect(() => {
    if (scan?.project_id) {
      let isMounted = true;
      api
        .getProject(scan.project_id)
        .then((p) => {
          if (isMounted) setProject(p);
        })
        .catch((err) => {
          console.warn(`[ScanDetail] Could not load project ${scan.project_id}:`, err);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [scan?.project_id]);

  const handleCancel = async () => {
    if (!id) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await api.cancelScan(id);
      setShowCancelModal(false);
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to cancel scan';
      setCancelError(msg);
      console.error(`[ScanDetail] Failed to cancel scan ${id}:`, err);
    } finally {
      setIsCancelling(false);
    }
  };

  const currentStatus = status || scan?.status || 'QUEUED';
  const canCancel = !isTerminalStatus(currentStatus);
  const isCompleted = currentStatus === 'COMPLETED';

  // Format ISO timestamps or show fallback dash
  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  // Derive display values strictly from API responses
  const projectName = project?.name || scan?.project_name || 'Not reported';
  const repositoryName = scan?.repository_name || 'Not reported';
  const filesAnalyzedDisplay =
    scan?.files_analyzed !== undefined && scan?.files_analyzed !== null
      ? scan.files_analyzed
      : 'Not reported';

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Back button and page breadcrumbs */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/scans')}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Scans</span>
        </button>

        <LastUpdated
          timestamp={lastUpdated}
          isPolling={isPolling}
          isPaused={isPaused}
          pauseReason={pauseReason}
          onResume={resume}
        />
      </div>

      {/* Visible Error Banner for API/Network Failures */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={retry}
          isRetrying={isPolling}
        />
      )}

      {/* Header Card */}
      <div className="card p-6 border-white/80 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow">Cryptographic Scan</span>
              <ScanStatusPill status={currentStatus} size="md" />
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <h1 className="font-mono text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight select-all">
                {id || 'Scan details'}
              </h1>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 truncate">
                <FolderGit2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Project:</span>
                <strong className="text-foreground font-medium">{projectName}</strong>
              </span>

              <span className="inline-flex items-center gap-1.5 truncate">
                <FileArchive className="h-3.5 w-3.5 text-slate-400" />
                <span>Repository archive:</span>
                <span className="font-mono text-[12px] text-slate-700 bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200/60">
                  {repositoryName}
                </span>
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Created:</span>
                <span className="tabular font-medium text-foreground">{formatTime(scan?.created_at)}</span>
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
            <button
              onClick={() => refresh()}
              disabled={isPolling}
              className="btn transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
              title="Manual telemetry refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPolling ? 'animate-spin text-primary' : ''}`} />
              <span>Refresh</span>
            </button>

            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50/80 px-3.5 text-[13px] font-medium text-rose-700 shadow-2xs hover:bg-rose-100 active:translate-y-0 cursor-pointer transition-colors"
                title="Cancel active scan"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Cancel scan</span>
              </button>
            )}
          </div>
        </div>

        {/* Detailed Timestamps Bar */}
        <div className="mt-5 pt-4 border-t border-border/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
          <div>
            <span className="text-muted-foreground">Queued at:</span>{' '}
            <span className="tabular font-medium text-foreground">{formatTime(scan?.created_at)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Started at:</span>{' '}
            <span className="tabular font-medium text-foreground">{formatTime(scan?.started_at)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Completed at:</span>{' '}
            <span className="tabular font-medium text-foreground">{formatTime(scan?.completed_at)}</span>
          </div>
        </div>
      </div>

      {/* Stepper Pipeline Card */}
      <div className="card p-6 border-white/80 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
              Assessment Pipeline Stage
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Automated progression through AST parsing, cryptographic detection, and post-quantum classification.
            </p>
          </div>
        </div>

        <ScanStepper
          status={currentStatus}
          errorMessage={scan?.error_message}
        />
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Files Analyzed Card */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Files analyzed</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3">
            {typeof filesAnalyzedDisplay === 'number' ? (
              <div className="tabular font-mono text-[32px] font-bold text-foreground">
                {filesAnalyzedDisplay}
              </div>
            ) : (
              <div className="text-[18px] font-medium text-muted-foreground">
                {filesAnalyzedDisplay}
              </div>
            )}
            <p className="mt-1 text-[12px] text-muted-foreground">
              Total source files and dependency manifests inspected
            </p>
          </div>
        </div>

        {/* Findings Total Card */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Total findings</span>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-3">
            {isCompleted && findingsSummary ? (
              <div className="tabular font-mono text-[32px] font-bold text-purple-700">
                {findingsSummary.total}
              </div>
            ) : isCompleted ? (
              <div className="tabular font-mono text-[32px] font-bold text-purple-700">
                0
              </div>
            ) : (
              <div className="text-[14px] text-muted-foreground italic">
                Pending analysis completion
              </div>
            )}
            <p className="mt-1 text-[12px] text-muted-foreground">
              Shor-vulnerable algorithms and implementation weaknesses
            </p>
          </div>
        </div>

        {/* Findings Action Card */}
        <div className="card p-5 bg-gradient-to-br from-purple-50/50 via-white/80 to-teal-50/30 flex flex-col justify-between">
          <div>
            <span className="eyebrow text-purple-700">Analysis engines</span>
            <p className="text-[13px] text-slate-700 mt-2 font-medium">
              NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA) and AST Static Heuristics
            </p>
          </div>
          <div className="mt-4">
            <Link
              to="/findings"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-purple-700 hover:text-purple-900 hover:underline"
            >
              <span>Explore Findings Explorer</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Findings Breakdown / Empty State Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
            Findings by Severity
          </h2>
          {isCompleted && (
            <span className="text-[12px] text-muted-foreground">
              Categorized by NIST PQC quantum threat level
            </span>
          )}
        </div>

        {isCompleted && findingsSummary && findingsSummary.total === 0 ? (
          // Completed with zero findings: empty state per Day 2 requirements
          <EmptyState
            icon={ShieldCheck}
            title="No findings detected"
            description={`This scan analyzed the repository archive and detected zero cryptographic vulnerabilities or post-quantum risks across all active analysis engines (AST, Crypto, SAST, Dependency).`}
            actionText="View Findings Explorer"
            onAction={() => navigate('/findings')}
          >
            <div className="text-[11px] font-mono text-muted-foreground mt-2">
              Files analyzed: {filesAnalyzedDisplay} · Status: COMPLETED
            </div>
          </EmptyState>
        ) : (
          <SeveritySummary
            summary={findingsSummary}
            isLoading={!isCompleted && !findingsSummary && !error}
            emptyLabel={
              isCompleted
                ? 'No findings recorded for this scan.'
                : 'Findings will appear after analysis'
            }
          />
        )}
      </div>

      {/* Confirmation Modal for Cancel Scan */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="card w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-foreground">
                  Cancel active scan?
                </h3>
                <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
                  Are you sure you want to abort scan <code className="font-mono text-foreground font-semibold">{id}</code>? The in-flight analysis jobs will be terminated and no further findings will be collected.
                </p>

                {cancelError && (
                  <p className="mt-3 text-[12px] text-rose-600 font-mono bg-rose-50 p-2 rounded border border-rose-200">
                    {cancelError}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    disabled={isCancelling}
                    className="btn"
                  >
                    Keep scanning
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-transparent bg-rose-600 px-4 text-[13px] font-medium text-white shadow-sm hover:bg-rose-700 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                  >
                    {isCancelling ? 'Cancelling…' : 'Confirm cancellation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanDetail;
