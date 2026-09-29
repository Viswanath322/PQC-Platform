import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bug, RefreshCw } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { FindingsTable } from '../components/findings/FindingsTable';
import { FindingFilters } from '../components/findings/FindingFilters';
import { FindingDetails } from '../components/findings/FindingDetails';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import type { Finding } from '../types';

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

  useEffect(() => {
    loadFindings();
  }, []);

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
        f.id.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.file.toLowerCase().includes(q) ||
        f.explanation.toLowerCase().includes(q) ||
        (f.cwe_id && f.cwe_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <PageContainer
      title="Security & PQC Findings Explorer"
      subtitle="Inspect source-level AST vulnerabilities, post-quantum risks, weak ciphers, and hardcoded secrets."
      actions={
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 rounded-lg"
            title="Refresh findings list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Filters Header */}
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
          <LoadingState message="Loading security findings..." />
        ) : filteredFindings.length === 0 ? (
          <EmptyState
            icon={Bug}
            title="No findings match filter"
            description="No vulnerability findings matched your search or severity criteria. Try resetting filters."
            actionText="Reset All Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <FindingsTable
            findings={filteredFindings}
            selectedFindingId={selectedFinding?.id}
            onSelectFinding={(f) => setSelectedFinding(f)}
          />
        )}
      </div>

      {/* Flyout Finding Details Panel */}
      <FindingDetails
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
      />
    </PageContainer>
  );
};
