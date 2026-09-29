import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  FolderGit2,
  Scan,
  Bug,
  Atom,
  FileBarChart,
  Settings,
  Cpu,
} from 'lucide-react';
import { BackendStatus } from '../common/BackendStatus';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderGit2 },
    { to: '/scans', label: 'Scans', icon: Scan },
    { to: '/findings', label: 'Findings', icon: Bug },
    { to: '/pqc', label: 'PQC Assessment', icon: Atom, highlight: 'PQC' },
    { to: '/crypto-inventory', label: 'Crypto Inventory', icon: Cpu },
    { to: '/reports', label: 'Reports', icon: FileBarChart },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="app-sidebar" aria-label="Main Application Navigation">
      {/* Top Header & Brand */}
      <div className="flex flex-col gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-1.5 h-12">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-sm flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-100 tracking-tight leading-tight truncate">
                PQC Sentinel
              </span>
              <span className="text-[9.5px] font-semibold text-teal-400 font-mono bg-teal-950/60 px-1.5 py-0.2 rounded border border-teal-800/40">
                v0.8.4
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
              Security Assessment
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-slate-800/80 mx-1 my-1" />

        {/* Nav Links */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 relative group ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active Accent Left Bar */}
                    <div
                      className={`absolute left-0 w-1 rounded-r-full bg-teal-400 transition-all duration-200 ${
                        isActive ? 'h-5' : 'h-0'
                      }`}
                    />

                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive ? 'text-teal-300' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />

                    <span className="truncate flex-1">{item.label}</span>

                    {item.highlight && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/25 text-teal-300">
                        {item.highlight}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status & Profile Area */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
        {/* Backend Connection Widget */}
        <BackendStatus variant="sidebar" />

        {/* User Profile Card */}
        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/70 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-teal-400 font-semibold text-xs flex-shrink-0">
            SO
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-200 truncate leading-tight">
              SecOfficer
            </span>
            <span className="text-[10.5px] text-slate-400 truncate leading-tight">
              Air-Gapped Auditor
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
