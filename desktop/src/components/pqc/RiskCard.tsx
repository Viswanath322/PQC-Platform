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
          color: '#252522', // Graphite numbers, not loud red
          bgColor: isActive ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.58)',
          borderColor: isActive ? '#2B2B28' : 'rgba(255, 255, 255, 0.8)',
          indicatorBg: 'rgba(43, 43, 40, 0.06)',
          icon: <ShieldAlert size={20} color="#3D3535" />,
          accentTag: 'rgba(61, 53, 53, 0.08)',
        };
      case 'MEDIUM':
        return {
          title: 'MEDIUM QUANTUM RISK',
          color: '#252522', // Graphite numbers
          bgColor: isActive ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.58)',
          borderColor: isActive ? '#C89B55' : 'rgba(255, 255, 255, 0.8)',
          indicatorBg: 'rgba(200, 155, 85, 0.12)',
          icon: <AlertTriangle size={20} color="#C89B55" />,
          accentTag: 'rgba(200, 155, 85, 0.1)',
        };
      case 'LOW':
        return {
          title: 'LOW QUANTUM RISK',
          color: '#252522', // Graphite numbers
          bgColor: isActive ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.58)',
          borderColor: isActive ? '#718071' : 'rgba(255, 255, 255, 0.8)',
          indicatorBg: 'rgba(113, 128, 113, 0.12)',
          icon: <ShieldCheck size={20} color="#718071" />,
          accentTag: 'rgba(113, 128, 113, 0.1)',
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
        boxShadow: isActive
          ? '0 12px 36px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1)'
          : '0 8px 28px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
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
                fontWeight: 600,
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
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: theme.indicatorBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.8)',
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
          <span style={{ fontSize: '11.5px', color: '#718071', fontWeight: 600 }}>
            Filter →
          </span>
        )}
      </div>
    </div>
  );
};
