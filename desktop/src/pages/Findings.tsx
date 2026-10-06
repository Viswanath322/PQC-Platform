import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bug, RefreshCw, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FindingsTable } from '@/components/findings/FindingsTable';
import { FindingFilters } from '@/components/findings/FindingFilters';
import { FindingDetails } from '@/components/findings/FindingDetails';
import { api, ApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { Finding } from '@/types';

export const Findings: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { handleUnauthorized } = useAuth();
  const initialSeverity = searchParams.get('severity') || 'ALL';
  const initialEngine = searchParams.get('engine') || 'ALL';
  const initialFindingCategory = searchParams.get('finding_category') || 'ALL';
  const initialScanId = searchParams.get('scan_id') || '';

  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>(initialSeverity);
  const [engine, setEngine] = useState<string>(initialEngine);
  const [findingCategory, setFindingCategory] = useState<string>(initialFindingCategory);
  const [scanFilter, setScanFilter] = useState<string>(initialScanId);
  // Day 3: Rule filter state
  const [ruleFilter, setRuleFilter] = useState<string>('ALL');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  useEffect(() => {
    const sId = searchParams.get('scan_id');
    if (sId) {
      setScanFilter(sId);
    }
  }, [searchParams]);

  const loadFindings = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.getFindings();
      setFindings(data);
    } catch (err) {
      // REAL API FAILURE != EMPTY SUCCESS
      // Capture the error and surface it — never convert to empty array
      const message =
        err instanceof ApiError
          ? err.userMessage
          : 'Failed to load findings. Check your network connection.';
      setLoadError(message);

      if (err instanceof ApiError && err.errorType === 'UNAUTHORIZED') {
        handleUnauthorized();
      }
      console.error('Failed to load findings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const data = await api.getFindings();
      setFindings(data);
      setLoadError(null); // Clear previous load error on successful refresh
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.userMessage
          : 'Failed to refresh findings.';
      setRefreshError(message);

      if (err instanceof ApiError && err.errorType === 'UNAUTHORIZED') {
        handleUnauthorized();
      }
      console.error('Failed to refresh findings:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSeverity('ALL');
    setEngine('ALL');
    setFindingCategory('ALL');
    setRuleFilter('ALL');
    setScanFilter('');
  };

  // ── Derive available categories and rules from real finding data ───────────
  const availableCategories = useMemo(
    () =>
      Array.from(
        new Set(
          findings
            .map((f) => f.finding_category || f.category)
            .filter((c): c is string => Boolean(c))
        )
      ),
    [findings]
  );

  // Rule IDs: use rule_id when available, fall back to title as a proxy rule
  // identifier so the filter is still useful even before the backend ships rule_id.
  // We only show a rule filter if there is actually rule_id data in the findings.
  const availableRules = useMemo(() => {
    const ruleIds = findings
      .map((f) => f.rule_id)
      .filter((r): r is string => Boolean(r));
    return Array.from(new Set(ruleIds));
  }, [findings]);

  // ── Filter logic ─────────────────────────────────────────────────────────

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (scanFilter && f.scan_id !== scanFilter) return false;

      if (
        selectedSeverity !== 'ALL' &&
        f.severity?.toUpperCase() !== selectedSeverity.toUpperCase()
      )
        return false;

      if (engine !== 'ALL') {
        const targetEngine = engine.toLowerCase();
        const itemEngine = (f.engine || '').toLowerCase();
        const itemCategory = (f.category || '').toLowerCase();
        const matchesEngine =
          itemEngine === targetEngine ||
          (targetEngine === 'semgrep' &&
            (itemEngine.includes('semgrep') || itemCategory === 'sast')) ||
          (targetEngine === 'sast' &&
            (itemEngine === 'sast' || itemCategory === 'sast')) ||
          (targetEngine === 'crypto' &&
            (itemEngine === 'crypto' || itemCategory === 'crypto')) ||
          (targetEngine === 'dependency' &&
            (itemEngine === 'dependency' || itemCategory === 'dependency')) ||
          (targetEngine === 'configuration' &&
            (itemEngine === 'configuration' || itemCategory === 'configuration'));
        if (!matchesEngine) return false;
      }

      if (findingCategory !== 'ALL') {
        const targetCat = findingCategory.toLowerCase();
        const itemFindingCat = (f.finding_category || f.category || '').toLowerCase();
        if (!itemFindingCat.includes(targetCat) && itemFindingCat !== targetCat) return false;
      }

      // Day 3: Rule filter — match by rule_id when available
      if (ruleFilter !== 'ALL') {
        if ((f.rule_id || '') !== ruleFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (f.id || '').toLowerCase().includes(q) ||
          (f.title || '').toLowerCase().includes(q) ||
          (f.explanation && f.explanation.toLowerCase().includes(q)) ||
          (f.description && f.description.toLowerCase().includes(q)) ||
          (f.file || '').toLowerCase().includes(q) ||
          (f.file_path || '').toLowerCase().includes(q) ||
          (f.rule_id || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [findings, scanFilter, selectedSeverity, engine, findingCategory, ruleFilter, searchQuery]);

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
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`}
            />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Refresh error banner */}
      {refreshError && !isRefreshing && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] mb-4"
          style={{
            background: 'rgba(220, 38, 38, 0.07)',
            border: '1px solid rgba(220, 38, 38, 0.18)',
            color: '#dc2626',
          }}
        >
          <AlertCircle size={15} className="shrink-0" />
          <span>
            <strong>Unable to refresh findings</strong> — {refreshError}
          </span>
          <button
            onClick={() => setRefreshError(null)}
            className="ml-auto text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Filters */}
        <FindingFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSeverity={selectedSeverity}
          onSeverityChange={setSelectedSeverity}
          engine={engine}
          onEngineChange={setEngine}
          findingCategory={findingCategory}
          onFindingCategoryChange={setFindingCategory}
          availableCategories={availableCategories}
          // Day 3: Rule filter — always rendered; options populated from real data only
          ruleFilter={ruleFilter}
          onRuleFilterChange={setRuleFilter}
          availableRules={availableRules}
          totalCount={findings.length}
          filteredCount={filteredFindings.length}
          onReset={handleResetFilters}
        />

        {scanFilter && (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-purple-50/90 border border-purple-200/80 px-4 py-2 text-xs text-purple-900 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Filtered by Scan ID:</span>
              <code className="font-mono bg-white px-2 py-0.5 rounded border border-purple-200 text-purple-700 text-[11px]">
                {scanFilter}
              </code>
              <span className="text-slate-500">({filteredFindings.length} findings)</span>
            </div>
            <button
              onClick={() => setScanFilter('')}
              className="text-purple-700 hover:text-purple-900 font-medium underline text-xs cursor-pointer"
            >
              Show all findings
            </button>
          </div>
        )}

        {/* Content Area: 4 distinct states */}
        {isLoading ? (
          /* STATE 1: Loading */
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-16 skeleton" />
            ))}
            <p className="text-center text-[12px] text-slate-400">Loading findings…</p>
          </div>
        ) : loadError ? (
          /* STATE 4: API failure — clearly distinct from 'No findings' */
          <div className="card flex flex-col items-center justify-center p-12 text-center">
            <div
              className="grid h-12 w-12 place-items-center rounded-xl mb-4"
              style={{
                background: 'rgba(220, 38, 38, 0.07)',
                border: '1px solid rgba(220, 38, 38, 0.18)',
                color: '#dc2626',
              }}
            >
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-[16px] font-semibold" style={{ color: '#29384D' }}>
              Unable to load findings
            </h3>
            <p
              className="mt-1 text-[13px] max-w-sm leading-relaxed"
              style={{ color: '#687587' }}
            >
              {loadError}
            </p>
            <button onClick={loadFindings} className="btn-primary mt-5">
              Try Again
            </button>
          </div>
        ) : filteredFindings.length === 0 && findings.length > 0 ? (
          /* STATE 3b: Successful response but filtered to empty — reset filters */
          <div className="card flex flex-col items-center justify-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-muted-foreground">
              <Bug className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-[16px] font-semibold">
              No findings matched your criteria
            </h3>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-sm">
              Try adjusting your active severity, engine, category, or rule filters, or clearing the
              search query.
            </p>
            <button onClick={handleResetFilters} className="btn mt-5">
              Reset Filters
            </button>
          </div>
        ) : findings.length === 0 ? (
          /* STATE 3a: Successful response, zero findings */
          <div className="card flex flex-col items-center justify-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-muted-foreground">
              <Bug className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-[16px] font-semibold">No findings</h3>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-sm">
              No security findings were returned for this scan. Run a scan to detect
              vulnerabilities.
            </p>
          </div>
        ) : (
          /* STATE 2: Success with data */
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
        allFindings={findings}
        onClose={() => setSelectedFinding(null)}
      />
    </>
  );
};

export default Findings;
