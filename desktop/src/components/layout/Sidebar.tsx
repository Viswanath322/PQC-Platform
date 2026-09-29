import React, { useState } from 'react';
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
  const [isHovered, setIsHovered] = useState(false);

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: isHovered ? '230px' : '72px',
        maxHeight: 'calc(100vh - 48px)',
        background: isHovered ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.52)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        border: '1px solid rgba(255, 255, 255, 0.65)',
        boxShadow: isHovered
          ? '0 20px 48px rgba(36, 52, 71, 0.16)'
          : '0 16px 40px rgba(36, 52, 71, 0.12)',
        borderRadius: '22px',
        padding: '18px 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 100,
        transition: 'width 220ms ease, backdrop-filter 220ms ease, box-shadow 220ms ease, background 220ms ease',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
      aria-label="Floating Application Navigation"
    >
      {/* Top Header / Brand Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '6px 8px',
            height: '42px',
            boxSizing: 'border-box',
          }}
        >
          {/* Logo Icon */}
          <div
            style={{
              width: '36px',
              height: '36px',
              minWidth: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #243447 0%, #1a2736 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(36, 52, 71, 0.25)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={20} color="#2A9D8F" />
          </div>

          {/* Expanded Brand Name */}
          <div
            style={{
              opacity: isHovered ? 1 : 0,
              visibility: isHovered ? 'visible' : 'hidden',
              transform: isHovered ? 'translateX(0)' : 'translateX(-8px)',
              transition: 'opacity 180ms ease, transform 180ms ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--color-primary)',
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
                color: 'var(--text-muted)',
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
            background: 'rgba(36, 52, 71, 0.08)',
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
                  height: '42px',
                  padding: '0 8px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive
                    ? 'rgba(42, 157, 143, 0.14)'
                    : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'background 160ms ease, color 160ms ease',
                  position: 'relative',
                  outline: 'none',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(36, 52, 71, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {/* Active Indicator Strip / Dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '2px',
                    width: '3.5px',
                    height: isActive ? '20px' : '0px',
                    borderRadius: '2px',
                    background: 'var(--color-secondary)',
                    transition: 'height 180ms ease',
                  }}
                />

                {/* Icon Container with subtle active pill */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    borderRadius: '8px',
                    background: isActive ? 'rgba(42, 157, 143, 0.18)' : 'transparent',
                  }}
                >
                  <Icon
                    size={19}
                    color={isActive ? 'var(--color-secondary)' : '#475569'}
                    strokeWidth={isActive ? 2.2 : 1.9}
                  />
                </div>

                {/* Text Label (visible when hovered) */}
                <div
                  style={{
                    opacity: isHovered ? 1 : 0,
                    visibility: isHovered ? 'visible' : 'hidden',
                    transform: isHovered ? 'translateX(0)' : 'translateX(-6px)',
                    transition: 'opacity 180ms ease, transform 180ms ease',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--color-primary)' : 'var(--text-primary)',
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

      {/* Bottom Section: Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
        <div
          style={{
            height: '1px',
            background: 'rgba(36, 52, 71, 0.08)',
            margin: '0 4px',
          }}
        />

        <button
          onClick={() => onNavigate('settings')}
          title={!isHovered ? 'Settings' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            height: '42px',
            padding: '0 8px',
            borderRadius: '12px',
            border: 'none',
            background: currentPage === 'settings'
              ? 'rgba(42, 157, 143, 0.14)'
              : 'transparent',
            color: currentPage === 'settings' ? 'var(--color-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'background 160ms ease, color 160ms ease',
            position: 'relative',
            outline: 'none',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 'settings') {
              e.currentTarget.style.background = 'rgba(36, 52, 71, 0.06)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 'settings') {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {/* Active Indicator for Settings */}
          <div
            style={{
              position: 'absolute',
              left: '2px',
              width: '3.5px',
              height: currentPage === 'settings' ? '20px' : '0px',
              borderRadius: '2px',
              background: 'var(--color-secondary)',
              transition: 'height 180ms ease',
            }}
          />

          <div
            style={{
              width: '36px',
              height: '36px',
              minWidth: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              borderRadius: '8px',
              background: currentPage === 'settings' ? 'rgba(42, 157, 143, 0.18)' : 'transparent',
            }}
          >
            <Settings
              size={19}
              color={currentPage === 'settings' ? 'var(--color-secondary)' : '#64748b'}
              strokeWidth={1.9}
            />
          </div>

          <div
            style={{
              opacity: isHovered ? 1 : 0,
              visibility: isHovered ? 'visible' : 'hidden',
              transform: isHovered ? 'translateX(0)' : 'translateX(-6px)',
              transition: 'opacity 180ms ease, transform 180ms ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              fontSize: '13px',
              fontWeight: currentPage === 'settings' ? 600 : 500,
              color: 'var(--text-primary)',
            }}
          >
            Settings
          </div>
        </button>
      </div>
    </nav>
  );
};
