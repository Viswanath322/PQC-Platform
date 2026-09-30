import React, { useState } from 'react';
import {
  Wifi,
  Shield,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  CloudOff,
  HardDrive,
  LockKeyhole,
  Server,
  Activity,
  Check,
  Moon,
  Sun,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { api, API_BASE_URL } from '@/services/api';

interface SettingsProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ darkMode, onToggleDarkMode }) => {
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

  const connectionState = pingResult === null ? 'warning' : pingResult.success ? 'connected' : 'offline';
  const connectionLabel = pingResult === null ? 'Warning · Not tested' : pingResult.success ? 'Connected' : 'Offline';

  return (
    <>
      <PageHeader
        title="Platform settings & connectivity"
        description="Configure on-premises scanner engine parameters, air-gapped security rules, and backend API integration."
      />

      <div className="settings-console flex flex-col gap-6 max-w-5xl">
        <section className="settings-section" aria-labelledby="connectivity-heading">
          <div className="settings-section-heading">
            <span>01</span><h2 id="connectivity-heading">Connectivity</h2>
            <p>Backend endpoint and service health</p>
          </div>
          <div className="settings-panel settings-connectivity-panel">
            <div className="settings-panel-title">
              <div className="settings-icon-tile"><Wifi className="h-[18px] w-[18px]" /></div>
              <div><h3>Backend API</h3><p>FastAPI service · GET /api/v1/health</p></div>
              <span className={`settings-state settings-state-${connectionState}`}><i />{connectionLabel}</span>
            </div>
            <div className="settings-api-form">
              <div className="settings-field">
                <label htmlFor="settings-api-url">API base URL <span>ENVIRONMENT CONFIGURED</span></label>
                <input
                  id="settings-api-url"
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="font-mono"
                />
                <p>Configured via <code>VITE_API_URL</code>. Defaults to <code>http://127.0.0.1:8000/api/v1</code>.</p>
              </div>
              <button type="button" onClick={handleTestConnection} disabled={isPinging} className="btn-primary settings-test-button">
                <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                <span>{isPinging ? 'Testing…' : 'Test connection'}</span>
              </button>
            </div>
            {pingResult && (
              <div className={`settings-health-result ${pingResult.success ? 'is-connected' : 'is-offline'}`}>
                {pingResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <div><strong>{pingResult.success ? 'Backend Health Verified' : 'Backend Offline / Unreachable'}</strong><p>{pingResult.message}</p></div>
              </div>
            )}
          </div>
        </section>

        <section className="settings-section" aria-labelledby="scanner-heading">
          <div className="settings-section-heading">
            <span>02</span><h2 id="scanner-heading">Scanner engine</h2>
            <p>Detection engine and compliance baseline</p>
          </div>
          <div className="settings-panel settings-engine-grid">
            <div className="settings-info-block">
              <div className="settings-info-icon is-pqc"><Cpu /></div>
              <div><span>ENGINE VERSION</span><strong>PQC-Sentinel AST Analyzer v0.8.4</strong><p>Post-quantum cryptographic detection and AST parsing engine</p></div>
              <b className="settings-state settings-state-active"><i />Active</b>
            </div>
            <div className="settings-info-block">
              <div className="settings-info-icon"><Shield /></div>
              <div><span>FIPS BASELINE</span><strong>FIPS 203 / 204 / 205</strong><p>Baseline enabled for cryptographic assessment</p></div>
              <b className="settings-state settings-state-enforced"><i />Enforced</b>
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="airgap-heading">
          <div className="settings-section-heading">
            <span>03</span><h2 id="airgap-heading">Air-gapped security</h2>
            <p>Local data handling and isolation controls</p>
          </div>
          <div className="settings-panel settings-airgap-panel">
            <div className="settings-telemetry-banner">
              <div className="settings-info-icon is-secure"><CloudOff /></div>
              <div><span>TELEMETRY MODE</span><strong>Air-Gapped Offline Mode</strong><p>Zero external SaaS telemetry</p></div>
              <span className="settings-state settings-state-enforced"><i />Enforced</span>
            </div>
            <div className="settings-control-grid">
              <div className="settings-control-row">
                <div className="settings-info-icon is-secure"><LockKeyhole /></div>
                <div><strong>Zero Cloud Telemetry</strong><p>ASTs, vulnerabilities, and CBOM components remain within the local environment.</p></div>
                <span className="settings-state settings-state-enforced"><i />Enforced</span>
              </div>
              <div className="settings-control-row">
                <div className="settings-info-icon"><HardDrive /></div>
                <div><strong>Local Archive Sandbox</strong><p>Repository archives are validated locally and extracted inside an ephemeral sandbox.</p></div>
                <span className="settings-state settings-state-enforced"><i />Enforced</span>
              </div>
              <div className="settings-control-row">
                <div className="settings-info-icon"><Shield /></div>
                <div><strong>Isolation controls</strong><p>Outbound data handling remains restricted to the local environment.</p></div>
                <span className="settings-state settings-state-enforced"><i />Enforced</span>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="system-status-heading">
          <div className="settings-section-heading">
            <span>04</span><h2 id="system-status-heading">System status</h2>
            <p>Current platform control state</p>
          </div>
          <div className="settings-system-status">
            <div><Server /><span>Backend API</span><strong className={`settings-state settings-state-${connectionState}`}><i />{connectionLabel}</strong></div>
            <div><Activity /><span>Scanner engine</span><strong className="settings-state settings-state-active"><i />Active</strong></div>
            <div><Shield /><span>FIPS baseline</span><strong className="settings-state settings-state-enforced"><i /><Check />Enforced</strong></div>
            <div><CloudOff /><span>Air-gapped policy</span><strong className="settings-state settings-state-enforced"><i /><Check />Enforced</strong></div>
          </div>
          <div className="settings-appearance-row">
            <div className="settings-info-icon is-pqc">{darkMode ? <Moon /> : <Sun />}</div>
            <div><strong>Appearance</strong><p>Use the persisted light or dark workspace theme.</p></div>
            <span className="settings-appearance-value">{darkMode ? 'Dark mode' : 'Light mode'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={darkMode}
              aria-label="Enable dark mode"
              onClick={onToggleDarkMode}
              className={`settings-theme-switch ${darkMode ? 'is-on' : ''}`}
            ><i /></button>
          </div>
        </section>
      </div>
    </>
  );
};

export default Settings;
