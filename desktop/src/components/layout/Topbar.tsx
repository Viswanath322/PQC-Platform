import { Search, Bell, RefreshCw, ChevronRight } from "lucide-react";

export function Topbar({
  page = "Dashboard",
  project = "Enterprise-Core-Services",
  branch = "main",
  online = false,
  onRefresh,
  isRefreshing = false,
}: {
  page?: string;
  project?: string;
  branch?: string;
  online?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-white/70 bg-white/60 px-4 backdrop-blur-xl backdrop-saturate-150 lg:px-8">
      <nav className="flex min-w-0 items-center gap-2 text-[13px]">
        <span className="font-semibold text-slate-900">{page}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <button className="flex min-w-0 items-center gap-2 rounded-md border border-white/80 bg-white/70 px-2.5 py-1 text-muted-foreground hover:text-foreground">
          <span className="truncate">{project}</span>
          <span className="rounded bg-slate-100 px-1.5 font-mono text-[11px] text-slate-600">{branch}</span>
        </button>
      </nav>

      <div className="relative mx-auto hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          aria-label="Search"
          placeholder="Search assets, algorithms, scans…"
          className="h-9 w-full rounded-lg border border-white/80 bg-white/70 pl-9 pr-12 text-[13px] text-foreground outline-none backdrop-blur placeholder:text-slate-400 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-white px-1.5 font-mono text-[10px] text-slate-500">⌘K</kbd>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-[12px] text-slate-700 backdrop-blur sm:flex">
          <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-success" : "animate-pulse bg-critical"}`} />
          {online ? "Live" : "Demo data · Backend offline"}
        </span>
        <button
          onClick={onRefresh}
          className="btn"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} /> Sync
        </button>
        <button aria-label="Notifications" className="grid h-9 w-9 place-items-center rounded-lg border border-white/80 bg-white/70 hover:bg-white">
          <Bell className="h-4 w-4 text-slate-600" />
        </button>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary ring-1 ring-primary/25">SO</div>
      </div>
    </header>
  );
}
