import React, { useState } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  RefreshCw,
  FolderGit2,
  GitBranch,
} from 'lucide-react';
import { BackendStatus } from '../common/BackendStatus';
import { MockDataBadge } from '../pqc/MockDataBadge';

interface TopHeaderProps {
  pageTitle: string;
  projectName?: string;
  branchName?: string;
  onRefreshScan?: () => void;
  isRefreshing?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  pageTitle,
  projectName = 'Enterprise-Core-Services',
  branchName = 'main',
  onRefreshScan,
  isRefreshing = false,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifications = [
    {
      id: 1,
      title: 'Quantum Vulnerability in Auth Module',
      desc: 'RSA-2048 key exchange requires FIPS 203 migration.',
      time: '12m ago',
    },
    {
      id: 2,
      title: 'Scan SCAN-001 Queued',
      desc: 'Scheduled AST worker ingestion started.',
      time: '45m ago',
    },
  ];

  return (
    <header className="app-header">
      {/* Left: Page Title & Current Project Context */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-bold text-slate-100 tracking-tight whitespace-nowrap">
          {pageTitle}
        </h1>

        <span className="text-slate-600 hidden sm:inline">/</span>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
          <FolderGit2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
          <span className="font-semibold truncate max-w-[140px] md:max-w-[200px]">{projectName}</span>
          <span className="text-slate-500">•</span>
          <GitBranch className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span className="font-mono text-slate-300 text-[11px]">{branchName}</span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden lg:flex items-center w-72 mx-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets, algorithms, scans..."
            className="w-full pl-8 pr-10 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-teal-400 transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.5 rounded text-[9px] font-mono bg-slate-700 text-slate-400 border border-slate-600">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Controls & Profile */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Single Subtle Platform Badge */}
        <MockDataBadge size="sm" />

        {/* Backend Status */}
        <BackendStatus variant="pill" />

        {/* Refresh button */}
        {onRefreshScan && (
          <button
            onClick={onRefreshScan}
            disabled={isRefreshing}
            className="btn-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1.5 rounded-lg text-slate-300"
            title="Refresh repository telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            <span className="hidden md:inline">{isRefreshing ? 'Scanning' : 'Sync'}</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-teal-400" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-semibold text-slate-200">
                <span>Security Alerts</span>
                <span className="text-[10px] text-teal-400 bg-teal-950/60 px-1.5 py-0.5 rounded">2 unread</span>
              </div>
              <div className="divide-y divide-slate-800/80 my-1 text-xs">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2">
                    <div className="font-medium text-slate-200">{n.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{n.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-[10px]">
              SO
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2.5 z-50 text-xs animate-in fade-in">
              <div className="px-2 py-1 border-b border-slate-800 mb-1">
                <div className="font-semibold text-slate-200">Security Officer</div>
                <div className="text-[10px] text-slate-400">analyst@pqc-sentinel.local</div>
              </div>
              <div className="space-y-0.5 text-slate-300">
                <div className="px-2 py-1 hover:bg-slate-800 rounded cursor-pointer">Compliance Logs</div>
                <div className="px-2 py-1 hover:bg-slate-800 rounded cursor-pointer">Scanner Engine</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
