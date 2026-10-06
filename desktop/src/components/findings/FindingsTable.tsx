import React, { useState, useCallback } from 'react';
import { ChevronRight, FileCode, ChevronsUpDown, ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';
import type { Finding } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { cn } from '@/lib/utils';

// ── Sorting ──────────────────────────────────────────────────────────────────

type SortKey = 'severity' | 'file' | 'line';
type SortDir = 'asc' | 'desc';

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function severityRank(sev: string): number {
  return SEVERITY_ORDER[(sev ?? '').toLowerCase()] ?? 99;
}

function sortFindings(findings: Finding[], key: SortKey, dir: SortDir): Finding[] {
  const sorted = [...findings].sort((a, b) => {
    let cmp = 0;
    if (key === 'severity') {
      cmp = severityRank(a.severity) - severityRank(b.severity);
    } else if (key === 'file') {
      const fa = (a.file || a.file_path || '').toLowerCase();
      const fb = (b.file || b.file_path || '').toLowerCase();
      cmp = fa.localeCompare(fb);
    } else if (key === 'line') {
      // Numeric sort — missing line treated as Infinity so it sorts last
      const la = a.line ?? a.line_number ?? Infinity;
      const lb = b.line ?? b.line_number ?? Infinity;
      cmp = la - lb;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

// ── Sort header cell ──────────────────────────────────────────────────────────

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey | null;
  activeSortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}

const SortHeader: React.FC<SortHeaderProps> = ({
  label,
  sortKey,
  activeSortKey,
  activeSortDir,
  onSort,
  className,
}) => {
  const isActive = activeSortKey === sortKey;
  const Icon = isActive ? (activeSortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th
      className={cn(
        'py-3 px-3.5 cursor-pointer select-none group whitespace-nowrap',
        className
      )}
      onClick={() => onSort(sortKey)}
      aria-sort={
        isActive ? (activeSortDir === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon
          className={cn(
            'w-3 h-3 transition-opacity',
            isActive ? 'opacity-80' : 'opacity-30 group-hover:opacity-60'
          )}
          aria-hidden
        />
      </span>
    </th>
  );
};

// ── Confidence display ────────────────────────────────────────────────────────

function formatConfidence(confidence: string | number | undefined | null): string {
  if (confidence === null || confidence === undefined || confidence === '') return '—';
  if (typeof confidence === 'number') {
    // Backend returns 0–1 float; show as percentage or HIGH/MEDIUM/LOW bucket
    if (confidence >= 0.85) return 'HIGH';
    if (confidence >= 0.6) return 'MED';
    return 'LOW';
  }
  return String(confidence).toUpperCase();
}

// ── ID cell ───────────────────────────────────────────────────────────────────
// Displays a compact human-friendly reference (F-0002) derived deterministically
// from the last 4 hex chars of the UUID (stripped of dashes).
// The full UUID is always preserved internally; copy and tooltip expose it.

/** Stable display reference: "F-" + last 4 chars of UUID without dashes.
 *  e.g. 00000000-0000-0000-0002-000000000002 → F-0002
 *       a8098c1a-f86e-11da-bd1a-00112444be1e → F-be1e
 *  Deterministic: same UUID always produces the same label. Never truncates
 *  raw UUID chars for display — this is a derived reference, not a substring. */
function findingRef(id: string): string {
  if (!id) return '—';
  const hex = id.replace(/-/g, '');
  return `F-${hex.slice(-4)}`;
}

const IdCell: React.FC<{ id: string; isDev: boolean }> = ({ id, isDev }) => {
  const [idCopied, setIdCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't open the details drawer
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 1500);
    });
  };

  return (
    <div className="flex flex-col items-start gap-0.5">
      {/* Reference row */}
      <div className="flex items-center gap-1">
        <span
          className="font-mono text-[11px] font-normal text-purple-400"
          title={id ? `Full ID: ${id}` : undefined}
        >
          {id ? findingRef(id) : '—'}
        </span>
        {/* Copy icon — visible only on row hover via group-hover */}
        {id && (
          <button
            onClick={handleCopy}
            title={idCopied ? 'Copied!' : `Copy full ID: ${id}`}
            aria-label={idCopied ? 'Copied' : 'Copy finding ID'}
            className="shrink-0 grid h-3.5 w-3.5 place-items-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-purple-500"
          >
            {idCopied
              ? <Check className="w-2.5 h-2.5 text-success" />
              : <Copy className="w-2.5 h-2.5" />}
          </button>
        )}
      </div>

      {/* DEV badge */}
      {isDev && (
        <span className="text-[9px] font-normal bg-amber-100 text-amber-700 rounded px-1 leading-4 inline-block">
          DEV
        </span>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

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
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        // Severity sorts most-severe first by default; others sort ascending
        setSortDir(key === 'severity' ? 'asc' : 'asc');
      }
    },
    [sortKey]
  );

  const displayFindings =
    sortKey !== null ? sortFindings(findings, sortKey, sortDir) : findings;

  return (
    <div className="glass-strong w-full overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50/70 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              <th className="py-3 px-3.5 w-24">Finding ID</th>
              <SortHeader
                label="Severity"
                sortKey="severity"
                activeSortKey={sortKey}
                activeSortDir={sortDir}
                onSort={handleSort}
                className="w-28"
              />
              <th className="py-3 px-3.5 w-32">Category</th>
              <th className="py-3 px-3.5">Title &amp; Description</th>
              <SortHeader
                label="File &amp; Location"
                sortKey="file"
                activeSortKey={sortKey}
                activeSortDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Line"
                sortKey="line"
                activeSortKey={sortKey}
                activeSortDir={sortDir}
                onSort={handleSort}
                className="w-20"
              />
              <th className="py-3 px-3.5 w-24">Confidence</th>
              <th className="py-3 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 text-foreground">
            {displayFindings.map((f) => {
              const isSelected = selectedFindingId === f.id;
              const filePath = f.file || f.file_path || '';
              const lineNum = f.line ?? f.line_number;
              return (
                <tr
                  key={f.id}
                  onClick={() => onSelectFinding(f)}
                  className={cn(
                    'group transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-white/70'
                  )}
                >
                  {/* ID */}
                  <td className="py-3 px-3.5 w-28">
                    <IdCell id={f.id} isDev={!!f.is_development} />
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
                      {f.explanation || f.description}
                    </div>
                    {f.engine && (
                      <span className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">
                        {f.engine}
                      </span>
                    )}
                  </td>

                  {/* File */}
                  <td className="py-3 px-3.5 max-w-[200px]">
                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                      <FileCode className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate" title={filePath}>{filePath || '—'}</span>
                    </div>
                  </td>

                  {/* Line — separate sortable column */}
                  <td className="py-3 px-3.5 w-20">
                    {lineNum != null ? (
                      <span className="text-[11px] text-slate-400 tabular font-mono">
                        {lineNum}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>

                  {/* Confidence */}
                  <td className="py-3 px-3.5">
                    <span className="font-mono text-[12px] text-slate-500 uppercase">
                      {formatConfidence(f.confidence)}
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
