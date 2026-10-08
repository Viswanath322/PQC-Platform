export type ScanStatus =
  | 'QUEUED'
  | 'INGESTING'
  | 'ANALYZING'
  | 'PROCESSING'
  | 'AI_ANALYSIS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type FindingCategory = 'SAST' | 'CRYPTO' | 'DEPENDENCY' | 'CONFIGURATION';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface HealthResponse {
  status: string;
  version?: string;
  timestamp?: string;
  environment?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'security_auditor' | 'analyst' | 'viewer';
  created_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: string;
  title: string;
  clearanceLevel: string;
  organization: string;
  pgpKeyId: string;
  bio: string;
  avatarInitials: string;
  phone?: string;
  location?: string;
  updatedAt: string;
}

export const defaultUserProfile: UserProfile = {
  id: '',
  name: '',
  fullName: '',
  email: '',
  role: '',
  title: '',
  clearanceLevel: '',
  organization: '',
  pgpKeyId: '',
  bio: '',
  avatarInitials: '?',
  phone: '',
  location: '',
  updatedAt: new Date().toISOString(),
};

export interface Project {
  id: string;
  name: string;
  description: string;
  repository_url: string;
  branch: string;
  created_at: string;
  updated_at: string;
  last_scan_id?: string;
  last_scan_at?: string;
  last_scan_status?: ScanStatus;
  findings_count?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  default_branch: string;
  size_bytes?: number;
  last_commit?: string;
}

export interface Scan {
  id: string;
  project_id: string;
  project_name: string;
  repository_name: string;
  branch: string;
  status: ScanStatus;
  created_at: string;
  completed_at?: string;
  file_name?: string;
  file_size?: string;
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  pqc_readiness_score: number;
  progress_percent?: number;
  is_mock?: boolean;
  error_message?: string | null;
  started_at?: string;
  engine_statuses?: Record<string, string>;
}

export interface Finding {
  id: string;
  finding_id?: string;
  scan_id: string;
  severity: FindingSeverity;
  category: FindingCategory | string;
  engine?: string;
  finding_category?: string;
  title: string;
  file: string;
  file_path?: string;
  line: number;
  line_number?: number;
  confidence: ConfidenceLevel | number;
  explanation: string;
  description?: string;
  recommendation: string;
  remediation?: string;
  evidence: string;
  cwe_id?: string;
  detected_at?: string;
  status?: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'SUPPRESSED';
  is_development?: boolean;
  rule_id?: string;
  rule_version?: string;
  source_engine?: string;
  correlation_group_id?: string;
}

export interface CryptoComponent {
  id: string;
  algorithm: string;
  library: string;
  version: string;
  location: string;
  usage: string;
  risk: RiskLevel;
  quantumVulnerable: boolean;
  status: string;
  curveOrKeySize?: string;
  purpose?: string;
}

export interface CBOMEntry {
  id: string;
  component: string;
  algorithm: string;
  library: string;
  version: string;
  location: string;
  usage: string;
  risk: RiskLevel;
  migrationCandidate: boolean;
  quantumVulnerable: boolean;
  standardReference?: string;
  dependencyType?: 'Direct' | 'Transitive';
  lastDetected?: string;
}

export interface MigrationCandidate {
  id: string;
  algorithm: string;
  location: string;
  risk: RiskLevel;
  recommendation: string;
  nistStandard?: string;
  estimatedEffort?: 'Low' | 'Medium' | 'High';
  affectedProtocols?: string[];
  rationale?: string;
}

export interface Component {
  component_id: string;
  component_type: string;
  name: string;
  version?: string | null;
  purl?: string | null;
  source_file?: string | null;
  line_number?: number | null;
  detection_method: string;
  confidence?: number | null;
  metadata?: Record<string, any>;
}

export interface Report {
  scan_id: string;
  status?: string;
  generated_at: string;
  project_name: string;
  target_repository?: string;
  total_findings?: number;
  findings_by_severity?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings_by_engine?: Record<string, number>;
  findings_by_category?: Record<string, number>;
  findings_truncated?: boolean;
  findings?: Finding[];
  sbom?: Component[];
  cbom?: Component[];
  executive_summary?: string;
  summary?: {
    total_findings: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
  };
  pqc_risk_summary?: {
    overall_readiness_score: number;
    high_risk_assets: number;
    medium_risk_assets: number;
    low_risk_assets: number;
    total_crypto_assets: number;
  };
  crypto_inventory_summary?: {
    total_components: number;
    vulnerable_algorithms: number;
    migration_candidates: number;
  };
}
