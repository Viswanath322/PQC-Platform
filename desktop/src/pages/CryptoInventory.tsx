import React, { useState } from 'react';
import { Lock, Layers, Binary, Hash, Shield } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CryptoInventoryTable } from '@/components/pqc/CryptoInventoryTable';
import { CBOMTable } from '@/components/pqc/CBOMTable';
import { mockCryptoInventory, mockCBOM } from '@/data/pqcMockData';

export const CryptoInventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'cbom'>('inventory');

  // Quick stats
  const total = mockCryptoInventory.length;
  const asymmetricCount = mockCryptoInventory.filter(
    (c) =>
      c.algorithm.includes('RSA') ||
      c.algorithm.includes('ECD') ||
      c.algorithm.includes('Ed25519') ||
      c.algorithm.includes('Diffie')
  ).length;
  const symmetricCount = mockCryptoInventory.filter(
    (c) =>
      c.algorithm.includes('AES') ||
      c.algorithm.includes('ChaCha') ||
      c.algorithm.includes('Blowfish')
  ).length;
  const hashCount = total - asymmetricCount - symmetricCount;

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
        {/* KPI Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Total Cryptographic Assets</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/25">
                <Shield className="h-4 w-4 text-primary" />
              </span>
            </div>
            <div className="mt-3 tabular text-[36px] font-semibold tracking-tight text-foreground leading-none">
              {total}
            </div>
            <p className="mt-3 truncate text-[13px] text-muted-foreground">
              Unique primitives detected
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Asymmetric Cryptography</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-critical/10 ring-1 ring-critical/25">
                <Binary className="h-4 w-4 text-critical" />
              </span>
            </div>
            <div className="mt-3 tabular text-[36px] font-semibold tracking-tight text-critical leading-none">
              {asymmetricCount}
            </div>
            <p className="mt-3 truncate text-[13px] text-muted-foreground">
              Shor-vulnerable (RSA, ECC, DH)
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Symmetric Ciphers</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-low/10 ring-1 ring-low/25">
                <Lock className="h-4 w-4 text-low" />
              </span>
            </div>
            <div className="mt-3 tabular text-[36px] font-semibold tracking-tight text-low leading-none">
              {symmetricCount}
            </div>
            <p className="mt-3 truncate text-[13px] text-muted-foreground">
              AES-256 / ChaCha20 primitives
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Hashes & Digests</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-medium/10 ring-1 ring-medium/25">
                <Hash className="h-4 w-4 text-medium" />
              </span>
            </div>
            <div className="mt-3 tabular text-[36px] font-semibold tracking-tight text-medium leading-none">
              {hashCount}
            </div>
            <p className="mt-3 truncate text-[13px] text-muted-foreground">
              SHA-2, SHA-3, MAC functions
            </p>
          </div>
        </div>

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
