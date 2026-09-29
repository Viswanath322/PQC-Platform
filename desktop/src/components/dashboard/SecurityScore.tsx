import React from 'react';
import { ShieldCheck, Atom } from 'lucide-react';

interface SecurityScoreProps {
  securityScore?: number;
  pqcReadinessScore?: number;
  lastScanTimestamp?: string;
  repositoryName?: string;
  branchName?: string;
}

export const SecurityScore: React.FC<SecurityScoreProps> = ({
  securityScore = 74,
  pqcReadinessScore = 58,
}) => {
  return (
    <div className="glass-panel p-5 rounded-2xl">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
          Security Posture & Quantum Resilience Baseline
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Composite evaluation across SAST vulnerability rules, cryptographic inventory, and NIST FIPS 203/204 readiness.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Overall Classical Security Rating */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Overall Security Score</span>
            </span>
            <div className="text-3xl font-extrabold text-slate-100 font-mono flex items-baseline gap-1">
              <span>{securityScore}</span>
              <span className="text-sm font-normal text-slate-500">/ 100</span>
            </div>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">
              Based on AST syntax validation, dependency CVEs, and configuration exposure.
            </p>
          </div>

          {/* Radial progress ring */}
          <div className="relative w-18 h-18 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.2"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-teal-400 transition-all duration-700 ease-out"
                strokeDasharray={`${securityScore}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-bold text-slate-100 font-mono">
              {securityScore}%
            </span>
          </div>
        </div>

        {/* 2. Post-Quantum Cryptography Readiness Index */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Atom className="w-4 h-4 text-cyan-400" />
                <span>PQC Readiness Index</span>
              </span>
              <span className="text-xs font-mono font-bold text-teal-300">
                {pqcReadinessScore}% Quantum Safe
              </span>
            </div>

            {/* Segmented Dual Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex my-2">
              <div
                className="h-full bg-teal-400 transition-all duration-700 ease-out"
                style={{ width: `${pqcReadinessScore}%` }}
                title={`${pqcReadinessScore}% Quantum Resilient`}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-700 ease-out"
                style={{ width: `${100 - pqcReadinessScore}%` }}
                title={`${100 - pqcReadinessScore}% Quantum Vulnerable`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>Resistant: AES-256 / SHA-384 ({pqcReadinessScore}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Shor At-Risk: RSA / ECC ({100 - pqcReadinessScore}%)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
