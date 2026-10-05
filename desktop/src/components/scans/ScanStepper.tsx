import React from 'react';
import { Check, AlertCircle, Ban, Loader2 } from 'lucide-react';
import type { ScanStatus } from '@/types/scan';
import { getScanStepIndex } from '@/types/scan';
import { cn } from '@/lib/utils';

interface ScanStepperProps {
  status: ScanStatus;
  errorMessage?: string | null;
  className?: string;
}

interface StepItem {
  id: string;
  label: string;
  description: string;
}

const STEPS: StepItem[] = [
  { id: 'QUEUED', label: 'Queued', description: 'Enqueued in Redis pipeline' },
  { id: 'INGESTING', label: 'Ingesting', description: 'Extracting archive & files' },
  { id: 'ANALYZING', label: 'Analyzing', description: 'AST, Crypto & SAST engines' },
  { id: 'COMPLETED', label: 'Completed', description: 'Assessment finished' },
];

export const ScanStepper: React.FC<ScanStepperProps> = ({
  status,
  errorMessage,
  className,
}) => {
  const currentIndex = getScanStepIndex(status);
  const isFailed = status === 'FAILED';
  const isCancelled = status === 'CANCELLED';
  const isCompleted = status === 'COMPLETED';

  return (
    <div className={cn('w-full', className)}>
      <nav aria-label="Scan progress" className="w-full">
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STEPS.map((step, index) => {
            const isPast = !isFailed && !isCancelled && index < currentIndex;
            const isCurrent = !isFailed && !isCancelled && index === currentIndex;
            const isFuture = !isFailed && !isCancelled && index > currentIndex;
            const isThisFailedStep = isFailed && index === currentIndex;
            const isThisCancelledStep = isCancelled && index === currentIndex;

            return (
              <li
                key={step.id}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'relative rounded-xl border p-4 transition-all duration-200 backdrop-blur-md',
                  isPast &&
                    'border-emerald-200/80 bg-emerald-50/40 text-foreground shadow-2xs',
                  isCurrent &&
                    'border-purple-300 bg-white/90 text-foreground ring-2 ring-purple-400/30 shadow-sm',
                  isFuture &&
                    'border-border/60 bg-surface/40 text-muted-foreground opacity-75',
                  isThisFailedStep &&
                    'border-rose-300 bg-rose-50/70 text-foreground ring-2 ring-rose-400/30 shadow-sm',
                  isThisCancelledStep &&
                    'border-slate-300 bg-slate-50/70 text-foreground shadow-2xs'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Step icon / indicator */}
                  <div
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-semibold transition-colors',
                      isPast && 'bg-emerald-500 text-white shadow-xs',
                      isCurrent && 'bg-purple-700 text-white shadow-xs',
                      isFuture && 'bg-surface-2 text-muted-foreground border border-border',
                      isThisFailedStep && 'bg-rose-500 text-white shadow-xs',
                      isThisCancelledStep && 'bg-slate-500 text-white shadow-xs'
                    )}
                  >
                    {isPast || isCompleted ? (
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    ) : isThisFailedStep ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : isThisCancelledStep ? (
                      <Ban className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                        Step 0{index + 1}
                      </span>
                      {isCurrent && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                          Active
                        </span>
                      )}
                      {isThisFailedStep && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                          Failed
                        </span>
                      )}
                      {isThisCancelledStep && (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          Cancelled
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-[13px] text-foreground mt-0.5">
                      {step.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {step.description}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Verbatim API Error details when scan FAILED */}
      {isFailed && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-rose-300 bg-rose-50/80 p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h4 className="text-[13px] font-semibold text-rose-950">
                Scan execution failed
              </h4>
              <p className="mt-1 text-[12px] font-mono text-rose-900 bg-white/70 border border-rose-200/80 p-2.5 rounded-lg whitespace-pre-wrap break-words leading-relaxed select-text">
                {errorMessage || 'Scan terminated with an unhandled analysis engine error.'}
              </p>
              <p className="mt-2 text-[11px] text-rose-700">
                The error message above was returned verbatim by the analysis engine. Check repository dependencies and archive integrity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Terminal cancelled state notice */}
      {isCancelled && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-slate-300 bg-slate-50/80 p-3.5 shadow-2xs text-[12px] text-slate-700 flex items-center gap-2.5"
        >
          <Ban className="h-4 w-4 text-slate-500 shrink-0" />
          <span>This scan was manually cancelled before completion. No further findings will be generated.</span>
        </div>
      )}
    </div>
  );
};
