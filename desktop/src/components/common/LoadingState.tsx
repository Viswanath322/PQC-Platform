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
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
        <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
      </div>
      <h3 className="text-sm font-semibold text-slate-200">{message}</h3>
      {submessage && <p className="text-xs text-slate-400 mt-1 max-w-sm">{submessage}</p>}
    </div>
  );
};
