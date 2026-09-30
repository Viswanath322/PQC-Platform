import React from 'react';
import {
  ShieldCheck,
  Bug,
  Atom,
  Clock,
  ArrowRight,
  RefreshCw,
  Cpu,
  FileBarChart,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileCode,
} from 'lucide-react';
import { MockDataBadge } from '../components/pqc/MockDataBadge';

interface SystemSecurityDashboardProps {
  onNavigateToPQC: () => void;
  onNavigateToInventory: () => void;
  onNavigateToFindings: () => void;
  onNavigateToReports: () => void;
  onRefreshScan: () => void;
  onShowToast: (message: string) => void;
  isRefreshing?: boolean;
}

export const SystemSecurityDashboard: React.FC<SystemSecurityDashboardProps> = ({
  onNavigateToPQC,
  onNavigateToInventory,
  onNavigateToFindings,
  onNavigateToReports,
  onRefreshScan,
  onShowToast,
  isRefreshing = false,
}) => {
  // Recent Findings Data (Section 7)
  const recentFindings = [
    {
      severity: 'HIGH',
      severityType: 'high',
      finding: 'RSA cryptography',
      location: 'auth.py',
      category: 'Quantum Vulnerable Key Exchange',
    },
    {
      severity: 'MEDIUM',
      severityType: 'medium',
      finding: 'Weak TLS configuration',
      location: 'tls.conf',
      category: 'Insecure Cipher Suite',
    },
    {
      severity: 'HIGH',
      severityType: 'high',
      finding: 'Hardcoded credential',
      location: 'config.py',
      category: 'Static Analysis Secret Exposure',
    },
    {
      severity: 'LOW',
      severityType: 'low',
      finding: 'Outdated dependency',
      location: 'package.json',
      category: 'Vulnerable Transitive Component',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '8px 0',
      }}
    >
      {/* 1. Page Header (Section 15) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 600,
                color: '#29384D',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              System Security Dashboard
            </h1>
            <MockDataBadge size="sm" />
          </div>
          <p
            style={{
              fontSize: '15px',
              color: '#687587',
              marginTop: '6px',
              marginBottom: 0,
              lineHeight: 1.5,
            }}
          >
            Enterprise security posture, vulnerability exposure and PQC readiness.
          </p>
        </div>

        {/* Action Header Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              onRefreshScan();
              onShowToast('Refreshed security telemetry across all analyzers.');
            }}
            disabled={isRefreshing}
            className="btn-secondary-glass"
            style={{ fontSize: '13px', padding: '8px 16px' }}
          >
            <RefreshCw
              size={14}
              style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
            />
            <span>{isRefreshing ? 'Running Scan...' : 'Run Security Scan'}</span>
          </button>
          <button
            onClick={onNavigateToPQC}
            className="btn-primary-sage"
            style={{ fontSize: '13px', padding: '8px 18px' }}
          >
            <span>Open PQC Assessment</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 2. Compact Summary Row (Section 2: 4 Small Glass Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: SECURITY SCORE */}
        <div
          className="apple-glass-card apple-glass-card-interactive"
          style={{ padding: '20px 22px' }}
          onClick={() => onShowToast('Security Score: 78/100 based on weighted SAST & PQC compliance.')}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#687587',
              }}
            >
              SECURITY SCORE
            </span>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(42, 157, 143, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={16} color="#2A9D8F" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#29384D',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              78
            </span>
            <span style={{ fontSize: '15px', color: '#687587', fontWeight: 500 }}>/ 100</span>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(42, 157, 143, 0.12)',
                color: '#237F74',
              }}
            >
              <CheckCircle2 size={11} />
              Good
            </span>
            <span style={{ fontSize: '11.5px', color: '#687587' }}>+2.4 pts this week</span>
          </div>
        </div>

        {/* Card 2: ACTIVE FINDINGS */}
        <div
          className="apple-glass-card apple-glass-card-interactive"
          style={{ padding: '20px 22px' }}
          onClick={onNavigateToFindings}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#687587',
              }}
            >
              ACTIVE FINDINGS
            </span>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(197, 48, 48, 0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bug size={16} color="#c53030" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#29384D',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              24
            </span>
            <span style={{ fontSize: '13px', color: '#687587' }}>total issues</span>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(197, 48, 48, 0.10)',
                color: '#c53030',
              }}
            >
              3 critical
            </span>
            <span style={{ fontSize: '11.5px', color: '#687587' }}>7 high • 14 med</span>
          </div>
        </div>

        {/* Card 3: PQC RISK */}
        <div
          className="apple-glass-card apple-glass-card-interactive"
          style={{ padding: '20px 22px' }}
          onClick={onNavigateToPQC}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#687587',
              }}
            >
              PQC RISK
            </span>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(233, 162, 59, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Atom size={16} color="#cb8523" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#29384D',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              5 HIGH
            </span>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(233, 162, 59, 0.12)',
                color: '#cb8523',
              }}
            >
              8 medium
            </span>
            <span style={{ fontSize: '11.5px', color: '#687587' }}>12 low risk</span>
          </div>
        </div>

        {/* Card 4: LAST SCAN */}
        <div
          className="apple-glass-card apple-glass-card-interactive"
          style={{ padding: '20px 22px' }}
          onClick={onRefreshScan}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#687587',
              }}
            >
              LAST SCAN
            </span>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(41, 56, 77, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={16} color="#29384D" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#29384D',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              2m ago
            </span>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11.5px',
                fontWeight: 500,
                color: '#237F74',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#2A9D8F',
                  display: 'inline-block',
                }}
              />
              Completed
            </span>
            <span style={{ fontSize: '11.5px', color: '#687587' }}>• AST AST-0.8.4</span>
          </div>
        </div>
      </div>

      {/* 3. Dashboard Grid Row 1 (Sections 4, 5, 6) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '20px',
        }}
      >
        {/* SECTION 5: SECURITY POSTURE CARD */}
        <div
          className="apple-glass-card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#29384D',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}
                >
                  SECURITY POSTURE
                </h3>
                <p style={{ fontSize: '12.5px', color: '#687587', marginTop: '2px', margin: 0 }}>
                  Consolidated vulnerability assessment & cryptographic integrity
                </p>
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(42, 157, 143, 0.12)',
                  color: '#237F74',
                }}
              >
                78 / 100 • Good
              </span>
            </div>

            {/* Circular Progress & Posture Breakdown */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '32px',
                padding: '12px 8px 20px 8px',
                flexWrap: 'wrap',
              }}
            >
              {/* Circular Meter (Apple minimalist style) */}
              <div
                style={{
                  position: 'relative',
                  width: '124px',
                  height: '124px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="124" height="124" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Background Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    stroke="#E9ECE8"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Progress Arc (78%) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    stroke="#2A9D8F"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - 0.78)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#29384D',
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    78
                  </span>
                  <span style={{ fontSize: '11px', color: '#687587', fontWeight: 500, marginTop: '2px' }}>
                    /100
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#2A9D8F',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginTop: '2px',
                    }}
                  >
                    Good
                  </span>
                </div>
              </div>

              {/* Severity Breakdown List (Under it: Critical 3, High 7, Medium 14) */}
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#29384D', marginBottom: '8px' }}>
                  Posture Distribution
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.6)',
                      border: '1px solid rgba(226, 232, 240, 0.7)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#c53030',
                        }}
                      />
                      <span style={{ fontSize: '12.5px', color: '#29384D', fontWeight: 500 }}>Critical</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#c53030' }}>3</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.6)',
                      border: '1px solid rgba(226, 232, 240, 0.7)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#cb8523',
                        }}
                      />
                      <span style={{ fontSize: '12.5px', color: '#29384D', fontWeight: 500 }}>High</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#cb8523' }}>7</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.6)',
                      border: '1px solid rgba(226, 232, 240, 0.7)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#687587',
                        }}
                      />
                      <span style={{ fontSize: '12.5px', color: '#29384D', fontWeight: 500 }}>Medium</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#29384D' }}>14</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              paddingTop: '14px',
              borderTop: '1px solid rgba(41, 56, 77, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '12px', color: '#687587' }}>
              Evaluated across 1,420 AST code units & dependencies
            </span>
            <button
              onClick={onNavigateToFindings}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2A9D8F',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 160ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#237F74')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#2A9D8F')}
            >
              Review breakdown →
            </button>
          </div>
        </div>

        {/* SECTION 6: PQC READINESS CARD */}
        <div
          className="apple-glass-card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#29384D',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}
                >
                  PQC READINESS
                </h3>
                <p style={{ fontSize: '12.5px', color: '#687587', marginTop: '2px', margin: 0 }}>
                  Quantum threat posture against Shor's algorithm
                </p>
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(42, 157, 143, 0.12)',
                  color: '#237F74',
                }}
              >
                Quantum Resilient
              </span>
            </div>

            {/* Metric Display */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 700,
                    color: '#29384D',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  58%
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#2A9D8F' }}>
                  Quantum Resilient
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#687587', marginTop: '6px', margin: 0 }}>
                25 cryptographic components analyzed across services
              </p>
            </div>

            {/* Progress Visualization */}
            <div style={{ marginBottom: '18px' }}>
              <div
                style={{
                  height: '8px',
                  width: '100%',
                  background: '#E9ECE8',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                <div
                  style={{
                    width: '58%',
                    height: '100%',
                    background: '#2A9D8F',
                    borderRadius: '9999px',
                    transition: 'width 600ms ease',
                  }}
                />
                <div
                  style={{
                    width: '42%',
                    height: '100%',
                    background: '#E9ECE8',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11.5px',
                  color: '#687587',
                  marginTop: '8px',
                }}
              >
                <span>15 Resilient / Hybrid</span>
                <span>10 Classical (Vulnerable)</span>
              </div>
            </div>

            {/* Standards Info Box */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.65)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                fontSize: '12px',
                color: '#687587',
                lineHeight: 1.45,
              }}
            >
              <strong style={{ color: '#29384D', fontWeight: 600 }}>NIST Standard Baseline: </strong>
              NIST SP 800-208 stateful hash signatures, FIPS 203 (ML-KEM), and FIPS 204 (ML-DSA) migration targets.
            </div>
          </div>

          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid rgba(41, 56, 77, 0.08)',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '11.5px', color: '#687587' }}>
              Identified 5 urgent migration candidates
            </span>
            <button
              onClick={onNavigateToPQC}
              className="btn-primary-sage"
              style={{ padding: '7px 16px', fontSize: '12.5px' }}
            >
              <span>View PQC Assessment</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Dashboard Grid Row 2 (Sections 4, 7, 8) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '20px',
        }}
      >
        {/* SECTION 7: RECENT FINDINGS */}
        <div
          className="apple-glass-card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#29384D',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}
                >
                  RECENT FINDINGS
                </h3>
                <p style={{ fontSize: '12.5px', color: '#687587', marginTop: '2px', margin: 0 }}>
                  High-priority security alerts and cryptographic exposures
                </p>
              </div>
              <button
                onClick={onNavigateToFindings}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2A9D8F',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 160ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#237F74')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#2A9D8F')}
              >
                View all 24 →
              </button>
            </div>

            {/* Glass Table / List */}
            <div
              style={{
                borderRadius: '12px',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                background: 'rgba(255, 255, 255, 0.65)',
                overflow: 'hidden',
              }}
            >
              {/* Table Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '95px 1fr 110px',
                  padding: '9px 16px',
                  background: 'rgba(41, 56, 77, 0.03)',
                  borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#687587',
                }}
              >
                <span>Severity</span>
                <span>Finding</span>
                <span>Location</span>
              </div>

              {/* Table Rows */}
              {recentFindings.map((item, idx) => {
                const isLast = idx === recentFindings.length - 1;
                const isHigh = item.severity === 'HIGH';
                const isMed = item.severity === 'MEDIUM';

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '95px 1fr 110px',
                      padding: '11px 16px',
                      alignItems: 'center',
                      borderBottom: isLast ? 'none' : '1px solid rgba(41, 56, 77, 0.05)',
                      transition: 'background 140ms ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(42, 157, 143, 0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() =>
                      onShowToast(`Selected finding: ${item.finding} (${item.location})`)
                    }
                  >
                    {/* Severity Pill */}
                    <div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: isHigh
                            ? 'rgba(197, 48, 48, 0.09)'
                            : isMed
                            ? 'rgba(233, 162, 59, 0.12)'
                            : 'rgba(42, 157, 143, 0.10)',
                          color: isHigh ? '#c53030' : isMed ? '#cb8523' : '#237F74',
                          border: isHigh
                            ? '1px solid rgba(197, 48, 48, 0.2)'
                            : isMed
                            ? '1px solid rgba(233, 162, 59, 0.25)'
                            : '1px solid rgba(42, 157, 143, 0.22)',
                        }}
                      >
                        {isHigh ? (
                          <AlertOctagon size={10} />
                        ) : isMed ? (
                          <AlertTriangle size={10} />
                        ) : (
                          <CheckCircle2 size={10} />
                        )}
                        {item.severity}
                      </span>
                    </div>

                    {/* Finding Name & Subtitle */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#29384D' }}>
                        {item.finding}
                      </span>
                      <span style={{ fontSize: '11.5px', color: '#687587' }}>{item.category}</span>
                    </div>

                    {/* Location */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <FileCode size={12} color="#687587" />
                      <code
                        style={{
                          fontSize: '12px',
                          color: '#29384D',
                          background: 'rgba(41, 56, 77, 0.05)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {item.location}
                      </code>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              paddingTop: '14px',
              borderTop: '1px solid rgba(41, 56, 77, 0.08)',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#687587',
            }}
          >
            <span>Auto-synced with Git commit hooks & SAST pipeline</span>
            <span style={{ color: '#2A9D8F', fontWeight: 500 }}>Live Telemetry</span>
          </div>
        </div>

        {/* SECTION 8: QUICK ACTIONS CARD */}
        <div
          className="apple-glass-card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#29384D',
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                QUICK ACTIONS
              </h3>
              <p style={{ fontSize: '12.5px', color: '#687587', marginTop: '2px', margin: 0 }}>
                Frequently used security inspection and compliance tasks
              </p>
            </div>

            {/* Quick Action Buttons Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 1. Run Security Scan */}
              <button
                onClick={() => {
                  onRefreshScan();
                  onShowToast('Executing full security & cryptographic scan...');
                }}
                disabled={isRefreshing}
                className="btn-primary-sage"
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '11px 16px',
                  fontSize: '13.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <RefreshCw
                    size={16}
                    style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
                  />
                  <span>Run Security Scan</span>
                </div>
                <span style={{ fontSize: '11px', opacity: 0.85 }}>AST v0.8.4</span>
              </button>

              {/* 2. View Findings */}
              <button
                onClick={onNavigateToFindings}
                className="btn-secondary-glass"
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '11px 16px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bug size={16} color="#2A9D8F" />
                  <span>View Findings</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    background: 'rgba(197, 48, 48, 0.1)',
                    color: '#c53030',
                  }}
                >
                  24 Active
                </span>
              </button>

              {/* 3. Open PQC Assessment */}
              <button
                onClick={onNavigateToPQC}
                className="btn-secondary-glass"
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '11px 16px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Atom size={16} color="#2A9D8F" />
                  <span>Open PQC Assessment</span>
                </div>
                <ArrowRight size={14} color="#687587" />
              </button>

              {/* 4. View Crypto Inventory */}
              <button
                onClick={onNavigateToInventory}
                className="btn-secondary-glass"
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '11px 16px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Cpu size={16} color="#2A9D8F" />
                  <span>View Crypto Inventory</span>
                </div>
                <span style={{ fontSize: '11px', color: '#687587' }}>25 Assets</span>
              </button>

              {/* 5. View Reports */}
              <button
                onClick={onNavigateToReports}
                className="btn-secondary-glass"
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '11px 16px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileBarChart size={16} color="#2A9D8F" />
                  <span>Generate Audit Reports</span>
                </div>
                <span style={{ fontSize: '11px', color: '#687587' }}>PDF / CBOM</span>
              </button>
            </div>
          </div>

          <div
            style={{
              paddingTop: '14px',
              borderTop: '1px solid rgba(41, 56, 77, 0.08)',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#687587',
            }}
          >
            <span>Role: Lead Cryptographic Auditor</span>
            <span style={{ color: '#2A9D8F', fontWeight: 500 }}>Read / Write</span>
          </div>
        </div>
      </div>
    </div>
  );
};
