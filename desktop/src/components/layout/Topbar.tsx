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
        <button className="flex min-w-0 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-2.5 py-1 text-slate-300 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] transition-all duration-200 hover:border-white/30 hover:bg-white/[0.14] hover:text-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.32),0_4px_16px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">
          <span className="truncate">{project}</span>
          <span className="rounded bg-purple-950/70 border border-purple-500/30 px-1.5 font-mono text-[11px] text-purple-300 font-semibold shadow-2xs">
            {branch}
          </span>
        </button>
      </nav>

      <div className="relative mx-auto hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          aria-label="Search"
          placeholder="Search assets, algorithms, scans…"
          className="h-9 w-full rounded-xl border border-white/15 bg-white/[0.06] pl-9 pr-12 text-[13px] text-white outline-none backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)] transition-all duration-200 placeholder:text-slate-400 hover:border-white/30 hover:bg-white/[0.10] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] focus:border-purple-400/80 focus:bg-white/[0.14] focus:ring-2 focus:ring-purple-400/30 focus:shadow-[inset_0_1px_1px_rgba(255,255,255,0.32),0_0_20px_rgba(168,85,247,0.35)]"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-purple-500/30 bg-purple-950/80 px-1.5 font-mono text-[10px] text-purple-300 shadow-sm">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-[12px] text-slate-300 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] sm:flex">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              online ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "animate-pulse bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
            }`}
          />
          {online ? "Live" : "Demo data · Backend offline"}
        </span>
        <button
          onClick={onRefresh}
          className="btn cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
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
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/[0.07] backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] transition-all duration-200 hover:border-white/30 hover:bg-white/[0.14] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.30),0_4px_16px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
        >
          <Bell className="h-4 w-4 text-slate-400 transition-colors group-hover:text-white" />
        </button>
        <button
          onClick={() => navigate("/profile")}
          title={`Profile: ${profile.fullName} (@${profile.name}) - Click to view and edit`}
          className="grid h-8.5 w-8.5 place-items-center rounded-xl bg-gradient-to-br from-purple-950/70 to-teal-950/70 text-[11.5px] font-bold text-purple-300 ring-1 ring-purple-500/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] transition-all duration-200 hover:ring-purple-400 hover:shadow-[0_0_18px_rgba(168,85,247,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
        >
          {profile.avatarInitials}
        </button>
      </div>
    </header>
  );
}
