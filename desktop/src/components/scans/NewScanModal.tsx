import React, { useState } from 'react';
import { X, Play, FolderGit2, Clock, AlertCircle } from 'lucide-react';
import { RepositoryUpload } from './RepositoryUpload';
import { api, ApiError } from '../../services/api';
import type { Project, Scan } from '../../types';

interface NewScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  defaultProjectId?: string;
  onScanCreated: (scan: Scan) => void;
}

export const NewScanModal: React.FC<NewScanModalProps> = ({
  isOpen,
  onClose,
  projects,
  defaultProjectId,
  onScanCreated,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId || (projects[0]?.id ?? '')
  );
  const [uploadedFile, setUploadedFile] = useState<{
    upload_id: string;
    filename: string;
    size_bytes: number;
    file: File;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdScan, setCreatedScan] = useState<Scan | null>(null);

  // BUG 6: Capture create-scan errors and show them to the user
  const [createError, setCreateError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUploadSuccess = (data: {
    upload_id: string;
    filename: string;
    size_bytes: number;
    file: File;
  }) => {
    setUploadedFile(data);
    setCreateError(null); // clear any previous error when upload changes
  };

  // BUG 8: Start scan MUST require a valid upload
  // Disabled when: no project, no upload, or already submitting
  const canStartScan = !!selectedProjectId && !!uploadedFile && !isSubmitting;
  const startScanTooltip = !selectedProjectId
    ? 'Select a project before starting a scan.'
    : !uploadedFile
      ? 'Upload a project before starting a scan.'
      : isSubmitting
        ? 'Scan is being queued…'
        : 'Create & Queue Scan';

  const handleCreateScan = async () => {
    if (!canStartScan) return;

    setIsSubmitting(true);
    setCreateError(null);
    try {
      const scan = await api.createScan({
        project_id: selectedProjectId,
        upload_id: uploadedFile!.upload_id,
        filename: uploadedFile!.filename,
        file_size: `${(uploadedFile!.size_bytes / (1024 * 1024)).toFixed(1)} MB`,
      });

      setCreatedScan(scan);
      onScanCreated(scan);
    } catch (err: unknown) {
      // BUG 6: Surface real error — never create a fake scan
      const message =
        err instanceof ApiError
          ? err.userMessage
          : 'Unable to start scan. Please try again.';
      setCreateError(message);
      console.error('Scan creation failed:', err);
      // Do NOT call onScanCreated — the scan was NOT created
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setUploadedFile(null);
    setCreatedScan(null);
    setCreateError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="glass-strong w-full max-w-xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/40">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/25 text-primary">
              <Play className="h-4 w-4 fill-current" />
            </div>
            <div>
              <h2 className="section-title">Initiate security assessment scan</h2>
              <p className="section-sub mt-0.5">Upload code package &amp; run PQC AST vulnerability analysis</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/80 bg-white/70 text-slate-500 hover:text-slate-900"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 text-[13px]">
          {createdScan ? (
            /* Scan status confirmation */
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-medium/10 ring-1 ring-medium/25 text-medium mb-4 animate-pulse">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-[18px] font-semibold text-slate-900 mb-1">Scan created</h3>
              <p className="text-[13px] text-slate-500 mb-2">
                Scan ID: <span className="font-mono text-purple-700 font-semibold">{createdScan.id}</span>
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-medium/10 text-medium ring-1 ring-medium/25 mb-4">
                Status: {createdScan.status}
              </div>
              <p className="text-[13px] text-slate-500 max-w-sm mb-6 leading-relaxed">
                The repository has been queued for AST ingestion, cryptographic inspection, and post-quantum vulnerability grading.
              </p>
              <button onClick={handleResetAndClose} className="btn-primary px-6">
                Close &amp; View in Scans Table
              </button>
            </div>
          ) : (
            <>
              {/* BUG 6: Create-scan error — shown to user, not just console */}
              {createError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl px-4 py-3 text-[13px]"
                  style={{
                    background: 'rgba(220, 38, 38, 0.07)',
                    border: '1px solid rgba(220, 38, 38, 0.18)',
                    color: '#dc2626',
                  }}
                >
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Unable to start scan</div>
                    <div className="mt-0.5 text-[12px] text-red-700/80">{createError}</div>
                  </div>
                  <button
                    onClick={() => setCreateError(null)}
                    className="ml-auto shrink-0 hover:opacity-70"
                    aria-label="Dismiss error"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Step 1: Select Target Project */}
              <div className="flex flex-col gap-2">
                <label className="eyebrow flex items-center gap-1.5">
                  <FolderGit2 className="h-3.5 w-3.5 text-primary" />
                  <span>1. Select Target Project</span>
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-white/80 bg-white/70 px-3 text-[13px] text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({proj.branch || 'main'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Upload ZIP Repository */}
              <div className="flex flex-col gap-2">
                <label className="eyebrow">
                  2. Upload Repository Package (.zip)
                </label>
                <RepositoryUpload
                  onUploadSuccess={handleUploadSuccess}
                  isUploading={isSubmitting}
                />
                {/* BUG 8: Upload required helper text */}
                {!uploadedFile && (
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <AlertCircle size={11} />
                    Upload a .zip file above before you can start a scan.
                  </p>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="btn"
                >
                  Cancel
                </button>
                {/* BUG 8: disabled until upload exists */}
                <button
                  type="button"
                  onClick={handleCreateScan}
                  disabled={!canStartScan}
                  title={startScanTooltip}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{isSubmitting ? 'Queueing Scan…' : 'Create & Queue Scan'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
