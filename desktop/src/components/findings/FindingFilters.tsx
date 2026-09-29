import React from 'react';
import { Search, Filter, X } from 'lucide-react';

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
  const severities: { label: string; value: string; color?: string }[] = [
    { label: 'All Severities', value: 'ALL' },
    { label: 'Critical', value: 'CRITICAL', color: '#f87171' },
    { label: 'High', value: 'HIGH', color: '#fb923c' },
    { label: 'Medium', value: 'MEDIUM', color: '#facc15' },
    { label: 'Low', value: 'LOW', color: '#2dd4bf' },
  ];

  const categories: { label: string; value: string }[] = [
    { label: 'All Categories', value: 'ALL' },
    { label: 'SAST Code', value: 'SAST' },
    { label: 'Cryptographic', value: 'CRYPTO' },
    { label: 'Dependency', value: 'DEPENDENCY' },
    { label: 'Configuration', value: 'CONFIGURATION' },
  ];

  const hasActiveFilters = searchQuery !== '' || selectedSeverity !== 'ALL' || selectedCategory !== 'ALL';

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search findings by title, file path, algorithm, or CWE..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-400 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Severity Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {severities.map((sev) => {
            const isSelected = selectedSeverity === sev.value;
            return (
              <button
                key={sev.value}
                onClick={() => onSeverityChange(sev.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-slate-700 text-white shadow-sm border border-slate-600'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                style={isSelected && sev.color ? { borderColor: sev.color, color: sev.color } : undefined}
              >
                {sev.label}
              </button>
            );
          })}
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-xs text-slate-400 hover:text-teal-300 underline underline-offset-2 ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11.5px] text-slate-400 pt-1 border-t border-slate-850">
        <span>
          Showing <strong className="text-slate-200 font-semibold">{filteredCount}</strong> of{' '}
          <strong className="text-slate-200 font-semibold">{totalCount}</strong> security findings
        </span>
        {hasActiveFilters && <span className="text-teal-400">Filters active</span>}
      </div>
    </div>
  );
};
