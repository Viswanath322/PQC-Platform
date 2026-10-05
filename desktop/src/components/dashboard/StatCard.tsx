import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const tone = {
  critical: { text: "text-critical", bg: "bg-critical/10", ring: "ring-critical/25" },
  high:     { text: "text-high",     bg: "bg-high/10",     ring: "ring-high/25" },
  medium:   { text: "text-medium",   bg: "bg-medium/10",   ring: "ring-medium/25" },
  low:      { text: "text-low",      bg: "bg-low/10",      ring: "ring-low/25" },
} as const;

export function StatCard({
  level,
  label,
  value,
  delta,
  deltaDir = "flat",
  hint,
  icon: Icon,
}: {
  level: keyof typeof tone;
  label: string;
  value: number;
  delta: string;
  deltaDir?: "up" | "down" | "flat";
  hint: string;
  icon: LucideIcon;
}) {
  const t = tone[level];
  const D = deltaDir === "up" ? TrendingUp : deltaDir === "down" ? TrendingDown : Minus;
  return (
    <div className="card card-hover min-w-0 p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg ring-1", t.bg, t.ring)}>
          <Icon className={cn("h-4 w-4", t.text)} aria-hidden />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={cn("tabular text-[36px] font-semibold leading-none tracking-tight", t.text)}>{value}</span>
        <span className="flex items-center gap-1 whitespace-nowrap text-[12px] text-muted-foreground">
          <D className="h-3 w-3" /> {delta}
        </span>
      </div>
      <p className="mt-3 truncate text-[13px] text-muted-foreground">{hint}</p>
    </div>
  );
}
