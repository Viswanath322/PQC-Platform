import React from 'react';
import { X, FileCode, Lightbulb, Copy, Check, Terminal, HelpCircle } from 'lucide-react';
import type { Finding } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { CategoryBadge } from '../common/CategoryBadge';

interface FindingDetailsProps {
  finding: Finding | null;
  onClose: () => void;
}

export const FindingDetails: React.FC<FindingDetailsProps> = ({ finding, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const closeTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    setIsClosing(false);
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, [finding?.finding_id]);

  if (!finding) return null;

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    closeTimer.current = window.setTimeout(onClose, 160);
  };

  const handleCopyEvidence = async () => {
    if (!finding.evidence) return;
    await navigator.clipboard.writeText(finding.evidence);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`finding-drawer fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-hidden border-l border-white/70 shadow-2xl glass-strong${isClosing ? ' is-closing' : ''}`}>
      <div className="finding-drawer-header flex items-center justify-between gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary ring-1 ring-primary/25">
            {finding.finding_id}
          </span>
          <SeverityBadge severity={finding.severity} size="sm" />
          <CategoryBadge category={finding.engine} size="sm" />
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/80 bg-white/70 text-slate-500 hover:text-slate-900"
          aria-label="Close details panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="finding-drawer-content flex-1 space-y-6 overflow-y-auto p-6 text-[13px]">
        <div className="finding-summary-section">
          <p className="inspector-label mb-1.5">WHAT WAS FOUND</p>
          <h2 className="finding-title text-[19px] font-semibold leading-snug tracking-tight text-slate-900">
            {finding.title}
          </h2>
          <p className="inspector-rule mt-2 text-[12px] text-slate-600">
            Rule / category: <span className="font-medium text-slate-900">{finding.category ?? 'Not provided'}</span>
          </p>
        </div>

        <div className="inspector-location rounded-xl border border-slate-200/60 bg-white/60 p-4">
          <div className="inspector-section-heading mb-2 flex items-center gap-2 text-[13px] font-medium text-slate-900">
            <FileCode className="h-4 w-4 text-primary" />
            <span>WHERE IT WAS FOUND</span>
          </div>
          <div className="break-all font-mono text-[12px] text-slate-600">{finding.file_path}</div>
          <div className="mt-1 font-mono text-[11px] text-slate-500">
            Line number: <span className="font-semibold text-slate-900">{finding.line_number ?? 'Not provided'}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Scan: {finding.scan_id}</div>
        </div>

        <section className="inspector-evidence">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="inspector-section-heading flex items-center gap-2 text-[13px] font-medium text-slate-900">
              <Terminal className="h-4 w-4 text-primary" />
              <h3>EVIDENCE</h3>
            </div>
            <button
              type="button"
              onClick={handleCopyEvidence}
              disabled={!finding.evidence}
              className="btn h-7 px-2 text-[11.5px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy evidence'}</span>
            </button>
          </div>
          <pre className="inspector-code overflow-x-auto whitespace-pre-wrap break-words rounded-xl border p-4 font-mono text-[11px] leading-relaxed">
            <code>{finding.evidence ?? 'No evidence supplied by the findings API.'}</code>
          </pre>
        </section>

        <section className="inspector-explanation rounded-xl border border-slate-200/60 bg-white/60 p-4">
          <h3 className="inspector-section-heading mb-2 flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <HelpCircle className="h-4 w-4 text-violet-600" /> WHY IT MATTERS
          </h3>
          <p className="leading-relaxed text-slate-600">
            {finding.explanation?.trim() || 'No explanation available.'}
          </p>
        </section>

        <section className="inspector-remediation rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="inspector-section-heading mb-2 flex items-center gap-2 text-[13px] font-semibold text-primary">
            <Lightbulb className="h-4 w-4" /> HOW TO FIX IT
          </h3>
          <p className="leading-relaxed text-slate-700">
            {finding.recommendation ?? 'No remediation recommendation supplied.'}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Confidence</span>
            <div className="mt-1 font-semibold uppercase text-slate-900">{finding.confidence ?? 'Not provided'}</div>
          </div>
          <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Finding ID</span>
            <div className="mt-1 break-all font-mono font-medium text-primary">{finding.finding_id}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
