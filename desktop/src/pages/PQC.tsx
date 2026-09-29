import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  FileSpreadsheet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RiskCard } from '@/components/pqc/RiskCard';
import { RiskDistribution } from '@/components/pqc/RiskDistribution';
import { CryptoInventoryTable } from '@/components/pqc/CryptoInventoryTable';
import { CBOMTable } from '@/components/pqc/CBOMTable';
import { MigrationCandidates } from '@/components/pqc/MigrationCandidates';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import {
  mockRiskSummary,
  mockCryptoInventory,
  mockCBOM,
  mockMigrationCandidates,
} from '@/data/pqcMockData';

interface PQCPageProps {
  onNavigateToInventory?: () => void;
  onNavigateToReports?: () => void;
  onShowToast?: (message: string) => void;
}

export const PQC: React.FC<PQCPageProps> = ({
  onNavigateToInventory,
  onNavigateToReports,
  onShowToast,
}) => {
  const navigate = useNavigate();
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [activeTableTab, setActiveTableTab] = useState<'inventory' | 'cbom'>('inventory');

  const handleNavInventory = onNavigateToInventory || (() => navigate('/crypto-inventory'));
  const handleNavReports = onNavigateToReports || (() => navigate('/reports'));

  const handleRiskFilterChange = (risk: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') => {
    setSelectedRiskFilter(risk);
  };

  return (
    <>
      <PageHeader
        title="PQC security assessment"
        description="Quantum readiness, Shor/Grover vulnerability evaluation, and NIST FIPS 203/204 migration candidates."
        actions={
          <>
            <button onClick={handleNavInventory} className="btn">
              <Lock className="h-3.5 w-3.5" />
              <span>Full inventory</span>
            </button>
            <button onClick={handleNavReports} className="btn-primary">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>View reports</span>
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {/* 1. Top Risk Cards Grid (High / Medium / Low + Quantum Readiness Summary) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <RiskCard
            level="HIGH"
            count={mockRiskSummary.high}
            label="High quantum risk"
            subtext="Shor vulnerable components"
            percentage={Math.round((mockRiskSummary.high / mockRiskSummary.total) * 100)}
            isActive={selectedRiskFilter === 'HIGH'}
            onClick={() => handleRiskFilterChange(selectedRiskFilter === 'HIGH' ? 'ALL' : 'HIGH')}
          />

          <RiskCard
            level="MEDIUM"
            count={mockRiskSummary.medium}
            label="Medium quantum risk"
            subtext="Components requiring hybrid review"
            percentage={Math.round((mockRiskSummary.medium / mockRiskSummary.total) * 100)}
            isActive={selectedRiskFilter === 'MEDIUM'}
            onClick={() => handleRiskFilterChange(selectedRiskFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          />

          <RiskCard
            level="LOW"
            count={mockRiskSummary.low}
            label="Low quantum risk"
            subtext="Quantum-safe / symmetric assets"
            percentage={Math.round((mockRiskSummary.low / mockRiskSummary.total) * 100)}
            isActive={selectedRiskFilter === 'LOW'}
            onClick={() => handleRiskFilterChange(selectedRiskFilter === 'LOW' ? 'ALL' : 'LOW')}
          />

          {/* Quantum Readiness Card */}
          <div className="card flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Quantum Readiness</span>
              <span className="rounded-full bg-critical/10 px-2 py-0.5 text-[11px] font-medium text-critical ring-1 ring-critical/25">
                {mockRiskSummary.atRiskPercentage}% At Risk
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <div className="tabular text-[36px] font-semibold leading-none tracking-tight text-primary">
                  {mockRiskSummary.readinessPercentage}%
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">Quantum Safe Readiness</p>
              </div>
              <ScoreRing value={mockRiskSummary.readinessPercentage} size={72} />
            </div>
            <p className="mt-3 truncate text-[12px] text-muted-foreground">
              Based on FIPS 203/204 algorithm standards
            </p>
          </div>
        </div>

        {/* 2. Risk Distribution Chart */}
        <RiskDistribution summary={mockRiskSummary} selectedRisk={selectedRiskFilter} />

        {/* 3. Migration Candidates */}
        <MigrationCandidates
          candidates={mockMigrationCandidates}
          onAssessCandidate={(c) => {
            if (onShowToast) {
              onShowToast(`Selected blueprint for ${c.recommendation} migration.`);
            }
          }}
        />

        {/* 4. Tabbed Table Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTableTab('inventory')}
                className={`px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${
                  activeTableTab === 'inventory'
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Cryptographic Assets Inventory ({mockCryptoInventory.length})
              </button>
              <button
                onClick={() => setActiveTableTab('cbom')}
                className={`px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${
                  activeTableTab === 'cbom'
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                CycloneDX CBOM Specification ({mockCBOM.length})
              </button>
            </div>
          </div>

          {activeTableTab === 'inventory' ? (
            <CryptoInventoryTable
              data={mockCryptoInventory}
              initialRiskFilter={selectedRiskFilter}
              showFiltersHeader={true}
              onItemSelect={(item) => {
                if (onShowToast) {
                  onShowToast(`Inspecting ${item.algorithm} in ${item.location}`);
                }
              }}
            />
          ) : (
            <CBOMTable data={mockCBOM} />
          )}
        </div>
      </div>
    </>
  );
};

export default PQC;
