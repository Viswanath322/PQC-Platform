import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Bug, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FindingsTable } from '@/components/findings/FindingsTable';
import { FindingFilters } from '@/components/findings/FindingFilters';
import { FindingDetails } from '@/components/findings/FindingDetails';
import { MockDataBadge } from '@/components/pqc/MockDataBadge';
import { api } from '@/services/api';
import { mockFindings } from '@/data/mockData';
import type { Finding } from '@/types';

export const Findings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSeverity = searchParams.get('severity')?.toLowerCase() || 'all';

  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>(initialSeverity);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [sortOrder, setSortOrder] = useState<'severity-desc' | 'severity-asc' | 'line-asc' | 'line-desc'>('severity-desc');
  const [isDevelopmentData, setIsDevelopmentData] = useState(false);

  const loadFindings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getLiveFindings();
      setFindings(data);
      setIsDevelopmentData(false);
    } catch (err) {
      console.error('Failed to load findings:', err);
      setFindings(mockFindings);
      setIsDevelopmentData(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, []);

  useEffect(() => {
    const requestedFindingId = (location.state as { selectedFindingId?: string } | null)?.selectedFindingId;
    if (!requestedFindingId || isLoading) return;

    const requestedFinding = findings.find((finding) => finding.finding_id === requestedFindingId);
    if (requestedFinding) setSelectedFinding(requestedFinding);

    // Consume the explicit selection so revisiting Findings starts with the drawer closed.
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [findings, isLoading, location.pathname, location.search, location.state, navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getLiveFindings();
      setFindings(data);
      setIsDevelopmentData(false);
    } catch (err) {
      console.error('Failed to refresh findings:', err);
      setFindings(mockFindings);
      setIsDevelopmentData(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSeverity('all');
    setSelectedCategory('all');
  };

  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) {
      return false;
    }
    if (selectedCategory !== 'all' && f.engine !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.finding_id.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.file_path.toLowerCase().includes(q) ||
        (f.category?.toLowerCase().includes(q) ?? false) ||
        (f.evidence?.toLowerCase().includes(q) ?? false) ||
        (f.recommendation?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const severityOrder: Record<Finding['severity'], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const sortedFindings = [...filteredFindings].sort((a, b) => {
    if (sortOrder.startsWith('severity')) {
      const delta = severityOrder[a.severity] - severityOrder[b.severity];
      return sortOrder === 'severity-desc' ? delta : -delta;
    }

    // Findings without line numbers remain at the end in either direction.
    if (a.line_number == null) return b.line_number == null ? 0 : 1;
    if (b.line_number == null) return -1;
    return sortOrder === 'line-asc'
      ? a.line_number - b.line_number
      : b.line_number - a.line_number;
  });

  const severitySummary: { value: Finding['severity']; label: string }[] = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];
  const severityCounts = findings.reduce<Record<Finding['severity'], number>>((counts, finding) => {
    counts[finding.severity] += 1;
    return counts;
  }, { critical: 0, high: 0, medium: 0, low: 0 });

  return (
    <>
      <PageHeader
        title="Security findings"
        description="Inspect code-level vulnerabilities, cryptographic weaknesses, and quantum exposure detected by static AST inspection."
        actions={
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn"
            title="Refresh findings list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      <div className="flex flex-col gap-5">
        {isDevelopmentData && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <MockDataBadge size="sm" />
            <span>Development examples are shown because the Findings API is unavailable.</span>
          </div>
        )}
        {/* Filters */}
        <FindingFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSeverity={selectedSeverity}
          onSeverityChange={setSelectedSeverity}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          totalCount={findings.length}
          filteredCount={filteredFindings.length}
          onReset={handleResetFilters}
        />

        {!isLoading && findings.length > 0 && (
          <div className="findings-summary-row" aria-label="Finding severity summary and sorting">
            <div className="findings-severity-summary" aria-label="Findings by severity">
              {severitySummary.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`severity-summary-chip severity-summary-${value}${selectedSeverity === value ? ' is-active' : ''}`}
                  aria-pressed={selectedSeverity === value}
                  onClick={() => setSelectedSeverity(selectedSeverity === value ? 'all' : value)}
                >
                  <span className="severity-summary-dot" />
                  <span>{label}</span>
                  <strong>{severityCounts[value]}</strong>
                </button>
              ))}
            </div>
            <label className="findings-sort-control">
              <span>Sort by</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
                <option value="severity-desc">Severity · highest first</option>
                <option value="severity-asc">Severity · lowest first</option>
                <option value="line-asc">Line number · low to high</option>
                <option value="line-desc">Line number · high to low</option>
              </select>
            </label>
          </div>
        )}

        {/* Content Area */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-16 skeleton" />
            ))}
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="empty-state card flex flex-col items-center justify-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-muted-foreground">
              <Bug className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-[16px] font-semibold">No findings matched your criteria</h3>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-sm">
              Try adjusting your active severity and category filters or clearing the search query.
            </p>
            <button
              onClick={handleResetFilters}
              className="btn mt-5"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <FindingsTable
            findings={sortedFindings}
            selectedFindingId={selectedFinding?.finding_id}
            onSelectFinding={(f) => setSelectedFinding(f)}
          />
        )}
      </div>

      {/* Flyout Details Drawer */}
      <FindingDetails
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
      />
    </>
  );
};

export default Findings;
