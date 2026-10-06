import React from 'react';
import { ShieldCheck, Atom } from 'lucide-react';
import { MockDataBadge } from '../pqc/MockDataBadge';

interface SecurityScoreProps {
  securityScore?: number;
  pqcReadinessScore?: number;
  lastScanTimestamp?: string;
  repositoryName?: string;
  branchName?: string;
}

export const SecurityScore: React.FC<SecurityScoreProps> = ({
  securityScore = 78,
  pqcReadinessScore = 58,
}) => {
  return (
    <div className="glass-panel p-5 rounded-2xl">
      <div className="mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#29384D', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            Security Posture & Quantum Resilience Baseline
          </h3>
          <MockDataBadge size="xs" label="DEVELOPMENT / MOCK DATA" />
        </div>
        <p style={{ fontSize: '12.5px', color: '#687587', marginTop: '4px' }}>
          Development examples — not generated from an actual scan. Composite evaluation across SAST vulnerability rules, cryptographic inventory, and NIST FIPS 203/204 readiness.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Overall Classical Security Rating */}
        <div
          className="p-4 rounded-xl flex items-center justify-between gap-4"
          style={{
            background: 'rgba(255, 255, 255, 0.70)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(41, 56, 77, 0.03)',
          }}
        >
          <div className="space-y-1">
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#687587', textTransform: 'uppercase', letterSpacing: '0.04em' }} className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" style={{ color: '#2A9D8F' }} />
              <span>Overall Security Score</span>
            </span>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#29384D', fontFamily: 'JetBrains Mono, monospace' }} className="flex items-baseline gap-1">
              <span>{securityScore}</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#94a3b8' }}>/ 100</span>
            </div>
            <p style={{ fontSize: '11.5px', color: '#687587', lineHeight: 1.45 }}>
              Development baseline score · AST syntax validation, CVEs, and configuration exposure.
            </p>
          </div>


          {/* Radial progress ring */}
          <div className="relative w-18 h-18 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                stroke="#E9ECE8"
                strokeWidth="3.2"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                stroke="#2A9D8F"
                strokeDasharray={`${securityScore}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                style={{ transition: 'stroke-dasharray 0.7s ease-out' }}
              />
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#29384D', fontFamily: 'JetBrains Mono, monospace' }} className="absolute">
              {securityScore}%
            </span>
          </div>
        </div>

        {/* 2. Post-Quantum Cryptography Readiness Index */}
        <div
          className="p-4 rounded-xl flex flex-col justify-between"
          style={{
            background: 'rgba(255, 255, 255, 0.70)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(41, 56, 77, 0.03)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#687587', textTransform: 'uppercase', letterSpacing: '0.04em' }} className="flex items-center gap-1.5">
                <Atom className="w-4 h-4" style={{ color: '#2A9D8F' }} />
                <span>PQC Readiness Index</span>
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#237F74', fontFamily: 'JetBrains Mono, monospace' }}>
                {pqcReadinessScore}% Quantum Safe
              </span>
            </div>

            {/* Segmented Dual Bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden flex my-2" style={{ background: '#E9ECE8' }}>
              <div
                className="h-full"
                style={{ width: `${pqcReadinessScore}%`, background: '#2A9D8F', transition: 'width 0.7s ease-out' }}
                title={`${pqcReadinessScore}% Quantum Resilient`}
              />
              <div
                className="h-full"
                style={{ width: `${100 - pqcReadinessScore}%`, background: 'rgba(197, 48, 48, 0.4)', transition: 'width 0.7s ease-out' }}
                title={`${100 - pqcReadinessScore}% Quantum Vulnerable`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1" style={{ color: '#687587' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#2A9D8F' }} />
              <span>Resistant: AES-256 / SHA-384 ({pqcReadinessScore}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#c53030' }} />
              <span>Shor At-Risk: RSA / ECC ({100 - pqcReadinessScore}%)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
