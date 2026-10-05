/**
 * Scan status and response models matching the backend contracts:
 * backend/app/schemas/scan.py and backend/app/schemas/finding.py
 */

export type ScanStatus =
  | 'QUEUED'
  | 'INGESTING'
  | 'ANALYZING'
  | 'PROCESSING'
  | 'AI_ANALYSIS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Backend ScanOut contract from backend/app/schemas/scan.py
 */
export interface ScanOut {
  id: string;
  project_id: string;
  status: ScanStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  // Optional enriched fields (populated from project/report lookups or future backend extensions)
  project_name?: string;
  repository_name?: string;
  files_analyzed?: number | null;
  error_message?: string | null;
}

export interface ScanCreatePayload {
  project_id: string;
  upload_id: string;
}

export interface ScanFindingsSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ScanReportOut {
  scan_id: string;
  status: string;
  generated_at: string;
  total_findings: number;
  findings_by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface FindingOut {
  finding_id: string;
  scan_id: string;
  engine: 'sast' | 'crypto' | 'dependency' | 'configuration';
  category?: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  file_path: string;
  line_number?: number | null;
  evidence?: string | null;
  explanation?: string | null;
  confidence?: number | null;
  recommendation?: string | null;
  is_development?: boolean;
}

export type ScanStep = 'QUEUED' | 'INGESTING' | 'ANALYZING' | 'COMPLETED';

/**
 * Terminal status check helper:
 * COMPLETED, FAILED, and CANCELLED scans will not transition further.
 */
export function isTerminalStatus(status: ScanStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
}

/**
 * Maps any scan status to its human-readable display label.
 */
export function getScanStatusLabel(status: ScanStatus): string {
  switch (status) {
    case 'QUEUED':
      return 'Queued';
    case 'INGESTING':
      return 'Ingesting';
    case 'ANALYZING':
      return 'Analyzing';
    case 'PROCESSING':
      return 'Processing';
    case 'AI_ANALYSIS':
      return 'AI Analysis';
    case 'COMPLETED':
      return 'Completed';
    case 'FAILED':
      return 'Failed';
    case 'CANCELLED':
      return 'Cancelled';
  }
}

/**
 * Maps any status to the canonical 4-step pipeline:
 * QUEUED (0) -> INGESTING (1) -> ANALYZING (2) -> COMPLETED (3)
 */
export function getScanStep(status: ScanStatus): ScanStep {
  switch (status) {
    case 'QUEUED':
      return 'QUEUED';
    case 'INGESTING':
      return 'INGESTING';
    case 'ANALYZING':
    case 'PROCESSING':
    case 'AI_ANALYSIS':
    case 'FAILED':
      return 'ANALYZING';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'QUEUED';
  }
}

/**
 * Step index (0-3) for the 4-stage pipeline stepper.
 */
export function getScanStepIndex(status: ScanStatus): number {
  switch (status) {
    case 'QUEUED':
      return 0;
    case 'INGESTING':
      return 1;
    case 'ANALYZING':
    case 'PROCESSING':
    case 'AI_ANALYSIS':
    case 'FAILED':
      return 2;
    case 'COMPLETED':
      return 3;
    case 'CANCELLED':
      return 0;
  }
}
