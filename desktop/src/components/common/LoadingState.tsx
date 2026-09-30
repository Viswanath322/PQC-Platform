import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  submessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading platform telemetry...',
  submessage,
}) => {
  return (
    <div className="loading-state flex flex-col items-center justify-center p-12 text-center">
      <div className="icon-tile mb-4 flex h-11 w-11 items-center justify-center border border-primary/20 bg-primary/8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{message}</h3>
      {submessage && <p className="mt-1 max-w-sm text-xs text-slate-500">{submessage}</p>}
    </div>
  );
};
