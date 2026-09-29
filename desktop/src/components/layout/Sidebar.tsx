import { LayoutDashboard, FolderGit2, ScanLine, Bug, ShieldCheck, KeyRound, FileText, Settings, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  return (
    <aside className="sticky top-0 flex h-screen flex-col border-r border-white/70 bg-white/50 px-2 py-4 backdrop-blur-2xl backdrop-saturate-150 lg:px-3">
      <div className="mb-6 flex items-center gap-3 px-1.5 lg:px-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/25">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="hidden leading-tight lg:block">
          <div className="text-[15px] font-semibold tracking-tight text-slate-900">PQC Sentinel</div>
          <div className="text-[11px] text-slate-500">Security Assessment · v0.8.4</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {nav.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                "relative flex h-9 items-center justify-center gap-3 rounded-lg text-[13.5px] transition-colors hover:bg-white/70 hover:text-slate-900 lg:justify-start lg:px-3",
                isActive
                  ? "bg-white/80 text-slate-900 shadow-[0_1px_0_#fff_inset,0_4px_14px_-6px_hsl(var(--primary)/0.35)] before:absolute before:left-0 before:top-2 before:h-5 before:w-0.5 before:rounded-full before:bg-primary"
                  : "text-slate-600"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden flex-1 lg:block">{label}</span>
            {badge && (
              <span className="hidden rounded bg-primary/10 px-1.5 text-[10px] font-semibold text-primary ring-1 ring-primary/20 lg:block">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="glass flex items-center justify-center gap-3 rounded-xl p-2 lg:justify-start lg:p-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/25">SO</div>
        <div className="hidden min-w-0 leading-tight lg:block">
          <div className="truncate text-[13px] font-medium text-slate-900">SecOfficer</div>
          <div className="truncate text-[11px] text-slate-500">Air-Gapped Auditor</div>
        </div>
      </div>
    </aside>
  );
}
