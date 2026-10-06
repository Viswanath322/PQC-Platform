import React from 'react';
import {
  X,
  FileCode,
  Lightbulb,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';
import type { Finding } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { CategoryBadge } from '../common/CategoryBadge';

interface FindingDetailsProps {
  finding: Finding | null;
  onClose: () => void;
}

export const FindingDetails: React.FC<FindingDetailsProps> = ({
  finding,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!finding) return null;

  const handleCopyEvidence = () => {
    navigator.clipboard.writeText(finding.evidence);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl glass-strong border-l border-white/70 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Drawer Top Header */}
      <div className="px-6 py-4 border-b border-slate-200/60 flex items-center justify-between gap-3 bg-white/40">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] font-semibold text-purple-700 bg-purple-100/70 border border-purple-200/80 px-2 py-0.5 rounded shadow-xs">
            {finding.id}
          </span>
          <SeverityBadge severity={finding.severity} size="sm" />
          <CategoryBadge category={finding.category} size="sm" />
          {finding.engine && (
            <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium ring-1 bg-slate-100 text-slate-700 ring-slate-300/50">
              Engine: {finding.engine}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/80 bg-white/70 text-slate-500 hover:text-slate-900"
          aria-label="Close details panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-[13px]">
        {/* Title */}
        <div>
          <h2 className="text-[18px] font-semibold text-slate-900 tracking-tight leading-snug">
            {finding.title}
          </h2>
          <p className="mt-2 text-slate-600 leading-relaxed text-[13.5px]">
            {finding.explanation}
          </p>
        </div>

        {/* Location Box */}
        <div className="rounded-xl border border-slate-200/60 bg-white/60 p-4">
          <div className="flex items-center gap-2 text-slate-900 font-medium text-[13px] mb-2">
            <FileCode className="w-4 h-4 text-primary" />
            <span>Code Location</span>
          </div>
          <div className="font-mono text-[12px] text-slate-600 break-all">
            {finding.file}
          </div>
          {finding.line && (
            <div className="mt-1 font-mono text-[11px] text-slate-500 tabular">
              Line number: <span className="text-slate-900 font-semibold">{finding.line}</span>
            </div>
          )}
        </div>

        {/* Evidence Block */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-900 font-medium text-[13px]">
              <Terminal className="w-4 h-4 text-primary" />
              <span>Extracted Code Evidence</span>
            </div>
            <button
              onClick={handleCopyEvidence}
              className="btn h-7 px-2 text-[11.5px]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/80 font-mono text-[12px] text-slate-800 overflow-x-auto leading-relaxed">
            <code>{finding.evidence}</code>
          </pre>
        </div>

        {/* Remediation Guidance */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-primary font-semibold text-[13px] mb-2">
            <Lightbulb className="w-4 h-4" />
            <span>Post-Quantum Remediation Recommendation</span>
          </div>
          <p className="text-[13px] text-slate-700 leading-relaxed">
            {finding.recommendation}
          </p>
        </div>

        {/* Standards & CWE */}
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
            <span className="text-[10px] uppercase font-medium tracking-wider text-slate-500">Confidence</span>
            <div className="font-semibold text-slate-900 uppercase mt-1">
              {finding.confidence}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200/60 bg-white/60 p-3">
            <span className="text-[10px] uppercase font-medium tracking-wider text-slate-500">Weakness Classification</span>
            <div className="font-mono font-semibold text-purple-700 mt-1">
              {finding.cwe_id || 'CWE-327 / FIPS 203'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
