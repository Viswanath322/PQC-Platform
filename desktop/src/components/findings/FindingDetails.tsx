import React from 'react';
import {
  X,
  FileCode,
  Lightbulb,
  Copy,
  Check,
  Terminal,
  HelpCircle,
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
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-slate-900/98 backdrop-blur-xl border-l border-slate-700 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Drawer Top Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/70">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-semibold text-teal-400 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-800/40">
            {finding.id}
          </span>
          <SeverityBadge severity={finding.severity} size="sm" />
          <CategoryBadge category={finding.category} size="sm" />
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          title="Close details panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-lg font-bold text-slate-100 leading-snug">
            {finding.title}
          </h2>
          {finding.cwe_id && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span className="text-teal-400 font-semibold">{finding.cwe_id}</span>
            </div>
          )}
        </div>

        {/* Location Box */}
        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-200 truncate">
            <FileCode className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span className="truncate">{finding.file}</span>
            <span className="text-teal-400 font-bold">Line {finding.line}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
            <span>Confidence:</span>
            <strong className="text-slate-200">{finding.confidence}</strong>
          </div>
        </div>

        {/* Code Evidence Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>Source Evidence</span>
            </span>
            <button
              onClick={handleCopyEvidence}
              className="text-[11px] text-slate-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Snippet'}</span>
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0d141f]">
            <div className="px-3.5 py-1.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>{finding.file} (Line {finding.line})</span>
              <span>Python / AST</span>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
              <code>{finding.evidence}</code>
            </pre>
          </div>
        </div>

        {/* Explanation Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Vulnerability Explanation</span>
          </h4>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            {finding.explanation}
          </div>
        </div>

        {/* Remediation & Recommendation Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-teal-400" />
            <span>Remediation & Quantum Migration Strategy</span>
          </h4>
          <div className="p-4 rounded-xl bg-teal-950/20 border border-teal-500/30 text-xs text-teal-100 leading-relaxed space-y-2">
            <p>{finding.recommendation}</p>
            <div className="pt-2 border-t border-teal-500/20 text-[11px] text-teal-300 flex items-center gap-2">
              <span>Standard Baseline: NIST FIPS 203 (ML-KEM) & FIPS 204 (ML-DSA)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Footer Actions */}
      <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-500 font-mono">
          Detected: {finding.detected_at || '2026-09-29 11:42 UTC'}
        </span>
        <button
          onClick={onClose}
          className="btn-secondary px-4 py-1.5 text-xs font-medium rounded-lg"
        >
          Close Panel
        </button>
      </div>
    </div>
  );
};
