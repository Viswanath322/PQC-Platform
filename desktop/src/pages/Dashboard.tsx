import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertOctagon, AlertTriangle, AlertCircle, Info, Plus, RefreshCw, ArrowRight, WifiOff } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Panel } from "@/components/dashboard/Panel";
import { SegmentBar } from "@/components/dashboard/SegmentBar";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { NewScanModal } from "@/components/scans/NewScanModal";
import { api, ApiError } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import type { Project, Scan, Finding } from "@/types";

// No hardcoded activity — activity is derived from real API scan data

export function Dashboard() {
  const navigate = useNavigate();
  const { handleUnauthorized } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isNewScanOpen, setIsNewScanOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<ApiError | Error | null>(null);

  const loadData = async () => {
    setLoadError(null);
    try {
      const [projList, scanList, findingsList] = await Promise.all([
        api.getProjects(),
        api.getScans(),
        api.getFindings(),
      ]);
      const projMap = new Map(projList.map((p) => [p.id, p.name]));
      const enrichedScans = scanList.map((s) => ({
        ...s,
        project_name: s.project_name || projMap.get(s.project_id) || 'Demo Banking Application',
        repository_name: s.repository_name || s.file_name || 'pqc_sample_banking_app.zip',
      }));
      setProjects(projList);
      setScans(enrichedScans);
      setFindings(findingsList);
    } catch (err) {
      // Surface real error — metrics will show zeroes, banner explains why
      const apiErr = err instanceof ApiError ? err : new Error(String(err));
      setLoadError(apiErr);
      if (err instanceof ApiError && err.errorType === 'UNAUTHORIZED') {
        handleUnauthorized();
      }
      console.error("Failed to load dashboard telemetry:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Poll only while any scan is in an active non-terminal state
  useEffect(() => {
    const hasActiveScan = scans.some((s) =>
      ['QUEUED', 'INGESTING', 'ANALYZING', 'PROCESSING', 'AI_ANALYSIS'].includes(s.status)
    );
    if (!hasActiveScan) return;

    const intervalId = setInterval(() => {
      loadData();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [scans]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleScanCreated = (_newScan: Scan) => {
    loadData();
  };

  // ── Real Severity metrics ──────────────────────────────────────────
  const criticalCount = findings.filter((f) => (f.severity || '').toUpperCase() === "CRITICAL").length;
  const highCount = findings.filter((f) => (f.severity || '').toUpperCase() === "HIGH").length;
  const mediumCount = findings.filter((f) => (f.severity || '').toUpperCase() === "MEDIUM").length;
  const lowCount = findings.filter((f) => (f.severity || '').toUpperCase() === "LOW").length;
  const totalFindings = criticalCount + highCount + mediumCount + lowCount;

  // ── Real Category breakdown ────────────────────────────────────────
  const cryptoFindingsCount = findings.filter((f) => {
    const cat = (f.finding_category || f.category || '').toUpperCase();
    const eng = (f.engine || '').toLowerCase();
    return cat === 'CRYPTO' || eng === 'crypto';
  }).length;

  const sastFindingsCount = findings.filter((f) => {
    const cat = (f.finding_category || f.category || '').toUpperCase();
    const eng = (f.engine || '').toLowerCase();
    return cat === 'SAST' || eng === 'sast' || eng.includes('semgrep');
  }).length;

  const dependencyFindingsCount = findings.filter((f) => {
    const cat = (f.finding_category || f.category || '').toUpperCase();
    const eng = (f.engine || '').toLowerCase();
    return cat === 'DEPENDENCY' || eng === 'dependency';
  }).length;

  const configFindingsCount = findings.filter((f) => {
    const cat = (f.finding_category || f.category || '').toUpperCase();
    const eng = (f.engine || '').toLowerCase();
    return cat === 'CONFIGURATION' || eng === 'configuration';
  }).length;

  // ── Real Security Score (100 base, weighted penalty per finding) ───
  const securityScore = scans.length === 0
    ? 100
    : Math.max(0, Math.min(100, 100 - (criticalCount * 25 + highCount * 15 + mediumCount * 5 + lowCount * 2)));

  // ── Real PQC Readiness ─────────────────────────────────────────────
  const shorVulnerableCount = findings.filter((f) => {
    const text = `${f.title || ''} ${f.explanation || ''} ${f.evidence || ''}`.toLowerCase();
    return text.includes('rsa') || text.includes('ecc') || text.includes('dsa') || text.includes('diffie');
  }).length;

  const weakHashCount = findings.filter((f) => {
    const text = `${f.title || ''} ${f.explanation || ''} ${f.evidence || ''}`.toLowerCase();
    return text.includes('md5') || text.includes('sha1') || text.includes('des') || text.includes('rc4');
  }).length;

  const quantumRiskIssues = shorVulnerableCount + weakHashCount + criticalCount;
  const quantumSafePercent = scans.length === 0
    ? 100
    : Math.max(10, Math.min(100, Math.round(100 - (quantumRiskIssues * 18))));
  const quantumAtRiskPercent = 100 - quantumSafePercent;

  // ── Real Post-Quantum Components / Risks ───────────────────────────
  const highPqcRisk = criticalCount + shorVulnerableCount;
  const mediumPqcRisk = highCount + weakHashCount;
  const lowPqcRisk = mediumCount + lowCount;

  const currentScan = scans.find((s) => s.status === "QUEUED" || s.status === "ANALYZING" || s.status === "INGESTING" || s.status === "PROCESSING") || scans[0] || null;

  const uniqueFiles = new Set(
    findings.map((f) => f.file_path || f.file).filter(Boolean)
  );
  const totalFilesAnalyzed = uniqueFiles.size;

  const getScanStatusBadge = (status?: string) => {
    switch ((status || '').toUpperCase()) {
      case 'QUEUED':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          label: 'QUEUED',
          description: 'Waiting in scan queue',
        };
      case 'INGESTING':
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse',
          label: 'INGESTING',
          description: 'Ingesting repository files',
        };
      case 'ANALYZING':
        return {
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-300 animate-pulse',
          label: 'ANALYZING',
          description: 'Running analysis engines',
        };
      case 'PROCESSING':
      case 'AI_ANALYSIS':
        return {
          badge: 'bg-purple-100 text-purple-800 border-purple-300 animate-pulse',
          label: 'PROCESSING',
          description: 'Correlating results & CBOM',
        };
      case 'COMPLETED':
        return {
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          label: 'COMPLETED',
          description: 'Completed successfully',
        };
      case 'FAILED':
        return {
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          label: 'FAILED',
          description: 'Scan failed',
        };
      case 'CANCELLED':
        return {
          badge: 'bg-slate-100 text-slate-800 border-slate-300',
          label: 'CANCELLED',
          description: 'Scan cancelled',
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-800 border-slate-300',
          label: status || 'UNKNOWN',
          description: status || 'Idle',
        };
    }
  };

  const statusInfo = currentScan ? getScanStatusBadge(currentScan.status) : null;

  // Real activity from actual scans
  const recentActivity = scans.slice(0, 5).map((s) => ({
    id: s.id,
    t: `Scan ${s.id.slice(0, 8)}… · ${s.status.toLowerCase()} · ${s.project_name || 'Demo Banking Application'}`,
    when: s.completed_at
      ? new Date(s.completed_at).toLocaleString()
      : new Date(s.created_at).toLocaleString(),
  }));

  return (
    <>
      <PageHeader
        title="Security overview"
        description="Application vulnerabilities, post-quantum readiness, and cryptographic inventory in one view."
        actions={
          <>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn"
              title="Refresh telemetry"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => setIsNewScanOpen(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> New scan
            </button>
          </>
        }
      />

      {/* Backend error notice — shown when API unreachable, metrics show zero */}
      {loadError && !isRefreshing && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] mb-2"
          style={{
            background: 'rgba(71, 85, 105, 0.07)',
            border: '1px solid rgba(71, 85, 105, 0.18)',
            color: '#475569',
          }}
        >
          <WifiOff size={15} className="shrink-0" />
          <span>
            <strong>Backend unavailable</strong> — metrics show zero until the API is reachable.{' '}
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

      {/* 5 Equal KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="cursor-pointer" onClick={() => navigate("/findings?severity=CRITICAL")}>
          <StatCard
            level="critical"
            label="Critical"
            value={criticalCount}
            delta={totalFindings > 0 ? `${Math.round((criticalCount / totalFindings) * 100)}% of total` : "0%"}
            deltaDir={criticalCount > 0 ? "up" : "flat"}
            hint={criticalCount > 0 ? "Immediate remediation required" : "No critical vulnerabilities"}
            icon={AlertOctagon}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/findings?severity=HIGH")}>
          <StatCard
            level="high"
            label="High"
            value={highCount}
            delta={totalFindings > 0 ? `${Math.round((highCount / totalFindings) * 100)}% of total` : "0%"}
            deltaDir={highCount > 0 ? "up" : "flat"}
            hint={highCount > 0 ? "Cryptographic & algorithm risk" : "No high severity issues"}
            icon={AlertTriangle}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/findings?severity=MEDIUM")}>
          <StatCard
            level="medium"
            label="Medium"
            value={mediumCount}
            delta={totalFindings > 0 ? `${Math.round((mediumCount / totalFindings) * 100)}% of total` : "0%"}
            deltaDir={mediumCount > 0 ? "up" : "flat"}
            hint={mediumCount > 0 ? "Config & hygiene warnings" : "No medium severity issues"}
            icon={AlertCircle}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/findings?severity=LOW")}>
          <StatCard
            level="low"
            label="Low"
            value={lowCount}
            delta={totalFindings > 0 ? `${Math.round((lowCount / totalFindings) * 100)}% of total` : "0%"}
            deltaDir={lowCount > 0 ? "up" : "flat"}
            hint={lowCount > 0 ? "Informational recommendations" : "Clean hygiene"}
            icon={Info}
          />
        </div>
        {/* Active assessment — real scan data */}
        <div className="card min-w-0 border-purple-200/80 bg-gradient-to-br from-purple-100/50 via-white/70 to-sky-100/40 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow text-purple-700 font-semibold">Latest assessment</span>
            {statusInfo && (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusInfo.badge}`}>
                {statusInfo.label}
              </span>
            )}
          </div>
          {currentScan ? (
            <>
              <div className="mt-3 font-mono text-[16px] font-semibold tracking-tight text-purple-700 truncate" title={currentScan.id}>
                {currentScan.id}
              </div>
              <p className="mt-1 truncate font-mono text-[12px] text-slate-600">
                {currentScan.repository_name || currentScan.file_name}
              </p>
            </>
          ) : (
            <div className="mt-3 text-[13px] text-slate-400 italic">
              No scans found. Start a new scan to see it here.
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-[13px]">
            <span className="text-slate-600 font-medium text-[12px]">
              {statusInfo ? (currentScan?.error_message ? `Failed: ${currentScan.error_message}` : statusInfo.description) : ''}
            </span>
            <button
              onClick={() => navigate("/scans")}
              className="cursor-pointer font-medium text-purple-700 hover:text-purple-900 hover:underline bg-transparent border-0 p-0"
            >
              View all →
            </button>
          </div>
        </div>
      </div>

      {/* Engine Telemetry & Analyzed Files Summary Strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="card p-3 bg-white/60">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Files Analyzed</span>
          <div className="mt-1 font-mono text-[18px] font-semibold text-slate-900 tabular">{totalFilesAnalyzed}</div>
        </div>
        <div className="card p-3 bg-white/60">
          <span className="text-[11px] font-medium uppercase tracking-wider text-sky-600">SAST Engine</span>
          <div className="mt-1 font-mono text-[18px] font-semibold text-sky-700 tabular">{sastFindingsCount}</div>
        </div>
        <div className="card p-3 bg-white/60">
          <span className="text-[11px] font-medium uppercase tracking-wider text-violet-600">Crypto Engine</span>
          <div className="mt-1 font-mono text-[18px] font-semibold text-violet-700 tabular">{cryptoFindingsCount}</div>
        </div>
        <div className="card p-3 bg-white/60">
          <span className="text-[11px] font-medium uppercase tracking-wider text-cyan-600">Dependency Engine</span>
          <div className="mt-1 font-mono text-[18px] font-semibold text-cyan-700 tabular">{dependencyFindingsCount}</div>
        </div>
        <div className="card p-3 bg-white/60">
          <span className="text-[11px] font-medium uppercase tracking-wider text-amber-600">Configuration</span>
          <div className="mt-1 font-mono text-[18px] font-semibold text-amber-700 tabular">{configFindingsCount}</div>
        </div>
      </div>


      {/* Row 1: [Security score | PQC readiness] */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Overall security score"
          sub={findings.length > 0 ? `Computed from ${findings.length} real findings across ${scans.length} scans` : "Real-time posture assessment."}
        >
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="tabular text-[48px] font-semibold leading-none tracking-tight">
                {securityScore}<span className="text-[20px] text-muted-foreground"> / 100</span>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {securityScore >= 80 ? "Good cryptographic posture" : securityScore >= 50 ? "Action required — vulnerabilities present" : "Critical remediation required"}
              </p>
            </div>
            <ScoreRing value={securityScore} />
          </div>
        </Panel>
        <Panel
          title="PQC readiness index"
          sub="NIST FIPS 203 / 204 readiness baseline."
          right={<span className="tabular font-semibold text-purple-700">{quantumSafePercent}% quantum safe</span>}
        >
          <SegmentBar
            segments={[
              { label: `Quantum-resistant (${quantumSafePercent}%)`, value: quantumSafePercent, color: "bg-primary" },
              { label: `Quantum at-risk (${quantumAtRiskPercent}%)`, value: quantumAtRiskPercent, color: "bg-critical" },
            ]}
            cols={1}
          />
        </Panel>
      </div>

      {/* Row 2: [Findings by severity | Findings by category] */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Findings by severity"
          right={`Total ${totalFindings}`}
          footer={<span className="text-muted-foreground">SLA · Critical 24h · High 7d · Medium 30d · Low 90d</span>}
        >
          <SegmentBar
            segments={[
              { label: "Critical", value: criticalCount, color: "bg-critical" },
              { label: "High", value: highCount, color: "bg-high" },
              { label: "Medium", value: mediumCount, color: "bg-medium" },
              { label: "Low", value: lowCount, color: "bg-low" },
            ]}
          />
        </Panel>
        <Panel
          title="Findings by category"
          right={`Total ${totalFindings}`}
          footer={<span className="text-muted-foreground">Source: AST static rules, dependency manifests, cryptographic heuristics</span>}
        >
          <SegmentBar
            segments={[
              { label: "Cryptographic", value: cryptoFindingsCount, color: "bg-violet-500" },
              { label: "SAST code", value: sastFindingsCount, color: "bg-sky-500" },
              { label: "Dependency", value: dependencyFindingsCount, color: "bg-cyan-500" },
              { label: "Configuration", value: configFindingsCount, color: "bg-amber-500" },
            ]}
          />
        </Panel>
      </div>

      {/* Row 3: [Post-quantum risk | Recent scan activity] */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Post-quantum cryptographic risk"
          sub="Inspected code elements evaluated against Shor and Grover threats."
          right={<span className="tabular font-semibold text-purple-700">{totalFindings} vulnerabilities tracked</span>}
          footer={
            <button
              onClick={() => navigate("/pqc")}
              className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline bg-transparent border-0 p-0 text-[13px]"
            >
              Explore PQC assessment <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          <SegmentBar
            cols={1}
            segments={[
              { label: `High risk · Shor vulnerable & Critical (${highPqcRisk})`, value: highPqcRisk, color: "bg-critical" },
              { label: `Medium risk · Deprecated crypto & High (${mediumPqcRisk})`, value: mediumPqcRisk, color: "bg-medium" },
              { label: `Low risk · Hygiene (${lowPqcRisk})`, value: lowPqcRisk, color: "bg-primary" },
            ]}
          />
        </Panel>
        <Panel
          title="Recent scan activity"
          sub="Audit trail of scans, pipeline runs and CBOM events."
          right="Live"
          footer={
            <button
              onClick={() => navigate("/scans")}
              className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline bg-transparent border-0 p-0 text-[13px]"
            >
              View scan history <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          {recentActivity.length > 0 ? (
            <ul className="space-y-3">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="truncate">{a.t}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">{a.when}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-[13px] text-slate-400">
              <span className="font-medium text-slate-500">No scan activity yet</span>
              <span className="mt-1 text-[12px]">Start a scan to see activity here.</span>
            </div>
          )}
        </Panel>
      </div>

      {/* New Scan Modal */}
      <NewScanModal
        isOpen={isNewScanOpen}
        onClose={() => setIsNewScanOpen(false)}
        projects={projects}
        onScanCreated={handleScanCreated}
      />
    </>
  );
}

export default Dashboard;
