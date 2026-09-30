import React, { useState } from 'react';
import { Lock, Layers, Hash, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CryptoInventoryTable } from '@/components/pqc/CryptoInventoryTable';
import { CBOMTable } from '@/components/pqc/CBOMTable';
import { mockCryptoInventory, mockCBOM } from '@/data/pqcMockData';

export const CryptoInventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'cbom'>('inventory');

  // Quick stats
  const total = mockCryptoInventory.length;
  const vulnerableCount = mockCryptoInventory.filter((component) => component.quantumVulnerable).length;
  const resistantCount = total - vulnerableCount;
  const symmetricCount = mockCryptoInventory.filter(
    (c) =>
      c.algorithm.includes('AES') ||
      c.algorithm.includes('ChaCha') ||
      c.algorithm.includes('Blowfish')
  ).length;
  const hashCount = mockCryptoInventory.filter(
    (component) => /SHA|HMAC|PBKDF2|HKDF/i.test(component.algorithm)
  ).length;
  const vulnerableShare = total === 0 ? 0 : (vulnerableCount / total) * 100;
  const resistantShare = total === 0 ? 0 : (resistantCount / total) * 100;

  const postureMetrics = [
    { label: 'Total assets', value: total, tone: 'neutral', icon: Shield },
    { label: 'Shor-vulnerable', value: vulnerableCount, tone: 'risk', icon: ShieldAlert },
    { label: 'Quantum-resistant', value: resistantCount, tone: 'secure', icon: ShieldCheck },
    { label: 'Symmetric primitives', value: symmetricCount, tone: 'crypto', icon: Lock },
    { label: 'Hashes & digests', value: hashCount, tone: 'crypto', icon: Hash },
  ] as const;

  return (
    <>
      <PageHeader
        title="Cryptographic inventory & CBOM"
        description="Cryptographic primitives, algorithms, key sizes, and library bindings discovered during assessment."
        actions={
          <div className="flex rounded-lg border border-border bg-surface p-1">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                activeTab === 'inventory'
                  ? 'bg-surface-2 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Inventory</span>
            </button>
            <button
              onClick={() => setActiveTab('cbom')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                activeTab === 'cbom'
                  ? 'bg-surface-2 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>CycloneDX CBOM</span>
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        <section className="crypto-posture card" aria-labelledby="crypto-posture-heading">
          <div className="crypto-posture-heading">
            <div>
              <span className="crypto-posture-eyebrow">INVENTORY SUMMARY</span>
              <h2 id="crypto-posture-heading">Cryptographic posture</h2>
            </div>
            <span className="crypto-posture-count">{total} assets assessed</span>
          </div>

          <div className="crypto-posture-metrics">
            {postureMetrics.map(({ label, value, tone, icon: Icon }) => (
              <div className={`crypto-posture-metric tone-${tone}`} key={label}>
                <span className="crypto-posture-icon"><Icon className="h-4 w-4" /></span>
                <div className="crypto-posture-metric-copy">
                  <span>{label}</span>
                  <strong className="tabular">{value}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="crypto-posture-distribution" role="img" aria-label={`${vulnerableCount} quantum-vulnerable and ${resistantCount} quantum-resistant assets out of ${total}`}>
            <div className="crypto-posture-risk-segment" style={{ width: `${vulnerableShare}%` }} />
            <div className="crypto-posture-safe-segment" style={{ width: `${resistantShare}%` }} />
          </div>
          <div className="crypto-posture-legend">
            <span><i className="is-vulnerable" />Quantum-vulnerable <strong>{vulnerableCount}</strong></span>
            <span><i className="is-resistant" />Quantum-resistant <strong>{resistantCount}</strong></span>
          </div>
        </section>

        {/* Tab Content */}
        {activeTab === 'inventory' ? (
          <CryptoInventoryTable data={mockCryptoInventory} showFiltersHeader={true} />
        ) : (
          <CBOMTable data={mockCBOM} />
        )}
      </div>
    </>
  );
};

export default CryptoInventory;
