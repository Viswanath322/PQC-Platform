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
        background: 'rgba(255, 255, 255, 0.35)',
        backdropFilter: 'blur(20px) saturate(120%)',
        WebkitBackdropFilter: 'blur(20px) saturate(120%)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '0 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxSizing: 'border-box',
      }}
    >
      {/* Project Selector & Branch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03), inset 0 1px 0 #ffffff',
          }}
        >
          <FolderGit2 size={15} color="#718071" />
          <select
            value={selectedProject}
            onChange={handleProjectChange}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 600,
              color: '#252522',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {projects.map((p) => (
              <option key={p.name} value={p.name} style={{ background: '#ffffff', color: '#252522' }}>
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
            fontWeight: 500,
            color: '#666762',
            background: 'rgba(255, 255, 255, 0.55)',
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
          }}
        >
          <GitBranch size={13} color="#8B8C86" />
          <span>{currentBranch}</span>
        </div>
      </div>

      {/* Right controls: Last Scan, Refresh, Mock Data Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#8B8C86' }}>
          <Clock size={13} />
          <span>Last Scan: </span>
          <span style={{ color: '#666762', fontWeight: 500 }}>{lastScanTimestamp}</span>
        </div>

        <button
          onClick={onRefreshScan}
          disabled={isRefreshing}
          className="btn-secondary"
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Trigger fresh workspace re-scan"
        >
          <RefreshCw
            size={12}
            color="#252522"
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span style={{ fontWeight: 500 }}>{isRefreshing ? 'Scanning...' : 'Refresh'}</span>
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
