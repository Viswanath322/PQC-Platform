import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import type { NavPage } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { PQC } from './pages/PQC';
import { CryptoInventory } from './pages/CryptoInventory';
import { Reports } from './pages/Reports';
import { mockProjectMetadata } from './data/pqcMockData';
import {
  LayoutDashboard,
  FolderGit2,
  Scan,
  Bug,
  Settings as SettingsIcon,
  Info,
} from 'lucide-react';
import { MockDataBadge } from './components/pqc/MockDataBadge';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavPage>('pqc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3800);
  };

  const handleRefreshScan = () => {
    setIsRefreshing(true);
    showToast('Initiated cryptographic AST re-scan for current workspace...');
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Scan complete: 25 cryptographic components analyzed.');
    }, 1200);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'pqc':
        return (
          <PQC
            onNavigateToInventory={() => setCurrentPage('inventory')}
            onNavigateToReports={() => setCurrentPage('reports')}
            onShowToast={showToast}
          />
        );
      case 'inventory':
        return <CryptoInventory />;
      case 'reports':
        return <Reports onShowToast={showToast} />;
      case 'dashboard':
        return (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'var(--color-primary-faded)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <LayoutDashboard size={28} color="var(--color-primary)" />
            </div>
            <h2 className="title-level-1">System Security Dashboard</h2>
            <p className="subtitle-muted" style={{ maxWidth: '520px', margin: '8px auto 24px auto' }}>
              High-level overview of enterprise vulnerability scanning, SAST pipelines, and compliance tracking.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setCurrentPage('pqc')} className="btn-teal">
                Open PQC Security Module →
              </button>
            </div>
          </div>
        );
      case 'projects':
        return (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'var(--color-primary-faded)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <FolderGit2 size={28} color="var(--color-primary)" />
            </div>
            <h2 className="title-level-1">Connected Repositories</h2>
            <p className="subtitle-muted" style={{ maxWidth: '520px', margin: '8px auto 24px auto' }}>
              Manage Git repositories, branch hooks, and automated CI/CD security scanning triggers.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setCurrentPage('pqc')} className="btn-primary">
                Return to PQC Overview
              </button>
            </div>
          </div>
        );
      case 'scans':
        return (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'var(--color-primary-faded)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Scan size={28} color="var(--color-primary)" />
            </div>
            <h2 className="title-level-1">Cryptographic Scans & History</h2>
            <p className="subtitle-muted" style={{ maxWidth: '520px', margin: '8px auto 24px auto' }}>
              View historical cryptographic inspection runs, diffs between scan revisions, and CI logs.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setCurrentPage('pqc')} className="btn-primary">
                View Active Scan (PQC)
              </button>
            </div>
          </div>
        );
      case 'findings':
        return (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Bug size={28} color="var(--color-risk-high)" />
            </div>
            <h2 className="title-level-1">Vulnerability Findings</h2>
            <p className="subtitle-muted" style={{ maxWidth: '520px', margin: '8px auto 24px auto' }}>
              Triage and track remediation across general software vulnerabilities and cryptographic risks.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setCurrentPage('pqc')} className="btn-teal">
                Jump to Quantum Risk Findings
              </button>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="glass-panel" style={{ padding: '36px', maxWidth: '720px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <SettingsIcon size={24} color="var(--color-primary)" />
              <h2 className="title-level-1">Platform Settings</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.65)',
                  border: '1px solid var(--border-glass)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-primary)' }}>
                  Scanner Engine Configuration
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Engine: PQC-Sentinel AST Analyzer v0.8.4-preview (FIPS 203/204/205 reference baseline)
                </div>
              </div>

              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.65)',
                  border: '1px solid var(--border-glass)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-primary)' }}>
                  Data Telemetry Mode
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <MockDataBadge size="sm" />
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Active (FastAPI endpoint integration ready)
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <PQC />;
    }
  };

  return (
    <div className="app-layout">
      {/* 1. Long Vertical Floating Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isHovered={isNavHovered}
        onHoverChange={setIsNavHovered}
      />

      {/* 2. Main Glass Workspace Container (Synchronized with Nav Hover) */}
      <div
        className="main-glass-container"
        style={{
          marginLeft: isNavHovered ? '280px' : '116px',
        }}
      >
        <TopHeader
          projectName={mockProjectMetadata.projectName}
          branch={mockProjectMetadata.branch}
          lastScanTimestamp={mockProjectMetadata.lastScanTimestamp}
          onRefreshScan={handleRefreshScan}
          isRefreshing={isRefreshing}
        />

        <main className="main-workspace-body">{renderContent()}</main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <Info size={18} color="var(--color-secondary)" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              marginLeft: '8px',
              fontSize: '13px',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
