import { GitBranch, Calendar, Play, FolderGit2 } from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  queued: "project-status-queued",
  ingesting: "project-status-active",
  analyzing: "project-status-active",
  processing: "project-status-active",
  ai_analysis: "project-status-active",
  completed: "project-status-completed",
  failed: "project-status-failed",
  cancelled: "project-status-muted",
};

type FindingCounts = { crit: number; high: number; med: number; low: number };

export function ProjectCard({
  name,
  branch,
  repositoryUrl,
  description,
  state = "completed",
  counts,
  readiness,
  date,
  onScan,
}: {
  name: string;
  branch: string;
  repositoryUrl?: string;
  description: string;
  state?: string;
  counts?: FindingCounts;
  readiness?: number | null;
  date?: string;
  onScan?: () => void;
}) {
  const normalizedState = state.toLowerCase();
  const statusLabel = normalizedState.replaceAll("_", " ");
  const countItems = counts ? [
    ["Critical", counts.crit, "project-count-critical"],
    ["High", counts.high, "project-count-high"],
    ["Medium", counts.med, "project-count-medium"],
    ["Low", counts.low, "project-count-low"],
  ] as const : null;
  const totalFindings = counts ? counts.crit + counts.high + counts.med + counts.low : null;

  return (
    <article className="project-card card card-hover group flex min-w-0 flex-col p-5">
      <div className="flex items-start gap-3">
        <div className="project-card-icon grid h-10 w-10 shrink-0 place-items-center rounded-lg">
          <FolderGit2 className="h-[18px] w-[18px]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">{name}</h3>
          <p className="mt-1 flex items-center gap-1.5 truncate font-mono text-[10px] text-slate-500" title={repositoryUrl || undefined}>
            <span className="truncate">{repositoryUrl || description}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
            <GitBranch className="h-3 w-3 shrink-0" aria-hidden /> {branch}
          </p>
        </div>
        <span className={cn("project-status-badge", statusStyles[normalizedState] || "project-status-muted")}>
          <i aria-hidden="true" />{statusLabel}
        </span>
      </div>

      <div className="project-card-metadata">
        <div className="project-card-metric">
          <span>FINDINGS</span>
          <strong>{totalFindings === null ? "—" : totalFindings}</strong>
        </div>
        <div className="project-card-metric project-readiness-metric">
          <span>PQC READINESS</span>
          <strong className={readiness == null ? "is-unavailable" : ""}>
            {readiness == null ? "Unavailable" : <>{readiness}<small>%</small></>}
          </strong>
        </div>
      </div>

      <div className="project-risk-block">
        <div className="project-risk-heading">
          <span>Finding severity</span>
          {totalFindings !== null && <span>{totalFindings === 0 ? "No findings" : `${totalFindings} total`}</span>}
        </div>
        {counts ? (
          <>
            <div className="project-risk-bar" aria-label={`Risk distribution: ${counts.crit} critical, ${counts.high} high, ${counts.med} medium, ${counts.low} low`}>
              {totalFindings ? <>
                <i className="project-bar-critical" style={{ width: `${counts.crit / totalFindings * 100}%` }} />
                <i className="project-bar-high" style={{ width: `${counts.high / totalFindings * 100}%` }} />
                <i className="project-bar-medium" style={{ width: `${counts.med / totalFindings * 100}%` }} />
                <i className="project-bar-low" style={{ width: `${counts.low / totalFindings * 100}%` }} />
              </> : <i className="project-bar-empty" />}
            </div>
            <div className="project-counts-grid">
              {countItems?.map(([label, value, style]) => (
                <div className="project-count-item" key={label}>
                  <span className={style} aria-hidden="true" />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </>
        ) : <p className="project-risk-unavailable">Finding counts unavailable</p>}
      </div>

      <div className="project-card-footer mt-auto flex items-center justify-between border-t border-slate-200/60 pt-4">
        <span className="flex items-center gap-2 text-[11px] text-slate-500">
          <Calendar className="h-3.5 w-3.5" /> <span className="tabular">{date || "No scan recorded"}</span>
        </span>
        <div className="flex items-center gap-2">
          <button className="project-details-button" type="button">
            Details
          </button>
          <button onClick={onScan} className="project-scan-button" type="button">
            <Play className="h-3 w-3 fill-current" /> Scan
          </button>
        </div>
      </div>
    </article>
  );
}
