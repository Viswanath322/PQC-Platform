import React, { useState } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  RefreshCw,
  FolderGit2,
  GitBranch,
  LogOut,
} from 'lucide-react';
import { BackendStatus } from '../common/BackendStatus';
import { useAuth } from '../../context/AuthContext';

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
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Derive display initials from real user data
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const emailDisplay = user?.email || '';

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
        <h1
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#29384D',
            letterSpacing: '-0.01em',
            margin: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {pageTitle}
        </h1>

        <span style={{ color: '#cbd5e1' }} className="hidden sm:inline">/</span>

        {/* Project & Branch Glass Pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
          style={{
            background: 'rgba(255, 255, 255, 0.70)',
            border: '1px solid rgba(226, 232, 240, 0.90)',
            boxShadow: '0 1px 3px rgba(41, 56, 77, 0.04)',
          }}
        >
          <FolderGit2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" style={{ color: '#2A9D8F' }} />
          <span style={{ fontWeight: 600, color: '#29384D' }} className="truncate max-w-[140px] md:max-w-[200px]">
            {projectName}
          </span>
          <span style={{ color: '#94a3b8' }}>•</span>
          <GitBranch className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#687587' }}>
            {branchName}
          </span>
        </div>
      </div>

      {/* Center: Global Search Bar in Glass Pill */}
      <div className="hidden lg:flex items-center w-72 mx-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets, algorithms, scans..."
            className="w-full pl-8 pr-10 py-1.5 rounded-full text-xs placeholder-slate-400"
            style={{
              background: 'rgba(255, 255, 255, 0.75)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              color: '#29384D',
            }}
          />
          <kbd
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] font-mono border"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              borderColor: 'rgba(226, 232, 240, 0.9)',
              color: '#687587',
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Controls & Profile */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Backend Status */}
        <BackendStatus variant="pill" />

        {/* Refresh button */}
        {onRefreshScan && (
          <button
            onClick={onRefreshScan}
            disabled={isRefreshing}
            className="btn-secondary-glass"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            title="Refresh repository telemetry"
          >
            <RefreshCw
              size={13}
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                color: '#2A9D8F',
              }}
            />
            <span className="hidden md:inline">{isRefreshing ? 'Scanning' : 'Sync'}</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 transition-colors relative"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
            }}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span
              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
              style={{ background: '#2A9D8F' }}
            />
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-2xl shadow-xl p-3.5 z-50 animate-in fade-in"
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                boxShadow: '0 12px 36px rgba(41, 56, 77, 0.12)',
              }}
            >
              <div
                className="flex items-center justify-between pb-2 text-xs font-semibold"
                style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.8)', color: '#29384D' }}
              >
                <span>Security Alerts</span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(42, 157, 143, 0.12)', color: '#237F74' }}
                >
                  2 unread
                </span>
              </div>
              <div className="divide-y divide-slate-100 my-1 text-xs">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2.5">
                    <div style={{ fontWeight: 600, color: '#29384D' }}>{n.title}</div>
                    <div style={{ fontSize: '11px', color: '#687587', marginTop: '2px' }}>{n.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu — shows real user name/email from AuthContext */}
        <div className="relative">
          <button
            id="user-menu-trigger"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-1.5 p-1 rounded-lg transition-colors"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
            }}
            aria-label="User menu"
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px]"
              style={{
                background: 'rgba(42, 157, 143, 0.15)',
                border: '1px solid rgba(42, 157, 143, 0.25)',
                color: '#237F74',
              }}
            >
              {initials}
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl shadow-xl p-2.5 z-50 text-xs animate-in fade-in"
              style={{
                background: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                boxShadow: '0 12px 36px rgba(41, 56, 77, 0.12)',
              }}
            >
              {/* Real user identity */}
              <div
                className="px-2 py-1.5 mb-1"
                style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}
              >
                <div style={{ fontWeight: 600, color: '#29384D' }}>{displayName}</div>
                <div style={{ fontSize: '10px', color: '#687587', marginTop: 2 }}>{emailDisplay}</div>
                {user?.role && (
                  <div
                    className="inline-block mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                    style={{
                      background: 'rgba(42,157,143,0.10)',
                      color: '#237F74',
                      border: '1px solid rgba(42,157,143,0.18)',
                    }}
                  >
                    {user.role}
                  </div>
                )}
              </div>

              <div className="space-y-0.5" style={{ color: '#475569' }}>
                <div className="px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">Compliance Logs</div>
                <div className="px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">Scanner Engine</div>
              </div>

              {/* Sign Out */}
              <div style={{ borderTop: '1px solid rgba(226, 232, 240, 0.8)', marginTop: 4, paddingTop: 4 }}>
                <button
                  id="sign-out-btn"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-red-50 transition-colors"
                  style={{ color: '#dc2626', fontSize: 12 }}
                >
                  <LogOut size={12} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
