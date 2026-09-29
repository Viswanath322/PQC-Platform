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
            padding: '16px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: 'rgba(0, 0, 0, 0.18)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Box with Apple pill styling */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              borderRadius: '9999px',
              padding: '7px 14px',
              minWidth: '260px',
              flex: '1 1 260px',
              maxWidth: '380px',
            }}
          >
            <Search size={15} color="rgba(255, 255, 255, 0.6)" />
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
                color: '#ffffff',
                background: 'transparent',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
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
              <Filter size={13} color="rgba(255, 255, 255, 0.65)" />
              <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>Filters:</span>
            </div>

            {/* Risk Selector */}
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              style={{
                fontSize: '12.5px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <option value="ALL" style={{ background: '#1c2533', color: '#fff' }}>All Risk Levels</option>
              <option value="HIGH" style={{ background: '#1c2533', color: '#fff' }}>High Risk ({data.filter((d) => d.risk === 'HIGH').length})</option>
              <option value="MEDIUM" style={{ background: '#1c2533', color: '#fff' }}>Medium Risk ({data.filter((d) => d.risk === 'MEDIUM').length})</option>
              <option value="LOW" style={{ background: '#1c2533', color: '#fff' }}>Low Risk ({data.filter((d) => d.risk === 'LOW').length})</option>
            </select>

            {/* Algorithm Family Selector */}
            <select
              value={selectedAlgoGroup}
              onChange={(e) => setSelectedAlgoGroup(e.target.value)}
              style={{
                fontSize: '12.5px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <option value="ALL" style={{ background: '#1c2533', color: '#fff' }}>All Algorithms</option>
              {algorithmFamilies.map((family) => (
                <option key={family} value={family} style={{ background: '#1c2533', color: '#fff' }}>
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
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <option value="ALL" style={{ background: '#1c2533', color: '#fff' }}>All Libraries</option>
              {libraries.map((lib) => (
                <option key={lib} value={lib} style={{ background: '#1c2533', color: '#fff' }}>
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
                style={{ padding: '5px 12px', fontSize: '11.5px', height: '30px' }}
              >
                Reset
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
                background: 'rgba(0, 0, 0, 0.28)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.65)',
                fontWeight: 600,
                fontSize: '11.5px',
                letterSpacing: '0.04em',
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
                <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                  No cryptographic components found matching the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredData.map((item, idx) => (
                <tr
                  key={item.id}
                  onClick={() => onItemSelect && onItemSelect(item)}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                    cursor: onItemSelect ? 'pointer' : 'default',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)')
                  }
                >
                  {/* Algorithm */}
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: '#ffffff' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{item.algorithm}</span>
                      {item.curveOrKeySize && (
                        <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 400 }}>
                          {item.curveOrKeySize}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Library */}
                  <td style={{ padding: '14px 16px', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 500 }}>
                    {item.library}
                  </td>

                  {/* Version */}
                  <td style={{ padding: '14px 14px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11.5px',
                        padding: '2px 8px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        color: 'rgba(255, 255, 255, 0.75)',
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
                          color: '#6ee7b7',
                          background: 'rgba(42, 157, 143, 0.15)',
                          border: '1px solid rgba(42, 157, 143, 0.3)',
                          padding: '3px 8px',
                          borderRadius: '6px',
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
                          color: copiedId === item.id ? '#6ee7b7' : 'rgba(255, 255, 255, 0.45)',
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
                  <td style={{ padding: '14px 18px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>{item.usage}</span>
                      {item.purpose && (
                        <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.55)' }}>{item.purpose}</span>
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
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.6)',
        }}
      >
        <span>
          Showing <strong>{filteredData.length}</strong> of <strong>{data.length}</strong> cryptographic components
        </span>
        <span>Apple Silicon / PQC Cryptographic Telemetry</span>
      </div>
    </div>
  );
};
