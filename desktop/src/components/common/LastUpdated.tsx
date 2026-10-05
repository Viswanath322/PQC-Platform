import React from 'react';
import { Clock, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LastUpdatedProps {
  timestamp: Date | null;
  isPolling?: boolean;
  isPaused?: boolean;
  pauseReason?: 'max_time' | 'consecutive_errors' | 'hidden' | null;
  onResume?: () => void;
  className?: string;
}

export const LastUpdated: React.FC<LastUpdatedProps> = ({
  timestamp,
  isPolling = false,
  isPaused = false,
  pauseReason,
  onResume,
  className,
}) => {
  const timeFormatted = timestamp ? timestamp.toLocaleTimeString() : '—';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5 text-[12px] text-muted-foreground',
        className
      )}
    >
      <span className="flex items-center gap-1.5 font-mono tabular">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        <span>Last updated: {timeFormatted}</span>
      </span>

      {/* Auto-refreshing / Paused badge */}
      {isPaused ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          <Pause className="h-3 w-3" />
          <span>
            {pauseReason === 'max_time'
              ? 'Polling capped (10m)'
              : pauseReason === 'consecutive_errors'
              ? 'Connection lost'
              : 'Paused'}
          </span>
          {onResume && (
            <button
              onClick={onResume}
              className="ml-1 inline-flex items-center gap-1 font-semibold text-amber-900 hover:underline cursor-pointer"
              title="Resume automatic polling"
            >
              <Play className="h-2.5 w-2.5 fill-current" />
              <span>Resume</span>
            </button>
          )}
        </span>
      ) : isPolling ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Auto-refreshing</span>
        </span>
      ) : null}
    </div>
  );
};

export default LastUpdated;
