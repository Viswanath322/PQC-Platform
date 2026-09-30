import React, { useState, useRef } from 'react';
import { Upload, FileArchive, CheckCircle2, AlertCircle, X } from 'lucide-react';
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
    <div className="flex flex-col gap-3 w-full text-[13px]">
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
        className={`border border-dashed rounded-xl p-6 transition-all duration-150 text-center ${
          isDragOver
            ? 'border-primary bg-primary/10'
            : selectedFile
            ? 'border-slate-200/60 bg-white/60 cursor-default'
            : 'border-slate-300 hover:border-primary/50 bg-white/50 hover:bg-white/70 cursor-pointer'
        }`}
      >
        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/25 text-primary mb-1">
              <Upload className="h-5 w-5" />
            </div>
            <div className="text-[14px] font-semibold text-slate-900">
              Drag &amp; drop your repository archive here
            </div>
            <div className="text-[12px] text-slate-500">
              Supports <span className="font-mono text-primary">.zip</span> archives up to 200 MB
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="btn text-[12px] h-8"
              >
                Browse local files
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                <FileArchive className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate max-w-sm font-mono text-[13px]">
                  {selectedFile.name}
                </div>
                <div className="text-[12px] text-slate-500 tabular">
                  {formatFileSize(selectedFile.size)} · Ready to ingest
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {uploadStatus === 'idle' && (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading || parentIsUploading}
                  className="btn-primary h-8 px-3 text-[12px]"
                >
                  Confirm &amp; Ingest
                </button>
              )}
              {uploadStatus !== 'uploading' && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/80 bg-white/70 text-slate-500 hover:text-slate-900"
                  aria-label="Remove selected archive"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {uploadStatus === 'uploading' && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-500 tabular">
            <span>Ingesting archive to local sandbox…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200/70 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Messages */}
      {uploadStatus === 'success' && (
        <div className="p-3 rounded-lg border border-success/30 bg-success/10 text-success text-[12px] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Archive verified and cached in local air-gapped memory sandbox.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg border border-critical/30 bg-critical/10 text-critical text-[12px] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
