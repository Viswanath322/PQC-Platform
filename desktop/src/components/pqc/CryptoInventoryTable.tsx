import React, { useState, useMemo } from 'react';
import { Search, Filter, Copy, Check, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
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

  // Extract unique algorithm families and libraries for filters
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

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Risk filter
      if (selectedRisk !== 'ALL' && item.risk !== selectedRisk) {
        return false;
      }
      // Algo filter
      if (selectedAlgoGroup !== 'ALL' && !item.algorithm.toUpperCase().includes(selectedAlgoGroup.toUpperCase())) {
        return false;
      }
      // Library filter
      if (selectedLibrary !== 'ALL' && item.library !== selectedLibrary) {
        return false;
      }
      // Text search
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
          <span className="badge-risk-high" title="Vulnerable to Shor's algorithm">
            <ShieldAlert size={12} />
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="badge-risk-medium" title="Requires review or transitional mitigation">
            <AlertTriangle size={12} />
            Medium
          </span>
        );
      case 'LOW':
        return (
          <span className="badge-risk-low" title="Symmetric / Quantum-resistant with appropriate key length">
            <ShieldCheck size={12} />
            Low
          </span>
        );
    }
  };

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {showFiltersHeader && (
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-glass)',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              border: '1px solid var(--border-glass-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '7px 12px',
              minWidth: '260px',
              flex: '1 1 260px',
              maxWidth: '380px',
            }}
          >
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search algorithm, file, library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '13px',
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={13} color="var(--text-muted)" />
              <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)' }}>Filters:</span>
            </div>

            {/* Risk Selector */}
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              style={{
                fontSize: '12.5px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-glass-strong)',
                background: '#ffffff',
                color: 'var(--color-primary)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
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
              style={{
                fontSize: '12.5px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-glass-strong)',
                background: '#ffffff',
                color: 'var(--color-primary)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
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
              style={{
                fontSize: '12.5px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-glass-strong)',
                background: '#ffffff',
                color: 'var(--color-primary)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
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
                className="btn-secondary"
                style={{ padding: '5px 10px', fontSize: '11.5px', height: '30px' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr
              style={{
                background: 'rgba(241, 245, 249, 0.75)',
                borderBottom: '1px solid var(--border-glass)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              <th style={{ padding: '12px 20px', width: '180px' }}>Algorithm</th>
              <th style={{ padding: '12px 16px', width: '140px' }}>Library</th>
              <th style={{ padding: '12px 14px', width: '90px' }}>Version</th>
              <th style={{ padding: '12px 20px', minWidth: '220px' }}>Location</th>
              <th style={{ padding: '12px 18px', width: '160px' }}>Usage</th>
              <th style={{ padding: '12px 20px', width: '110px' }}>Risk</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No cryptographic components found matching the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredData.map((item, idx) => (
                <tr
                  key={item.id}
                  onClick={() => onItemSelect && onItemSelect(item)}
                  style={{
                    borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
                    backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                    cursor: onItemSelect ? 'pointer' : 'default',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(241, 245, 249, 0.9)')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      idx % 2 === 0 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)')
                  }
                >
                  {/* Algorithm */}
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-primary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{item.algorithm}</span>
                      {item.curveOrKeySize && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                          {item.curveOrKeySize}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Library */}
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {item.library}
                  </td>

                  {/* Version */}
                  <td style={{ padding: '14px 14px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11.5px',
                        padding: '2px 6px',
                        background: 'rgba(36, 52, 71, 0.05)',
                        borderRadius: '4px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {item.version}
                    </span>
                  </td>

                  {/* Location */}
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <code
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-primary)',
                          background: 'rgba(36, 52, 71, 0.04)',
                          padding: '3px 7px',
                          borderRadius: '4px',
                          wordBreak: 'break-all',
                        }}
                      >
                        {item.location}
                      </code>
                      <button
                        onClick={(e) => handleCopyLocation(e, item.id, item.location)}
                        title="Copy file path"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: copiedId === item.id ? 'var(--color-secondary-dark)' : 'var(--text-light)',
                          padding: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px',
                        }}
                      >
                        {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>

                  {/* Usage */}
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>{item.usage}</span>
                      {item.purpose && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.purpose}</span>
                      )}
                    </div>
                  </td>

                  {/* Risk */}
                  <td style={{ padding: '14px 20px' }}>{renderRiskBadge(item.risk)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-glass)',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          Showing <strong>{filteredData.length}</strong> of <strong>{data.length}</strong> cryptographic components
        </span>
        <span>Standard cryptographic AST inspection</span>
      </div>
    </div>
  );
};
