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
          color: 'var(--color-graphite)',
          bgColor: isActive ? 'rgba(41, 40, 36, 0.08)' : 'rgba(255, 255, 255, 0.52)',
          borderColor: isActive ? 'var(--color-graphite)' : 'rgba(41, 40, 36, 0.18)',
          indicatorBg: 'rgba(41, 40, 36, 0.09)',
          icon: <ShieldAlert size={20} color="var(--color-graphite)" strokeWidth={2} />,
          badgeBg: 'rgba(41, 40, 36, 0.08)',
          badgeColor: 'var(--color-graphite)',
        };
      case 'MEDIUM':
        return {
          title: 'MEDIUM QUANTUM RISK',
          color: 'var(--color-risk-medium)',
          bgColor: isActive ? 'rgba(140, 106, 56, 0.10)' : 'rgba(255, 255, 255, 0.52)',
          borderColor: isActive ? 'var(--color-risk-medium)' : 'rgba(140, 106, 56, 0.22)',
          indicatorBg: 'rgba(140, 106, 56, 0.10)',
          icon: <AlertTriangle size={20} color="var(--color-risk-medium)" strokeWidth={2} />,
          badgeBg: 'rgba(140, 106, 56, 0.10)',
          badgeColor: 'var(--color-risk-medium)',
        };
      case 'LOW':
        return {
          title: 'LOW QUANTUM RISK',
          color: 'var(--color-muted-sage)',
          bgColor: isActive ? 'rgba(120, 135, 119, 0.14)' : 'rgba(255, 255, 255, 0.52)',
          borderColor: isActive ? 'var(--color-muted-sage)' : 'rgba(120, 135, 119, 0.25)',
          indicatorBg: 'rgba(120, 135, 119, 0.12)',
          icon: <ShieldCheck size={20} color="var(--color-muted-sage)" strokeWidth={2} />,
          badgeBg: 'rgba(120, 135, 119, 0.12)',
          badgeColor: 'var(--color-muted-sage)',
        };
    }
  };

  const theme = getCardTheme();

  return (
    <div
      onClick={onClick}
      className="glass-panel"
      style={{
        padding: '22px 24px',
        cursor: onClick ? 'pointer' : 'default',
        borderColor: theme.borderColor,
        borderWidth: isActive ? '1.5px' : '1px',
        backgroundColor: theme.bgColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '144px',
        position: 'relative',
        overflow: 'hidden',
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
                letterSpacing: '-0.03em',
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

        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: theme.indicatorBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.45)',
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
          <span style={{ fontSize: '12px', color: 'var(--color-muted-sage)', fontWeight: 600 }}>
            Filter →
          </span>
        )}
      </div>
    </div>
  );
};
