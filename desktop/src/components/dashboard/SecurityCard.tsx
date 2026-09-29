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
      border: 'border-red-200/70 hover:border-red-300',
      text: 'text-red-600',
      iconBg: 'bg-red-50 text-red-600 border-red-200/80',
      trendColor: 'text-red-600',
    },
    high: {
      border: 'border-amber-200/70 hover:border-amber-300',
      text: 'text-amber-600',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/80',
      trendColor: 'text-emerald-600',
    },
    medium: {
      border: 'border-slate-200/70 hover:border-slate-300',
      text: 'text-slate-700',
      iconBg: 'bg-slate-100 text-slate-600 border-slate-200/80',
      trendColor: 'text-slate-500',
    },
    low: {
      border: 'border-teal-200/70 hover:border-teal-300',
      text: 'text-teal-600',
      iconBg: 'bg-teal-50 text-teal-600 border-teal-200/80',
      trendColor: 'text-teal-600',
    },
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`glass-panel p-4 rounded-2xl border ${styles.border} flex flex-col justify-between cursor-pointer transition-all duration-150 group`}
    >
      <div>
        {/* Top: Label and Icon */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
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
              {trendDirection === 'neutral' && <Minus className="w-3 h-3 text-slate-400" />}
              <span>{trend}</span>
            </span>
          )}
        </div>
      </div>

      {/* Bottom Description */}
      <div className="mt-3 pt-2 text-[11px] text-slate-500 truncate" style={{ borderTop: '1px solid rgba(226, 232, 240, 0.85)' }} title={description}>
        {description}
      </div>
    </div>
  );
};
