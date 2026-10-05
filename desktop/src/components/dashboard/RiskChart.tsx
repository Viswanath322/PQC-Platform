import React from 'react';
import { ShieldAlert, Activity, ArrowRight } from 'lucide-react';

interface ActivityItem {
  id: string;
  event: string;
  time: string;
}

interface RiskChartProps {
  onNavigateToPQC?: () => void;
  onNavigateToScans?: () => void;
  // Real activity from API \u2014 empty array = no activity
  recentActivity?: ActivityItem[];
}

export const RiskChart: React.FC<RiskChartProps> = ({
  onNavigateToPQC,
  onNavigateToScans,
  recentActivity = [],  // Default to empty \u2014 no fake SCAN-001/SCAN-002 events
}) => {
  // These PQC risk distribution numbers are legitimate Day 1 DEVELOPMENT / MOCK DATA
  // They represent example cryptographic component risk categories
  const pqcAssets = [
    { name: 'High Risk (Shor algorithm vulnerable: RSA / ECC)', count: 5, color: '#ef4444', pct: 20 },
    { name: 'Medium Risk (Hybrid / legacy TLS negotiation)', count: 8, color: '#eab308', pct: 32 },
    { name: 'Low Risk (AES-256 / SHA-384 Grover resilient)', count: 12, color: '#14b8a6', pct: 48 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 1. PQC Cryptographic Risk Distribution — Day 1 DEVELOPMENT / MOCK DATA */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Post-Quantum Cryptographic Risk
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">25 components</span>
          </div>

          <p className="text-xs text-slate-400 mb-1 leading-relaxed">
            Classification of cryptographic components against Shor and Grover quantum cryptanalysis threats.
          </p>
          <p className="text-[10px] text-amber-400/80 mb-4 font-medium">⚠ DEVELOPMENT / MOCK DATA</p>

          <div className="space-y-3.5">
            {pqcAssets.map((asset) => (
              <div key={asset.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium truncate max-w-xs">{asset.name}</span>
                  <span className="font-mono text-slate-200 font-bold ml-2">
                    {asset.count} ({asset.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${asset.pct}%`, background: asset.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {onNavigateToPQC && (
          <div className="mt-4 pt-2.5 border-t border-slate-800/70 flex justify-end">
            <button
              onClick={onNavigateToPQC}
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>Explore PQC Assessment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Scan Activity — real API data only; empty state shown if no scans */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Recent Scan Activity
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-mono">Live Queue</span>
          </div>

          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Audit trail of AST scanner tasks, pipeline runs, and CBOM generation events.
          </p>

          {recentActivity.length > 0 ? (
            <div className="space-y-2.5">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                    <span className="font-medium text-slate-200 truncate">{item.event}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono flex-shrink-0 ml-2">{item.time}</span>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state — no hardcoded fake activity */
            <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-slate-400">
              <span className="font-medium text-slate-300">No scan activity yet</span>
              <span className="mt-1">Start a scan to see activity here.</span>
            </div>
          )}
        </div>

        {onNavigateToScans && (
          <div className="mt-4 pt-2.5 border-t border-slate-800/70 flex justify-end">
            <button
              onClick={onNavigateToScans}
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>View Scan History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
