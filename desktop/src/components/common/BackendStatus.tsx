import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { api, API_BASE_URL } from '../../services/api';

interface BackendStatusProps {
  compact?: boolean;
  showEndpoint?: boolean;
  variant?: 'pill' | 'sidebar' | 'detailed';
}

export const BackendStatus: React.FC<BackendStatusProps> = ({
  compact = false,
  variant,
}) => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await api.health();
      setIsHealthy(res && res.status === 'healthy');
    } catch {
      setIsHealthy(false);
    } finally {
      setIsChecking(false);
      const now = new Date();
      setLastChecked(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 25000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const activeVariant = variant || (compact ? 'pill' : 'pill');

  if (activeVariant === 'sidebar') {
    return (
      <div
        className="px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer group"
        style={{
          background: isHealthy === true ? 'rgba(34, 197, 94, 0.08)' : isHealthy === false ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${isHealthy === true ? 'rgba(34, 197, 94, 0.2)' : isHealthy === false ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
        }}
        onClick={checkHealth}
        title={`Backend: ${API_BASE_URL}\nLast check: ${lastChecked || 'just now'}\nClick to re-ping`}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: isHealthy === true ? '#22c55e' : isHealthy === false ? '#ef4444' : '#94a3b8',
              boxShadow: isHealthy === true ? '0 0 8px rgba(34, 197, 94, 0.6)' : isHealthy === false ? '0 0 8px rgba(239, 68, 68, 0.6)' : 'none',
            }}
          />
          <div className="flex flex-col">
            <span
              className="font-medium text-[11.5px]"
              style={{
                color: isHealthy === true ? '#4ade80' : isHealthy === false ? '#f87171' : '#94a3b8',
              }}
            >
              {isHealthy === true ? 'FastAPI Connected' : isHealthy === false ? 'Backend Offline' : 'Connecting...'}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            checkHealth();
          }}
          disabled={isChecking}
          className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
          title="Re-check FastAPI health"
        >
          <RefreshCw size={11} className={isChecking ? 'animate-spin text-teal-400' : ''} />
        </button>
      </div>
    );
  }

  // Default compact pill
  return (
    <div
      onClick={checkHealth}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all hover:brightness-110 flex-shrink-0"
      style={{
        background: isHealthy === true ? 'rgba(34, 197, 94, 0.12)' : isHealthy === false ? 'rgba(239, 68, 68, 0.12)' : 'rgba(148, 163, 184, 0.1)',
        border: `1px solid ${isHealthy === true ? 'rgba(34, 197, 94, 0.28)' : isHealthy === false ? 'rgba(239, 68, 68, 0.28)' : 'rgba(148, 163, 184, 0.2)'}`,
        color: isHealthy === true ? '#4ade80' : isHealthy === false ? '#f87171' : '#94a3b8',
      }}
      title={`Backend: ${API_BASE_URL}\nStatus: ${isHealthy === true ? 'Healthy' : isHealthy === false ? 'Offline' : 'Connecting'}\nClick to re-ping`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: isHealthy === true ? '#22c55e' : isHealthy === false ? '#ef4444' : '#94a3b8',
        }}
      />
      <span>{isHealthy === true ? 'API Connected' : isHealthy === false ? 'Backend Offline' : 'Checking'}</span>
      <RefreshCw size={10} className={`opacity-60 ${isChecking ? 'animate-spin' : ''}`} />
    </div>
  );
};
