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
          padding: '16px 24px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(113, 128, 113, 0.12)',
              color: '#718071',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '12px',
              border: '1px solid rgba(113, 128, 113, 0.25)',
            }}
          >
            <Layers size={13} />
            CycloneDX / CBOM Standard Spec v1.6
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              borderRadius: 'var(--radius-full)',
              padding: '5px 14px',
              minWidth: '240px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
            }}
          >
            <Search size={13} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search CBOM entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '12px',
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            />
          </div>

          {/* Dependency Filter */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.04)', padding: '3px', borderRadius: 'var(--radius-full)' }}>
            {(['ALL', 'Direct', 'Transitive'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setDependencyFilter(type)}
                style={{
                  padding: '4px 11px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  background: dependencyFilter === type ? '#ffffff' : 'transparent',
                  color: dependencyFilter === type ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: dependencyFilter === type ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
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
                background: 'rgba(255, 255, 255, 0.35)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                color: '#666762',
                fontWeight: 600,
                fontSize: '11.5px',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              <th style={{ padding: '12px 22px', width: '120px' }}>CBOM Asset ID</th>
              <th style={{ padding: '12px 18px', width: '170px' }}>Algorithm Spec</th>
              <th style={{ padding: '12px 16px', width: '150px' }}>Library & Version</th>
              <th style={{ padding: '12px 18px', minWidth: '220px' }}>Call Site / AST Location</th>
              <th style={{ padding: '12px 16px', width: '150px' }}>Standard Ref</th>
              <th style={{ padding: '12px 22px', width: '110px' }}>Quantum Risk</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((entry, idx) => (
              <tr
                key={entry.id}
                style={{
                  borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
                  backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.45)',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.65)')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    idx % 2 === 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.45)')
                }
              >
                {/* Asset ID */}
                <td style={{ padding: '13px 22px', fontWeight: 600 }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#252522',
                      background: 'rgba(0, 0, 0, 0.035)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {entry.id}
                  </span>
                </td>

                {/* Algorithm Spec */}
                <td style={{ padding: '13px 18px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.algorithm}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{entry.usage}</div>
                </td>

                {/* Library & Version */}
                <td style={{ padding: '13px 16px' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{entry.library}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>v{entry.version}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: entry.dependencyType === 'Direct' ? 'rgba(113, 128, 113, 0.12)' : 'rgba(0,0,0,0.03)',
                        color: entry.dependencyType === 'Direct' ? '#718071' : 'var(--text-muted)',
                        fontWeight: 600,
                      }}
                    >
                      {entry.dependencyType}
                    </span>
                  </div>
                </td>

                {/* Location */}
                <td style={{ padding: '13px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCode2 size={13} color="var(--text-muted)" />
                    <code
                      style={{
                        fontSize: '12px',
                        color: '#252522',
                        background: 'rgba(0, 0, 0, 0.03)',
                        padding: '2px 6px',
                        borderRadius: '4px',
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
                        color: copiedId === entry.id ? '#718071' : 'var(--text-muted)',
                        padding: '2px',
                      }}
                    >
                      {copiedId === entry.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </td>

                {/* Standard Reference */}
                <td style={{ padding: '13px 16px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {entry.standardReference || 'Standard Reference'}
                </td>

                {/* Risk */}
                <td style={{ padding: '13px 22px' }}>{renderRiskBadge(entry.risk)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          padding: '12px 24px',
          borderTop: '1px solid rgba(0, 0, 0, 0.04)',
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-muted)',
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
