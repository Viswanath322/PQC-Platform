import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertOctagon, AlertTriangle, AlertCircle, Info, Plus, RefreshCw, ArrowRight, WifiOff } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Panel } from "@/components/dashboard/Panel";
import { SegmentBar } from "@/components/dashboard/SegmentBar";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { MockDataBadge } from "@/components/pqc/MockDataBadge";
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
      setProjects(projList);
      setScans(scanList);
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleScanCreated = (newScan: Scan) => {
    setScans((prev) => [newScan, ...prev]);
  };

  // Severity counts — real data when backend available, zero when offline/errored
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const mediumCount = findings.filter((f) => f.severity === "MEDIUM").length;
  const lowCount = findings.filter((f) => f.severity === "LOW").length;
  const totalFindings = criticalCount + highCount + mediumCount + lowCount;

  const currentScan = scans.find((s) => s.status === "QUEUED" || s.status === "ANALYZING") || scans[0] || null;

  // Build real activity from actual scan list — no hardcoded events
  const recentActivity = scans.slice(0, 5).map((s) => ({
    id: s.id,
    t: `Scan ${s.id} — ${s.status.toLowerCase()} · ${s.project_name || 'unknown project'}`,
    when: s.completed_at
      ? new Date(s.completed_at).toLocaleString()
      : new Date(s.created_at).toLocaleString(),
  }));

  return (
    <>
      <PageHeader
        title="Security overview"
        badge={<MockDataBadge size="sm" label="DEVELOPMENT / MOCK DATA" />}
        description="Development / Mock Data: Application vulnerabilities, post-quantum readiness, and cryptographic inventory in one view."
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
            delta="+1 this week"
            deltaDir="up"
            hint="Immediate Shor risk"
            icon={AlertOctagon}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/findings?severity=HIGH")}>
          <StatCard
            level="high"
            label="High"
            value={highCount}
            delta="2 resolved"
            deltaDir="down"
            hint="HNDL vulnerability"
            icon={AlertTriangle}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/findings?severity=MEDIUM")}>
          <StatCard
            level="medium"
            label="Medium"
            value={mediumCount}
            delta="Unchanged"
            hint="Config & padding flaws"
            icon={AlertCircle}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/findings?severity=LOW")}>
          <StatCard
            level="low"
            label="Low"
            value={lowCount}
            delta="1 resolved"
            deltaDir="down"
            hint="Informational hygiene"
            icon={Info}
          />
        </div>
        {/* Active assessment — only shows real scan data; no invented SCAN-001 fallback */}
        <div className="card min-w-0 border-purple-200/80 bg-gradient-to-br from-purple-100/50 via-white/70 to-sky-100/40 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow text-purple-700 font-semibold">Active assessment</span>
            {currentScan && (
              <span className="rounded-full bg-purple-100/70 border border-purple-200/70 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                {currentScan.status}
              </span>
            )}
          </div>
          {currentScan ? (
            <>
              <div className="mt-3 font-mono text-[22px] font-semibold tracking-tight text-purple-700">
                {currentScan.id}
              </div>
              <p className="mt-1 truncate font-mono text-[12px] text-slate-500">
                {currentScan.repository_name}
              </p>
            </>
          ) : (
            <div className="mt-3 text-[13px] text-slate-400 italic">
              No active scan. Start a new scan to see it here.
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-[13px]">
            <span className="text-slate-500">{currentScan ? 'Queue position #1' : ''}</span>
            <button
              onClick={() => navigate("/scans")}
              className="cursor-pointer font-medium text-purple-700 hover:text-purple-900 hover:underline bg-transparent border-0 p-0"
            >
              View all →
            </button>
          </div>
        </div>
      </div>


      {/* Row 1: [Security score | PQC readiness] */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Overall security score"
          sub="Development / Mock Data — AST syntax validation, dependency CVEs and configuration exposure."
          right={<MockDataBadge size="xs" label="DEVELOPMENT / MOCK DATA" />}
        >
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="tabular text-[48px] font-semibold leading-none tracking-tight">
                74<span className="text-[20px] text-muted-foreground"> / 100</span>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">Development example score</p>
            </div>
            <ScoreRing value={74} />
          </div>
        </Panel>
        <Panel
          title="PQC readiness index"
          sub="Development / Mock Data — NIST FIPS 203 / 204 readiness baseline."
          right={<span className="tabular font-semibold text-purple-700">58% quantum safe</span>}
        >
          <SegmentBar
            segments={[
              { label: "Resistant · AES-256 / SHA-384", value: 58, color: "bg-primary" },
              { label: "Shor at-risk · RSA / ECC", value: 42, color: "bg-critical" },
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
          right="Total 58"
          footer={<span className="text-muted-foreground">Source: AST rules, dependency manifests, TLS configs</span>}
        >
          <SegmentBar
            segments={[
              { label: "Cryptographic", value: 21, color: "bg-violet-500" },
              { label: "SAST code", value: 18, color: "bg-sky-500" },
              { label: "Dependency", value: 11, color: "bg-cyan-500" },
              { label: "Configuration", value: 8, color: "bg-amber-500" },
            ]}
          />
        </Panel>
      </div>

      {/* Row 3: [Post-quantum risk | Recent scan activity] */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Post-quantum cryptographic risk"
          sub="Development / Mock Data — Components classified against Shor and Grover threats."
          right={<span className="tabular font-semibold text-purple-700">25 components</span>}
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
              { label: "High · Shor vulnerable (RSA / ECC)", value: 5, color: "bg-critical" },
              { label: "Medium · Hybrid / legacy TLS", value: 8, color: "bg-medium" },
              { label: "Low · AES-256 / SHA-384", value: 12, color: "bg-primary" },
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
