import {
  LayoutDashboard,
  FolderGit2,
  ScanLine,
  Bug,
  ShieldCheck,
  KeyRound,
  FileText,
  Settings,
  Shield,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";

interface NavGroup {
  title?: string;
  items: {
    to: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/projects", label: "Projects", icon: FolderGit2 },
      { to: "/scans", label: "Scans", icon: ScanLine },
    ],
  },
  {
    title: "Security & PQC",
    items: [
      { to: "/findings", label: "Findings", icon: Bug },
      { to: "/pqc", label: "PQC Assessment", icon: ShieldCheck, badge: "PQC" },
      { to: "/inventory", label: "Crypto Inventory", icon: KeyRound },
      { to: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    title: "System",
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
];

export function Sidebar() {
  const { profile } = useUser();

  return (
    <aside className="flex h-full shrink-0 flex-col justify-between rounded-2xl border border-white/80 bg-white/75 p-3 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:p-3.5 w-16 lg:w-[230px] select-none">
      <div className="flex flex-col gap-3">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-1 py-1 border-b border-slate-200/70 pb-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white shadow-xs">
            <Shield className="h-4.5 w-4.5 text-teal-400" />
          </div>
          <div className="hidden leading-tight lg:block min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold tracking-tight text-slate-900">
                PQC Sentinel
              </span>
              <span className="rounded bg-purple-50 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-purple-700 ring-1 ring-purple-200/80">
                v0.8.4
              </span>
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              Security Assessment
            </div>
          </div>
        </div>

        {/* Navigation Sections separated by divider borders */}
        <nav className="flex flex-1 flex-col gap-2.5">
          {navGroups.map((group, gIdx) => (
            <div
              key={gIdx}
              className={cn(
                "flex flex-col gap-0.5",
                gIdx > 0 && "pt-2.5 border-t border-slate-200/70"
              )}
            >
              {group.title && (
                <div className="hidden lg:flex items-center justify-between px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-950">
                  <span>{group.title}</span>
                </div>
              )}
              {group.items.map(({ to, label, icon: Icon, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  aria-label={label}
                  className={({ isActive }) =>
                    cn(
                      "group flex h-8.5 items-center justify-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-150 lg:justify-start",
                      isActive
                        ? "bg-white text-slate-950 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/5"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.04]"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-purple-700"
                            : "text-slate-400 group-hover:text-slate-700"
                        )}
                      />
                      <span className="hidden flex-1 truncate lg:block">
                        {label}
                      </span>
                      {badge && (
                        <span
                          className={cn(
                            "hidden rounded bg-purple-100/80 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-purple-700 ring-1 ring-purple-200/80 lg:block",
                            isActive && "bg-purple-100 ring-purple-300"
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="pt-2.5 border-t border-slate-200/70">
        <NavLink
          to="/profile"
          title="Open and edit auditor profile"
          className={({ isActive }) =>
            cn(
              "flex items-center justify-center gap-2.5 rounded-xl p-1.5 transition-all duration-150 lg:justify-start lg:p-2 group cursor-pointer",
              isActive
                ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/5"
                : "hover:bg-slate-900/[0.04]"
            )
          }
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-purple-100 to-teal-50 text-[11px] font-bold text-purple-700 ring-1 ring-purple-200/70 shadow-2xs transition-transform duration-150 group-hover:scale-105">
            {profile.avatarInitials}
          </div>
          <div className="hidden min-w-0 leading-tight lg:block flex-1">
            <div className="truncate text-[13px] font-semibold text-slate-900 group-hover:text-slate-950 transition-colors">
              {profile.name}
            </div>
            <div className="truncate text-[11px] text-slate-500">
              {profile.title}
            </div>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
