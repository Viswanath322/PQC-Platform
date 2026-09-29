import { LayoutDashboard, FolderGit2, ScanLine, Bug, ShieldCheck, KeyRound, FileText, Settings, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderGit2 },
  { to: "/scans", label: "Scans", icon: ScanLine },
  { to: "/findings", label: "Findings", icon: Bug },
  { to: "/pqc", label: "PQC Assessment", icon: ShieldCheck, badge: "PQC" },
  { to: "/inventory", label: "Crypto Inventory", icon: KeyRound },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { profile } = useUser();

  return (
    <aside className="flex h-full shrink-0 flex-col justify-between rounded-2xl border border-white/80 bg-white/60 p-3 shadow-[0_8px_32px_rgba(41,56,77,0.06)] backdrop-blur-2xl backdrop-saturate-150 lg:p-3.5 w-16 lg:w-[240px]">
      <div className="flex flex-col gap-5">
        {/* Brand */}
        <div className="flex items-center gap-3 px-1.5 lg:px-2 py-1 rounded-xl transition-all duration-200 border border-transparent hover:border-white/70 hover:bg-white/40 hover:backdrop-blur-md cursor-default">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/25 shadow-sm transition-transform duration-200 hover:scale-105">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="hidden leading-tight lg:block">
            <div className="text-[15px] font-semibold tracking-tight text-slate-900">PQC Sentinel</div>
            <div className="text-[11px] text-slate-500 font-mono">v0.8.4 · Security Assessment</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  "group relative flex h-9 items-center justify-center gap-3 rounded-xl text-[13.5px] transition-all duration-200 ease-out border lg:justify-start lg:px-3",
                  isActive
                    ? "border-white/95 bg-white/90 text-slate-950 shadow-[inset_0_1px_1px_#fff,0_4px_14px_-4px_hsl(var(--primary)/0.35),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-xl font-medium before:absolute before:left-0 before:top-2 before:h-5 before:w-0.5 before:rounded-full before:bg-primary"
                    : "border-transparent text-slate-600 hover:border-white/90 hover:bg-white/60 hover:text-slate-950 hover:backdrop-blur-md hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_4px_12px_-2px_rgba(41,56,77,0.06),0_1px_2px_rgba(41,56,77,0.02)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0 transition-colors duration-150 group-hover:text-primary" />
              <span className="hidden flex-1 lg:block">{label}</span>
              {badge && (
                <span className="hidden rounded bg-primary/10 px-1.5 text-[10px] font-semibold text-primary ring-1 ring-primary/20 lg:block group-hover:bg-primary/15 transition-colors">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Profile Card Button */}
      <NavLink
        to="/profile"
        title="Open and edit auditor profile"
        className={({ isActive }) =>
          cn(
            "flex items-center justify-center gap-3 rounded-xl p-2 transition-all duration-200 border lg:justify-start lg:p-2.5 group cursor-pointer",
            isActive
              ? "border-white/95 bg-white/90 shadow-[inset_0_1px_1px_#fff,0_4px_14px_-4px_hsl(var(--primary)/0.25)] ring-1 ring-primary/30 backdrop-blur-xl"
              : "border-white/70 bg-white/50 backdrop-blur-md shadow-sm hover:border-white/95 hover:bg-white/75 hover:backdrop-blur-xl hover:shadow-[inset_0_1px_1px_#fff,0_6px_20px_-4px_rgba(41,56,77,0.08)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
          )
        }
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/25 transition-transform duration-200 group-hover:scale-105 group-hover:ring-primary/40">
          {profile.avatarInitials}
        </div>
        <div className="hidden min-w-0 leading-tight lg:block flex-1">
          <div className="flex items-center justify-between">
            <span className="truncate text-[13px] font-medium text-slate-900 group-hover:text-primary transition-colors">
              {profile.name}
            </span>
          </div>
          <div className="truncate text-[11px] text-slate-500">
            {profile.title}
          </div>
        </div>
      </NavLink>
    </aside>
  );
}
