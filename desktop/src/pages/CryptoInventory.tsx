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
        <div style={{ display: 'flex', background: 'rgba(15, 23, 36, 0.75)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
              background: activeTab === 'inventory' ? 'rgba(42, 157, 143, 0.28)' : 'transparent',
              color: activeTab === 'inventory' ? '#5eead4' : '#94a3b8',
              boxShadow: activeTab === 'inventory' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
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
              background: activeTab === 'cbom' ? 'rgba(42, 157, 143, 0.28)' : 'transparent',
              color: activeTab === 'cbom' ? '#5eead4' : '#94a3b8',
              boxShadow: activeTab === 'cbom' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
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
              background: 'rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Database size={18} color="#5eead4" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Total Identified
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>{total} primitives</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(239, 68, 68, 0.25)',
            }}
          >
            <Shield size={18} color="#fca5a5" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Asymmetric / PQC At Risk
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fca5a5' }}>
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
              background: 'rgba(42, 157, 143, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(42, 157, 143, 0.25)',
            }}
          >
            <Binary size={18} color="#5eead4" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Symmetric Ciphers
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#5eead4' }}>
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
              background: 'rgba(233, 162, 59, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(233, 162, 59, 0.25)',
            }}
          >
            <Hash size={18} color="#fcd34d" />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Hashing & KDFs
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fcd34d' }}>
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
