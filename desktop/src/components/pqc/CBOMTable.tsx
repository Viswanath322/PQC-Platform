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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary-faded)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '12.5px',
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
              background: '#ffffff',
              border: '1px solid var(--border-glass-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 12px',
              minWidth: '240px',
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
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            />
          </div>

          {/* Dependency Filter */}
          <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
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
                  color: dependencyFilter === type ? 'var(--color-primary)' : 'var(--text-secondary)',
                  boxShadow: dependencyFilter === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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
                background: 'rgba(241, 245, 249, 0.75)',
                borderBottom: '1px solid var(--border-glass)',
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
                  borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
                  backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                }}
              >
                {/* Asset ID */}
                <td style={{ padding: '14px 20px', fontWeight: 600 }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: 'var(--color-primary)',
                      background: 'rgba(36, 52, 71, 0.05)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {entry.id}
                  </span>
                </td>

                {/* Algorithm Spec */}
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{entry.algorithm}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{entry.usage}</div>
                </td>

                {/* Library & Version */}
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{entry.library}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>v{entry.version}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: entry.dependencyType === 'Direct' ? 'var(--color-secondary-light)' : '#f1f5f9',
                        color: entry.dependencyType === 'Direct' ? 'var(--color-secondary-dark)' : 'var(--text-muted)',
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
                        color: 'var(--color-primary)',
                        background: 'rgba(36, 52, 71, 0.04)',
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
                        color: copiedId === entry.id ? 'var(--color-secondary-dark)' : 'var(--text-light)',
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
          Showing <strong>{filteredData.length}</strong> CBOM items
        </span>
        <span>Cryptographic Bill of Materials specification compliance view</span>
      </div>
    </div>
  );
};
