import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertOctagon, AlertTriangle, AlertCircle, Info, Plus, RefreshCw, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Panel } from "@/components/dashboard/Panel";
import { SegmentBar } from "@/components/dashboard/SegmentBar";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { ScanPipelineCard } from "@/components/dashboard/ScanPipelineCard";
import { NewScanModal } from "@/components/scans/NewScanModal";
import { SeverityBadge } from "@/components/common/SeverityBadge";
import { api } from "@/services/api";
import type { Project, Scan, Finding } from "@/types";

const activity = [
  { title: "SCAN-001 queued", detail: "for AST ingestion", when: "10 min ago" },
  { title: "SCAN-002 completed", detail: "18 findings detected", when: "2 hours ago" },
  { title: "CBOM export generated", detail: "Core-Services", when: "5 hours ago" },
  { title: "AST Analyzer ruleset updated", detail: "FIPS 203", when: "1 day ago" },
];

export function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isNewScanOpen, setIsNewScanOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
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

  // Severity counts
  const criticalCount = findings.filter((f) => f.severity === "critical").length || 5;
  const highCount = findings.filter((f) => f.severity === "high").length || 4;
  const mediumCount = findings.filter((f) => f.severity === "medium").length || 3;
  const lowCount = findings.filter((f) => f.severity === "low").length || 2;
  const totalFindings = criticalCount + highCount + mediumCount + lowCount;

  const currentScan = scans.find((s) => s.status === "QUEUED" || s.status === "ANALYZING") || scans[0];
  const severityRank: Record<Finding["severity"], number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const topSecurityRisks = [...findings]
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, 3);

  return (
    <>
      <PageHeader
        title="Security overview"
        description="Application vulnerabilities, post-quantum readiness and cryptographic inventory in one view."
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

      {/* 5 Equal KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="cursor-pointer" onClick={() => navigate("/findings?severity=critical")}>
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
        <div className="cursor-pointer" onClick={() => navigate("/findings?severity=high")}>
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
        <div className="cursor-pointer" onClick={() => navigate("/findings?severity=medium")}>
          <StatCard
            level="medium"
            label="Medium"
            value={mediumCount}
            delta="Unchanged"
            hint="Config & padding flaws"
            icon={AlertCircle}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/findings?severity=low")}>
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
      </div>

      <ScanPipelineCard scan={currentScan} onViewScan={() => navigate("/scans")} />

      {/* Row 1: [Security score | PQC readiness] */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Overall security score" sub="AST syntax validation, dependency CVEs and configuration exposure.">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="tabular text-[48px] font-semibold leading-none tracking-tight">
                74<span className="text-[20px] text-muted-foreground"> / 100</span>
              </div>
              <p className="mt-2 text-[13px] text-success">▲ 3 pts vs last scan</p>
            </div>
            <ScoreRing value={74} />
          </div>
        </Panel>
        <section className="pqc-readiness-widget">
          <div className="pqc-widget-topline">
            <div className="pqc-widget-kicker"><span className="pqc-widget-mark">◈</span> POST-QUANTUM INTELLIGENCE</div>
            <span className="pqc-standard-badge">NIST FIPS <strong>203 / 204</strong></span>
          </div>
          <div className="pqc-widget-heading">
            <div>
              <h2>PQC Readiness Index</h2>
              <p>Quantum exposure across cryptographic assets</p>
            </div>
            <span className="pqc-widget-context">PQC READINESS</span>
          </div>
          <div className="pqc-widget-content">
            <div className="pqc-readiness-ring" aria-label="58 percent quantum safe">
              <div className="pqc-readiness-ring-inner">
                <strong>58<span>%</span></strong>
                <span>quantum safe</span>
              </div>
            </div>
            <div className="pqc-readiness-breakdown">
              <div className="pqc-readiness-stat pqc-resistant-stat">
                <span className="pqc-stat-dot" />
                <div className="pqc-stat-copy"><span>Resistant algorithms</span><strong>AES-256 <i>/</i> SHA-384</strong></div>
                <b className="pqc-stat-percent">58%</b>
              </div>
              <div className="pqc-readiness-stat pqc-risk-stat">
                <span className="pqc-stat-dot" />
                <div className="pqc-stat-copy"><span>Shor-at-risk algorithms</span><strong>RSA <i>/</i> ECC</strong></div>
                <b className="pqc-stat-percent">42%</b>
              </div>
            </div>
          </div>
          <div className="pqc-exposure-meter" role="img" aria-label="Quantum exposure: 58 percent resistant, 42 percent at risk">
            <div className="pqc-meter-safe" />
            <div className="pqc-meter-risk" />
          </div>
          <div className="pqc-meter-labels"><span><i className="safe-key" />RESISTANT</span><span>QUANTUM EXPOSURE<i className="risk-key" />AT RISK</span></div>
        </section>
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

      <section className="top-security-risks mt-6" aria-labelledby="top-security-risks-title">
        <div className="top-risks-header">
          <div>
            <span className="top-risks-eyebrow">SECURITY PRIORITIES</span>
            <h2 id="top-security-risks-title">Top Security Risks</h2>
          </div>
          <button type="button" onClick={() => navigate("/findings")} className="top-risks-view-all">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {topSecurityRisks.length > 0 ? (
          <ul className="top-risks-list">
            {topSecurityRisks.map((finding) => (
              <li key={finding.finding_id}>
                <button
                  type="button"
                  className="top-risk-row"
                  onClick={() => navigate("/findings", { state: { selectedFindingId: finding.finding_id } })}
                  aria-label={`Open ${finding.finding_id}: ${finding.title}`}
                >
                  <span className="top-risk-id">{finding.finding_id}</span>
                  <span className="top-risk-main">
                    <span className="top-risk-title">{finding.title}</span>
                    <span className="top-risk-path">{finding.file_path}</span>
                  </span>
                  {finding.category && <span className="top-risk-category">{finding.category}</span>}
                  <SeverityBadge severity={finding.severity} size="sm" />
                  <ArrowRight className="top-risk-arrow h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="top-risks-empty">No findings available.</div>
        )}
      </section>

      {/* Row 3: [Post-quantum risk | Recent scan activity] */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Post-quantum cryptographic risk"
          sub="Components classified against Shor and Grover threats."
          right="25 components"
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
          title="Activity"
          sub="Audit trail of scans, pipeline runs and CBOM events."
          right={
            <button
              onClick={() => navigate("/scans")}
              className="activity-view-all"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          <ol className="activity-timeline">
            {activity.map((item) => {
              const lowerTitle = item.title.toLowerCase();
              const scanId = item.title.match(/SCAN-\d+/)?.[0];
              const relatedProject = scanId ? scans.find((scan) => scan.id === scanId)?.project_name : undefined;
              const activityDetail = [relatedProject, item.detail].filter(Boolean).join(" · ");
              const activityStatus = lowerTitle.includes('queued')
                ? 'Queued'
                : lowerTitle.includes('completed')
                  ? 'Completed'
                  : lowerTitle.includes('export generated')
                    ? 'Exported'
                    : 'Updated';
              return (
              <li key={item.title} className={`activity-timeline-item activity-${activityStatus.toLowerCase()}`}>
                <span className="activity-timeline-rail" aria-hidden="true" />
                <span className="activity-timeline-node" aria-hidden="true" />
                <div className="activity-timeline-body">
                  <div className="activity-timeline-meta">
                    <time>{item.when}</time>
                    <span className="activity-status-tag">{activityStatus}</span>
                  </div>
                  <p>{item.title}</p>
                  <span className="activity-timeline-detail">{activityDetail}</span>
                </div>
              </li>
              );
            })}
          </ol>
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
