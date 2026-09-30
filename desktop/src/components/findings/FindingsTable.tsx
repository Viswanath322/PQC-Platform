import React, { useState } from 'react';
import { Check, ChevronRight, Copy, FileCode } from 'lucide-react';
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
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  const copyValue = async (
    event: React.MouseEvent<HTMLButtonElement>,
    findingId: string,
    kind: 'id' | 'location',
    value: string,
  ) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      const key = `${findingId}:${kind}`;
      setCopiedAction(key);
      window.setTimeout(() => setCopiedAction((current) => current === key ? null : current), 1600);
    } catch (error) {
      console.warn(`Could not copy finding ${kind}.`, error);
    }
  };

  return (
    <div className="findings-table-shell glass-strong w-full overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="findings-table w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50/70 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              <th scope="col" className="w-28 px-4 py-3.5">Finding ID</th>
              <th scope="col" className="w-28 px-4 py-3.5">Severity</th>
              <th scope="col" className="w-36 px-4 py-3.5">Category</th>
              <th scope="col" className="px-4 py-3.5">Title</th>
              <th scope="col" className="px-4 py-3.5">File</th>
              <th scope="col" className="w-20 px-4 py-3.5">Line</th>
              <th scope="col" className="w-10 px-2 py-3.5" aria-label="Open details" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 text-foreground">
            {findings.map((finding) => {
              const isSelected = selectedFindingId === finding.finding_id;
              const idCopied = copiedAction === `${finding.finding_id}:id`;
              const locationCopied = copiedAction === `${finding.finding_id}:location`;
              const sourceLocation = finding.line_number == null
                ? finding.file_path
                : `${finding.file_path}:${finding.line_number}`;

              return (
                <tr
                  key={finding.finding_id}
                  onClick={() => onSelectFinding(finding)}
                  aria-selected={isSelected}
                  className={cn('finding-row cursor-pointer transition-colors', isSelected && 'is-selected')}
                >
                  <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-primary">
                    <div className="finding-id-cell">
                      <button
                        type="button"
                        className="rounded-sm text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectFinding(finding);
                        }}
                        aria-label={`View finding ${finding.finding_id}`}
                      >
                        {finding.finding_id}
                      </button>
                      <button
                        type="button"
                        className="finding-row-action"
                        onClick={(event) => copyValue(event, finding.finding_id, 'id', finding.finding_id)}
                        aria-label={`${idCopied ? 'Copied' : 'Copy'} finding ID ${finding.finding_id}`}
                        title={idCopied ? 'Finding ID copied' : 'Copy finding ID'}
                      >
                        {idCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <SeverityBadge severity={finding.severity} size="sm" />
                  </td>
                  <td className="px-4 py-3.5">
                    <CategoryBadge category={finding.engine} size="sm" />
                  </td>
                  <td className="max-w-[360px] px-4 py-3.5">
                    <div className="line-clamp-1 font-semibold tracking-[-0.015em] text-slate-900" title={finding.title}>
                      {finding.title}
                    </div>
                  </td>
                  <td className="finding-file-cell max-w-[240px] px-4 py-3.5 font-mono text-[10px] text-slate-500">
                    <div className="finding-file-content">
                      <FileCode className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate" title={finding.file_path}>{finding.file_path}</span>
                      <button
                        type="button"
                        className="finding-row-action"
                        onClick={(event) => copyValue(event, finding.finding_id, 'location', sourceLocation)}
                        aria-label={`${locationCopied ? 'Copied' : 'Copy'} source location for ${finding.finding_id}`}
                        title={locationCopied ? 'Source location copied' : 'Copy source location'}
                      >
                        {locationCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] tabular-nums text-slate-600">
                    {finding.line_number ?? '—'}
                  </td>
                  <td className="px-2 py-3 text-center text-slate-400">
                    <ChevronRight className="inline-block h-4 w-4" />
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
