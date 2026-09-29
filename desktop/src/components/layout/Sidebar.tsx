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
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #243447 0%, #1a2736 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(36, 52, 71, 0.20)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={20} color="#2A9D8F" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#29384D', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                PQC Sentinel
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 600,
                  color: '#237F74',
                  fontFamily: 'JetBrains Mono, monospace',
                  background: 'rgba(42, 157, 143, 0.12)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid rgba(42, 157, 143, 0.25)',
                }}
              >
                v0.8.4
              </span>
            </div>
            <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#687587', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Security Assessment
            </span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ height: '1px', background: 'rgba(226, 232, 240, 0.9)', margin: '4px 2px' }} />

        {/* Nav Links */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 relative group"
                style={({ isActive }) => ({
                  background: isActive ? 'rgba(42, 157, 143, 0.14)' : 'transparent',
                  color: isActive ? '#237F74' : '#687587',
                  fontWeight: isActive ? 600 : 500,
                  border: '1px solid',
                  borderColor: isActive ? 'rgba(42, 157, 143, 0.22)' : 'transparent',
                })}
              >
                {({ isActive }) => (
                  <>
                    {/* Active Accent Left Bar */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '0px',
                        width: '3.5px',
                        height: isActive ? '20px' : '0px',
                        borderRadius: '0 4px 4px 0',
                        background: '#2A9D8F',
                        transition: 'height 160ms ease',
                      }}
                    />

                    <Icon
                      size={17}
                      color={isActive ? '#2A9D8F' : '#687587'}
                      strokeWidth={isActive ? 2.2 : 1.9}
                      className="flex-shrink-0 transition-colors"
                    />

                    <span className="truncate flex-1">{item.label}</span>

                    {item.highlight && (
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          background: 'rgba(42, 157, 143, 0.16)',
                          color: '#237F74',
                          border: '1px solid rgba(42, 157, 143, 0.25)',
                        }}
                      >
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
      <div className="flex flex-col gap-2.5 pt-3" style={{ borderTop: '1px solid rgba(226, 232, 240, 0.9)' }}>
        {/* Backend Connection Widget */}
        <BackendStatus variant="sidebar" />

        {/* User Profile Card */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.75)',
            border: '1px solid rgba(226, 232, 240, 0.85)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(41, 56, 77, 0.03)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(42, 157, 143, 0.12)',
              border: '1px solid rgba(42, 157, 143, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#237F74',
              fontWeight: 700,
              fontSize: '11.5px',
              flexShrink: 0,
            }}
          >
            SO
          </div>
          <div className="flex flex-col min-w-0">
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#29384D', lineHeight: 1.2 }} className="truncate">
              SecOfficer
            </span>
            <span style={{ fontSize: '11px', color: '#687587', lineHeight: 1.2 }} className="truncate">
              Air-Gapped Auditor
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
