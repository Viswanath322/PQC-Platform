import React from 'react';
import {
  X,
  Lightbulb,
  Copy,
  Check,
  Terminal,
  Info,
  Link2,
  AlertTriangle,
} from 'lucide-react';
import type { Finding } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { CategoryBadge } from '../common/CategoryBadge';

interface FindingDetailsProps {
  finding: Finding | null;
  /** Full list of loaded findings — enables related-finding navigation. */
  allFindings?: Finding[];
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NA = <span className="text-slate-400 font-normal italic text-[12px]">Not available</span>;

function hasValue(v: unknown): boolean {
  return v !== null && v !== undefined && v !== '';
}

/** Stable display reference: "F-" + last 4 hex chars of UUID (dashes stripped).
 *  e.g. 00000000-0000-0000-0002-000000000002 → F-0002
 *  Deterministic: same UUID always produces the same label. */
function findingRef(id: string): string {
  if (!id) return '—';
  const hex = id.replace(/-/g, '');
  return `F-${hex.slice(-4)}`;
}

function confidenceLabel(c: string | number | undefined | null): string {
  if (c === null || c === undefined || c === '') return '';
  if (typeof c === 'number') {
    if (c >= 0.85) return `HIGH (${Math.round(c * 100)}%)`;
    if (c >= 0.6) return `MEDIUM (${Math.round(c * 100)}%)`;
    return `LOW (${Math.round(c * 100)}%)`;
  }
  return String(c).toUpperCase();
}

// ── Field ─────────────────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  wide?: boolean;
}> = ({ label, value, mono, wide }) => (
  <div className={wide ? 'col-span-2' : undefined}>
    <span className="block text-[10px] uppercase font-medium tracking-wider text-slate-500 mb-0.5">
      {label}
    </span>
    <span
      className={`text-[13px] font-semibold text-slate-900 break-all leading-snug ${
        mono ? 'font-mono' : ''
      }`}
    >
      {value === undefined || value === null || value === '' ? NA : value}
    </span>
  </div>
);

// ── Section ───────────────────────────────────────────────────────────────────

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}> = ({ title, icon, children, accent }) => (
  <div className={`rounded-xl border p-4 ${accent ?? 'border-slate-200/60 bg-white/60'}`}>
    <div className="flex items-center gap-2 font-semibold text-[13px] text-slate-900 mb-3">
      {icon}
      <span>{title}</span>
    </div>
    {children}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const FindingDetails: React.FC<FindingDetailsProps> = ({
  finding: initialFinding,
  allFindings = [],
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);
  // Separate copy state for the header ID badge
  const [idCopied, setIdCopied] = React.useState(false);
  const [navStack, setNavStack] = React.useState<Finding[]>([]);

  const prevId = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (initialFinding?.id !== prevId.current) {
      prevId.current = initialFinding?.id ?? null;
      setNavStack([]);
      setIdCopied(false);
    }
  }, [initialFinding?.id]);

  if (!initialFinding) return null;

  const finding = navStack.length > 0 ? navStack[navStack.length - 1] : initialFinding;
  const isNavigated = navStack.length > 0;

  const handleCopyEvidence = () => {
    navigator.clipboard.writeText(finding.evidence ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!finding.id) return;
    navigator.clipboard.writeText(finding.id).then(() => {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 1800);
    });
  };

  const handleNavigateTo = (relatedId: string) => {
    const target = allFindings.find((f) => f.id === relatedId);
    if (target) setNavStack((s) => [...s, target]);
  };

  const handleBack = () => setNavStack((s) => s.slice(0, -1));

  const filePath = finding.file || finding.file_path || null;
  const lineNum = finding.line ?? finding.line_number ?? null;
  const confStr = confidenceLabel(finding.confidence);
  const engineLabel = hasValue(finding.engine) ? finding.engine!.toUpperCase() : null;

  const normalizedCategory =
    hasValue(finding.finding_category) && finding.finding_category !== finding.category
      ? finding.finding_category!
      : null;
  const hasNormalizedData = normalizedCategory !== null || hasValue(finding.cwe_id);

  const hasCorrelation =
    hasValue(finding.correlation_id) ||
    (Array.isArray(finding.related_finding_ids) && finding.related_finding_ids.length > 0);

  return (
    <div
      className="fixed inset-y-0 right-0 w-full max-w-xl glass-strong border-l border-white/70 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      role="dialog"
      aria-label="Finding details"
    >
      {/* ── Header ───────────────────────────────────────────────────────────
          Layout: [← Back] [ID badge + copy] [Severity] [Category] [Engine] [DEV]   [×]
          The ID badge is the same compact height as every other badge here.
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-slate-200/60 flex items-center justify-between gap-3 bg-white/40 shrink-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {isNavigated && (
            <button
              onClick={handleBack}
              className="text-[11px] text-primary hover:underline font-medium shrink-0"
            >
              ← Back
            </button>
          )}

          {/* ID badge — compact reference (F-0002) with copy, same height as other badges */}
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-purple-700 bg-purple-100/70 border border-purple-200/80 px-2 py-0.5 rounded shadow-xs shrink-0">
            <span
              title={finding.id ? `Full ID: ${finding.id}` : undefined}
              aria-label={finding.id ? `Finding ID: ${finding.id}` : 'No Finding ID'}
            >
              {finding.id ? findingRef(finding.id) : '—'}
            </span>
            {finding.id && (
              <button
                onClick={handleCopyId}
                title={idCopied ? 'Copied!' : 'Copy full finding ID'}
                aria-label={idCopied ? 'Copied' : 'Copy full finding ID'}
                className="grid h-3.5 w-3.5 place-items-center rounded text-purple-400 hover:text-purple-700 transition-colors"
              >
                {idCopied
                  ? <Check className="w-2.5 h-2.5 text-success" />
                  : <Copy className="w-2.5 h-2.5" />}
              </button>
            )}
          </span>

          <SeverityBadge severity={finding.severity} size="sm" />
          <CategoryBadge category={finding.category} size="sm" />

          {engineLabel && (
            <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium ring-1 bg-slate-100 text-slate-700 ring-slate-300/50">
              {engineLabel}
            </span>
          )}

          {finding.is_development && (
            <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold ring-1 bg-amber-50 text-amber-700 ring-amber-300/50">
              DEV DATA
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/80 bg-white/70 text-slate-500 hover:text-slate-900 shrink-0"
          aria-label="Close details panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 text-[13px]">

        {/* Title + explanation */}
        <div>
          <h2 className="text-[18px] font-semibold text-slate-900 tracking-tight leading-snug">
            {finding.title}
          </h2>
          <p className="mt-2 text-slate-600 leading-relaxed text-[13.5px]">
            {finding.explanation || finding.description}
          </p>
        </div>

        {/* ── 1. FINDING OVERVIEW ──────────────────────────────────────────────
            Finding ID reference shown here AND in the header badge.
            Header badge = compact navigation context.
            Overview field = complete scannable metadata record.
        ────────────────────────────────────────────────────────────────────── */}
        <Section title="Finding Overview" icon={<Info className="w-4 h-4 text-primary" />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">

            {/* Finding ID — reference label + full UUID on hover/copy */}
            <div className="col-span-2">
              <span className="block text-[10px] uppercase font-medium tracking-wider text-slate-500 mb-0.5">
                Finding ID
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className="font-mono text-[13px] font-semibold text-purple-700"
                  title={finding.id ? `Full UUID: ${finding.id}` : undefined}
                >
                  {finding.id ? findingRef(finding.id) : NA}
                </span>
                {finding.id && (
                  <button
                    onClick={handleCopyId}
                    title={idCopied ? 'Copied!' : `Copy full UUID: ${finding.id}`}
                    aria-label={idCopied ? 'Copied' : 'Copy full finding UUID'}
                    className="grid h-4 w-4 place-items-center rounded text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                  >
                    {idCopied
                      ? <Check className="w-3 h-3 text-success" />
                      : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            <Field
              label="Severity"
              value={<SeverityBadge severity={finding.severity} size="sm" />}
            />

            <Field
              label="Category"
              value={<CategoryBadge category={finding.category} size="sm" />}
            />

            <Field
              label="Engine / Source"
              value={engineLabel ?? undefined}
              mono
            />

            {/* Rule ID — not yet returned by backend */}
            <Field
              label="Rule ID"
              value={hasValue(finding.rule_id) ? finding.rule_id : undefined}
              mono
            />

            {/* Rule Version — not yet returned by backend */}
            <Field
              label="Rule Version"
              value={hasValue(finding.rule_version) ? finding.rule_version : undefined}
              mono
            />

            <Field
              label="Confidence"
              value={hasValue(confStr) ? confStr : undefined}
            />

            {/* File Path + Line Number */}
            <Field
              label="File Path"
              value={hasValue(filePath) ? filePath! : undefined}
              mono
              wide
            />

            <Field
              label="Line Number"
              value={lineNum !== null ? String(lineNum) : undefined}
              mono
            />

          </div>
        </Section>

        {/* ── 2. ORIGINAL DETECTOR EVIDENCE ──────────────────────────────────── */}
        <Section
          title="Original Detector Evidence"
          icon={<Terminal className="w-4 h-4 text-primary" />}
        >
          <p className="text-[11px] text-slate-500 mb-2 italic leading-relaxed">
            Extracted directly from the detection engine. Not modified or rewritten.
            Redacted values are preserved as stored.
          </p>

          {hasValue(finding.evidence) ? (
            <>
              <div className="flex items-center justify-end mb-2">
                <button onClick={handleCopyEvidence} className="btn h-7 px-2 text-[11.5px]">
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/80 font-mono text-[12px] text-slate-800 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                <code>{finding.evidence}</code>
              </pre>
            </>
          ) : (
            <p className="text-[12px] text-slate-400 italic">
              No evidence captured for this finding.
            </p>
          )}
        </Section>

        {/* ── 3. NORMALIZED FINDING ──────────────────────────────────────────── */}
        <Section
          title="Normalized Finding"
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          accent="border-amber-200/50 bg-amber-50/30"
        >
          {hasNormalizedData ? (
            <>
              <p className="text-[11px] text-slate-500 mb-3 italic">
                Normalized metadata produced from the detector output.
                Separate from the raw evidence above.
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {normalizedCategory && (
                  <Field label="Normalized Category" value={normalizedCategory} />
                )}
                {hasValue(finding.cwe_id) && (
                  <Field label="CWE Reference" value={finding.cwe_id} mono />
                )}
              </div>
            </>
          ) : (
            <p className="text-[12px] text-slate-400 italic leading-relaxed">
              The backend does not currently return separate normalized finding data
              (rule mapping, normalized category, CWE reference).
              This section will populate when those fields are available.
            </p>
          )}
        </Section>

        {/* ── 4. CORRELATION & RELATED FINDINGS ──────────────────────────────── */}
        <Section
          title="Correlation & Related Findings"
          icon={<Link2 className="w-4 h-4 text-slate-500" />}
        >
          {hasCorrelation ? (
            <div className="space-y-4">
              {hasValue(finding.correlation_id) && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field
                    label="Correlation / Group ID"
                    value={finding.correlation_id}
                    mono
                    wide={!hasValue(finding.correlation_reason)}
                  />
                  {hasValue(finding.correlation_reason) && (
                    <Field
                      label="Correlation Reason"
                      value={finding.correlation_reason}
                      wide
                    />
                  )}
                </div>
              )}

              {Array.isArray(finding.related_finding_ids) &&
                finding.related_finding_ids.length > 0 && (
                  <div>
                    <span className="block text-[10px] uppercase font-medium tracking-wider text-slate-500 mb-2">
                      Related Findings ({finding.related_finding_ids.length})
                    </span>
                    <ul className="space-y-1.5">
                      {finding.related_finding_ids.map((rid) => {
                        const related = allFindings.find((f) => f.id === rid);
                        return (
                          <li key={rid}>
                            <button
                              onClick={() => handleNavigateTo(rid)}
                              disabled={!related}
                              className={`w-full text-left rounded-lg border px-3 py-2 text-[12px] transition-colors ${
                                related
                                  ? 'border-slate-200/60 bg-white/60 hover:bg-primary/5 cursor-pointer'
                                  : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                              }`}
                              title={
                                related
                                  ? `View related finding ${rid}`
                                  : 'Finding not loaded in current view'
                              }
                            >
                              <span className="font-mono text-purple-700 mr-2 text-[11px]">
                                {findingRef(rid)}
                              </span>
                              {related ? (
                                <>
                                  <SeverityBadge severity={related.severity} size="sm" />
                                  <span className="ml-2 text-slate-700">{related.title}</span>
                                </>
                              ) : (
                                <span className="italic">Not in current view</span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
            </div>
          ) : (
            <p className="text-[12px] text-slate-400 italic leading-relaxed">
              The backend does not currently return correlation group IDs or related
              finding references. This section will populate when those fields are available.
            </p>
          )}
        </Section>

        {/* ── 5. RECOMMENDATION ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-primary font-semibold text-[13px] mb-2">
            <Lightbulb className="w-4 h-4" />
            <span>Post-Quantum Remediation Recommendation</span>
          </div>
          <p className="text-[13px] text-slate-700 leading-relaxed">
            {hasValue(finding.recommendation)
              ? finding.recommendation
              : hasValue(finding.remediation)
              ? finding.remediation
              : NA}
          </p>
        </div>

      </div>
    </div>
  );
};
