import React from 'react';
import { Scan as ScanIcon, ChevronRight } from 'lucide-react';
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
  const scanId = currentScan?.id || 'SCAN-001';
  const status = currentScan?.status || 'QUEUED';
  const repoName = currentScan?.repository_name || 'core-services.zip';

  return (
    <div className="glass-panel p-4 rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-950/20 to-slate-900/60 flex flex-col justify-between">
      <div>
        {/* Top: Header & Badge */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1">
            <ScanIcon className="w-3 h-3" />
            <span>Active Assessment</span>
          </span>
          <ScanStatusBadge status={status} size="sm" />
        </div>

        {/* Scan ID & Target File */}
        <div className="text-xl font-mono font-bold text-slate-100">
          {scanId}
        </div>
        <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5" title={repoName}>
          {repoName}
        </div>
      </div>

      {/* Footer Link */}
      <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Queue Position #1</span>
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
