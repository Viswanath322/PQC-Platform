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
            <ShieldAlert size={12} color="var(--color-graphite)" /> High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="badge-risk-medium">
            <AlertTriangle size={12} color="var(--color-risk-medium)" /> Medium
          </span>
        );
      case 'LOW':
        return (
          <span className="badge-risk-low">
            <ShieldCheck size={12} color="var(--color-muted-sage)" /> Low
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
          borderBottom: '1px solid rgba(255, 255, 255, 0.6)',
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(120, 135, 119, 0.14)',
              color: 'var(--color-graphite)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '12px',
              border: '1px solid rgba(120, 135, 119, 0.25)',
            }}
          >
            <Layers size={14} color="var(--color-muted-sage)" />
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
              background: 'rgba(255, 255, 255, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 12px',
              minWidth: '240px',
              boxShadow: '0 2px 6px rgba(41, 40, 36, 0.03)',
            }}
          >
            <Search size={14} color="var(--text-muted)" />
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
                color: 'var(--color-graphite)',
                background: 'transparent',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Dependency Filter */}
          <div style={{ display: 'flex', background: 'rgba(241, 237, 228, 0.8)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
            {(['ALL', 'Direct', 'Transitive'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setDependencyFilter(type)}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: dependencyFilter === type ? '#ffffff' : 'transparent',
                  color: dependencyFilter === type ? 'var(--color-graphite)' : 'var(--text-secondary)',
                  boxShadow: dependencyFilter === type ? '0 1px 3px rgba(41,40,36,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit',
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
                background: 'rgba(241, 237, 228, 0.65)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.6)',
                color: 'var(--text-secondary)',
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
                  borderBottom: '1px solid rgba(41, 40, 36, 0.05)',
                  backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.55)',
                }}
              >
                {/* Asset ID */}
                <td style={{ padding: '14px 20px', fontWeight: 600 }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: 'var(--color-graphite)',
                      background: 'rgba(41, 40, 36, 0.05)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(41, 40, 36, 0.08)',
                    }}
                  >
                    {entry.id}
                  </span>
                </td>

                {/* Algorithm Spec */}
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-graphite)' }}>{entry.algorithm}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{entry.usage}</div>
                </td>

                {/* Library & Version */}
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ color: 'var(--color-graphite)', fontWeight: 500 }}>{entry.library}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>v{entry.version}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: entry.dependencyType === 'Direct' ? 'rgba(120, 135, 119, 0.15)' : 'rgba(41, 40, 36, 0.06)',
                        color: entry.dependencyType === 'Direct' ? 'var(--color-muted-sage)' : 'var(--text-secondary)',
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
                    <FileCode2 size={13} color="var(--text-muted)" />
                    <code
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-graphite)',
                        background: 'rgba(41, 40, 36, 0.05)',
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
                        color: copiedId === entry.id ? 'var(--color-muted-sage)' : 'var(--text-light)',
                        padding: '2px',
                      }}
                    >
                      {copiedId === entry.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </td>

                {/* Standard Reference */}
                <td style={{ padding: '14px 16px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
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
          borderTop: '1px solid rgba(255, 255, 255, 0.6)',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
