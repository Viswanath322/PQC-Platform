import React from 'react';
import { Search, X } from 'lucide-react';

interface FindingFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSeverity: string;
  onSeverityChange: (s: string) => void;
  selectedCategory: string;
  onCategoryChange: (c: string) => void;
  totalCount: number;
  filteredCount: number;
  onReset: () => void;
}

export const FindingFilters: React.FC<FindingFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedSeverity,
  onSeverityChange,
  selectedCategory,
  onCategoryChange,
  totalCount,
  filteredCount,
  onReset,
}) => {
  const severities = [
    { label: 'All Severities', value: 'ALL' },
    { label: 'Critical', value: 'CRITICAL' },
    { label: 'High', value: 'HIGH' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Low', value: 'LOW' },
  ];

  const categories = [
    { label: 'All Categories', value: 'ALL' },
    { label: 'SAST Code', value: 'SAST' },
    { label: 'Cryptographic', value: 'CRYPTO' },
    { label: 'Dependency', value: 'DEPENDENCY' },
    { label: 'Configuration', value: 'CONFIGURATION' },
  ];

  const hasActiveFilters = searchQuery !== '' || selectedSeverity !== 'ALL' || selectedCategory !== 'ALL';

  return (
    <div className="glass flex flex-col gap-3 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search findings by title, file, algorithm, or CWE…"
            className="h-9 w-full rounded-lg border border-white/80 bg-white/70 pl-9 pr-8 text-[13px] outline-none placeholder:text-slate-400 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Severity Selector */}
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-slate-500">Severity:</span>
          <select
            value={selectedSeverity}
            onChange={(e) => onSeverityChange(e.target.value)}
            className="h-9 rounded-lg border border-white/80 bg-white/70 px-2.5 text-[12px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          >
            {severities.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Selector */}
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-slate-500">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="h-9 rounded-lg border border-white/80 bg-white/70 px-2.5 text-[12px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Counts & Clear */}
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <span>
            Showing <strong className="text-slate-900 tabular">{filteredCount}</strong> of{' '}
            <strong className="text-slate-900 tabular">{totalCount}</strong>
          </span>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="ml-2 text-primary hover:underline text-[12px]"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
