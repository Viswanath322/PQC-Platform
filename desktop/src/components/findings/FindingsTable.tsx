import React from 'react';
import { ChevronRight, FileCode } from 'lucide-react';
import type { Finding } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { cn } from '@/lib/utils';

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
    <div className="glass-strong w-full overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50/70 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              <th className="py-3 px-3.5 w-24">Finding ID</th>
              <th className="py-3 px-3.5 w-28">Severity</th>
              <th className="py-3 px-3.5 w-32">Category</th>
              <th className="py-3 px-3.5">Title &amp; Description</th>
              <th className="py-3 px-3.5">File &amp; Location</th>
              <th className="py-3 px-3.5 w-24">Confidence</th>
              <th className="py-3 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 text-foreground">
            {findings.map((f) => {
              const isSelected = selectedFindingId === f.id;
              return (
                <tr
                  key={f.id}
                  onClick={() => onSelectFinding(f)}
                  className={cn(
                    'transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-white/70'
                  )}
                >
                  {/* ID */}
                  <td className="py-3 px-3.5 font-mono font-medium text-primary">
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
                  <td className="py-3 px-3.5 max-w-[320px]">
                    <div className="font-semibold text-slate-900 line-clamp-1">{f.title}</div>
                    <div className="text-[12px] text-slate-500 line-clamp-1 mt-0.5">
                      {f.explanation}
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-3 px-3.5 max-w-[200px]">
                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                      <FileCode className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{f.file}</span>
                    </div>
                    {f.line && (
                      <div className="text-[11px] text-slate-400 tabular font-mono mt-0.5">
                        Line: {f.line}
                      </div>
                    )}
                  </td>

                  {/* Confidence */}
                  <td className="py-3 px-3.5">
                    <span className="font-mono text-[12px] text-slate-500 uppercase">
                      {f.confidence}
                    </span>
                  </td>

                  {/* Arrow */}
                  <td className="py-3 px-2 text-center text-slate-400">
                    <ChevronRight className="w-4 h-4 inline-block" />
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
