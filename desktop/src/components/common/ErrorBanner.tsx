import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ApiError } from '@/services/api';
import { cn } from '@/lib/utils';

interface ErrorBannerProps {
  error: ApiError | Error | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  onRetry,
  isRetrying = false,
  className,
}) => {
  if (!error) return null;

  const isApiError = error instanceof ApiError;
  const endpoint = isApiError ? error.endpoint : 'Local API';
  const statusLabel = isApiError
    ? error.kind === 'http' && error.status
      ? `HTTP ${error.status}`
      : 'Network error'
    : 'System error';

  const timeString = new Date().toLocaleTimeString();

  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-rose-300 bg-rose-50/90 p-4 shadow-sm backdrop-blur-md animate-in fade-in duration-200',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="min-w-0 flex-1 text-[13px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-rose-950">API Communication Failure</span>
              <span className="rounded bg-rose-200/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-800">
                {statusLabel}
              </span>
              <span className="font-mono text-[11px] text-rose-700 truncate max-w-[200px]" title={endpoint}>
                {endpoint}
              </span>
              <span className="text-[11px] text-rose-600/80 tabular">
                at {timeString}
              </span>
            </div>
            <p className="mt-1 font-mono text-[12px] text-rose-900 bg-white/70 border border-rose-200/70 p-2 rounded-md break-words select-text">
              {error.message || 'An unexpected API communication error occurred.'}
            </p>
          </div>
        </div>

        {onRetry && (
          <div className="flex items-center shrink-0 sm:self-center">
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 text-[12px] font-medium text-rose-900 shadow-2xs hover:bg-rose-50 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-rose-700', isRetrying && 'animate-spin')} />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorBanner;
