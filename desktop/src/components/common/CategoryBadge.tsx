import React from 'react';
import { Code, KeyRound, Package, Sliders } from 'lucide-react';
import type { FindingCategory } from '../../types';
import { cn } from '@/lib/utils';

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
      styles: 'bg-sky-500/10 text-sky-700 ring-sky-500/25',
    },
    CRYPTO: {
      label: 'Cryptographic',
      icon: KeyRound,
      styles: 'bg-violet-500/10 text-violet-700 ring-violet-500/25',
    },
    DEPENDENCY: {
      label: 'Dependency',
      icon: Package,
      styles: 'bg-cyan-500/10 text-cyan-700 ring-cyan-500/25',
    },
    CONFIGURATION: {
      label: 'Configuration',
      icon: Sliders,
      styles: 'bg-amber-500/10 text-amber-700 ring-amber-500/25',
    },
  }[norm] || {
    label: category,
    icon: Code,
    styles: 'bg-slate-100 text-slate-600 ring-slate-300/50',
  };

  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium ring-1',
        config.styles,
        isSm ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-[12px] px-2.5 py-0.5 gap-1.5'
      )}
    >
      <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden />
      <span>{config.label}</span>
    </span>
  );
};
