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
          color: 'var(--color-risk-high)',
          bgColor: 'rgba(239, 68, 68, 0.12)',
          borderColor: isActive ? 'var(--color-risk-high)' : 'rgba(239, 68, 68, 0.28)',
          indicatorBg: 'rgba(239, 68, 68, 0.16)',
          icon: <ShieldAlert size={22} color="var(--color-risk-high)" />,
        };
      case 'MEDIUM':
        return {
          title: 'MEDIUM QUANTUM RISK',
          color: 'var(--color-accent-dark)',
          bgColor: 'rgba(233, 162, 59, 0.12)',
          borderColor: isActive ? 'var(--color-accent)' : 'rgba(233, 162, 59, 0.3)',
          indicatorBg: 'rgba(233, 162, 59, 0.16)',
          icon: <AlertTriangle size={22} color="var(--color-accent-dark)" />,
        };
      case 'LOW':
        return {
          title: 'LOW QUANTUM RISK',
          color: '#5eead4',
          bgColor: 'rgba(42, 157, 143, 0.12)',
          borderColor: isActive ? 'var(--color-secondary)' : 'rgba(42, 157, 143, 0.28)',
          indicatorBg: 'rgba(42, 157, 143, 0.16)',
          icon: <ShieldCheck size={22} color="#5eead4" />,
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
                fontSize: '32px',
                fontWeight: 700,
                color: theme.color,
                lineHeight: 1.1,
                fontFeatureSettings: '"tnum"',
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
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: theme.indicatorBg,
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
          <span style={{ fontSize: '11.5px', color: '#5eead4', fontWeight: 600 }}>
            Filter →
          </span>
        )}
      </div>
    </div>
  );
};
