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
        height: '66px',
        background: 'rgba(255, 255, 255, 0.42)',
        backdropFilter: 'blur(20px) saturate(120%)',
        WebkitBackdropFilter: 'blur(20px) saturate(120%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.6)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 20,
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
            background: 'rgba(255, 255, 255, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.75)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 2px 8px rgba(41, 40, 36, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          }}
        >
          <FolderGit2 size={16} color="var(--color-graphite)" />
          <select
            value={selectedProject}
            onChange={handleProjectChange}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-graphite)',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'inherit',
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
            fontSize: '12px',
            color: 'var(--text-secondary)',
            background: 'rgba(255, 255, 255, 0.5)',
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.5)',
          }}
        >
          <GitBranch size={13} color="var(--color-muted-sage)" />
          <span>{currentBranch}</span>
        </div>
      </div>

      {/* Right controls: Last Scan, Refresh, Mock Data Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Clock size={13} color="var(--text-muted)" />
          <span>Last Scan: </span>
          <strong style={{ color: 'var(--color-graphite)', fontWeight: 600 }}>{lastScanTimestamp}</strong>
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
            color="var(--color-graphite)"
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
