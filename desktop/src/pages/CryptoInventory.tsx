import React, { useState, useEffect, useMemo } from 'react';
import { Lock, Layers, Binary, Hash, Shield, RefreshCw, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CryptoInventoryTable } from '@/components/pqc/CryptoInventoryTable';
import { api, ApiError } from '@/services/api';
import type { Finding } from '@/types';
import type { CryptoComponent, RiskLevel } from '@/types/pqc';

function classifyCryptoRisk(f: Finding): RiskLevel {
  const content = `${f.title} ${f.explanation || ''} ${f.evidence || ''}`.toLowerCase();
  const sev = (f.severity || '').toUpperCase();
  if (
    sev === 'CRITICAL' ||
    content.includes('rsa') ||
    content.includes('ecc') ||
    content.includes('diffie') ||
    content.includes('shor')
  ) {
    return 'HIGH';
  }
  if (
    sev === 'HIGH' ||
    content.includes('md5') ||
    content.includes('sha1') ||
    content.includes('weak') ||
    content.includes('deprecated')
  ) {
    return 'HIGH'; // Weak crypto hash MD5 is high risk
  }
  if (sev === 'MEDIUM') {
    return 'MEDIUM';
  }
  return 'LOW';
}

function extractAlgorithm(f: Finding): string {
  const content = `${f.title} ${f.evidence || ''}`.toUpperCase();
  if (content.includes('MD5')) return 'MD5';
  if (content.includes('SHA-1') || content.includes('SHA1')) return 'SHA-1';
  if (content.includes('SHA-256') || content.includes('SHA256')) return 'SHA-256';
  if (content.includes('RSA')) return 'RSA';
  if (content.includes('ECC') || content.includes('ECDSA') || content.includes('ECDH')) return 'ECC';
  if (content.includes('AES')) return 'AES-256';
  return f.title.split(' ')[0] || 'Cryptographic Primitive';
}

function findingToCryptoComponent(f: Finding): CryptoComponent {
  const risk = classifyCryptoRisk(f);
  const algo = extractAlgorithm(f);
  return {
    id: f.id,
    algorithm: algo,
    library: f.engine === 'crypto' ? 'Python hashlib' : 'AST Static Inspector',
    version: 'Standard Library',
    location: `${f.file}:${f.line}`,
    usage: f.title,
    risk: risk,
    quantumVulnerable: risk === 'HIGH' || risk === 'MEDIUM',
    status: 'Detected',
    purpose: f.explanation || f.evidence || 'AST static inspection',
  };
}

export const CryptoInventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'cbom'>('inventory');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.getFindings();
      setFindings(data);
    } catch (err) {
      console.error('Failed to load crypto inventory findings:', err);
      setLoadError(err instanceof ApiError ? err.userMessage : 'Failed to retrieve cryptographic findings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Filter cryptographic observations using contract: category === "CRYPTO" || engine === "crypto"
  const cryptoFindings = useMemo(() => {
    return findings.filter((f) => {
      const cat = (f.category || '').toUpperCase();
      const eng = (f.engine || '').toLowerCase();
      const content = `${f.title} ${f.explanation || ''}`.toLowerCase();
      return (
        cat === 'CRYPTO' ||
        eng === 'crypto' ||
        content.includes('cryptographic') ||
        content.includes('hash') ||
        content.includes('md5') ||
        content.includes('sha') ||
        content.includes('cipher')
      );
    });
  }, [findings]);

  // Convert real findings to CryptoComponent items
  const cryptoInventoryItems: CryptoComponent[] = useMemo(() => {
    return cryptoFindings.map(findingToCryptoComponent);
  }, [cryptoFindings]);

  // Calculate dynamic stats
  const total = cryptoInventoryItems.length;
  const asymmetricCount = cryptoInventoryItems.filter(
    (c) =>
      c.algorithm.includes('RSA') ||
      c.algorithm.includes('ECC') ||
      c.algorithm.includes('Diffie')
  ).length;
  const symmetricCount = cryptoInventoryItems.filter(
    (c) =>
      c.algorithm.includes('AES') ||
      c.algorithm.includes('ChaCha')
  ).length;
  const hashCount = cryptoInventoryItems.filter(
    (c) =>
      c.algorithm.includes('MD5') ||
      c.algorithm.includes('SHA') ||
      c.usage.toLowerCase().includes('hash')
  ).length;

  return (
    <>
      <PageHeader
        title="Cryptographic inventory & CBOM"
        description="Catalog of cryptographic primitives, algorithms, key sizes, and library bindings discovered during repository inspection."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="btn flex items-center gap-1.5"
              title="Refresh inventory"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || isLoading ? 'animate-spin text-primary' : ''}`} />
              <span>Refresh</span>
            </button>

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
                <span>Inventory ({total})</span>
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
          </div>
        }
      />

      {loadError && (
        <div className="rounded-xl p-4 bg-red-50/80 border border-red-200 text-red-900 text-xs flex items-center gap-2 mb-4">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Total Cryptographic Assets</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-100/70 border border-purple-200/80">
                <Shield className="h-4 w-4 text-purple-700" />
              </span>
            </div>
            <div className="mt-3 tabular text-[36px] font-semibold tracking-tight text-purple-700 leading-none">
              {total}
            </div>
            <p className="mt-3 truncate text-[13px] text-muted-foreground">
              {total > 0 ? `${total} real primitives detected` : 'No cryptographic assets detected'}
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
              {hashCount > 0 ? 'MD5 detected in codebase' : 'SHA-256 / Clean hygiene'}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'inventory' ? (
          <CryptoInventoryTable data={cryptoInventoryItems} showFiltersHeader={true} />
        ) : (
          <div className="card p-12 text-center flex flex-col items-center justify-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-100/70 border border-purple-200/80 text-purple-700 mb-3">
              <Layers className="h-6 w-6" />
            </div>
            <h4 className="font-semibold text-slate-900 text-[15px]">CycloneDX CBOM Specification</h4>
            <p className="text-slate-500 text-[13px] mt-1 max-w-md leading-relaxed">
              CycloneDX CBOM JSON export will be available in Day 3. Full CBOM serialization will compile discovered cryptographic primitives into standard CycloneDX 1.6 specifications.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default CryptoInventory;
