import React, { useState } from 'react';
import { X, FolderGit2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import type { Project } from '../../types';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newProj = await api.createProject({
        name: name.trim(),
        description: description.trim(),
        repository_url: repositoryUrl.trim(),
      });
      onProjectCreated(newProj);
      onClose();
      // Reset form
      setName('');
      setDescription('');
      setRepositoryUrl('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="card w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2/40">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/25 text-primary">
              <FolderGit2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="section-title">Register new repository target</h2>
              <p className="section-sub mt-0.5">Configure continuous cryptographic baseline scanning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border bg-surface text-muted-foreground hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-[13px]">
          {error && (
            <div className="p-3 rounded-lg border border-critical/30 bg-critical/10 text-critical text-[12px] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="eyebrow">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Core-Payment-Gateway"
              className="h-10 w-full rounded-lg border bg-surface px-3.5 text-[13px] text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="eyebrow">
              Target Scope & Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Microservice backend processing cardholder cryptograms and HSM handshakes"
              className="w-full rounded-lg border bg-surface p-3 text-[13px] text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="eyebrow">
              Local Air-Gapped Git Mirror (Optional)
            </label>
            <input
              type="text"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              placeholder="git@internal-git.corp:payments/core-gateway.git"
              className="h-10 w-full rounded-lg border bg-surface px-3.5 text-[13px] font-mono text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-[11px] text-muted-foreground">
              Air-gapped on-premises mirror url or leave empty for manual file bundle uploads.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn-primary disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Registering…' : 'Register Repository'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
