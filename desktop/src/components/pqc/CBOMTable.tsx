import React, { useState, useMemo } from 'react';
import { Search, Copy, Check, ShieldAlert, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import type { CBOMEntry, RiskLevel } from '../../types/pqc';
import { MockDataBadge } from './MockDataBadge';

interface CBOMTableProps {

  data: CBOMEntry[];
}

export const CBOMTable: React.FC<CBOMTableProps> = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dependencyFilter, setDependencyFilter] = useState<'ALL' | 'Direct' | 'Transitive'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (dependencyFilter !== 'ALL' && item.dependencyType !== dependencyFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.id.toLowerCase().includes(q) ||
          item.algorithm.toLowerCase().includes(q) ||
          item.library.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.usage.toLowerCase().includes(q) ||
          (item.standardReference || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, dependencyFilter, searchQuery]);

  const handleCopy = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-critical/10 text-critical ring-1 ring-critical/25">
            <ShieldAlert className="h-3 w-3" />
            <span>High</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-medium/10 text-medium ring-1 ring-medium/25">
            <AlertTriangle className="h-3 w-3" />
            <span>Medium</span>
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-low/10 text-low ring-1 ring-low/25">
            <ShieldCheck className="h-3 w-3" />
            <span>Low</span>
          </span>
        );
    }
  };

  return (
    <div className="card w-full overflow-hidden flex flex-col">
      {/* Header filter bar */}
      <div className="p-4 border-b border-border bg-surface-2/40 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search CBOM by algorithm, library, BOM-ref…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border bg-surface pl-9 pr-8 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-muted-foreground">Dependency:</span>
            <select
              value={dependencyFilter}
              onChange={(e) => setDependencyFilter(e.target.value as 'ALL' | 'Direct' | 'Transitive')}
              className="h-8 rounded-lg border bg-surface px-2.5 text-[12px] text-foreground outline-none focus:border-primary/60"
            >
              <option value="ALL">All Dependencies</option>
              <option value="Direct">Direct Only</option>
              <option value="Transitive">Transitive Only</option>
            </select>
          </div>
          <MockDataBadge size="xs" label="Development / Mock Data" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2/50 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <th className="py-3 px-4 w-32">BOM Ref</th>
              <th className="py-3 px-4 w-40">Algorithm</th>
              <th className="py-3 px-4 w-36">Library</th>
              <th className="py-3 px-4 w-28">Type</th>
              <th className="py-3 px-4 min-w-[200px]">Asset Location</th>
              <th className="py-3 px-4 w-32">PQC Status</th>
              <th className="py-3 px-4 w-24">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  No CBOM entries matched your filter query.
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-surface-2/40 transition-colors">
                  {/* BOM Ref */}
                  <td className="py-3 px-4 font-mono text-[11.5px] font-semibold text-purple-700">
                    {item.id}
                  </td>

                  {/* Algorithm */}
                  <td className="py-3 px-4 font-mono font-medium text-foreground text-[12.5px]">
                    {item.algorithm}
                  </td>

                  {/* Library & Version */}
                  <td className="py-3 px-4 text-muted-foreground text-[12px]">
                    <span className="font-medium text-foreground">{item.library}</span>
                    <span className="font-mono text-[11px] ml-1.5 opacity-80">v{item.version}</span>
                  </td>

                  {/* Dependency Type */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium font-mono ${
                        item.dependencyType === 'Direct'
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
                          : 'bg-surface-2 text-muted-foreground'
                      }`}
                    >
                      {item.dependencyType}
                    </span>
                  </td>

                  {/* Location */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-[11.5px] text-muted-foreground bg-surface-2 px-1.5 py-0.5 rounded break-all max-w-[280px] truncate">
                        {item.location}
                      </code>
                      <button
                        onClick={(e) => handleCopy(e, item.id, item.location)}
                        title="Copy file path"
                        className="text-muted-foreground hover:text-foreground p-1 rounded"
                        aria-label="Copy file path"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* PQC Status */}
                  <td className="py-3 px-4">
                    <span
                      className={`text-[12px] font-medium ${
                        item.quantumVulnerable ? 'text-critical' : 'text-primary'
                      }`}
                    >
                      {item.quantumVulnerable ? 'Shor Vulnerable' : 'Quantum Safe'}
                    </span>
                  </td>

                  {/* Risk */}
                  <td className="py-3 px-4">{renderRiskBadge(item.risk)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-3 px-4 border-t border-border bg-surface-2/30 flex items-center justify-between text-[12px] text-muted-foreground">
        <span>
          Showing <strong className="text-foreground tabular">{filteredData.length}</strong> of{' '}
          <strong className="text-foreground tabular">{data.length}</strong> components (Development / Mock Data)
        </span>
        <span className="font-mono text-[11px]">CycloneDX 1.6 CBOM Schema (Mock Template)</span>
      </div>
    </div>
  );
};
