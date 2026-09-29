import React, { useState } from 'react';
import { Lock, Layers, Database, Shield, Binary, Hash } from 'lucide-react';
import { MockDataBadge } from '../components/pqc/MockDataBadge';
import { CryptoInventoryTable } from '../components/pqc/CryptoInventoryTable';
import { CBOMTable } from '../components/pqc/CBOMTable';
import { mockCryptoInventory, mockCBOM } from '../data/pqcMockData';

export const CryptoInventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'cbom'>('inventory');

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="title-level-1">Cryptographic Inventory</h1>
            <MockDataBadge />
          </div>
          <p className="subtitle-muted" style={{ fontSize: '14px', marginTop: '4px' }}>
            Cryptographic components identified during the assessment
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(241, 237, 228, 0.8)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
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
              borderRadius: '8px',
              cursor: 'pointer',
              background: activeTab === 'inventory' ? '#ffffff' : 'transparent',
              color: 'var(--color-graphite)',
              boxShadow: activeTab === 'inventory' ? '0 2px 6px rgba(41,40,36,0.08)' : 'none',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
            }}
          >
            <Lock size={14} color="var(--color-graphite)" />
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
              borderRadius: '8px',
              cursor: 'pointer',
              background: activeTab === 'cbom' ? '#ffffff' : 'transparent',
              color: 'var(--color-graphite)',
              boxShadow: activeTab === 'cbom' ? '0 2px 6px rgba(41,40,36,0.08)' : 'none',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
            }}
          >
            <Layers size={14} color="var(--color-graphite)" />
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
              borderRadius: '10px',
              background: 'rgba(41, 40, 36, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.6)',
            }}
          >
            <Database size={18} color="var(--color-graphite)" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Total Identified
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-graphite)', letterSpacing: '-0.02em' }}>{total} primitives</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(41, 40, 36, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(41, 40, 36, 0.15)',
            }}
          >
            <Shield size={18} color="var(--color-graphite)" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Asymmetric / PQC At Risk
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-graphite)', letterSpacing: '-0.02em' }}>
              {asymmetricCount} items
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(120, 135, 119, 0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(120, 135, 119, 0.25)',
            }}
          >
            <Binary size={18} color="var(--color-muted-sage)" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Symmetric Ciphers
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-muted-sage)', letterSpacing: '-0.02em' }}>
              {symmetricCount} items
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(140, 106, 56, 0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(140, 106, 56, 0.22)',
            }}
          >
            <Hash size={18} color="#8c6a38" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Hashing & KDFs
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#8c6a38', letterSpacing: '-0.02em' }}>
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
