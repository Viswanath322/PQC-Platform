import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { SecurityCard } from '../components/dashboard/SecurityCard';
import { ScanStatusCard } from '../components/dashboard/ScanStatusCard';
import { SecurityScore } from '../components/dashboard/SecurityScore';
import { FindingsChart } from '../components/dashboard/FindingsChart';
import { RiskChart } from '../components/dashboard/RiskChart';
import { NewScanModal } from '../components/scans/NewScanModal';
import { api } from '../services/api';
import type { Project, Scan, Finding } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isNewScanOpen, setIsNewScanOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projList, scanList, findingsList] = await Promise.all([
        api.getProjects(),
        api.getScans(),
        api.getFindings(),
      ]);
      setProjects(projList);
      setScans(scanList);
      setFindings(findingsList);
    } catch (err) {
      console.error('Failed to load dashboard telemetry:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleScanCreated = (newScan: Scan) => {
    setScans((prev) => [newScan, ...prev]);
  };

  // Severity counts
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length || 5;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length || 12;
  const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length || 27;
  const lowCount = findings.filter((f) => f.severity === 'LOW').length || 14;

  const currentScan = scans.find((s) => s.status === 'QUEUED' || s.status === 'ANALYZING') || scans[0];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      {/* Page Action Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="title-level-1">Security Overview</h2>
          <p className="subtitle-muted">
            Monitor application security vulnerabilities, post-quantum readiness, and cryptographic inventory.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 rounded-lg"
            title="Refresh metrics from API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsNewScanOpen(true)}
            className="btn-teal px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Scan</span>
          </button>
        </div>
      </div>

      {/* Top 5 Metric Cards: Critical, High, Medium, Low, Current Scan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <SecurityCard
          count={criticalCount}
          label="Critical"
          description="Immediate Shor risk"
          trend="+1 this week"
          trendDirection="up"
          icon={ShieldAlert}
          variant="critical"
          onClick={() => navigate('/findings?severity=CRITICAL')}
        />
        <SecurityCard
          count={highCount}
          label="High"
          description="HNDL vulnerability"
          trend="-2 resolved"
          trendDirection="down"
          icon={AlertTriangle}
          variant="high"
          onClick={() => navigate('/findings?severity=HIGH')}
        />
        <SecurityCard
          count={mediumCount}
          label="Medium"
          description="Config & padding flaws"
          trend="Unchanged"
          trendDirection="neutral"
          icon={AlertCircle}
          variant="medium"
          onClick={() => navigate('/findings?severity=MEDIUM')}
        />
        <SecurityCard
          count={lowCount}
          label="Low"
          description="Informational hygiene"
          trend="-1 resolved"
          trendDirection="down"
          icon={Info}
          variant="low"
          onClick={() => navigate('/findings?severity=LOW')}
        />
        <ScanStatusCard
          currentScan={currentScan}
          onViewScans={() => navigate('/scans')}
          onNewScan={() => setIsNewScanOpen(true)}
        />
      </div>

      {/* Security Posture Section */}
      <SecurityScore
        securityScore={74}
        pqcReadinessScore={58}
        lastScanTimestamp="2026-09-29 11:42:15 UTC"
        repositoryName="Enterprise-Core-Services"
        branchName="main"
      />

      {/* Charts Section: Findings by Severity & Category */}
      <FindingsChart
        severityCounts={{
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
        }}
        categoryCounts={{
          sast: 18,
          crypto: 21,
          dependency: 11,
          configuration: 8,
        }}
      />

      {/* Risk Distribution & Scan Activity */}
      <RiskChart
        onNavigateToPQC={() => navigate('/pqc')}
        onNavigateToScans={() => navigate('/scans')}
      />

      {/* New Scan Workflow Modal */}
      <NewScanModal
        isOpen={isNewScanOpen}
        onClose={() => setIsNewScanOpen(false)}
        projects={projects}
        onScanCreated={handleScanCreated}
      />
    </div>
  );
};
