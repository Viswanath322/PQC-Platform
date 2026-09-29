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
} from 'lucide-react';

export type NavPage = 'dashboard' | 'projects' | 'scans' | 'findings' | 'pqc' | 'inventory' | 'reports' | 'settings';

interface FloatingGlassNavbarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}

export const FloatingGlassNavbar: React.FC<FloatingGlassNavbarProps> = ({
  currentPage,
  onNavigate,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const navItems = [
    { id: 'dashboard' as NavPage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects' as NavPage, label: 'Projects', icon: FolderGit2 },
    { id: 'scans' as NavPage, label: 'Scans', icon: Scan },
    { id: 'findings' as NavPage, label: 'Findings', icon: Bug },
    { id: 'pqc' as NavPage, label: 'PQC', icon: Atom },
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
        width: isHovered ? '236px' : '72px',
        background: isHovered ? 'rgba(255, 255, 255, 0.62)' : 'rgba(255, 255, 255, 0.48)',
        backdropFilter: 'blur(28px) saturate(120%)',
        WebkitBackdropFilter: 'blur(28px) saturate(120%)',
        border: '1px solid rgba(255, 255, 255, 0.55)',
        boxShadow: isHovered
          ? '0 22px 60px rgba(41, 40, 36, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.75)'
          : '0 18px 50px rgba(41, 40, 36, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
        borderRadius: '24px',
        padding: '18px 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 100,
        transition: 'width 240ms cubic-bezier(.22, 1, .36, 1), box-shadow 240ms ease, backdrop-filter 240ms ease, background 240ms ease',
        overflow: 'hidden',
        boxSizing: 'border-box',
        maxHeight: 'calc(100vh - 80px)',
      }}
      aria-label="Floating Glass Navigation"
    >
      {/* Top Brand & Navigation Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
          {/* Logo Mark: Monochrome Graphite Line Mark */}
          <div
            style={{
              width: '38px',
              height: '38px',
              minWidth: '38px',
              borderRadius: '12px',
              background: 'var(--color-graphite)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(41, 40, 36, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={20} color="#ffffff" strokeWidth={2} />
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
                color: 'var(--color-graphite)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              PQC Security
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Assessment
            </div>
          </div>
        </div>

        {/* Subtle Separator */}
        <div
          style={{
            height: '1px',
            background: 'rgba(41, 40, 36, 0.08)',
            margin: '0 4px',
          }}
        />

        {/* Nav Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
                    ? 'rgba(120, 135, 119, 0.16)'
                    : 'transparent',
                  boxShadow: isActive ? 'inset 0 1px 0 rgba(255, 255, 255, 0.5)' : 'none',
                  color: 'var(--color-graphite)',
                  cursor: 'pointer',
                  transition: 'background 160ms ease',
                  position: 'relative',
                  outline: 'none',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(41, 40, 36, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {/* Active Indicator: Subtle Muted Sage Pill */}
                <div
                  style={{
                    position: 'absolute',
                    left: '2px',
                    width: '3px',
                    height: isActive ? '20px' : '0px',
                    borderRadius: '2px',
                    background: 'var(--color-muted-sage)',
                    transition: 'height 180ms ease',
                  }}
                />

                {/* Monochrome Line Icon */}
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
                    color: 'var(--color-graphite)',
                  }}
                >
                  <Icon
                    size={19}
                    color="var(--color-graphite)"
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </div>

                {/* Text Label */}
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
                    color: 'var(--color-graphite)',
                    flex: 1,
                  }}
                >
                  {item.label}
                </div>

                {/* Subtle Sage Dot / Indicator in Expanded State */}
                {isHovered && isActive && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--color-muted-sage)',
                      marginRight: '6px',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        <div
          style={{
            height: '1px',
            background: 'rgba(41, 40, 36, 0.08)',
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
              ? 'rgba(120, 135, 119, 0.16)'
              : 'transparent',
            boxShadow: currentPage === 'settings' ? 'inset 0 1px 0 rgba(255, 255, 255, 0.5)' : 'none',
            color: 'var(--color-graphite)',
            cursor: 'pointer',
            transition: 'background 160ms ease',
            position: 'relative',
            outline: 'none',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 'settings') {
              e.currentTarget.style.background = 'rgba(41, 40, 36, 0.05)';
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
              width: '3px',
              height: currentPage === 'settings' ? '20px' : '0px',
              borderRadius: '2px',
              background: 'var(--color-muted-sage)',
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
            }}
          >
            <Settings
              size={19}
              color="var(--color-graphite)"
              strokeWidth={currentPage === 'settings' ? 2.2 : 1.8}
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
              color: 'var(--color-graphite)',
            }}
          >
            Settings
          </div>
        </button>
      </div>
    </nav>
  );
};
