import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RiskCard } from '@/components/pqc/RiskCard';
import { RiskDistribution } from '@/components/pqc/RiskDistribution';
import { CryptoInventoryTable } from '@/components/pqc/CryptoInventoryTable';
import { MigrationCandidates } from '@/components/pqc/MigrationCandidates';
import { KeyInsights } from '@/components/pqc/KeyInsights';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { api, ApiError } from '@/services/api';
import type { Finding, Scan } from '@/types';
import type { CryptoComponent, MigrationCandidate, KeyInsight, PQCRiskSummary } from '@/types/pqc';

interface PQCPageProps {
  onNavigateToInventory?: () => void;
  onNavigateToReports?: () => void;
  onShowToast?: (message: string) => void;
}

// ── Quantum Risk Classifier ───────────────────────────────────────────
function classifyQuantumRisk(f: Finding): 'HIGH' | 'MEDIUM' | 'LOW' {
  const content = `${f.title} ${f.explanation || ''} ${f.evidence || ''} ${f.file}`.toLowerCase();
  const sev = (f.severity || '').toUpperCase();
  if (
    sev === 'CRITICAL' ||
    content.includes('rsa') ||
    content.includes('ecc') ||
    content.includes('elliptic') ||
    content.includes('diffie') ||
    content.includes('dsa') ||
    content.includes('shor')
  ) {
    return 'HIGH';
  }
  if (
    sev === 'HIGH' ||
    content.includes('md5') ||
    content.includes('sha1') ||
    content.includes('sha-1') ||
    content.includes('des') ||
    content.includes('rc4') ||
    content.includes('deprecated') ||
    content.includes('weak')
  ) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function extractAlgorithm(f: Finding): string {
  const content = `${f.title} ${f.evidence || ''}`.toUpperCase();
  if (content.includes('MD5')) return 'MD5';
  if (content.includes('SHA-1') || content.includes('SHA1')) return 'SHA-1';
  if (content.includes('SHA-256') || content.includes('SHA256')) return 'SHA-256';
  if (content.includes('RSA')) return 'RSA';
  if (content.includes('ECC') || content.includes('ECDSA') || content.includes('ECDH')) return 'ECC';
  if (content.includes('AES')) return 'AES-256';
  if (content.includes('SECRET') || content.includes('TOKEN') || content.includes('PASSWORD')) return 'API Secret';
  return f.title.split(' ')[0] || 'Unknown';
}

function findingToCryptoComponent(f: Finding): CryptoComponent {
  const risk = classifyQuantumRisk(f);
  const algo = extractAlgorithm(f);
  return {
    id: f.id,
    algorithm: algo,
    library: f.engine === 'crypto' ? 'Cryptographic Rule Engine' : 'AST Static Inspector',
    version: '1.0',
    location: `${f.file}:${f.line}`,
    usage: f.title,
    risk: risk,
    quantumVulnerable: risk !== 'LOW',
    status: 'Detected',
    purpose: f.explanation || f.evidence || 'Cryptographic operation',
  };
}

export const PQC: React.FC<PQCPageProps> = ({
  onNavigateToInventory,
  onNavigateToReports,
  onShowToast,
}) => {
  const navigate = useNavigate();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [activeTableTab, setActiveTableTab] = useState<'inventory' | 'cbom'>('inventory');

  const handleNavInventory = onNavigateToInventory || (() => navigate('/crypto-inventory'));
  const handleNavReports = onNavigateToReports || (() => navigate('/reports'));

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [findingsList, scanList] = await Promise.all([
        api.getFindings(),
        api.getScans(),
      ]);
      setFindings(findingsList);
      setScans(scanList);
    } catch (err) {
      console.error('Failed to load PQC assessment telemetry:', err);
      setLoadError(err instanceof ApiError ? err.userMessage : 'Failed to retrieve assessment findings.');
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
    setIsRefreshing(false);
  };

  // Derive real quantum risk metrics
  const highRiskFindings = useMemo(
    () => findings.filter((f) => classifyQuantumRisk(f) === 'HIGH'),
    [findings]
  );
  const mediumRiskFindings = useMemo(
    () => findings.filter((f) => classifyQuantumRisk(f) === 'MEDIUM'),
    [findings]
  );
  const lowRiskFindings = useMemo(
    () => findings.filter((f) => classifyQuantumRisk(f) === 'LOW'),
    [findings]
  );

  const totalAnalyzed = findings.length;
  const highCount = highRiskFindings.length;
  const mediumCount = mediumRiskFindings.length;
  const lowCount = lowRiskFindings.length;

  const readinessPercentage =
    totalAnalyzed === 0
      ? 100
      : Math.max(10, Math.min(100, Math.round(100 - (highCount * 30 + mediumCount * 15))));
  const atRiskPercentage = 100 - readinessPercentage;

  const riskSummary: PQCRiskSummary = {
    high: highCount,
    medium: mediumCount,
    low: lowCount,
    total: totalAnalyzed,
    readinessPercentage,
    atRiskPercentage,
    analyzedComponents: totalAnalyzed,
  };

  // Convert real findings to CryptoComponents
  const cryptoComponents: CryptoComponent[] = useMemo(() => {
    return findings.map(findingToCryptoComponent);
  }, [findings]);

  // Generate real migration candidates based on detected risks
  const migrationCandidates: MigrationCandidate[] = useMemo(() => {
    const list: MigrationCandidate[] = [];
    findings.forEach((f) => {
      const algo = extractAlgorithm(f);
      if (algo === 'MD5' || algo === 'SHA-1') {
        list.push({
          id: `mig-${f.id}`,
          algorithm: algo,
          location: `${f.file}:${f.line}`,
          risk: 'MEDIUM',
          recommendation: 'Replace legacy hash with SHA-256 or SHA-3',
          nistStandard: 'NIST SP 800-131A',
          estimatedEffort: 'Low',
          rationale: 'MD5 is vulnerable to collision attacks and must be replaced with post-quantum approved digests.',
        });
      } else if (algo === 'RSA' || algo === 'ECC') {
        list.push({
          id: `mig-${f.id}`,
          algorithm: algo,
          location: `${f.file}:${f.line}`,
          risk: 'HIGH',
          recommendation: 'Migrate to ML-KEM / ML-DSA (NIST FIPS 203 / 204)',
          nistStandard: 'NIST FIPS 203',
          estimatedEffort: 'High',
          rationale: 'Asymmetric keys are Shor-vulnerable and vulnerable to Harvest Now, Decrypt Later (HNDL).',
        });
      } else if ((f.severity || '').toUpperCase() === 'CRITICAL') {
        list.push({
          id: `mig-${f.id}`,
          algorithm: 'API Secret Exposure',
          location: `${f.file}:${f.line}`,
          risk: 'HIGH',
          recommendation: 'Externalize credentials to secure secrets store',
          nistStandard: 'NIST SP 800-57',
          estimatedEffort: 'Low',
          rationale: 'Hardcoded secrets undermine all cryptographic protection layers.',
        });
      }
    });
    return list;
  }, [findings]);

  // Generate key security insights dynamically from findings
  const keyInsights: KeyInsight[] = useMemo(() => {
    const insights: KeyInsight[] = [];
    if (highCount > 0) {
      insights.push({
        id: 'ins-high',
        category: 'critical',
        text: `${highCount} high-risk cryptographic issues detected (critical secrets / Shor-vulnerable primitives) requiring immediate remediation.`,
      });
    }
    if (mediumCount > 0) {
      insights.push({
        id: 'ins-med',
        category: 'warning',
        text: `${mediumCount} deprecated classical primitives detected (e.g. MD5 hashing) vulnerable to pre-image and collision attacks.`,
      });
    }
    if (scans.length > 0) {
      insights.push({
        id: 'ins-scans',
        category: 'info',
        text: `Analysis generated across ${scans.length} verified scan executions using NIST FIPS 203/204 rulesets.`,
      });
    }
    return insights;
  }, [highCount, mediumCount, scans]);

  const handleRiskFilterChange = (risk: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') => {
    setSelectedRiskFilter(risk);
  };

  return (
    <>
      <PageHeader
        title="PQC security assessment"
        description="Classify cryptographic assets against Shor and Grover threats based on live AST and cryptographic engine telemetry."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="btn flex items-center gap-1.5"
              title="Refresh telemetry"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || isLoading ? 'animate-spin text-primary' : ''}`} />
              <span>Refresh</span>
            </button>
            <button onClick={handleNavInventory} className="btn">
              <Lock className="h-3.5 w-3.5" />
              <span>Full inventory</span>
            </button>
            <button onClick={handleNavReports} className="btn-primary">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>View reports</span>
            </button>
          </div>
        }
      />

      {loadError && (
        <div className="rounded-xl p-4 bg-red-50/80 border border-red-200 text-red-900 text-xs flex items-center gap-2 mb-4">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* 1. Top Risk Cards Grid (High / Medium / Low + Quantum Readiness Summary) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <RiskCard
            level="HIGH"
            count={highCount}
            label="High quantum risk"
            subtext="Shor-vulnerable / Critical"
            percentage={totalAnalyzed > 0 ? Math.round((highCount / totalAnalyzed) * 100) : 0}
            isActive={selectedRiskFilter === 'HIGH'}
            onClick={() => handleRiskFilterChange(selectedRiskFilter === 'HIGH' ? 'ALL' : 'HIGH')}
          />

          <RiskCard
            level="MEDIUM"
            count={mediumCount}
            label="Medium quantum risk"
            subtext="Deprecated crypto (e.g. MD5)"
            percentage={totalAnalyzed > 0 ? Math.round((mediumCount / totalAnalyzed) * 100) : 0}
            isActive={selectedRiskFilter === 'MEDIUM'}
            onClick={() => handleRiskFilterChange(selectedRiskFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          />

          <RiskCard
            level="LOW"
            count={lowCount}
            label="Low quantum risk"
            subtext="Standard / Symmetric hygiene"
            percentage={totalAnalyzed > 0 ? Math.round((lowCount / totalAnalyzed) * 100) : 0}
            isActive={selectedRiskFilter === 'LOW'}
            onClick={() => handleRiskFilterChange(selectedRiskFilter === 'LOW' ? 'ALL' : 'LOW')}
          />

          {/* Quantum Readiness Card */}
          <div className="card flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Quantum Readiness</span>
              <span className="rounded-full bg-critical/10 px-2 py-0.5 text-[11px] font-medium text-critical ring-1 ring-critical/25">
                {atRiskPercentage}% At Risk
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <div className="tabular text-[36px] font-semibold leading-none tracking-tight text-purple-700">
                  {readinessPercentage}%
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">Quantum Safe Readiness</p>
              </div>
              <ScoreRing value={readinessPercentage} size={72} />
            </div>
            <p className="mt-3 truncate text-[12px] text-muted-foreground">
              {totalAnalyzed} components evaluated · NIST FIPS 203/204
            </p>
          </div>
        </div>

        {/* 2. Risk Distribution Chart */}
        <RiskDistribution summary={riskSummary} selectedRisk={selectedRiskFilter} />

        {/* 3. Key Security Insights (Generated dynamically from real findings) */}
        {keyInsights.length > 0 && <KeyInsights insights={keyInsights} />}

        {/* 4. Migration Candidates */}
        {migrationCandidates.length > 0 && (
          <MigrationCandidates
            candidates={migrationCandidates}
            onAssessCandidate={(c) => {
              if (onShowToast) {
                onShowToast(`Selected ${c.algorithm} for migration evaluation: ${c.recommendation}`);
              }
            }}
          />
        )}

        {/* 5. Tabbed Table Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTableTab('inventory')}
                className={`px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors cursor-pointer ${
                  activeTableTab === 'inventory'
                    ? 'bg-purple-100/70 text-purple-700 ring-1 ring-purple-300/70 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Cryptographic Findings Inventory ({cryptoComponents.length})
              </button>
              <button
                onClick={() => setActiveTableTab('cbom')}
                className={`px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors cursor-pointer ${
                  activeTableTab === 'cbom'
                    ? 'bg-purple-100/70 text-purple-700 ring-1 ring-purple-300/70 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                CycloneDX CBOM Specification
              </button>
            </div>
          </div>

          {activeTableTab === 'inventory' ? (
            <CryptoInventoryTable
              data={cryptoComponents}
              initialRiskFilter={selectedRiskFilter}
              showFiltersHeader={true}
              onItemSelect={(item) => {
                if (onShowToast) {
                  onShowToast(`Inspecting ${item.algorithm} at ${item.location}`);
                }
              }}
            />
          ) : (
            <div className="card p-12 text-center flex flex-col items-center justify-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-100/70 border border-purple-200/80 text-purple-700 mb-3">
                <Layers className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-slate-900 text-[15px]">CycloneDX CBOM Generation</h4>
              <p className="text-slate-500 text-[13px] mt-1 max-w-md">
                CycloneDX CBOM JSON export will be available in Day 3. Full CBOM serialization will compile discovered cryptographic primitives into standard CycloneDX 1.6 specifications.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PQC;
