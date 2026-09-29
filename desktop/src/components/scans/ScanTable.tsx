import React from 'react';
import { Eye, Ban, FileArchive, CheckCircle2 } from 'lucide-react';
import type { Scan } from '../../types';
import { ScanStatusBadge } from './ScanStatusBadge';

interface ScanTableProps {
  scans: Scan[];
  onViewScan: (scan: Scan) => void;
  onCancelScan: (scan: Scan) => void;
}

export const ScanTable: React.FC<ScanTableProps> = ({
  scans,
  onViewScan,
  onCancelScan,
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold tracking-wider uppercase">
            <th className="py-3 px-4">Scan ID</th>
            <th className="py-3 px-4">Project</th>
            <th className="py-3 px-4">Repository</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Created</th>
            <th className="py-3 px-4">Findings</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-300">
          {scans.map((scan) => {
            const canCancel =
              scan.status === 'QUEUED' ||
              scan.status === 'INGESTING' ||
              scan.status === 'ANALYZING' ||
              scan.status === 'PROCESSING' ||
              scan.status === 'AI_ANALYSIS';

            return (
              <tr
                key={scan.id}
                className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                onClick={() => onViewScan(scan)}
              >
                {/* Scan ID */}
                <td className="py-3.5 px-4 font-mono font-semibold text-teal-300">
                  {scan.id}
                </td>

                {/* Project */}
                <td className="py-3.5 px-4">
                  <div className="font-medium text-slate-100">{scan.project_name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">branch: {scan.branch}</div>
                </td>

                {/* Repository / File */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <FileArchive className="w-3.5 h-3.5 text-slate-400" />
                    <span>{scan.repository_name || scan.file_name}</span>
                  </div>
                  {scan.file_size && (
                    <div className="text-[11px] text-slate-500">{scan.file_size}</div>
                  )}
                </td>

                {/* Status */}
                <td className="py-3.5 px-4">
                  <ScanStatusBadge status={scan.status} size="sm" />
                </td>

                {/* Created */}
                <td className="py-3.5 px-4 text-slate-400">
                  {scan.created_at}
                </td>

                {/* Findings */}
                <td className="py-3.5 px-4">
                  {scan.total_findings > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-100">{scan.total_findings}</span>
                      <div className="flex items-center gap-1 text-[10.5px]">
                        {scan.critical_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">
                            {scan.critical_count}C
                          </span>
                        )}
                        {scan.high_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-medium">
                            {scan.high_count}H
                          </span>
                        )}
                        {scan.medium_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-medium">
                            {scan.medium_count}M
                          </span>
                        )}
                      </div>
                    </div>
                  ) : scan.status === 'COMPLETED' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>0 findings</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Pending analysis</span>
                  )}
                </td>

                {/* Actions */}
                <td
                  className="py-3.5 px-4 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewScan(scan)}
                      className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1"
                      title="View Scan Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    {canCancel && (
                      <button
                        onClick={() => onCancelScan(scan)}
                        className="px-2.5 py-1 text-xs text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 rounded-md transition-colors flex items-center gap-1"
                        title="Cancel this scan"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
