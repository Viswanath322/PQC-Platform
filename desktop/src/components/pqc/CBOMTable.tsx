import React, { useState, useMemo } from 'react';
import { Search, Layers, FileCode2, Copy, Check, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { CBOMEntry, RiskLevel } from '../../types/pqc';

interface CBOMTableProps {
  data: CBOMEntry[];
}

export const CBOMTable: React.FC<CBOMTableProps> = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dependencyFilter, setDependencyFilter] = useState<'ALL' | 'Direct' | 'Transitive'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (dependencyFilter !== 'ALL' && item.dependencyType !== dependencyFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.id.toLowerCase().includes(q) ||
          item.algorithm.toLowerCase().includes(q) ||
          item.library.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.usage.toLowerCase().includes(q) ||
          (item.standardReference || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, dependencyFilter, searchQuery]);

  const handleCopy = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'HIGH':
        return (
          <span className="badge-risk-high">
            <ShieldAlert size={12} /> High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="badge-risk-medium">
            <AlertTriangle size={12} /> Medium
          </span>
        );
      case 'LOW':
        return (
          <span className="badge-risk-low">
            <ShieldCheck size={12} /> Low
          </span>
        );
    }
  };

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* CBOM Controls Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(42, 157, 143, 0.2)',
              color: '#6ee7b7',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '12px',
              border: '1px solid rgba(42, 157, 143, 0.4)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            }}
          >
            <Layers size={14} />
            CycloneDX / CBOM Standard Spec v1.6
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Search */}
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
              padding: '6px 14px',
              minWidth: '240px',
            }}
          >
            <Search size={14} color="rgba(255, 255, 255, 0.6)" />
            <input
              type="text"
              placeholder="Search CBOM entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '12.5px',
                color: '#ffffff',
                background: 'transparent',
              }}
            />
          </div>

          {/* Dependency Filter Pill Switcher */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.08)', padding: '3px', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.14)' }}>
            {(['ALL', 'Direct', 'Transitive'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setDependencyFilter(type)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  background: dependencyFilter === type ? 'rgba(255, 255, 255, 0.22)' : 'transparent',
                  color: dependencyFilter === type ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  boxShadow: dependencyFilter === type ? 'inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 2px 6px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {type === 'ALL' ? 'All Types' : `${type} Deps`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
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
              <th style={{ padding: '12px 20px', width: '120px' }}>CBOM Asset ID</th>
              <th style={{ padding: '12px 18px', width: '170px' }}>Algorithm Spec</th>
              <th style={{ padding: '12px 16px', width: '150px' }}>Library & Version</th>
              <th style={{ padding: '12px 18px', minWidth: '220px' }}>Call Site / AST Location</th>
              <th style={{ padding: '12px 16px', width: '150px' }}>Standard Ref</th>
              <th style={{ padding: '12px 18px', width: '110px' }}>Quantum Risk</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((entry, idx) => (
              <tr
                key={entry.id}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Asset ID */}
                <td style={{ padding: '14px 20px', fontWeight: 600 }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#6ee7b7',
                      background: 'rgba(42, 157, 143, 0.18)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(42, 157, 143, 0.35)',
                    }}
                  >
                    {entry.id}
                  </span>
                </td>

                {/* Algorithm Spec */}
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>{entry.algorithm}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.55)' }}>{entry.usage}</div>
                </td>

                {/* Library & Version */}
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ color: '#ffffff', fontWeight: 500 }}>{entry.library}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>v{entry.version}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        background: entry.dependencyType === 'Direct' ? 'rgba(42, 157, 143, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                        color: entry.dependencyType === 'Direct' ? '#6ee7b7' : 'rgba(255, 255, 255, 0.7)',
                        fontWeight: 600,
                      }}
                    >
                      {entry.dependencyType}
                    </span>
                  </div>
                </td>

                {/* Location */}
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCode2 size={13} color="rgba(255, 255, 255, 0.6)" />
                    <code
                      style={{
                        fontSize: '12px',
                        color: '#6ee7b7',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        padding: '2px 7px',
                        borderRadius: '6px',
                      }}
                    >
                      {entry.location}
                    </code>
                    <button
                      onClick={(e) => handleCopy(e, entry.id, entry.location)}
                      title="Copy path"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: copiedId === entry.id ? '#6ee7b7' : 'rgba(255, 255, 255, 0.45)',
                        padding: '2px',
                      }}
                    >
                      {copiedId === entry.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </td>

                {/* Standard Reference */}
                <td style={{ padding: '14px 16px', fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.75)' }}>
                  {entry.standardReference || 'Standard Reference'}
                </td>

                {/* Risk */}
                <td style={{ padding: '14px 18px' }}>{renderRiskBadge(entry.risk)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
          Showing <strong>{filteredData.length}</strong> CBOM items
        </span>
        <span>Cryptographic Bill of Materials specification compliance view</span>
      </div>
    </div>
  );
};
