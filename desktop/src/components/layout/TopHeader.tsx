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
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-glass)',
        padding: '0 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Project Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(36, 52, 71, 0.05)',
            border: '1px solid var(--border-glass-strong)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <FolderGit2 size={16} color="var(--color-primary)" />
          <select
            value={selectedProject}
            onChange={handleProjectChange}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '13.5px',
              fontWeight: 600,
              color: 'var(--color-primary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {projects.map((p) => (
              <option key={p.name} value={p.name}>
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
            fontSize: '12.5px',
            color: 'var(--text-muted)',
            background: '#ffffff',
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-glass)',
          }}
        >
          <GitBranch size={13} />
          <span>{currentBranch}</span>
        </div>
      </div>

      {/* Right controls: Last Scan, Refresh, Mock Data Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <Clock size={13} />
          <span>Last Scan: </span>
          <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{lastScanTimestamp}</strong>
        </div>

        <button
          onClick={onRefreshScan}
          disabled={isRefreshing}
          className="btn-secondary"
          style={{
            padding: '7px 14px',
            fontSize: '12.5px',
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
