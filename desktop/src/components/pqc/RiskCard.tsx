import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { RiskLevel } from '../../types/pqc';

interface RiskCardProps {
  level: RiskLevel;
  count: number;
  label: string;
  subtext: string;
  percentage?: number;
  onClick?: () => void;
  isActive?: boolean;
}

export const RiskCard: React.FC<RiskCardProps> = ({
  level,
  count,
  label,
  subtext,
  percentage,
  onClick,
  isActive = false,
}) => {
  const getCardTheme = () => {
    switch (level) {
      case 'HIGH':
        return {
          title: 'HIGH QUANTUM RISK',
          color: '#ff8585',
          bgColor: 'rgba(255, 107, 107, 0.12)',
          borderColor: isActive ? '#ff6b6b' : 'rgba(255, 107, 107, 0.3)',
          indicatorBg: 'rgba(255, 107, 107, 0.22)',
          icon: <ShieldAlert size={22} color="#ff8585" />,
        };
      case 'MEDIUM':
        return {
          title: 'MEDIUM QUANTUM RISK',
          color: '#fcd34d',
          bgColor: 'rgba(233, 162, 59, 0.12)',
          borderColor: isActive ? 'var(--color-accent)' : 'rgba(233, 162, 59, 0.3)',
          indicatorBg: 'rgba(233, 162, 59, 0.22)',
          icon: <AlertTriangle size={22} color="#fcd34d" />,
        };
      case 'LOW':
        return {
          title: 'LOW QUANTUM RISK',
          color: '#6ee7b7',
          bgColor: 'rgba(42, 157, 143, 0.12)',
          borderColor: isActive ? 'var(--color-secondary)' : 'rgba(42, 157, 143, 0.3)',
          indicatorBg: 'rgba(42, 157, 143, 0.22)',
          icon: <ShieldCheck size={22} color="#6ee7b7" />,
        };
    }
  };

  const theme = getCardTheme();

  return (
    <div
      onClick={onClick}
      className="glass-panel"
      style={{
        padding: '20px 24px',
        cursor: onClick ? 'pointer' : 'default',
        borderColor: theme.borderColor,
        borderWidth: isActive ? '2px' : '1px',
        backgroundColor: isActive ? theme.bgColor : undefined,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '140px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isActive
          ? 'inset 0 1px 1px rgba(255, 255, 255, 0.4), 0 12px 32px rgba(0, 0, 0, 0.35)'
          : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            {label || theme.title}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontSize: '34px',
                fontWeight: 700,
                color: theme.color,
                lineHeight: 1.1,
                fontFeatureSettings: '"tnum"',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
              }}
            >
              {count}
            </span>
            {percentage !== undefined && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                ({percentage}%)
              </span>
            )}
          </div>
        </div>

        {/* Circular Apple Quick Action Icon */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '9999px',
            background: theme.indicatorBg,
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 4px 12px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {theme.icon}
        </div>
      </div>

      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {subtext}
        </span>
        {onClick && (
          <span style={{ fontSize: '11.5px', color: '#6ee7b7', fontWeight: 600 }}>
            Filter →
          </span>
        )}
      </div>
    </div>
  );
};
