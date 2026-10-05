import { useState, useEffect, useRef, useCallback } from 'react';
import { api, ApiError } from '@/services/api';
import {
  isTerminalStatus,
  type ScanOut,
  type ScanStatus,
  type ScanFindingsSummary,
} from '@/types/scan';

export interface UseScanPollingReturn {
  scan: ScanOut | null;
  findingsSummary: ScanFindingsSummary | null;
  status: ScanStatus | null;
  error: ApiError | Error | null;
  isPolling: boolean;
  isPaused: boolean;
  pauseReason: 'max_time' | 'consecutive_errors' | 'hidden' | null;
  lastUpdated: Date | null;
  consecutiveFailures: number;
  refresh: () => Promise<void>;
  resume: () => void;
  retry: () => Promise<void>;
}

const MAX_POLLING_DURATION_MS = 10 * 60 * 1000; // 10 minutes hard cap
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Custom hook for resilient, bounded scan polling.
 * - Polls GET /api/v1/scans/{id} while status is non-terminal.
 * - 2s interval for INGESTING/ANALYZING, 5s for QUEUED.
 * - Stops immediately on COMPLETED, FAILED, or CANCELLED.
 * - Backs off exponentially on error (2s, 4s, 8s, max 15s).
 * - Stops after 5 consecutive failures with a "Connection lost" state.
 * - Hard cap of 10 minutes polling per scan with "Polling paused" state and Resume.
 * - Automatically pauses when window is hidden and resumes when focused.
 * - Fetches findings summary when scan completes.
 */
export function useScanPolling(
  scanId: string | null | undefined,
  options?: {
    enabled?: boolean;
    initialScan?: ScanOut | null;
  }
): UseScanPollingReturn {
  const enabled = options?.enabled !== false && Boolean(scanId);

  const [scan, setScan] = useState<ScanOut | null>(options?.initialScan || null);
  const [findingsSummary, setFindingsSummary] = useState<ScanFindingsSummary | null>(null);
  const [status, setStatus] = useState<ScanStatus | null>(options?.initialScan?.status || null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<'max_time' | 'consecutive_errors' | 'hidden' | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  // References to maintain mutable loop state without triggering re-renders
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const currentScanIdRef = useRef<string | null | undefined>(scanId);
  const scanStatusRef = useRef<ScanStatus | null>(options?.initialScan?.status || null);

  // Keep refs in sync inside effects to avoid impure render updates
  useEffect(() => {
    currentScanIdRef.current = scanId;
  }, [scanId]);

  useEffect(() => {
    scanStatusRef.current = status;
  }, [status]);

  const clearPendingTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchFindings = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      // 1. Try report endpoint first for authoritative severity counts
      const report = await api.getScanReport(id, signal);
      setFindingsSummary({
        total: report.total_findings,
        critical: report.findings_by_severity.critical,
        high: report.findings_by_severity.high,
        medium: report.findings_by_severity.medium,
        low: report.findings_by_severity.low,
      });
    } catch {
      // 2. Fall back to deriving counts from /findings if report endpoint isn't ready
      try {
        const findings = await api.getScanFindings(id, signal);
        const critical = findings.filter((f) => f.severity.toLowerCase() === 'critical').length;
        const high = findings.filter((f) => f.severity.toLowerCase() === 'high').length;
        const medium = findings.filter((f) => f.severity.toLowerCase() === 'medium').length;
        const low = findings.filter((f) => f.severity.toLowerCase() === 'low').length;
        setFindingsSummary({
          total: findings.length,
          critical,
          high,
          medium,
          low,
        });
      } catch (findingsErr) {
        console.warn(`[useScanPolling] Failed to fetch findings summary for scan ${id}:`, findingsErr);
      }
    }
  }, []);

  // Use a ref for executePoll to cleanly break cyclic self-referencing inside setTimeout
  const executePollRef = useRef<((isManual?: boolean) => Promise<void>) | null>(null);

  const executePoll = useCallback(
    async (isManual = false) => {
      const activeId = currentScanIdRef.current;
      if (!activeId) return;

      // Prevent overlapping requests
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      // Check 10-minute cap (only for automatic polling, not manual)
      if (!isManual && startTimeRef.current > 0 && Date.now() - startTimeRef.current >= MAX_POLLING_DURATION_MS) {
        inFlightRef.current = false;
        setIsPolling(false);
        setIsPaused(true);
        setPauseReason('max_time');
        return;
      }

      // Prepare abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setIsPolling(true);

      try {
        const updatedScan = await api.getScan(activeId, signal);

        // Success - reset error counters
        consecutiveErrorsRef.current = 0;
        setConsecutiveFailures(0);
        setError(null);
        setScan(updatedScan);
        setStatus(updatedScan.status);
        scanStatusRef.current = updatedScan.status;
        setLastUpdated(new Date());

        // Check if scan is terminal
        if (isTerminalStatus(updatedScan.status)) {
          setIsPolling(false);
          setIsPaused(false);
          setPauseReason(null);
          clearPendingTimer();

          // Fetch final findings when transitioning to COMPLETED
          if (updatedScan.status === 'COMPLETED') {
            await fetchFindings(activeId, signal);
          }
          return;
        }

        // Scan is still non-terminal: schedule next poll
        setIsPaused(false);
        setPauseReason(null);

        if (!signal.aborted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          // 2s interval while INGESTING/ANALYZING/PROCESSING, 5s while QUEUED
          const intervalMs =
            updatedScan.status === 'QUEUED' ? 5000 : 2000;

          clearPendingTimer();
          timerRef.current = setTimeout(() => {
            executePollRef.current?.(false);
          }, intervalMs);
        }
      } catch (err: unknown) {
        if (signal.aborted) {
          return; // Ignore aborted requests
        }

        const apiErr =
          err instanceof ApiError
            ? err
            : err instanceof Error
            ? new ApiError(err.message, `/scans/${activeId}`, 'network')
            : new ApiError('Unknown error', `/scans/${activeId}`, 'network');

        consecutiveErrorsRef.current += 1;
        setConsecutiveFailures(consecutiveErrorsRef.current);
        setError(apiErr);

        console.error(
          `[useScanPolling] Failure #${consecutiveErrorsRef.current} polling scan ${activeId}:`,
          apiErr.message
        );

        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_FAILURES) {
          // Stop polling after 5 consecutive failures
          setIsPolling(false);
          setIsPaused(true);
          setPauseReason('consecutive_errors');
          clearPendingTimer();
        } else {
          // Exponential backoff: 2s, 4s, 8s, max 15s
          const backoffDelay = Math.min(
            15000,
            2000 * Math.pow(2, consecutiveErrorsRef.current - 1)
          );

          clearPendingTimer();
          timerRef.current = setTimeout(() => {
            executePollRef.current?.(false);
          }, backoffDelay);
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [clearPendingTimer, fetchFindings]
  );

  useEffect(() => {
    executePollRef.current = executePoll;
  }, [executePoll]);

  // Manual refresh
  const refresh = useCallback(async () => {
    clearPendingTimer();
    consecutiveErrorsRef.current = 0;
    setConsecutiveFailures(0);
    setError(null);
    setIsPaused(false);
    setPauseReason(null);
    await executePoll(true);
  }, [clearPendingTimer, executePoll]);

  // Resume after pause (resets timer and consecutive errors)
  const resume = useCallback(() => {
    clearPendingTimer();
    startTimeRef.current = Date.now();
    consecutiveErrorsRef.current = 0;
    setConsecutiveFailures(0);
    setError(null);
    setIsPaused(false);
    setPauseReason(null);
    executePoll();
  }, [clearPendingTimer, executePoll]);

  // Manual retry after connection lost
  const retry = useCallback(async () => {
    resume();
  }, [resume]);

  // Main lifecycle: start polling on scanId change
  useEffect(() => {
    if (!enabled || !scanId) {
      clearPendingTimer();
      return;
    }

    // Reset state for new scanId
    startTimeRef.current = Date.now();
    consecutiveErrorsRef.current = 0;

    // Initial fetch
    executePoll();

    // Visibility change handler: pause on hidden, resume on visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearPendingTimer();
      } else if (document.visibilityState === 'visible') {
        const currentStatus = scanStatusRef.current;
        const isTerminal = currentStatus && isTerminalStatus(currentStatus);
        const hasStopped = consecutiveErrorsRef.current >= MAX_CONSECUTIVE_FAILURES;
        const isTimeCapped = Date.now() - startTimeRef.current >= MAX_POLLING_DURATION_MS;

        if (!isTerminal && !hasStopped && !isTimeCapped) {
          executePoll();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearPendingTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      inFlightRef.current = false;
    };
  }, [enabled, scanId, clearPendingTimer, executePoll]);

  return {
    scan,
    findingsSummary,
    status,
    error,
    isPolling,
    isPaused,
    pauseReason,
    lastUpdated,
    consecutiveFailures,
    refresh,
    resume,
    retry,
  };
}
