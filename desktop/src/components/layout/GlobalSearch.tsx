import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Atom,
  Box,
  FileCode2,
  FolderGit2,
  Search,
  ScanLine,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { Finding, Project, Scan } from '@/types';
import type { CryptoComponent } from '@/types/pqc';
import { api } from '@/services/api';
import { mockCryptoInventory } from '@/data/pqcMockData';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { CategoryBadge } from '@/components/common/CategoryBadge';

type SearchGroup = 'Findings' | 'Projects' | 'Scans' | 'Algorithms' | 'Files' | 'Crypto assets';
type SearchResult = {
  key: string;
  group: SearchGroup;
  title: string;
  detail: string;
  searchable: string;
  to: string;
  finding?: Finding;
};
type SearchSources = { findings: Finding[]; projects: Project[]; scans: Scan[]; crypto: CryptoComponent[] };

const groupOrder: SearchGroup[] = ['Findings', 'Projects', 'Scans', 'Algorithms', 'Files', 'Crypto assets'];
const groupIcons = {
  Findings: ShieldAlert,
  Projects: FolderGit2,
  Scans: ScanLine,
  Algorithms: Atom,
  Files: FileCode2,
  'Crypto assets': Box,
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<SearchSources | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const loadSources = useCallback(async () => {
    if (sources || isLoading) return;
    setIsLoading(true);
    try {
      const [findings, projects, scans] = await Promise.all([
        api.getFindings(),
        api.getProjects(),
        api.getScans(),
      ]);
      setSources({ findings, projects, scans, crypto: mockCryptoInventory });
    } catch {
      setSources({ findings: [], projects: [], scans: [], crypto: mockCryptoInventory });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sources]);

  const openSearch = useCallback(() => {
    setIsOpen(true);
    void loadSources();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [loadSources]);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [openSearch]);

  const results = useMemo(() => {
    if (!sources) return [] as SearchResult[];
    const all: SearchResult[] = [];

    sources.findings.forEach((finding) => all.push({
      key: `finding:${finding.finding_id}`,
      group: 'Findings',
      title: finding.title,
      detail: `${finding.finding_id} · ${finding.file_path}`,
      searchable: [finding.finding_id, finding.title, finding.file_path, finding.category, finding.evidence].join(' '),
      to: '/findings',
      finding,
    }));
    sources.projects.forEach((project) => all.push({
      key: `project:${project.id}`,
      group: 'Projects',
      title: project.name,
      detail: `${project.repository_url} · ${project.branch}`,
      searchable: `${project.name} ${project.description} ${project.repository_url} ${project.branch}`,
      to: '/projects',
    }));
    sources.scans.forEach((scan) => all.push({
      key: `scan:${scan.id}`,
      group: 'Scans',
      title: scan.id,
      detail: `${scan.status.replace('_', ' ')} · ${scan.project_name} · ${scan.repository_name}`,
      searchable: `${scan.id} ${scan.status} ${scan.project_name} ${scan.repository_name} ${scan.file_name ?? ''}`,
      to: '/scans',
    }));
    sources.crypto.forEach((asset) => all.push({
      key: `algorithm:${asset.id}`,
      group: 'Algorithms',
      title: asset.algorithm,
      detail: `${asset.library} ${asset.version} · ${asset.location}`,
      searchable: `${asset.algorithm} ${asset.library} ${asset.version} ${asset.location} ${asset.usage}`,
      to: '/inventory',
    }));

    const fileResults = new Map<string, SearchResult>();
    sources.findings.forEach((finding) => fileResults.set(finding.file_path, {
      key: `file:finding:${finding.finding_id}`,
      group: 'Files',
      title: finding.file_path,
      detail: `Finding ${finding.finding_id} · ${finding.title}`,
      searchable: `${finding.file_path} ${finding.finding_id} ${finding.title}`,
      to: '/findings',
      finding,
    }));
    sources.crypto.forEach((asset) => {
      if (!fileResults.has(asset.location)) fileResults.set(asset.location, {
        key: `file:crypto:${asset.id}`,
        group: 'Files',
        title: asset.location,
        detail: `${asset.algorithm} · ${asset.library}`,
        searchable: `${asset.location} ${asset.algorithm} ${asset.library}`,
        to: '/inventory',
      });
    });
    all.push(...fileResults.values());

    sources.crypto.forEach((asset) => all.push({
      key: `asset:${asset.id}`,
      group: 'Crypto assets',
      title: asset.library,
      detail: `${asset.algorithm} · ${asset.location}`,
      searchable: `${asset.id} ${asset.library} ${asset.version} ${asset.algorithm} ${asset.location} ${asset.usage} ${asset.purpose ?? ''}`,
      to: '/inventory',
    }));

    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery
      ? all.filter((result) => `${result.title} ${result.detail} ${result.searchable}`.toLowerCase().includes(normalizedQuery))
      : [];
  }, [query, sources]);

  const visibleResults = useMemo(
    () => groupOrder.flatMap((group) => results.filter((result) => result.group === group).slice(0, 5)),
    [results],
  );

  const selectResult = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
    if (result.finding) {
      navigate(result.to, { state: { selectedFindingId: result.finding.finding_id } });
    } else {
      navigate(result.to);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setQuery('');
      setActiveIndex(-1);
    } else if (event.key === 'ArrowDown' && visibleResults.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % visibleResults.length);
    } else if (event.key === 'ArrowUp' && visibleResults.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? visibleResults.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0 && visibleResults[activeIndex]) {
      event.preventDefault();
      selectResult(visibleResults[activeIndex]);
    }
  };

  const flatIndex = (result: SearchResult) => visibleResults.findIndex((candidate) => candidate.key === result.key);

  return (
    <>
      {isOpen && <button type="button" className="global-search-backdrop" aria-label="Close search" onClick={() => setIsOpen(false)} />}
      <div className={`global-search relative mx-auto hidden w-full max-w-[360px] md:block ${isOpen ? 'is-open' : ''}`}>
        <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          aria-label="Search"
          aria-expanded={isOpen}
          aria-controls="global-search-results"
          aria-activedescendant={activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined}
          placeholder="Search findings, projects, algorithms…"
          className="h-9 w-full rounded-lg border border-slate-200/80 bg-slate-50/75 pl-9 pr-20 text-[12px] text-foreground outline-none transition-all duration-150 placeholder:text-slate-400 hover:bg-white focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/15"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); }}
          onFocus={() => { setIsOpen(true); void loadSources(); }}
          onKeyDown={handleKeyDown}
        />
        {query ? (
          <button type="button" className="global-search-clear" aria-label="Clear search" onClick={() => { setQuery(''); setActiveIndex(-1); inputRef.current?.focus(); }}>
            <X className="h-3.5 w-3.5" />
          </button>
        ) : <kbd className="global-search-shortcut">⌘ K</kbd>}

        {isOpen && (
          <div id="global-search-panel" className="global-search-panel" role="dialog" aria-label="Secure workspace search">
            <div className="global-search-panel-header">
              <div>
                <span>SECURE SEARCH</span>
                <strong>{query.trim() ? `Results for “${query.trim()}”` : 'Search across your workspace'}</strong>
              </div>
              <kbd>ESC</kbd>
            </div>
            <div id="global-search-results" className="global-search-results" role="listbox" aria-label="Grouped search results">
              {!query.trim() ? (
                <div className="global-search-hint">Search findings, projects, scans, algorithms, files, and crypto assets.</div>
              ) : isLoading ? (
                <div className="global-search-hint">Searching existing workspace data…</div>
              ) : results.length === 0 ? (
                <div className="global-search-hint">No matching results in the available workspace data.</div>
              ) : (
                groupOrder.map((group) => {
                  const groupResults = results.filter((result) => result.group === group);
                  if (!groupResults.length) return null;
                  const GroupIcon = groupIcons[group];
                  return (
                    <section className="global-search-group" key={group} role="group" aria-label={group}>
                      <h3><span><GroupIcon className="h-3.5 w-3.5" />{group}</span><span>{groupResults.length}</span></h3>
                      {groupResults.slice(0, 5).map((result) => {
                        const index = flatIndex(result);
                        return (
                          <button
                            id={`global-search-result-${index}`}
                            key={result.key}
                            type="button"
                            role="option"
                            aria-selected={activeIndex === index}
                            className={`global-search-result ${activeIndex === index ? 'is-active' : ''}`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => selectResult(result)}
                          >
                            <span className="global-search-result-copy">
                              <strong className={group === 'Scans' || group === 'Files' ? 'is-mono' : ''}>{result.title}</strong>
                              <small className={group === 'Projects' || group === 'Findings' || group === 'Algorithms' || group === 'Crypto assets' ? 'is-mono' : ''}>{result.detail}</small>
                            </span>
                            {result.finding && (
                              <span className="global-search-finding-meta">
                                <CategoryBadge category={result.finding.engine} size="sm" />
                                <SeverityBadge severity={result.finding.severity} size="sm" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </section>
                  );
                })
              )}
            </div>
            <div className="global-search-panel-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><kbd>⌘ K</kbd> search</span></div>
          </div>
        )}
      </div>
    </>
  );
}
