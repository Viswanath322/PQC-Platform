import React from 'react';
import { ArrowRight, Cpu, GitBranch } from 'lucide-react';
import type { MigrationCandidate } from '../../types/pqc';
import { MockDataBadge } from './MockDataBadge';

interface MigrationCandidatesProps {
  candidates: MigrationCandidate[];
  onAssessCandidate?: (candidate: MigrationCandidate) => void;
}

export const MigrationCandidates: React.FC<MigrationCandidatesProps> = ({
  candidates,
  onAssessCandidate,
}) => {
  return (
    <div className="card flex flex-col gap-5 p-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="section-title">PQC migration candidates</h3>
            <span className="rounded-full bg-purple-100/70 border border-purple-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 shadow-xs">
              NIST FIPS 203 / 204
            </span>
            <MockDataBadge size="sm" label="Development / Mock Data" />
          </div>
          <p className="section-sub mt-0.5 text-muted-foreground">
            Development examples — not generated from an actual scan. Illustrative quantum-vulnerable primitives and recommended post-quantum replacements.
          </p>
        </div>
        <div className="text-[12px] text-muted-foreground">
          Showing <span className="tabular font-medium text-foreground">{candidates.length}</span> example candidates
        </div>
      </div>

      {/* Candidate Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {candidates.map((item) => (
          <div
            key={item.id}
            className="card card-hover flex flex-col justify-between border-l-2 border-l-critical bg-surface-2/40 p-4"
          >
            {/* Header info */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono text-[11px] text-muted-foreground">{item.id} · Example</span>
                <span className="rounded-full bg-critical/10 px-2 py-0.5 text-[10px] font-medium text-critical ring-1 ring-critical/25 uppercase">
                  {item.risk} Risk
                </span>
              </div>


              {/* Current vs Target Algorithm */}
              <div className="rounded-lg bg-surface p-3 border border-border">
                <div className="flex items-center justify-between text-[12px]">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground">Classical Primitive</span>
                    <div className="font-mono font-semibold text-critical text-[13px] mt-0.5">
                      {item.algorithm}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mx-2" />
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-muted-foreground">Target Standard</span>
                    <div className="font-mono font-semibold text-purple-700 text-[12px] mt-0.5">
                      {item.nistStandard || 'FIPS 203'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Context metadata */}
              <div className="mt-3 space-y-1 text-[12px] text-muted-foreground">
                <div className="flex items-center gap-1.5 font-mono text-[11.5px] truncate">
                  <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.location}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px]">
                  <Cpu className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>Recommendation: <strong className="text-foreground">{item.recommendation}</strong></span>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Effort: <strong className="text-foreground capitalize">{item.estimatedEffort || 'Medium'}</strong>
              </span>
              <button
                onClick={() => onAssessCandidate?.(item)}
                className="btn h-7 px-2.5 text-[12px]"
                title="Migration Blueprint (Day 1 UI placeholder)"
              >
                <span>Migration Blueprint</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
