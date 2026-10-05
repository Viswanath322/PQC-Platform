import React from 'react';
import { AlertCircle, AlertTriangle, Info, Sparkles } from 'lucide-react';
import type { KeyInsight } from '../../types/pqc';

interface KeyInsightsProps {
  insights: KeyInsight[];
}

export const KeyInsights: React.FC<KeyInsightsProps> = ({ insights }) => {
  const getBadge = (category: KeyInsight['category']) => {
    switch (category) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-critical/10 text-critical ring-1 ring-critical/25">
            <AlertCircle className="h-3 w-3" />
            <span>Critical</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-medium/10 text-medium ring-1 ring-medium/25">
            <AlertTriangle className="h-3 w-3" />
            <span>Warning</span>
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-low/10 text-low ring-1 ring-low/25">
            <Info className="h-3 w-3" />
            <span>Info</span>
          </span>
        );
    }
  };

  return (
    <div className="card flex flex-col gap-4 p-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-purple-700" />
            <h3 className="section-title">Key security insights</h3>
          </div>
          <p className="section-sub mt-0.5 text-muted-foreground">
            Critical observations derived from static AST inspection and cryptographic algorithm analysis.
          </p>
        </div>
        <div className="text-[12px] text-muted-foreground">
          Showing <span className="tabular font-medium text-foreground">{insights.length}</span> insights
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2/40 p-3.5 hover:bg-surface-2/70 transition-colors"
          >
            <div className="space-y-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground leading-snug">
                {insight.text}
              </p>
              {insight.componentRef && (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <span className="opacity-75">Target:</span>
                  <span className="rounded bg-surface px-1.5 py-0.5 text-foreground/80 border border-border truncate">
                    {insight.componentRef}
                  </span>
                </div>
              )}
            </div>
            <div className="shrink-0 pt-0.5">
              {getBadge(insight.category)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
