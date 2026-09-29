import React, { useState } from 'react';
import { RefreshCw, FolderGit2, Clock } from 'lucide-react';
import { MockDataBadge } from '../pqc/MockDataBadge';

interface TopHeaderProps {
  projectName: string;
  branch?: string;
  lastScanTimestamp: string;
  onRefreshScan: () => void;
  isRefreshing?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  projectName,
  lastScanTimestamp,
  onRefreshScan,
  isRefreshing = false,
}) => {
  const [selectedProject, setSelectedProject] = useState(projectName);

  const projects = [
    { name: 'Enterprise-Core-Services', branch: 'main' },
    { name: 'Payment-Gateway-Service', branch: 'v2.4-release' },
    { name: 'Identity-OAuth-Server', branch: 'main' },
  ];

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProject(e.target.value);
  };

  return (
    <header
      style={{
        height: '68px',
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
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
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid var(--border-glass-strong)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 1px 3px rgba(36, 52, 71, 0.05)',
          }}
        >
          <FolderGit2 size={16} color="var(--color-primary)" />
          <select
            value={selectedProject}
            onChange={handleProjectChange}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
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
      </div>

      {/* Right controls: Last Scan, Refresh, Mock Data Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
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
            padding: '6px 13px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#ffffff',
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
