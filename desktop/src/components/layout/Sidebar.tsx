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
  Activity,
} from 'lucide-react';

export type NavPage = 'dashboard' | 'projects' | 'scans' | 'findings' | 'pqc' | 'inventory' | 'reports' | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  isHovered: boolean;
  onHoverChange: (hovered: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isHovered,
  onHoverChange,
}) => {
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
    <nav
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      style={{
        position: 'fixed',
        left: '20px',
        top: '24px',
        bottom: '24px',
        height: 'calc(100vh - 48px)',
        width: isHovered ? '240px' : '76px',
        background: isHovered ? 'rgba(24, 35, 52, 0.88)' : 'rgba(18, 27, 40, 0.78)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: isHovered
          ? '0 20px 48px rgba(0, 0, 0, 0.5)'
          : '0 16px 40px rgba(0, 0, 0, 0.35)',
        borderRadius: '24px',
        padding: '20px 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 100,
        transition: 'width 240ms cubic-bezier(0.2, 0, 0, 1), background 240ms ease, box-shadow 240ms ease, backdrop-filter 240ms ease',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
      aria-label="Floating Application Navigation"
    >
      {/* Top Header & Navigation Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '4px 6px',
            height: '46px',
            boxSizing: 'border-box',
          }}
        >
          {/* Logo Icon */}
          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e2d3e 0%, #15202d 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} color="#2A9D8F" />
          </div>

          {/* Expanded Brand Name */}
          <div
            style={{
              opacity: isHovered ? 1 : 0,
              visibility: isHovered ? 'visible' : 'hidden',
              transform: isHovered ? 'translateX(0)' : 'translateX(-8px)',
              transition: 'opacity 200ms ease, transform 200ms ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: '14.5px',
                fontWeight: 700,
                color: '#f8fafc',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              PQC Security
            </div>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                color: '#94a3b8',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Assessment
            </div>
          </div>
        </div>

        {/* Separator */}
        <div
          style={{
            height: '1px',
            background: 'rgba(255, 255, 255, 0.08)',
            margin: '0 4px',
          }}
        />

        {/* Navigation Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={!isHovered ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  height: '44px',
                  padding: '0 8px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive
                    ? 'rgba(42, 157, 143, 0.2)'
                    : 'transparent',
                  color: isActive ? '#5eead4' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'background 160ms ease, color 160ms ease',
                  position: 'relative',
                  outline: 'none',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.color = '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                {/* Active Indicator Strip */}
                <div
                  style={{
                    position: 'absolute',
                    left: '2px',
                    width: '3.5px',
                    height: isActive ? '22px' : '0px',
                    borderRadius: '2px',
                    background: 'var(--color-secondary)',
                    transition: 'height 180ms ease',
                  }}
                />

                {/* Icon Container with subtle active pill */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    minWidth: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    borderRadius: '10px',
                    background: isActive ? 'rgba(42, 157, 143, 0.22)' : 'transparent',
                  }}
                >
                  <Icon
                    size={20}
                    color={isActive ? '#5eead4' : '#94a3b8'}
                    strokeWidth={isActive ? 2.2 : 1.9}
                  />
                </div>

                {/* Text Label (revealed on hover) */}
                <div
                  style={{
                    opacity: isHovered ? 1 : 0,
                    visibility: isHovered ? 'visible' : 'hidden',
                    transform: isHovered ? 'translateX(0)' : 'translateX(-6px)',
                    transition: 'opacity 200ms ease, transform 200ms ease',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    fontSize: '13.5px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#5eead4' : '#e2e8f0',
                    flex: 1,
                  }}
                >
                  {item.label}
                </div>

                {/* PQC Highlight Badge in expanded state */}
                {isHovered && item.id === 'pqc' && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'var(--color-secondary)',
                      color: '#ffffff',
                      marginRight: '4px',
                    }}
                  >
                    PQC
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Settings & Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            height: '1px',
            background: 'rgba(255, 255, 255, 0.08)',
            margin: '0 4px',
          }}
        />

        {/* Settings button */}
        <button
          onClick={() => onNavigate('settings')}
          title={!isHovered ? 'Settings' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            height: '44px',
            padding: '0 8px',
            borderRadius: '12px',
            border: 'none',
            background: currentPage === 'settings'
              ? 'rgba(42, 157, 143, 0.2)'
              : 'transparent',
            color: currentPage === 'settings' ? '#5eead4' : '#94a3b8',
            cursor: 'pointer',
            transition: 'background 160ms ease, color 160ms ease',
            position: 'relative',
            outline: 'none',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 'settings') {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#f1f5f9';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 'settings') {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }
          }}
        >
          {/* Active Indicator for Settings */}
          <div
            style={{
              position: 'absolute',
              left: '2px',
              width: '3.5px',
              height: currentPage === 'settings' ? '22px' : '0px',
              borderRadius: '2px',
              background: 'var(--color-secondary)',
              transition: 'height 180ms ease',
            }}
          />

          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              borderRadius: '10px',
              background: currentPage === 'settings' ? 'rgba(42, 157, 143, 0.22)' : 'transparent',
            }}
          >
            <Settings
              size={20}
              color={currentPage === 'settings' ? '#5eead4' : '#94a3b8'}
              strokeWidth={1.9}
            />
          </div>

          <div
            style={{
              opacity: isHovered ? 1 : 0,
              visibility: isHovered ? 'visible' : 'hidden',
              transform: isHovered ? 'translateX(0)' : 'translateX(-6px)',
              transition: 'opacity 200ms ease, transform 200ms ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              fontSize: '13.5px',
              fontWeight: currentPage === 'settings' ? 600 : 500,
              color: '#e2e8f0',
            }}
          >
            Settings
          </div>
        </button>

        {/* Engine Status / Micro-Badge */}
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflow: 'hidden',
            minHeight: '38px',
            boxSizing: 'border-box',
          }}
          title="PQC Sentinel AST Analyzer v0.8.4"
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Activity size={14} color="#5eead4" />
          </div>

          <div
            style={{
              opacity: isHovered ? 1 : 0,
              visibility: isHovered ? 'visible' : 'hidden',
              transform: isHovered ? 'translateX(0)' : 'translateX(-6px)',
              transition: 'opacity 200ms ease, transform 200ms ease',
              whiteSpace: 'nowrap',
              fontSize: '11px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Sentinel Engine</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>v0.8.4</span>
          </div>
        </div>
      </div>
    </nav>
  );
};
