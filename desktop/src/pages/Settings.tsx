import React, { useState } from 'react';
import {
  Wifi,
  Shield,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { BackendStatus } from '../components/common/BackendStatus';
import { MockDataBadge } from '../components/pqc/MockDataBadge';
import { api, API_BASE_URL } from '../services/api';

export const Settings: React.FC = () => {
  const [apiUrl, setApiUrl] = useState(API_BASE_URL);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message: string;
  } | null>(null);

  const handleTestConnection = async () => {
    setIsPinging(true);
    setPingResult(null);
    const start = performance.now();
    try {
      const res = await api.health();
      const elapsed = Math.round(performance.now() - start);
      setPingResult({
        success: res.status === 'healthy',
        latencyMs: elapsed,
        message: `FastAPI responded in ${elapsed}ms: ${JSON.stringify(res)}`,
      });
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - start);
      setPingResult({
        success: false,
        latencyMs: elapsed,
        message: err instanceof Error ? err.message : 'Connection failed to health check endpoint.',
      });
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <PageContainer
      title="Platform Settings & Connectivity"
      subtitle="Configure on-premises scanner engine parameters, air-gapped security rules, and backend API integration."
    >
      <div className="flex flex-col gap-6 max-w-4xl">
        {/* Backend API Connectivity Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Backend API & Health Monitoring
                </h3>
                <p className="text-xs text-slate-400">
                  FastAPI service endpoint configuration (GET /api/v1/health)
                </p>
              </div>
            </div>
            <BackendStatus compact />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                API Base URL (Environment Configured)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isPinging}
                  className="btn-teal px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 flex-shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Configured via <code className="text-teal-300">VITE_API_URL</code> environment variable. Defaults to <code className="text-teal-300">http://127.0.0.1:8000/api/v1</code>.
              </p>
            </div>

            {pingResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  pingResult.success
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                }`}
              >
                {pingResult.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    {pingResult.success ? 'Backend Health Verified' : 'Backend Offline / Error'}
                  </div>
                  <div className="text-[11.5px] mt-0.5 opacity-90 font-mono">
                    {pingResult.message}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scanner Engine Configuration */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Scanner Engine Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Post-quantum cryptographic detection and AST parsing engine
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 mb-1">Active Engine Version</div>
              <div className="font-semibold text-slate-200">
                PQC-Sentinel AST Analyzer v0.8.4-preview
              </div>
              <div className="text-[11px] text-teal-400 mt-1">
                FIPS 203/204/205 reference baseline enabled
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-slate-400 mb-1">Data Telemetry Mode</div>
              <div className="flex items-center gap-2">
                <MockDataBadge size="sm" />
                <span className="font-semibold text-slate-200">
                  FastAPI endpoint integration ready
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Air-gapped on-premise fallback active
              </div>
            </div>
          </div>
        </div>

        {/* Air-Gapped Security Controls */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Air-Gapped & On-Premises Isolation Controls
              </h3>
              <p className="text-xs text-slate-400">
                Defense-grade policies preventing outbound network exfiltration
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Zero Cloud Telemetry</div>
                <div className="text-slate-400 text-[11px]">
                  All code ASTs, findings, and CBOM inventories remain local to this container.
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 font-semibold text-[11px]">
                Enforced
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <div className="font-semibold text-slate-200">Local Archive Isolation</div>
                <div className="text-slate-400 text-[11px]">
                  Uploaded repository zip archives are validated in memory and extracted inside ephemeral sandbox workers.
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 font-semibold text-[11px]">
                Enforced
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
