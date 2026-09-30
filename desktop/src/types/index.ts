export type ScanStatus =
  | 'QUEUED'
  | 'INGESTING'
  | 'ANALYZING'
  | 'PROCESSING'
  | 'AI_ANALYSIS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export type FindingCategory = 'sast' | 'crypto' | 'dependency' | 'configuration';

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
  id: 'usr-sec-01',
  name: 'SecOfficer',
  fullName: 'Sathish V.',
  email: 'sathish.officer@pqc-sentinel.local',
  role: 'Security Auditor',
  title: 'Air-Gapped Auditor',
  clearanceLevel: 'Level 4 (Top Secret / PQC Defense)',
  organization: 'Post-Quantum Security Division',
  pgpKeyId: '4A9F 821E 993B C401',
  bio: 'Lead security engineer and air-gapped auditor specializing in cryptographic vulnerability discovery, CBOM management, and post-quantum algorithm migration.',
  avatarInitials: 'SO',
  phone: '+1 (555) 019-2834',
  location: 'Defense Operations Center (Air-Gapped)',
  updatedAt: '2026-09-29T12:00:00.000Z',
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
}

export interface Finding {
  finding_id: string;
  scan_id: string;
  engine: FindingCategory;
  category: string | null;
  severity: FindingSeverity;
  title: string;
  file_path: string;
  line_number: number | null;
  evidence: string | null;
  explanation?: string | null;
  confidence: string | null;
  recommendation: string | null;
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

export interface Report {
  scan_id: string;
  project_name: string;
  generated_at: string;
  executive_summary: string;
  summary: {
    total_findings: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
  };
  pqc_risk_summary: {
    overall_readiness_score: number;
    high_risk_assets: number;
    medium_risk_assets: number;
    low_risk_assets: number;
    total_crypto_assets: number;
  };
  crypto_inventory_summary: {
    total_components: number;
    vulnerable_algorithms: number;
    migration_candidates: number;
  };
}
