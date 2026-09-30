import { Bell, RefreshCw, ChevronRight, FolderGit2, GitBranch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

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
    <header className="app-topbar flex h-[66px] shrink-0 items-center gap-4 px-4 lg:px-7">
      <nav className="flex min-w-0 items-center gap-2.5 text-[12px]">
        <span className="font-semibold tracking-[-0.02em] text-slate-900">{page}</span>
        <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
        <button title={`${project} · ${branch}`} className="project-context flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-600 transition-colors">
          <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-teal-700" />
          <span className="hidden max-w-[130px] truncate font-medium sm:block lg:max-w-[190px]">{project}</span>
          <span className="h-3.5 w-px bg-slate-200" />
          <GitBranch className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="font-mono text-[10px] font-medium text-slate-500">{branch}</span>
        </button>
      </nav>

      <GlobalSearch />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className={`backend-pill hidden items-center gap-2 rounded-md border px-2.5 py-1.5 text-[10px] font-medium sm:flex ${online ? "is-online" : "is-offline"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-success" : "bg-critical"}`} />
          {online ? "Live" : "Demo data · Backend offline"}
        </span>
        <button
          onClick={onRefresh}
          className="btn topbar-action"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} /> Sync
        </button>
        <button
          aria-label="Notifications"
          className="topbar-icon grid h-9 w-9 place-items-center rounded-lg transition-colors"
        >
          <Bell className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-900" />
        </button>
        <button
          onClick={() => navigate('/profile')}
          title={`Profile: ${profile.fullName} (@${profile.name}) - Click to view and edit`}
          className="topbar-profile grid h-9 w-9 place-items-center rounded-full text-[11px] font-semibold transition-colors"
        >
          {profile.avatarInitials}
        </button>
      </div>
    </header>
  );
}
