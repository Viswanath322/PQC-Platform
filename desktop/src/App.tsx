import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Scans } from './pages/Scans';
import { Findings } from './pages/Findings';
import { PQC } from './pages/PQC';
import { CryptoInventory } from './pages/CryptoInventory';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { mockProjectMetadata } from './data/pqcMockData';
import { Info, X } from 'lucide-react';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 4000);
  };

  const handleRefreshScan = () => {
    setIsRefreshing(true);
    showToast('Triggered cryptographic AST re-scan for current repository baseline...');
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Scan complete: 25 cryptographic components analyzed and verified.');
    }, 1200);
  };

  // Derive current page title from route
  const getPageTitle = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/projects')) return 'Projects';
    if (path.includes('/scans')) return 'Cryptographic Scans';
    if (path.includes('/findings')) return 'Security Findings';
    if (path.includes('/pqc')) return 'PQC Assessment';
    if (path.includes('/crypto-inventory')) return 'Cryptographic Inventory';
    if (path.includes('/reports')) return 'Security Reports';
    if (path.includes('/settings')) return 'Platform Settings';
    return 'Dashboard';
  };

  const pageTitle = getPageTitle();

  return (
    <div className="app-layout">
      {/* 1. Persistent Fixed Left Sidebar */}
      <Sidebar />

      {/* 2. Main Application Workspace Canvas */}
      <div className="app-main">
        <TopHeader
          pageTitle={pageTitle}
          projectName={mockProjectMetadata.projectName}
          branchName={mockProjectMetadata.branch}
          onRefreshScan={handleRefreshScan}
          isRefreshing={isRefreshing}
        />

        <main className="main-workspace-body">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/scans" element={<Scans />} />
            <Route path="/findings" element={<Findings />} />
            <Route path="/pqc" element={<PQC onShowToast={showToast} />} />
            <Route path="/crypto-inventory" element={<CryptoInventory />} />
            <Route path="/reports" element={<Reports onShowToast={showToast} />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <Info size={16} className="text-teal-400" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
};

export default App;
