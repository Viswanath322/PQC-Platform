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
        height: '70px',
        background: 'rgba(20, 28, 40, 0.35)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
        borderTopLeftRadius: '26px',
        borderTopRightRadius: '26px',
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
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)',
            padding: '6px 14px',
            borderRadius: '9999px',
          }}
        >
          <FolderGit2 size={16} color="#6ee7b7" />
          <select
            value={selectedProject}
            onChange={handleProjectChange}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {projects.map((p) => (
              <option key={p.name} value={p.name} style={{ background: '#1c2533', color: '#ffffff' }}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.8)',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(16px)',
            padding: '5px 12px',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
        >
          <GitBranch size={13} color="rgba(255, 255, 255, 0.7)" />
          <span>{currentBranch}</span>
        </div>
      </div>

      {/* Right controls: Last Scan, Refresh, Mock Data Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
          <Clock size={13} />
          <span>Last Scan: </span>
          <strong style={{ color: '#ffffff', fontWeight: 600 }}>{lastScanTimestamp}</strong>
        </div>

        <button
          onClick={onRefreshScan}
          disabled={isRefreshing}
          className="btn-secondary"
          style={{
            padding: '6px 14px',
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
          <span>{isRefreshing ? 'Scanning...' : 'Refresh'}</span>
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
