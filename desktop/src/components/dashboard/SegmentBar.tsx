import { cn } from "@/lib/utils";

export type Segment = { label: string; value: number; color: string }; // color = tailwind bg class

export function SegmentBar({ segments, cols = 2 }: { segments: Segment[]; cols?: 1 | 2 }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className="space-y-4">
      <div className="flex h-2 w-full gap-1 overflow-hidden rounded-full bg-slate-200/50">
        {segments.map((s) => (
          <div
            key={s.label}
            className={cn("h-full rounded-full", s.color)}
            style={{ width: `${(s.value / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className={cn("grid gap-x-6 gap-y-2.5", cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
        {segments.map((s) => (
          <li key={s.label} className="flex min-w-0 items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", s.color)} />
              <span className="truncate text-slate-600">{s.label}</span>
            </span>
            <span className="tabular whitespace-nowrap font-medium text-slate-900">
              {s.value} <span className="text-slate-500">({Math.round((s.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
