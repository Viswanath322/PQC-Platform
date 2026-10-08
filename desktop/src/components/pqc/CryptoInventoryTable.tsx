import React, { useState, useMemo } from 'react';
import { Search, Filter, Copy, Check, ShieldAlert, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import type { CryptoComponent, RiskLevel } from '../../types/pqc';

interface CryptoInventoryTableProps {

  data: CryptoComponent[];
  initialRiskFilter?: string;
  onItemSelect?: (item: CryptoComponent) => void;
  showFiltersHeader?: boolean;
}

export const CryptoInventoryTable: React.FC<CryptoInventoryTableProps> = ({
  data,
  initialRiskFilter = 'ALL',
  onItemSelect,
  showFiltersHeader = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string>(initialRiskFilter);
  const [selectedAlgoGroup, setSelectedAlgoGroup] = useState<string>('ALL');
  const [selectedLibrary, setSelectedLibrary] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const algorithmFamilies = useMemo(() => {
    const families = new Set<string>();
    data.forEach((item) => {
      const family = item.algorithm.split('-')[0].split(' ')[0];
      families.add(family);
    });
    return Array.from(families).sort();
  }, [data]);

  const libraries = useMemo(() => {
    const libs = new Set<string>();
    data.forEach((item) => libs.add(item.library));
    return Array.from(libs).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (selectedRisk !== 'ALL' && item.risk !== selectedRisk) {
        return false;
      }
      if (selectedAlgoGroup !== 'ALL' && !item.algorithm.toUpperCase().includes(selectedAlgoGroup.toUpperCase())) {
        return false;
      }
      if (selectedLibrary !== 'ALL' && item.library !== selectedLibrary) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesAlgo = item.algorithm.toLowerCase().includes(query);
        const matchesLoc = item.location.toLowerCase().includes(query);
        const matchesLib = item.library.toLowerCase().includes(query);
        const matchesUsage = item.usage.toLowerCase().includes(query);
        const matchesPurpose = (item.purpose || '').toLowerCase().includes(query);
        return matchesAlgo || matchesLoc || matchesLib || matchesUsage || matchesPurpose;
      }
      return true;
    });
  }, [data, selectedRisk, selectedAlgoGroup, selectedLibrary, searchQuery]);

  const handleCopyLocation = (e: React.MouseEvent, id: string, text: string) => {
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
      {showFiltersHeader && (
        <div className="p-4 border-b border-border bg-surface-2/40 flex flex-wrap gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search algorithm, file, library…"
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

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2.5 items-center">
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters:</span>
            </div>

            {/* Risk Selector */}
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="h-8 rounded-lg border bg-surface px-2.5 text-[12px] text-foreground outline-none focus:border-primary/60"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">High Risk ({data.filter((d) => d.risk === 'HIGH').length})</option>
              <option value="MEDIUM">Medium Risk ({data.filter((d) => d.risk === 'MEDIUM').length})</option>
              <option value="LOW">Low Risk ({data.filter((d) => d.risk === 'LOW').length})</option>
            </select>

            {/* Algorithm Family Selector */}
            <select
              value={selectedAlgoGroup}
              onChange={(e) => setSelectedAlgoGroup(e.target.value)}
              className="h-8 rounded-lg border bg-surface px-2.5 text-[12px] text-foreground outline-none focus:border-primary/60"
            >
              <option value="ALL">All Algorithms</option>
              {algorithmFamilies.map((family) => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
            </select>

            {/* Library Selector */}
            <select
              value={selectedLibrary}
              onChange={(e) => setSelectedLibrary(e.target.value)}
              className="h-8 rounded-lg border bg-surface px-2.5 text-[12px] text-foreground outline-none focus:border-primary/60"
            >
              <option value="ALL">All Libraries</option>
              {libraries.map((lib) => (
                <option key={lib} value={lib}>
                  {lib}
                </option>
              ))}
            </select>

            {(selectedRisk !== 'ALL' || selectedAlgoGroup !== 'ALL' || selectedLibrary !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedRisk('ALL');
                  setSelectedAlgoGroup('ALL');
                  setSelectedLibrary('ALL');
                  setSearchQuery('');
                }}
                className="btn h-8 px-2.5 text-[12px]"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2/50 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <th className="py-3 px-4 w-44">Algorithm</th>
              <th className="py-3 px-4 w-36">Library</th>
              <th className="py-3 px-4 w-24">Version</th>
              <th className="py-3 px-4 min-w-[200px]">Location</th>
              <th className="py-3 px-4 w-36">Detection Method</th>
              <th className="py-3 px-4 w-24">Confidence</th>
              <th className="py-3 px-4 w-28">PQC Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  No cryptographic components found matching the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onItemSelect && onItemSelect(item)}
                  className={`transition-colors ${
                    onItemSelect ? 'cursor-pointer hover:bg-surface-2/60' : 'hover:bg-surface-2/30'
                  }`}
                >
                  {/* Algorithm */}
                  <td className="py-3 px-4 font-medium text-foreground">
                    <div className="flex flex-col">
                      <span className="font-mono text-[13px] font-semibold text-purple-700">{item.algorithm}</span>
                      {item.curveOrKeySize && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {item.curveOrKeySize}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Library */}
                  <td className="py-3 px-4 text-muted-foreground font-medium text-[12px]">
                    {item.library}
                  </td>

                  {/* Version */}
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] rounded bg-surface-2 px-1.5 py-0.5 text-muted-foreground">
                      {item.version}
                    </span>
                  </td>

                  {/* Location */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-[11.5px] text-purple-700 bg-purple-50/70 border border-purple-200/60 px-1.5 py-0.5 rounded break-all max-w-[240px] truncate" title={item.location}>
                        {item.location}
                      </code>
                      <button
                        onClick={(e) => handleCopyLocation(e, item.id, item.location)}
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

                  {/* Detection Method */}
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11.5px] text-slate-700">
                      {item.detectionMethod || 'AST Inspection'}
                    </span>
                  </td>

                  {/* Confidence */}
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] uppercase font-semibold text-slate-600">
                      {String(item.confidence || 'HIGH')}
                    </span>
                  </td>

                  {/* PQC Risk */}
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
          <strong className="text-foreground tabular">{data.length}</strong> cryptographic components
        </span>
        <span className="font-mono text-[11px]">NIST FIPS 203 / 204 AST Inspector (Live Telemetry)</span>
      </div>
    </div>
  );
};
