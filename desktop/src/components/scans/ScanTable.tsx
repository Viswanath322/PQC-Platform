import React from 'react';
import { Eye, Ban, FileArchive, CheckCircle2 } from 'lucide-react';
import type { Scan } from '../../types';
import { ScanStatusPill } from './ScanStatusPill';

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
    <div className="glass-strong w-full overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50/70 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              <th className="py-3 px-4">Scan ID</th>
              <th className="py-3 px-4">Project</th>
              <th className="py-3 px-4">Repository</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Files</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4">Findings</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 text-foreground">
            {scans.map((scan) => {
              const canCancel =
                scan.status === 'QUEUED' ||
                scan.status === 'INGESTING' ||
                scan.status === 'ANALYZING' ||
                scan.status === 'PROCESSING' ||
                scan.status === 'AI_ANALYSIS';

              const filesDisplay =
                (scan as { files_analyzed?: number | null }).files_analyzed !== undefined &&
                (scan as { files_analyzed?: number | null }).files_analyzed !== null
                  ? (scan as { files_analyzed?: number | null }).files_analyzed
                  : 'Not reported';

              return (
                <tr
                  key={scan.id}
                  className="transition-colors hover:bg-white/70 cursor-pointer"
                  onClick={() => onViewScan(scan)}
                >
                  {/* Scan ID */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-purple-700 group-hover:text-purple-900 transition-colors">
                    {scan.id}
                  </td>

                  {/* Project */}
                  <td className="py-3.5 px-4 min-w-[150px]">
                    <div className="font-medium text-slate-900">{scan.project_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>branch:</span>
                      <span className="rounded bg-purple-100/70 border border-purple-200/80 px-1.5 font-mono text-[10.5px] text-purple-700 font-semibold">{scan.branch}</span>
                    </div>
                  </td>

                  {/* Repository / File */}
                  <td className="py-3.5 px-4 min-w-[160px]">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <FileArchive className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono text-[12px] truncate max-w-[200px]">
                        {scan.repository_name}
                      </span>
                    </div>
                  </td>

                  {/* Status Pill */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <ScanStatusPill status={scan.status} size="sm" />
                  </td>

                  {/* Files Analyzed */}
                  <td className="py-3.5 px-4 font-mono text-[12px] text-muted-foreground whitespace-nowrap">
                    {filesDisplay}
                  </td>

                  {/* Created At */}
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[12px]">
                    <span className="tabular">{new Date(scan.created_at).toLocaleString()}</span>
                  </td>

                  {/* Findings breakdown */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {scan.total_findings > 0 ? (
                      <div className="flex items-center gap-1 text-[11px] font-semibold tabular">
                        {scan.critical_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-critical/10 text-critical ring-1 ring-critical/25">
                            {scan.critical_count}C
                          </span>
                        )}
                        {scan.high_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-high/10 text-high ring-1 ring-high/25">
                            {scan.high_count}H
                          </span>
                        )}
                        {scan.medium_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-medium/10 text-medium ring-1 ring-medium/25">
                            {scan.medium_count}M
                          </span>
                        )}
                        {scan.low_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-low/10 text-low ring-1 ring-low/25">
                            {scan.low_count}L
                          </span>
                        )}
                        <span className="text-slate-500 ml-1">({scan.total_findings})</span>
                      </div>
                    ) : scan.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 text-success text-[12px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Clean
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[12px]">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td
                    className="py-3.5 px-4 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onViewScan(scan)}
                        className="btn h-7 px-2.5 text-[12px] cursor-pointer"
                        title="View Scan Details"
                        aria-label="View Scan Details"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Inspect</span>
                      </button>

                      {canCancel && (
                        <button
                          onClick={() => onCancelScan(scan)}
                          className="h-7 px-2 text-[12px] inline-flex items-center gap-1 rounded-lg border border-critical/30 bg-critical/10 text-critical hover:bg-critical/20 cursor-pointer"
                          title="Cancel ongoing scan"
                          aria-label="Cancel ongoing scan"
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
    </div>
  );
};
