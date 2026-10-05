import React, { useState } from 'react';
import {
  Wifi,
  Shield,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { api, API_BASE_URL } from '@/services/api';

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
        success: res.status === 'healthy' || res.status === 'ok',
        latencyMs: elapsed,
        message: `FastAPI service responded in ${elapsed}ms: ${JSON.stringify(res)}`,
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
    <>
      <PageHeader
        title="Platform settings & connectivity"
        description="Configure on-premises scanner engine parameters, air-gapped security rules, and backend API integration."
      />

      <div className="flex flex-col gap-6 max-w-4xl">
        {/* Backend API Connectivity Card */}
        <div className="card p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/25 text-primary">
                <Wifi className="h-5 w-5" />
              </div>
              <div>
                <h3 className="section-title">Backend API & health monitoring</h3>
                <p className="section-sub mt-0.5">
                  FastAPI service endpoint configuration (GET /api/v1/health)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="eyebrow">
                API Base URL (Environment Configured)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="flex-1 h-9 rounded-lg border border-white/80 bg-white/70 px-3.5 text-[13px] font-mono text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isPinging}
                  className="btn-primary"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Testing…' : 'Test connection'}</span>
                </button>
              </div>
              <p className="text-[12px] text-muted-foreground">
                Configured via <code className="font-mono text-primary text-[11px]">VITE_API_URL</code>. Defaults to{' '}
                <code className="font-mono text-primary text-[11px]">http://127.0.0.1:8000/api/v1</code>.
              </p>
            </div>

            {pingResult && (
              <div
                className={`p-4 rounded-xl border text-[13px] flex items-start gap-3 ${
                  pingResult.success
                    ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-critical/10 border-critical/30 text-critical'
                }`}
              >
                {pingResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    {pingResult.success ? 'Backend Health Verified' : 'Backend Offline / Unreachable'}
                  </div>
                  <div className="text-[12px] mt-1 font-mono opacity-90">
                    {pingResult.message}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scanner Engine Configuration */}
        <div className="card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/25 text-violet-600">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="section-title">Scanner engine configuration</h3>
              <p className="section-sub mt-0.5">
                Post-quantum cryptographic detection and AST parsing engine
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60">
              <span className="eyebrow">Active Engine Version</span>
              <div className="font-semibold text-slate-900 mt-1">
                PQC-Sentinel AST Analyzer v0.8.4
              </div>
              <div className="text-[12px] text-primary mt-1 font-mono">
                FIPS 203 / 204 / 205 baseline enabled
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/60 border border-slate-200/60">
              <span className="eyebrow">Data Telemetry Mode</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/25">
                  Air-Gapped Offline Mode
                </span>
              </div>
              <div className="text-[12px] text-slate-500 mt-1">
                Zero external SaaS exfiltration
              </div>
            </div>
          </div>
        </div>

        {/* Air-Gapped Security Controls */}
        <div className="card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/25 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="section-title">Air-gapped isolation controls</h3>
              <p className="section-sub mt-0.5">
                Defense-grade policies preventing outbound network exfiltration
              </p>
            </div>
          </div>

          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-slate-200/60">
              <div>
                <div className="font-medium text-foreground">Zero Cloud Telemetry</div>
                <div className="text-muted-foreground text-[12px] mt-0.5">
                  All ASTs, vulnerabilities, and CBOM components remain strictly within local environment memory.
                </div>
              </div>
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success ring-1 ring-success/25 shrink-0 ml-4">
                Enforced
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-slate-200/60">
              <div>
                <div className="font-medium text-foreground">Local Archive Sandbox</div>
                <div className="text-muted-foreground text-[12px] mt-0.5">
                  Uploaded repository zip archives are validated in memory and extracted inside ephemeral sandbox containers.
                </div>
              </div>
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success ring-1 ring-success/25 shrink-0 ml-4">
                Enforced
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
