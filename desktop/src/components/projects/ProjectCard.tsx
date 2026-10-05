import { GitBranch, Calendar, Play, FolderGit2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles = {
  queued:    "bg-medium/10 text-medium ring-medium/25",
  completed: "bg-success/10 text-success ring-success/25",
  analyzing: "bg-violet-500/10 text-violet-600 ring-violet-500/25",
} as const;

export function ProjectCard({
  name,
  branch,
  description,
  state,      // undefined = no scans yet
  counts,     // undefined = no scans yet, never invent values
  date,       // undefined = no scan date
  onScan,
}: {
  name: string;
  branch: string;
  description: string;
  state?: keyof typeof statusStyles;
  counts?: { crit: number; high: number; med: number; low: number };
  date?: string;
  onScan?: () => void;
}) {
  const hasScans = state !== undefined;

  const tiles: [string, number, string][] = counts
    ? [
        ["Crit", counts.crit, "text-critical bg-critical/10 ring-1 ring-critical/20"],
        ["High", counts.high, "text-high bg-high/10 ring-1 ring-high/20"],
        ["Med",  counts.med,  "text-medium bg-medium/10 ring-1 ring-medium/20"],
        ["Low",  counts.low,  "text-low bg-low/10 ring-1 ring-low/20"],
      ]
    : [];

  return (
    <article className="card card-hover flex min-w-0 flex-col p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/25">
          <FolderGit2 className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-semibold tracking-tight text-slate-900">{name}</h3>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-[12px] text-slate-500">
            <GitBranch className="h-3.5 w-3.5 text-purple-700" />
            <span className="rounded bg-purple-100/70 border border-purple-200/80 px-1.5 font-mono text-[11px] text-purple-700 font-semibold">{branch}</span>
          </div>
        </div>
        {/* Status badge — only shown when a real scan exists */}
        {hasScans ? (
          <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ring-1", statusStyles[state!])}>
            {state}
          </span>
        ) : (
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 bg-slate-100/80 text-slate-500 ring-slate-200">
            No scans
          </span>
        )}
      </div>
      <p className="mt-4 line-clamp-2 min-h-[40px] text-[13px] leading-5 text-slate-500">{description}</p>

      {/* Finding counts — only shown when real API data is available */}
      {counts ? (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {tiles.map(([l, v, c]) => (
            <div key={l} className={cn("rounded-lg px-2 py-2 text-center", c)}>
              <div className="tabular text-[16px] font-semibold leading-none">{v}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wide opacity-80">{l}</div>
            </div>
          ))}
        </div>
      ) : (
        /* No scans yet — explicit empty state, not fake zeros */
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[13px] text-slate-400">
          <Clock className="h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium text-slate-500">No scans yet</div>
            <div className="text-[11px] mt-0.5">Upload your project and start a scan to see security findings.</div>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-slate-200/60 pt-4">
        <span className="flex items-center gap-2 text-[12px] text-slate-500">
          <Calendar className="h-3.5 w-3.5" />
          {/* Only show real scan date — never a hardcoded fallback */}
          {date ? (
            <span className="tabular">{date}</span>
          ) : (
            <span className="italic text-slate-400">No scan date</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button className="h-8 rounded-lg px-3 text-[13px] text-slate-600 transition-colors hover:bg-white/80 hover:text-slate-900">
            Details
          </button>
          <button
            onClick={onScan}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:brightness-110"
            title={!hasScans ? "Upload a project before starting a scan" : "Start a new scan"}
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Scan
          </button>
        </div>
      </div>
    </article>
  );
}
