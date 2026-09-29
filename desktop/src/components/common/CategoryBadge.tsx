import React from 'react';
import { Code, KeyRound, Package, Sliders } from 'lucide-react';
import type { FindingCategory } from '../../types';

interface CategoryBadgeProps {
  category: FindingCategory | string;
  size?: 'sm' | 'md';
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = 'md',
}) => {
  const norm = (category || 'SAST').toUpperCase();

  const config = {
    SAST: {
      label: 'SAST Code',
      icon: Code,
      bg: 'rgba(59, 130, 246, 0.14)',
      border: 'rgba(59, 130, 246, 0.3)',
      text: '#93c5fd',
      iconColor: '#60a5fa',
    },
    CRYPTO: {
      label: 'Cryptographic',
      icon: KeyRound,
      bg: 'rgba(168, 85, 247, 0.14)',
      border: 'rgba(168, 85, 247, 0.3)',
      text: '#d8b4fe',
      iconColor: '#c084fc',
    },
    DEPENDENCY: {
      label: 'Dependency',
      icon: Package,
      bg: 'rgba(14, 165, 233, 0.14)',
      border: 'rgba(14, 165, 233, 0.3)',
      text: '#7dd3fc',
      iconColor: '#38bdf8',
    },
    CONFIGURATION: {
      label: 'Configuration',
      icon: Sliders,
      bg: 'rgba(234, 179, 8, 0.14)',
      border: 'rgba(234, 179, 8, 0.3)',
      text: '#fde047',
      iconColor: '#facc15',
    },
  }[norm] || {
    label: category,
    icon: Code,
    bg: 'rgba(148, 163, 184, 0.14)',
    border: 'rgba(148, 163, 184, 0.3)',
    text: '#cbd5e1',
    iconColor: '#94a3b8',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md ${
        size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
      }`}
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text,
      }}
    >
      <Icon size={size === 'sm' ? 12 : 13} color={config.iconColor} />
      <span>{config.label}</span>
    </span>
  );
};
