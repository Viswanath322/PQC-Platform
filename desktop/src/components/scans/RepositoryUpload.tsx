import React, { useState, useRef } from 'react';
import { Upload, FileArchive, CheckCircle2, AlertCircle, Shield, X } from 'lucide-react';
import { api } from '../../services/api';

interface RepositoryUploadProps {
  onUploadSuccess: (uploadData: { upload_id: string; file_name: string; size_bytes: number; file: File }) => void;
  isUploading?: boolean;
}

export const RepositoryUpload: React.FC<RepositoryUploadProps> = ({
  onUploadSuccess,
  isUploading: parentIsUploading = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    setUploadStatus('idle');
    setUploadProgress(0);

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMessage('Invalid file format. Please upload a valid .zip repository archive.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 200 MB limit.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(10);
    setErrorMessage(null);

    try {
      const result = await api.uploadRepository(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      setUploadStatus('success');
      setUploadProgress(100);
      onUploadSuccess({
        upload_id: result.upload_id,
        file_name: result.file_name,
        size_bytes: result.size_bytes,
        file: selectedFile,
      });
    } catch (err: unknown) {
      setUploadStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed. Backend ingestion service unavailable.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={handleFileChange}
        className="hidden"
        id="repository-zip-input"
      />

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center ${
          isDragOver
            ? 'border-teal-400 bg-teal-500/10'
            : selectedFile
            ? 'border-slate-700 bg-slate-800/40 cursor-default'
            : 'border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-800/30 cursor-pointer'
        }`}
      >
        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-1">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-200">
              Drag & Drop your repository archive here
            </div>
            <div className="text-xs text-slate-400">
              Supports <span className="font-mono text-teal-300">.zip</span> archives up to 200 MB
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="btn-secondary px-4 py-2 text-xs font-semibold rounded-lg shadow-sm"
              >
                [ Select Repository ]
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 flex-shrink-0">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-slate-200 truncate max-w-xs md:max-w-md">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatFileSize(selectedFile.size)} • Ready for ingestion
                  </div>
                </div>
              </div>

              {!isUploading && !parentIsUploading && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progress Bar during upload */}
            {(isUploading || uploadProgress > 0) && (
              <div className="w-full flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Uploading to ingestion pipeline...</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-teal-400 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions & Status */}
            {uploadStatus === 'idle' && (
              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="btn-secondary px-3 py-1.5 text-xs font-medium rounded-lg"
                >
                  Change File
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading || parentIsUploading}
                  className="btn-teal px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload & Ingest</span>
                </button>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Archive uploaded successfully. Staged for security scan.</span>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-500/30 px-3 py-2 rounded-lg text-left">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage || 'Failed to upload repository.'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {errorMessage && uploadStatus !== 'error' && (
        <div className="flex items-center gap-2 text-xs text-rose-400 px-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Air-gapped / Safe extraction security disclosure */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-900/30 border border-slate-800 text-[11px] text-slate-400">
        <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Air-Gapped Ingestion Notice:</strong> Archives are never unzipped client-side in the browser. Extraction, path traversal validation, and AST parsing are conducted securely within isolated backend container workers.
        </span>
      </div>
    </div>
  );
};
