import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface SecurityCardProps {
  count: number;
  label: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  description: string;
  icon: LucideIcon;
  variant: 'critical' | 'high' | 'medium' | 'low';
  onClick?: () => void;
}

export const SecurityCard: React.FC<SecurityCardProps> = ({
  count,
  label,
  trend,
  trendDirection = 'neutral',
  description,
  icon: Icon,
  variant,
  onClick,
}) => {
  const styles = {
    critical: {
      border: 'border-red-500/20 hover:border-red-500/40',
      text: 'text-red-400',
      iconBg: 'bg-red-500/10 text-red-400 border-red-500/20',
      trendColor: 'text-red-400',
    },
    high: {
      border: 'border-orange-500/20 hover:border-orange-500/40',
      text: 'text-orange-400',
      iconBg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      trendColor: 'text-emerald-400',
    },
    medium: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      text: 'text-amber-400',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      trendColor: 'text-slate-400',
    },
    low: {
      border: 'border-teal-500/20 hover:border-teal-500/40',
      text: 'text-teal-400',
      iconBg: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      trendColor: 'text-emerald-400',
    },
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`glass-panel p-4 rounded-xl border ${styles.border} flex flex-col justify-between cursor-pointer transition-all duration-150 hover:bg-slate-800/40 group`}
    >
      <div>
        {/* Top: Label and Icon */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {label}
          </span>
          <div className={`w-7 h-7 rounded-lg ${styles.iconBg} border flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Big Number and Trend */}
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-extrabold tracking-tight font-mono ${styles.text}`}>
            {count}
          </span>
          {trend && (
            <span className={`inline-flex items-center text-[10.5px] font-medium ${styles.trendColor}`}>
              {trendDirection === 'up' && <ArrowUpRight className="w-3 h-3" />}
              {trendDirection === 'down' && <ArrowDownRight className="w-3 h-3" />}
              {trendDirection === 'neutral' && <Minus className="w-3 h-3 text-slate-500" />}
              <span>{trend}</span>
            </span>
          )}
        </div>
      </div>

      {/* Bottom Description */}
      <div className="mt-3 pt-2 border-t border-slate-800/70 text-[11px] text-slate-400 truncate" title={description}>
        {description}
      </div>
    </div>
  );
};
