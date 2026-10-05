import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bug, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FindingsTable } from '@/components/findings/FindingsTable';
import { FindingFilters } from '@/components/findings/FindingFilters';
import { FindingDetails } from '@/components/findings/FindingDetails';
import { api } from '@/services/api';
import type { Finding } from '@/types';

export const Findings: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSeverity = searchParams.get('severity') || 'ALL';

  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>(initialSeverity);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const loadFindings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getFindings();
      setFindings(data);
    } catch (err) {
      console.error('Failed to load findings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getFindings();
      setFindings(data);
    } catch (err) {
      console.error('Failed to refresh findings:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSeverity('ALL');
    setSelectedCategory('ALL');
  };

  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity !== 'ALL' && f.severity !== selectedSeverity) {
      return false;
    }
    if (selectedCategory !== 'ALL' && f.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (f.id ?? '').toLowerCase().includes(q) ||
        (f.title ?? '').toLowerCase().includes(q) ||
        (f.explanation ?? '').toLowerCase().includes(q) ||
        (f.file ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

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

        {/* Content Area */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-16 skeleton" />
            ))}
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="card flex flex-col items-center justify-center p-12 text-center">
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
            findings={filteredFindings}
            selectedFindingId={selectedFinding?.id}
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
