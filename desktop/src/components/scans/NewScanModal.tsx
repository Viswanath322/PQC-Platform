import React, { useState } from 'react';
import { X, Play, FolderGit2, Clock } from 'lucide-react';
import { RepositoryUpload } from './RepositoryUpload';
import { api } from '../../services/api';
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
    file_name: string;
    size_bytes: number;
    file: File;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdScan, setCreatedScan] = useState<Scan | null>(null);

  if (!isOpen) return null;

  const handleUploadSuccess = (data: {
    upload_id: string;
    file_name: string;
    size_bytes: number;
    file: File;
  }) => {
    setUploadedFile(data);
  };

  const handleCreateScan = async () => {
    if (!selectedProjectId) return;

    setIsSubmitting(true);
    try {
      const scan = await api.createScan({
        project_id: selectedProjectId,
        file_name: uploadedFile?.file_name || 'repository.zip',
        file_size: uploadedFile ? `${(uploadedFile.size_bytes / (1024 * 1024)).toFixed(1)} MB` : '8.2 MB',
      });

      setCreatedScan(scan);
      onScanCreated(scan);
    } catch (err: unknown) {
      console.error('Scan creation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setUploadedFile(null);
    setCreatedScan(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Initiate Security Assessment Scan</h2>
              <p className="text-xs text-slate-400">Upload code package & run PQC AST vulnerability analysis</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5">
          {createdScan ? (
            /* Success confirmation */
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">
                Scan Scheduled Successfully!
              </h3>
              <p className="text-xs text-slate-300 mb-2">
                Scan ID: <span className="font-mono text-teal-300 font-semibold">{createdScan.id}</span>
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-6">
                Status: {createdScan.status}
              </div>
              <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                The repository has been queued for AST ingestion, cryptographic inspection, and post-quantum vulnerability grading.
              </p>
              <button
                onClick={handleResetAndClose}
                className="btn-teal px-6 py-2 text-xs font-semibold rounded-lg shadow-md"
              >
                Close & View in Scans Table
              </button>
            </div>
          ) : (
            <>
              {/* Step 1: Select Target Project */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>1. Select Target Project</span>
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-teal-400"
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
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  2. Upload Repository Package (.zip)
                </label>
                <RepositoryUpload
                  onUploadSuccess={handleUploadSuccess}
                  isUploading={isSubmitting}
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="btn-secondary px-4 py-2 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateScan}
                  disabled={!selectedProjectId || isSubmitting}
                  className="btn-teal px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isSubmitting ? 'Queueing Scan...' : 'Create & Queue Scan'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
