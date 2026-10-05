import { Search, Bell, RefreshCw, ChevronRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";

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
  const { logout } = useAuth();
  const { resetProfile } = useUser();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-white/70 bg-white/50 px-4 backdrop-blur-xl lg:px-6">
      <nav className="flex min-w-0 items-center gap-2 text-[13px]">
        <span className="font-semibold text-slate-900">{page}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <button className="flex min-w-0 items-center gap-2 rounded-xl border border-white/80 bg-white/60 px-2.5 py-1 text-slate-700 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-200 hover:border-white hover:bg-white/90 hover:text-slate-950 hover:shadow-[0_4px_14px_rgba(41,56,77,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">
          <span className="truncate">{project}</span>
          <span className="rounded bg-purple-100/70 border border-purple-200/80 px-1.5 font-mono text-[11px] text-purple-700 font-semibold shadow-2xs">
            {branch}
          </span>
        </button>
      </nav>

      <div className="relative mx-auto hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          aria-label="Search"
          placeholder="Search assets, algorithms, scans…"
          className="h-9 w-full rounded-xl border border-white/80 bg-white/60 pl-9 pr-12 text-[13px] text-slate-900 outline-none backdrop-blur-md shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 placeholder:text-slate-400 hover:border-white hover:bg-white/85 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus:border-purple-400/80 focus:bg-white focus:ring-2 focus:ring-purple-300/40 focus:shadow-[0_0_16px_rgba(168,85,247,0.15)]"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-purple-200/70 bg-purple-50/80 px-1.5 font-mono text-[10px] text-purple-700 shadow-sm">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-[12px] text-slate-700 backdrop-blur-md shadow-xs sm:flex">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              online ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "animate-pulse bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
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
              isRefreshing ? "animate-spin text-teal-600" : ""
            }`}
          />{" "}
          Sync
        </button>
        <button
          aria-label="Notifications"
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/80 bg-white/60 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-200 hover:border-white hover:bg-white/90 hover:shadow-[0_4px_14px_rgba(41,56,77,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
        >
          <Bell className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-900" />
        </button>
        <button
          onClick={() => { logout(); resetProfile(); }}
          title="Sign out"
          aria-label="Sign out"
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/80 bg-white/60 text-slate-600 hover:bg-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => navigate("/profile")}
          title={`Profile: ${profile.fullName} (@${profile.name}) - Click to view and edit`}
          className="grid h-8.5 w-8.5 place-items-center rounded-xl bg-gradient-to-br from-purple-100 to-teal-50 text-[11.5px] font-bold text-purple-700 ring-1 ring-purple-200/80 backdrop-blur-md shadow-2xs transition-all duration-200 hover:ring-2 hover:ring-purple-300 hover:shadow-[0_4px_14px_rgba(147,51,234,0.15)] hover:scale-105 active:scale-95 cursor-pointer"
        >
          {profile.avatarInitials}
        </button>
      </div>
    </header>
  );
}
