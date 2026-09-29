import React, { useState } from 'react';
import { Lock, Layers, Database, Shield, Binary, Hash } from 'lucide-react';
import { CryptoInventoryTable } from '../components/pqc/CryptoInventoryTable';
import { CBOMTable } from '../components/pqc/CBOMTable';
import { mockCryptoInventory, mockCBOM } from '../data/pqcMockData';

export const CryptoInventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'cbom'>('inventory');

  // Quick stats
  const total = mockCryptoInventory.length;
  const asymmetricCount = mockCryptoInventory.filter(
    (c) => c.algorithm.includes('RSA') || c.algorithm.includes('ECD') || c.algorithm.includes('Ed25519') || c.algorithm.includes('Diffie')
  ).length;
  const symmetricCount = mockCryptoInventory.filter((c) => c.algorithm.includes('AES') || c.algorithm.includes('ChaCha') || c.algorithm.includes('Blowfish')).length;
  const hashCount = total - asymmetricCount - symmetricCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 className="title-level-1">Cryptographic Inventory & CBOM</h1>
          <p className="subtitle-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
            Cryptographic components, ciphers, and algorithms identified during assessment
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('inventory')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              background: activeTab === 'inventory' ? '#ffffff' : 'transparent',
              color: activeTab === 'inventory' ? 'var(--color-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'inventory' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Lock size={14} />
            Cryptographic Inventory
          </button>
          <button
            onClick={() => setActiveTab('cbom')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              background: activeTab === 'cbom' ? '#ffffff' : 'transparent',
              color: activeTab === 'cbom' ? 'var(--color-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'cbom' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Layers size={14} />
            CBOM (Bill of Materials)
          </button>
        </div>
      </div>

      {/* Summary Stats Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'var(--color-primary-faded)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Database size={18} color="var(--color-primary)" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Total Identified
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>{total} primitives</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={18} color="var(--color-risk-high)" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Asymmetric / PQC At Risk
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-risk-high)' }}>
              {asymmetricCount} items
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'var(--color-secondary-faded)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Binary size={18} color="var(--color-secondary-dark)" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Symmetric Ciphers
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-secondary-dark)' }}>
              {symmetricCount} items
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'var(--color-accent-faded)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Hash size={18} color="var(--color-accent-dark)" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Hashing & KDFs
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-accent-dark)' }}>
              {hashCount} items
            </div>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      {activeTab === 'inventory' ? (
        <CryptoInventoryTable data={mockCryptoInventory} />
      ) : (
        <CBOMTable data={mockCBOM} />
      )}
    </div>
  );
};
