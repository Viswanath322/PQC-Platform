import React, { useState } from 'react';
import { Lock, Layers, Database, Shield, Binary, Hash } from 'lucide-react';
import { MockDataBadge } from '../components/pqc/MockDataBadge';
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="title-level-1">Cryptographic Inventory</h1>
            <MockDataBadge />
          </div>
          <p className="subtitle-muted" style={{ fontSize: '14.5px', marginTop: '4px' }}>
            Cryptographic components identified during the assessment
          </p>
        </div>

        {/* Tab Switcher - Apple Glass Segmented Control */}
        <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.04)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <button
            onClick={() => setActiveTab('inventory')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '9px',
              cursor: 'pointer',
              background: activeTab === 'inventory' ? '#ffffff' : 'transparent',
              color: activeTab === 'inventory' ? 'var(--color-graphite)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'inventory' ? '0 2px 10px rgba(0, 0, 0, 0.06)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <Lock size={14} color={activeTab === 'inventory' ? 'var(--color-graphite)' : 'var(--text-muted)'} />
            Cryptographic Inventory
          </button>
          <button
            onClick={() => setActiveTab('cbom')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '9px',
              cursor: 'pointer',
              background: activeTab === 'cbom' ? '#ffffff' : 'transparent',
              color: activeTab === 'cbom' ? 'var(--color-graphite)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'cbom' ? '0 2px 10px rgba(0, 0, 0, 0.06)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <Layers size={14} color={activeTab === 'cbom' ? 'var(--color-graphite)' : 'var(--text-muted)'} />
            CBOM (Bill of Materials)
          </button>
        </div>
      </div>

      {/* Summary Stats Strip - Frosted Glass Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(43, 43, 40, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(43, 43, 40, 0.1)',
            }}
          >
            <Database size={18} color="var(--color-graphite)" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Total Identified
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{total} primitives</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(61, 53, 53, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(61, 53, 53, 0.14)',
            }}
          >
            <Shield size={18} color="#3D3535" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Asymmetric / PQC At Risk
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#3D3535' }}>
              {asymmetricCount} items
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(113, 128, 113, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(113, 128, 113, 0.2)',
            }}
          >
            <Binary size={18} color="var(--color-sage)" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Symmetric Ciphers
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-sage)' }}>
              {symmetricCount} items
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(200, 155, 85, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(200, 155, 85, 0.22)',
            }}
          >
            <Hash size={18} color="var(--color-warm-amber)" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Hashing & KDFs
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-warm-amber)' }}>
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
