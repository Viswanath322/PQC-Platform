/**
 * ApiErrorBanner — displays real API error states for projects/scans/uploads.
 *
 * CRITICAL: This component NEVER shows mock data as a fallback.
 * It renders the real error state so the user understands what happened.
 *
 * Usage: replace silent mock fallbacks with <ApiErrorBanner error={err} onRetry={...} />
 */
import React from 'react';
import { AlertCircle, Lock, ShieldAlert, ServerCrash, Wifi, AlertTriangle } from 'lucide-react';
import { ApiError } from '../../services/api';
import type { ApiErrorType } from '../../services/api';

interface ApiErrorBannerProps {
  error: ApiError | Error | unknown;
  onRetry?: () => void;
  onSignIn?: () => void;
  className?: string;
}

interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  detail: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
}

function getErrorConfig(errorType: ApiErrorType): ErrorConfig {
  switch (errorType) {
    case 'UNAUTHORIZED':
      return {
        icon: <Lock size={20} />,
        title: 'Authentication Required',
        detail: 'Your session has expired or you are not signed in. Please sign in to continue.',
        accentColor: '#b45309',
        accentBg: 'rgba(245, 158, 11, 0.08)',
        accentBorder: 'rgba(245, 158, 11, 0.20)',
      };
    case 'FORBIDDEN':
      return {
        icon: <ShieldAlert size={20} />,
        title: 'Access Denied',
        detail: 'Your account is not associated with an organization. Contact your administrator.',
        accentColor: '#dc2626',
        accentBg: 'rgba(220, 38, 38, 0.07)',
        accentBorder: 'rgba(220, 38, 38, 0.18)',
      };
    case 'NOT_FOUND':
      return {
        icon: <AlertTriangle size={20} />,
        title: 'Resource Not Found',
        detail: 'Resource not found or unavailable.',
        accentColor: '#7c3aed',
        accentBg: 'rgba(124, 58, 237, 0.07)',
        accentBorder: 'rgba(124, 58, 237, 0.18)',
      };
    case 'SERVER_ERROR':
      return {
        icon: <ServerCrash size={20} />,
        title: 'Server Error',
        detail: 'A backend server error occurred. Please try again later.',
        accentColor: '#dc2626',
        accentBg: 'rgba(220, 38, 38, 0.07)',
        accentBorder: 'rgba(220, 38, 38, 0.18)',
      };
    case 'NETWORK_ERROR':
      return {
        icon: <Wifi size={20} />,
        title: 'Backend Unavailable',
        detail: 'Cannot reach the PQC backend. Check that the server is running and try again.',
        accentColor: '#475569',
        accentBg: 'rgba(71, 85, 105, 0.07)',
        accentBorder: 'rgba(71, 85, 105, 0.18)',
      };
    default:
      return {
        icon: <AlertCircle size={20} />,
        title: 'Error',
        detail: 'An unexpected error occurred.',
        accentColor: '#475569',
        accentBg: 'rgba(71, 85, 105, 0.07)',
        accentBorder: 'rgba(71, 85, 105, 0.18)',
      };
  }
}

export const ApiErrorBanner: React.FC<ApiErrorBannerProps> = ({
  error,
  onRetry,
  onSignIn,
  className = '',
}) => {
  const isApiError = error instanceof ApiError;
  const errorType: ApiErrorType = isApiError ? error.errorType : 'UNKNOWN';
  const config = getErrorConfig(errorType);

  const showSignIn = errorType === 'UNAUTHORIZED' && onSignIn;

  return (
    <div
      role="alert"
      className={`card flex flex-col items-center justify-center p-12 text-center ${className}`}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
        style={{
          background: config.accentBg,
          border: `1px solid ${config.accentBorder}`,
          color: config.accentColor,
        }}
      >
        {config.icon}
      </div>

      <h3
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#29384D',
          marginBottom: 6,
        }}
      >
        {config.title}
      </h3>

      <p
        style={{
          fontSize: 13,
          color: '#687587',
          maxWidth: 360,
          lineHeight: 1.6,
          marginBottom: 20,
        }}
      >
        {config.detail}
      </p>

      <div className="flex items-center gap-3">
        {showSignIn && (
          <button
            id="api-error-sign-in-btn"
            onClick={onSignIn}
            className="btn-primary"
          >
            Sign In
          </button>
        )}

        {onRetry && (
          <button
            id="api-error-retry-btn"
            onClick={onRetry}
            className={showSignIn ? 'btn' : 'btn-primary'}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ApiErrorBanner;
