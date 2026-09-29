import React from 'react';
import { ChevronRight, FileCode } from 'lucide-react';
import type { Finding } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { CategoryBadge } from '../common/CategoryBadge';

interface FindingsTableProps {
  findings: Finding[];
  selectedFindingId?: string;
  onSelectFinding: (finding: Finding) => void;
}

export const FindingsTable: React.FC<FindingsTableProps> = ({
  findings,
  selectedFindingId,
  onSelectFinding,
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold tracking-wider uppercase">
            <th className="py-3 px-3.5 w-24">Finding ID</th>
            <th className="py-3 px-3.5 w-28">Severity</th>
            <th className="py-3 px-3.5 w-32">Category</th>
            <th className="py-3 px-3.5">Title & Description</th>
            <th className="py-3 px-3.5">File & Location</th>
            <th className="py-3 px-3.5 w-24">Confidence</th>
            <th className="py-3 px-2 w-10 text-center"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-300">
          {findings.map((f) => {
            const isSelected = selectedFindingId === f.id;
            return (
              <tr
                key={f.id}
                onClick={() => onSelectFinding(f)}
                className={`transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-teal-950/30 border-l-2 border-teal-400'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                {/* ID */}
                <td className="py-3 px-3.5 font-mono font-medium text-teal-300">
                  {f.id}
                </td>

                {/* Severity */}
                <td className="py-3 px-3.5">
                  <SeverityBadge severity={f.severity} size="sm" />
                </td>

                {/* Category */}
                <td className="py-3 px-3.5">
                  <CategoryBadge category={f.category} size="sm" />
                </td>

                {/* Title */}
                <td className="py-3 px-3.5">
                  <div className="font-semibold text-slate-100 max-w-md truncate">
                    {f.title}
                  </div>
                  <div className="text-[11px] text-slate-400 max-w-md truncate mt-0.5">
                    {f.explanation}
                  </div>
                </td>

                {/* File & Line */}
                <td className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                    <FileCode className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate max-w-[200px]" title={f.file}>{f.file}</span>
                    <span className="text-teal-400 font-semibold">:{f.line}</span>
                  </div>
                </td>

                {/* Confidence */}
                <td className="py-3 px-3.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold tracking-wide ${
                      f.confidence === 'HIGH'
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50'
                        : f.confidence === 'MEDIUM'
                        ? 'bg-amber-950/40 text-amber-300 border border-amber-800/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {f.confidence}
                  </span>
                </td>

                {/* Arrow */}
                <td className="py-3 px-2 text-center text-slate-500">
                  <ChevronRight className="w-4 h-4" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
