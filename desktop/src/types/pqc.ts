export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CryptoComponent {
  id: string;
  algorithm: string;
  library: string;
  version: string;
  location: string;
  usage: string;
  risk: RiskLevel;
  quantumVulnerable: boolean;
  purpose?: string;
  curveOrKeySize?: string;
}

export interface CBOMEntry {
  id: string;
  algorithm: string;
  library: string;
  version: string;
  location: string;
  usage: string;
  risk: RiskLevel;
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

export interface PQCRiskSummary {
  high: number;
  medium: number;
  low: number;
  total: number;
  readinessPercentage: number;
  atRiskPercentage: number;
  analyzedComponents: number;
}

export interface KeyInsight {
  id: string;
  text: string;
  category: 'critical' | 'warning' | 'info';
  componentRef?: string;
}

export interface ProjectScanMetadata {
  projectName: string;
  repositoryUrl: string;
  branch: string;
  lastScanTimestamp: string;
  scanEngineVersion: string;
  totalFilesScanned: number;
  isMockData: boolean;
}

export interface ReportExportOption {
  id: string;
  format: 'PDF' | 'JSON' | 'CSV';
  title: string;
  description: string;
  recommendedFor: string;
  estimatedSize: string;
}
