import { GitBranch, Calendar, Play, FolderGit2 } from "lucide-react";
import { cn } from "@/lib/utils";

const status = {
  queued:    "bg-medium/10 text-medium ring-medium/25",
  completed: "bg-success/10 text-success ring-success/25",
  analyzing: "bg-violet-500/10 text-violet-600 ring-violet-500/25",
} as const;

export function ProjectCard({
  name,
  branch,
  description,
  state = "completed",
  counts = { crit: 0, high: 0, med: 0, low: 0 },
  date,
  onScan,
}: {
  name: string;
  branch: string;
  description: string;
  state?: keyof typeof status;
  counts?: { crit: number; high: number; med: number; low: number };
  date: string;
  onScan?: () => void;
}) {
  const tiles: [string, number, string][] = [
    ["Crit", counts.crit, "text-critical bg-critical/10 ring-1 ring-critical/20"],
    ["High", counts.high, "text-high bg-high/10 ring-1 ring-high/20"],
    ["Med",  counts.med,  "text-medium bg-medium/10 ring-1 ring-medium/20"],
    ["Low",  counts.low,  "text-low bg-low/10 ring-1 ring-low/20"],
  ];
  return (
    <article className="card card-hover flex min-w-0 flex-col p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/25">
          <FolderGit2 className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-semibold tracking-tight text-slate-900">{name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[12px] text-slate-500">
            <GitBranch className="h-3.5 w-3.5" /> {branch}
          </p>
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ring-1", status[state] || status.completed)}>
          {state}
        </span>
      </div>
      <p className="mt-4 line-clamp-2 min-h-[40px] text-[13px] leading-5 text-slate-500">{description}</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {tiles.map(([l, v, c]) => (
          <div key={l} className={cn("rounded-lg px-2 py-2 text-center", c)}>
            <div className="tabular text-[16px] font-semibold leading-none">{v}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wide opacity-80">{l}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-200/60 pt-4">
        <span className="flex items-center gap-2 text-[12px] text-slate-500">
          <Calendar className="h-3.5 w-3.5" /> <span className="tabular">{date}</span>
        </span>
        <div className="flex items-center gap-2">
          <button className="h-8 rounded-lg px-3 text-[13px] text-slate-600 transition-colors hover:bg-white/80 hover:text-slate-900">
            Details
          </button>
          <button
            onClick={onScan}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:brightness-110"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Scan
          </button>
        </div>
      </div>
    </article>
  );
}
