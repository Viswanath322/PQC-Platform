import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Service Error',
  message,
  onRetry,
}) => {
  return (
    <div className="error-state flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/80 p-10 text-center">
      <div className="icon-tile mb-3 flex h-11 w-11 items-center justify-center border border-critical/20 bg-white text-critical">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-red-900">{title}</h3>
      <p className="mb-4 max-w-md text-xs text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn inline-flex items-center gap-2 px-3 py-1.5 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};
