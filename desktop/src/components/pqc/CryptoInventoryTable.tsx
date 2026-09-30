import React, { useState, useMemo } from 'react';
import { Search, Filter, Copy, Check, ShieldAlert, AlertTriangle, ShieldCheck, X, ChevronDown, ChevronRight, FileCode } from 'lucide-react';
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 1600);
    }).catch((error: unknown) => {
      console.warn('Could not copy cryptographic asset location.', error);
    });
  };

  const renderRiskBadge = (risk: RiskLevel, quantumVulnerable: boolean) => {
    const RiskIcon = risk === 'HIGH' ? ShieldAlert : risk === 'MEDIUM' ? AlertTriangle : ShieldCheck;
    const riskClass = risk.toLowerCase();
    const PostureIcon = quantumVulnerable ? ShieldAlert : ShieldCheck;

    return (
      <div className="crypto-risk-stack">
        <span className={`crypto-posture-badge ${quantumVulnerable ? 'is-vulnerable' : 'is-resistant'}`}>
          <PostureIcon className="h-3.5 w-3.5" />
          {quantumVulnerable ? 'Quantum vulnerable' : 'Quantum resistant'}
        </span>
        <span className={`crypto-risk-level is-${riskClass}`}>
          <RiskIcon className="h-3 w-3" /> {riskClass} risk
        </span>
      </div>
    );
  };

  const getAlgorithmFamily = (algorithm: string) => {
    const normalized = algorithm.toUpperCase();
    if (normalized.includes('DIFFIE-HELLMAN')) return 'Diffie-Hellman';
    if (normalized.includes('CURVE25519')) return 'Curve25519';
    if (normalized.includes('ED25519')) return 'Ed25519';
    if (normalized.includes('ECDSA')) return 'ECDSA';
    if (normalized.includes('ECDH')) return 'ECDH';
    if (normalized.includes('RSA')) return 'RSA';
    if (normalized.includes('CHACHA20')) return 'ChaCha20';
    if (normalized.includes('BLOWFISH')) return 'Blowfish';
    if (normalized.includes('AES')) return 'AES';
    if (normalized.includes('PBKDF2')) return 'PBKDF2';
    if (normalized.includes('HKDF')) return 'HKDF';
    if (normalized.includes('HMAC')) return 'HMAC';
    if (normalized.includes('SHA3')) return 'SHA-3';
    if (normalized.includes('SHA')) return 'SHA';
    return algorithm.split(/[- ]/)[0];
  };

  const toggleExpanded = (id: string) => setExpandedId((current) => current === id ? null : id);

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
        <table className="crypto-flow-table w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2/50 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <th className="py-3 px-4 w-44"><span>Algorithm <ChevronRight /></span></th>
              <th className="py-3 px-4 w-36"><span>Library <ChevronRight /></span></th>
              <th className="py-3 px-4 w-24"><span>Version <ChevronRight /></span></th>
              <th className="py-3 px-4 min-w-[220px]"><span>Source location <ChevronRight /></span></th>
              <th className="py-3 px-4 w-40"><span>Usage <ChevronRight /></span></th>
              <th className="py-3 px-4 w-48">Quantum risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  No cryptographic components found matching the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <React.Fragment key={item.id}>
                <tr
                  onClick={() => {
                    onItemSelect?.(item);
                    toggleExpanded(item.id);
                  }}
                  aria-expanded={expandedId === item.id}
                  className={`crypto-inventory-row ${expandedId === item.id ? 'is-expanded' : ''}`}
                >
                  {/* Algorithm */}
                  <td className="py-3 px-4 font-medium text-foreground">
                    <div className="crypto-algorithm-cell">
                      <div className="flex min-w-0 flex-col">
                        <span className="font-mono text-[13px]">{item.algorithm}</span>
                        {item.curveOrKeySize && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {item.curveOrKeySize}
                          </span>
                        )}
                        <span className="crypto-family-badge">{getAlgorithmFamily(item.algorithm)}</span>
                      </div>
                      <button
                        type="button"
                        className="crypto-expand-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleExpanded(item.id);
                        }}
                        aria-label={`${expandedId === item.id ? 'Collapse' : 'Expand'} details for ${item.algorithm}`}
                        title={expandedId === item.id ? 'Hide algorithm details' : 'Show algorithm details'}
                      >
                        {expandedId === item.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
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
                    <div className="crypto-location-cell">
                      <FileCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <code className="font-mono text-[11.5px] text-primary bg-surface-2 px-1.5 py-0.5 rounded break-all max-w-[300px] truncate">
                        {item.location}
                      </code>
                      <button
                        onClick={(e) => handleCopyLocation(e, item.id, item.location)}
                        title={copiedId === item.id ? 'Source path copied' : 'Copy source path'}
                        className="crypto-copy-path"
                        aria-label={`${copiedId === item.id ? 'Copied' : 'Copy'} source path for ${item.algorithm}`}
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Usage */}
                  <td className="py-3 px-4 text-muted-foreground">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-medium text-foreground">{item.usage}</span>
                      {item.purpose && (
                        <span className="text-[11px] text-muted-foreground">{item.purpose}</span>
                      )}
                    </div>
                  </td>

                  {/* Risk */}
                  <td className="py-3 px-4">{renderRiskBadge(item.risk, item.quantumVulnerable)}</td>
                </tr>
                {expandedId === item.id && (
                  <tr className="crypto-expanded-row">
                    <td colSpan={6}>
                      <div className="crypto-expanded-details">
                        {item.curveOrKeySize && <div><span>Key / curve detail</span><strong>{item.curveOrKeySize}</strong></div>}
                        <div><span>Purpose</span><strong>{item.purpose || item.usage}</strong></div>
                        <div><span>Quantum posture</span><strong className={item.quantumVulnerable ? 'text-critical' : 'text-success'}>{item.quantumVulnerable ? 'Shor-vulnerable' : 'Quantum-resistant'}</strong></div>
                        {item.status && <div><span>Status</span><strong>{item.status}</strong></div>}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
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
        <span className="font-mono text-[11px]">NIST FIPS 203 / 204 AST Inspector</span>
      </div>
    </div>
  );
};
