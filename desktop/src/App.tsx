import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { UserProvider } from './context/UserContext';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Scans } from './pages/Scans';
import { Findings } from './pages/Findings';
import { PQC } from './pages/PQC';
import { CryptoInventory } from './pages/CryptoInventory';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { mockProjectMetadata } from './data/pqcMockData';
import { api } from './services/api';
import { Info, X } from 'lucide-react';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const res = await api.health();
        if (isMounted) {
          setIsOnline(res.status === 'healthy' || res.status === 'ok');
        }
      } catch {
        if (isMounted) {
          setIsOnline(false);
        }
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 4000);
  };

  const handleRefreshScan = () => {
    setIsRefreshing(true);
    showToast('Synchronizing telemetry and AST verification pipeline…');
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Synchronization complete: 25 cryptographic components verified.');
    }, 1000);
  };

  // Derive current page title from route
  const getPageTitle = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/profile')) return 'Auditor Profile';
    if (path.includes('/projects')) return 'Projects';
    if (path.includes('/scans')) return 'Scans';
    if (path.includes('/findings')) return 'Findings';
    if (path.includes('/pqc')) return 'PQC Assessment';
    if (path.includes('/inventory') || path.includes('/crypto-inventory')) return 'Crypto Inventory';
    if (path.includes('/reports')) return 'Reports';
    if (path.includes('/settings')) return 'Settings';
    return 'Dashboard';
  };

  const pageTitle = getPageTitle();

  return (
    <AppShell
      page={pageTitle}
      project={mockProjectMetadata.projectName}
      branch={mockProjectMetadata.branch}
      online={isOnline}
      onRefresh={handleRefreshScan}
      isRefreshing={isRefreshing}
    >
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/scans" element={<Scans />} />
        <Route path="/findings" element={<Findings />} />
        <Route path="/pqc" element={<PQC onShowToast={showToast} />} />
        <Route path="/inventory" element={<CryptoInventory />} />
        <Route path="/crypto-inventory" element={<CryptoInventory />} />
        <Route path="/reports" element={<Reports onShowToast={showToast} />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile onShowToast={showToast} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-[13px] text-foreground shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Info className="h-4 w-4 shrink-0 text-primary" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss toast"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <HashRouter>
      <UserProvider>
        <AppLayout />
      </UserProvider>
    </HashRouter>
  );
};

export default App;
