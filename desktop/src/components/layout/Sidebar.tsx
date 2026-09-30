import {
  Activity,
  Bug,
  FileText,
  FolderGit2,
  KeyRound,
  LayoutDashboard,
  ScanLine,
  Settings,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";

const sections = [
  {
    label: "WORKSPACE",
    links: [
      { to: "/", label: "Overview", icon: LayoutDashboard },
      { to: "/projects", label: "Projects", icon: FolderGit2 },
      { to: "/scans", label: "Scans", icon: ScanLine },
      { to: "/findings", label: "Findings", icon: Bug },
    ],
  },
  {
    label: "INTELLIGENCE",
    links: [
      { to: "/pqc", label: "PQC Assessment", icon: ShieldCheck, badge: "PQC" },
      { to: "/inventory", label: "Crypto Inventory", icon: KeyRound },
      { to: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "SYSTEM",
    links: [
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const { profile } = useUser();

  return (
    <aside className="app-sidebar flex h-full w-[70px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl px-2.5 py-3.5 lg:w-[252px] lg:px-3.5">
      <div className="flex min-h-0 flex-col">
        <div className="brand-lockup mb-7 flex items-center gap-3 px-1.5 py-1.5">
          <div className="brand-mark grid h-10 w-10 shrink-0 place-items-center rounded-xl">
            <Shield className="h-[21px] w-[21px]" strokeWidth={1.8} />
          </div>
          <div className="hidden min-w-0 leading-tight lg:block">
            <div className="text-[15px] font-semibold tracking-[-0.03em] text-white">PQC Sentinel</div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
              <Activity className="h-3 w-3 text-teal-400" /> Security platform
            </div>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="flex min-h-0 flex-col gap-5 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="nav-section-label mb-2 hidden px-3 text-[9px] font-semibold tracking-[0.16em] lg:block">
                {section.label}
              </div>
              <div className="flex flex-col gap-1">
                {section.links.map(({ to, label, icon: Icon, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    aria-label={label}
                    title={label}
                    className={({ isActive }) =>
                      cn("app-nav-link group relative flex h-10 items-center justify-center gap-3 rounded-lg border px-2.5 text-[12px] transition-all duration-150 lg:justify-start lg:px-3", isActive && "is-active")
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                    <span className="hidden min-w-0 flex-1 truncate lg:block">{label}</span>
                    {badge && <span className="nav-badge hidden lg:inline-flex">{badge}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <NavLink
          to="/profile"
          title="Open and edit auditor profile"
          className={({ isActive }) => cn("profile-card group flex items-center justify-center gap-2.5 rounded-xl border p-2 transition-colors lg:justify-start lg:px-2.5 lg:py-2.5", isActive && "is-active")}
        >
          <span className="profile-avatar grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ring-1">
            {profile.avatarInitials}
          </span>
          <span className="hidden min-w-0 flex-1 leading-tight lg:block">
            <span className="block truncate text-[12px] font-medium text-white">{profile.name}</span>
            <span className="mt-1 block truncate text-[10px] text-slate-400">{profile.title}</span>
          </span>
          <span className="hidden text-[10px] text-slate-500 lg:block">⌘</span>
        </NavLink>
      </div>
    </aside>
  );
}
