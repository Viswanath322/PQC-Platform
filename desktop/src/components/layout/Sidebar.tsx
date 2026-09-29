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
        height: 'min(540px, calc(100vh - 48px))',
        width: isHovered ? '236px' : '72px',
        background: isHovered ? 'rgba(255, 255, 255, 0.68)' : 'rgba(255, 255, 255, 0.52)',
        backdropFilter: 'blur(30px) saturate(125%)',
        WebkitBackdropFilter: 'blur(30px) saturate(125%)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: isHovered
          ? '0 16px 44px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.95)'
          : '0 12px 40px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        borderRadius: '24px',
        padding: '16px 8px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 100,
        transition: 'width 260ms cubic-bezier(.22, 1, .36, 1), background 260ms ease, box-shadow 260ms ease',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
      aria-label="Floating Application Navigation"
    >
      {/* Top Header & Navigation Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '4px 6px',
            height: '42px',
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
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 #ffffff',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={20} color="#718071" />
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
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#252522',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              PQC Security
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 500,
                color: '#8B8C86',
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
            background: 'rgba(0, 0, 0, 0.05)',
            margin: '2px 4px',
          }}
        />

        {/* Navigation Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                    ? 'rgba(113, 128, 113, 0.12)'
                    : 'transparent',
                  color: isActive ? '#252522' : '#666762',
                  cursor: 'pointer',
                  transition: 'background 140ms ease, color 140ms ease',
                  position: 'relative',
                  outline: 'none',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.035)';
                    e.currentTarget.style.color = '#252522';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#666762';
                  }
                }}
              >
                {/* Active Indicator Strip */}
                <div
                  style={{
                    position: 'absolute',
                    left: '2px',
                    width: '3px',
                    height: isActive ? '20px' : '0px',
                    borderRadius: '2px',
                    background: '#718071',
                    transition: 'height 160ms ease',
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
                    background: isActive ? 'rgba(113, 128, 113, 0.16)' : 'transparent',
                  }}
                >
                  <Icon
                    size={19}
                    color={isActive ? '#718071' : '#666762'}
                    strokeWidth={isActive ? 2.1 : 1.8}
                  />
                </div>

                {/* Text Label (revealed on hover) */}
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
                    color: isActive ? '#252522' : '#666762',
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
                      background: 'rgba(113, 128, 113, 0.18)',
                      color: '#718071',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          style={{
            height: '1px',
            background: 'rgba(0, 0, 0, 0.05)',
            margin: '2px 4px',
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
              ? 'rgba(113, 128, 113, 0.12)'
              : 'transparent',
            color: currentPage === 'settings' ? '#252522' : '#666762',
            cursor: 'pointer',
            transition: 'background 140ms ease, color 140ms ease',
            position: 'relative',
            outline: 'none',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 'settings') {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.035)';
              e.currentTarget.style.color = '#252522';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 'settings') {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#666762';
            }
          }}
        >
          {/* Active Indicator for Settings */}
          <div
            style={{
              position: 'absolute',
              left: '2px',
              width: '3px',
              height: currentPage === 'settings' ? '20px' : '0px',
              borderRadius: '2px',
              background: '#718071',
              transition: 'height 160ms ease',
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
              background: currentPage === 'settings' ? 'rgba(113, 128, 113, 0.16)' : 'transparent',
            }}
          >
            <Settings
              size={19}
              color={currentPage === 'settings' ? '#718071' : '#666762'}
              strokeWidth={1.8}
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
              color: '#252522',
            }}
          >
            Settings
          </div>
        </button>
      </div>
    </nav>
  );
};
