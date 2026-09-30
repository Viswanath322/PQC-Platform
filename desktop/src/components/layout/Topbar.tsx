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
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-white/10 bg-slate-950/70 px-4 backdrop-blur-xl lg:px-6">
      <nav className="flex min-w-0 items-center gap-2 text-[13px]">
        <span className="font-semibold text-white">{page}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <button className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300 backdrop-blur-md transition-all duration-150 hover:border-white/20 hover:bg-white/10 hover:text-white cursor-pointer">
          <span className="truncate">{project}</span>
          <span className="rounded bg-purple-950/70 border border-purple-500/30 px-1.5 font-mono text-[11px] text-purple-300 font-semibold">
            {branch}
          </span>
        </button>
      </nav>

      <div className="relative mx-auto hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          aria-label="Search"
          placeholder="Search assets, algorithms, scans…"
          className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-12 text-[13px] text-white outline-none backdrop-blur-md transition-all duration-150 placeholder:text-slate-400 hover:border-white/20 focus:border-purple-400/50 focus:bg-white/10 focus:ring-2 focus:ring-purple-400/20"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-purple-500/30 bg-purple-950/80 px-1.5 font-mono text-[10px] text-purple-300 shadow-sm">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-slate-300 backdrop-blur-md shadow-sm sm:flex">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              online ? "bg-emerald-400" : "animate-pulse bg-rose-500"
            }`}
          />
          {online ? "Live" : "Demo data · Backend offline"}
        </span>
        <button
          onClick={onRefresh}
          className="btn transition-all duration-150 hover:border-white/25 hover:bg-white/10 cursor-pointer"
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              isRefreshing ? "animate-spin text-teal-400" : ""
            }`}
          />{" "}
          Sync
        </button>
        <button
          aria-label="Notifications"
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-150 hover:border-white/20 hover:bg-white/10 cursor-pointer group"
        >
          <Bell className="h-4 w-4 text-slate-400 transition-colors group-hover:text-white" />
        </button>
        <button
          onClick={() => navigate("/profile")}
          title={`Profile: ${profile.fullName} (@${profile.name}) - Click to view and edit`}
          className="grid h-8.5 w-8.5 place-items-center rounded-lg bg-gradient-to-br from-purple-950/70 to-teal-950/70 text-[11.5px] font-bold text-purple-300 ring-1 ring-purple-500/30 backdrop-blur-md transition-all duration-150 hover:ring-purple-400 hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
        >
          {profile.avatarInitials}
        </button>
      </div>
    </header>
  );
}
