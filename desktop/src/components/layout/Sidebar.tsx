import React from 'react';
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

export type NavPage = 'dashboard' | 'projects' | 'scans' | 'findings' | 'pqc' | 'inventory' | 'reports' | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const navItems = [
    { id: 'dashboard' as NavPage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects' as NavPage, label: 'Projects', icon: FolderGit2 },
    { id: 'scans' as NavPage, label: 'Scans', icon: Scan },
    { id: 'findings' as NavPage, label: 'Findings', icon: Bug },
    { id: 'pqc' as NavPage, label: 'PQC Overview', icon: Atom },
    { id: 'inventory' as NavPage, label: 'Crypto Inventory', icon: Cpu },
    { id: 'reports' as NavPage, label: 'Reports', icon: FileBarChart },
  ];

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-sidebar)',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 50,
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.12)',
      }}
    >
      {/* Brand Header */}
      <div>
        <div
          style={{
            padding: '24px 20px 20px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2A9D8F 0%, #1d6e64 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(42, 157, 143, 0.4)',
            }}
          >
            <ShieldCheck size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
              PQC Sentinel
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-on-dark-muted)', letterSpacing: '0.04em' }}>
              ENTERPRISE SECURITY
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav style={{ padding: '16px 12px' }}>
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#8b9bb4',
              padding: '0 12px 8px 12px',
            }}
          >
            Security Modules
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? 'rgba(42, 157, 143, 0.18)' : 'transparent',
                    color: isActive ? '#5eead4' : '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#cbd5e1';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon
                      size={17}
                      color={isActive ? 'var(--color-secondary)' : '#94a3b8'}
                      style={{ flexShrink: 0 }}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.id === 'pqc' && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--color-secondary)',
                        color: '#ffffff',
                      }}
                    >
                      PQC
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <button
          onClick={() => onNavigate('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '9px 14px',
            borderRadius: '8px',
            border: 'none',
            background: currentPage === 'settings' ? 'rgba(42, 157, 143, 0.18)' : 'transparent',
            color: currentPage === 'settings' ? '#5eead4' : '#94a3b8',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 'settings') {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }
          }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>

        {/* Engine status indicator */}
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'var(--color-secondary)',
                display: 'inline-block',
              }}
            />
            <span>Engine Ready</span>
          </div>
          <span style={{ fontSize: '10px', opacity: 0.7 }}>v0.8.4</span>
        </div>
      </div>
    </aside>
  );
};
