import React from 'react';
import { Scan as ScanIcon, ChevronRight, Clock } from 'lucide-react';
import type { Scan } from '../../types';
import { ScanStatusBadge } from '../scans/ScanStatusBadge';

interface ScanStatusCardProps {
  currentScan?: Scan | null;
  onViewScans?: () => void;
  onNewScan?: () => void;
}

export const ScanStatusCard: React.FC<ScanStatusCardProps> = ({
  currentScan,
  onViewScans,
}) => {
  // NEVER show a hardcoded SCAN-001 fallback — only real data
  const hasScan = !!currentScan;

  return (
    <div className="glass-panel p-4 rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-950/20 to-slate-900/60 flex flex-col justify-between">
      <div>
        {/* Top: Header & Badge */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1">
            <ScanIcon className="w-3 h-3" />
            <span>Active Assessment</span>
          </span>
          {hasScan && <ScanStatusBadge status={currentScan!.status} size="sm" />}
        </div>

        {hasScan ? (
          <>
            {/* Scan ID & Target File */}
            <div className="text-xl font-mono font-bold text-slate-100">
              {currentScan!.id}
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5" title={currentScan!.repository_name}>
              {currentScan!.repository_name}
            </div>
          </>
        ) : (
          /* No active scan — explicit empty state, no invented SCAN-001 */
          <div className="flex items-center gap-2 mt-2 text-[12px] text-slate-400">
            <Clock className="w-4 h-4 shrink-0" />
            <span>No active scan. Start a new scan to see it here.</span>
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">{hasScan ? 'Queue Position #1' : ''}</span>
        {onViewScans && (
          <button
            onClick={onViewScans}
            className="text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-0.5 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
