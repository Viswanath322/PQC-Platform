import React from 'react';
import { BarChart3, PieChart } from 'lucide-react';

interface FindingsChartProps {
  severityCounts?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryCounts?: {
    sast: number;
    crypto: number;
    dependency: number;
    configuration: number;
  };
}

export const FindingsChart: React.FC<FindingsChartProps> = ({
  severityCounts = { critical: 5, high: 12, medium: 27, low: 14 },
  categoryCounts = { sast: 18, crypto: 21, dependency: 11, configuration: 8 },
}) => {
  const totalFindings =
    severityCounts.critical +
    severityCounts.high +
    severityCounts.medium +
    severityCounts.low;

  const totalCategories =
    categoryCounts.sast +
    categoryCounts.crypto +
    categoryCounts.dependency +
    categoryCounts.configuration;

  const severityItems = [
    { label: 'Critical', count: severityCounts.critical, color: '#ef4444', bgClass: 'bg-red-500' },
    { label: 'High', count: severityCounts.high, color: '#f97316', bgClass: 'bg-orange-500' },
    { label: 'Medium', count: severityCounts.medium, color: '#eab308', bgClass: 'bg-yellow-500' },
    { label: 'Low', count: severityCounts.low, color: '#14b8a6', bgClass: 'bg-teal-500' },
  ];

  const categoryItems = [
    { label: 'Cryptographic', count: categoryCounts.crypto, color: '#a855f7', bgClass: 'bg-purple-500' },
    { label: 'SAST Code', count: categoryCounts.sast, color: '#3b82f6', bgClass: 'bg-blue-500' },
    { label: 'Dependency', count: categoryCounts.dependency, color: '#0ea5e9', bgClass: 'bg-sky-500' },
    { label: 'Configuration', count: categoryCounts.configuration, color: '#eab308', bgClass: 'bg-yellow-500' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 1. Findings by Severity */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-400" />
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Findings by Severity
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Total: <strong className="text-slate-200">{totalFindings}</strong>
            </span>
          </div>

          {/* Stacked Horizontal Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex mb-4">
            {severityItems.map((item) => {
              const widthPct = (item.count / totalFindings) * 100;
              return (
                <div
                  key={item.label}
                  className={`h-full ${item.bgClass}`}
                  style={{ width: `${widthPct}%` }}
                  title={`${item.label}: ${item.count} (${widthPct.toFixed(0)}%)`}
                />
              );
            })}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {severityItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800/80"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-slate-300 font-medium truncate">{item.label}</span>
                </div>
                <div className="font-mono text-slate-200 font-semibold pl-2">
                  {item.count}
                  <span className="text-[10px] text-slate-500 ml-1">
                    ({((item.count / totalFindings) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-800/70 text-[11px] text-slate-500">
          Remediation SLA: Critical (24h) • High (7d) • Medium (30d) • Low (90d)
        </div>
      </div>

      {/* 2. Findings by Category */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Findings by Category
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Total: <strong className="text-slate-200">{totalCategories}</strong>
            </span>
          </div>

          {/* Stacked Horizontal Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex mb-4">
            {categoryItems.map((item) => {
              const widthPct = (item.count / totalCategories) * 100;
              return (
                <div
                  key={item.label}
                  className={`h-full ${item.bgClass}`}
                  style={{ width: `${widthPct}%` }}
                  title={`${item.label}: ${item.count} (${widthPct.toFixed(0)}%)`}
                />
              );
            })}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {categoryItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800/80"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-slate-300 font-medium truncate">{item.label}</span>
                </div>
                <div className="font-mono text-slate-200 font-semibold pl-2">
                  {item.count}
                  <span className="text-[10px] text-slate-500 ml-1">
                    ({((item.count / totalCategories) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-800/70 text-[11px] text-slate-500">
          Source: AST static rules, dependency manifest inspection, and TLS configs.
        </div>
      </div>
    </div>
  );
};
