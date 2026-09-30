import { Search, Bell, RefreshCw, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";

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
  const navigate = useNavigate();
  const { profile } = useUser();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-white/70 bg-white/40 px-4 backdrop-blur-md lg:px-6">
      <nav className="flex min-w-0 items-center gap-2 text-[13px]">
        <span className="font-semibold text-slate-900">{page}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <button className="flex min-w-0 items-center gap-2 rounded-lg border border-white/80 bg-white/60 px-2.5 py-1 text-muted-foreground backdrop-blur-md transition-all duration-200 hover:border-white/95 hover:bg-white/85 hover:text-slate-950 hover:shadow-[inset_0_1px_1px_#fff,0_3px_10px_rgba(41,56,77,0.06)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer">
          <span className="truncate">{project}</span>
          <span className="rounded bg-purple-100/70 border border-purple-200/80 px-1.5 font-mono text-[11px] text-purple-700 font-semibold">{branch}</span>
        </button>
      </nav>

      <div className="relative mx-auto hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          aria-label="Search"
          placeholder="Search assets, algorithms, scans…"
          className="h-9 w-full rounded-lg border border-white/80 bg-white/60 pl-9 pr-12 text-[13px] text-foreground outline-none backdrop-blur-md transition-all duration-200 placeholder:text-slate-400 hover:border-white hover:bg-white/80 focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-purple-200/70 bg-purple-50/80 px-1.5 font-mono text-[10px] text-purple-700 shadow-sm">⌘K</kbd>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-[12px] text-slate-700 backdrop-blur-md shadow-sm sm:flex">
          <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-success" : "animate-pulse bg-critical"}`} />
          {online ? "Live" : "Demo data · Backend offline"}
        </span>
        <button
          onClick={onRefresh}
          className="btn transition-all duration-200 hover:border-white/95 hover:bg-white/90 hover:shadow-[inset_0_1px_1px_#fff,0_4px_14px_-2px_rgba(42,157,143,0.22)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} /> Sync
        </button>
        <button
          aria-label="Notifications"
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/80 bg-white/60 backdrop-blur-md transition-all duration-200 hover:border-white/95 hover:bg-white/90 hover:shadow-[inset_0_1px_1px_#fff,0_3px_10px_rgba(41,56,77,0.06)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer group"
        >
          <Bell className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-900" />
        </button>
        <button
          onClick={() => navigate('/profile')}
          title={`Profile: ${profile.fullName} (@${profile.name}) - Click to view and edit`}
          className="grid h-8.5 w-8.5 place-items-center rounded-lg bg-gradient-to-br from-purple-100 to-teal-50 text-[11.5px] font-bold text-purple-700 ring-1 ring-purple-200/80 backdrop-blur-md transition-all duration-150 hover:ring-2 hover:ring-purple-300 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
        >
          {profile.avatarInitials}
        </button>
      </div>
    </header>
  );
}
