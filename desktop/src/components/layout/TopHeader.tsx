import React, { useState } from 'react';
import { RefreshCw, GitBranch, FolderGit2, Clock } from 'lucide-react';
import { MockDataBadge } from '../pqc/MockDataBadge';

interface TopHeaderProps {
  projectName: string;
  branch: string;
  lastScanTimestamp: string;
  onRefreshScan: () => void;
  isRefreshing?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  projectName,
  branch,
  lastScanTimestamp,
  onRefreshScan,
  isRefreshing = false,
}) => {
  const [selectedProject, setSelectedProject] = useState(projectName);
  const [currentBranch, setCurrentBranch] = useState(branch);

  const projects = [
    { name: 'Enterprise-Core-Services', branch: 'main' },
    { name: 'Payment-Gateway-Service', branch: 'v2.4-release' },
    { name: 'Identity-OAuth-Server', branch: 'main' },
  ];

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProject(val);
    const found = projects.find((p) => p.name === val);
    if (found) {
      setCurrentBranch(found.branch);
    }
  };

  return (
    <header
      style={{
        height: '68px',
        background: 'rgba(20, 31, 46, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        borderTopLeftRadius: '22px',
        borderTopRightRadius: '22px',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxSizing: 'border-box',
      }}
    >
      {/* Project Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
          }}
        >
          <FolderGit2 size={16} color="#5eead4" />
          <select
            value={selectedProject}
            onChange={handleProjectChange}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 600,
              color: '#f8fafc',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {projects.map((p) => (
              <option key={p.name} value={p.name} style={{ background: '#162231', color: '#f8fafc' }}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            color: '#94a3b8',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <GitBranch size={13} color="#94a3b8" />
          <span>{currentBranch}</span>
        </div>
      </div>

      {/* Right controls: Last Scan, Refresh, Mock Data Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
          <Clock size={13} />
          <span>Last Scan: </span>
          <strong style={{ color: '#e2e8f0', fontWeight: 600 }}>{lastScanTimestamp}</strong>
        </div>

        <button
          onClick={onRefreshScan}
          disabled={isRefreshing}
          className="btn-secondary"
          style={{
            padding: '6px 13px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Trigger fresh workspace re-scan"
        >
          <RefreshCw
            size={13}
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>{isRefreshing ? 'Scanning...' : 'Refresh Scan'}</span>
        </button>

        <MockDataBadge />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
};
