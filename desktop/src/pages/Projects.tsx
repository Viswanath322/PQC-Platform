import React, { useState, useEffect } from "react";
import { Plus, Search, FolderGit2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { NewScanModal } from "@/components/scans/NewScanModal";
import { ApiErrorBanner } from "@/components/common/ApiErrorBanner";
import { api, ApiError } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import type { Project, Scan } from "@/types";

interface ProjectsProps {
  projects?: React.ComponentProps<typeof ProjectCard>[];
}

export function Projects({ projects: externalProjects }: ProjectsProps) {
  const { handleUnauthorized } = useAuth();
  const [internalProjects, setInternalProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(!externalProjects);
  const [loadError, setLoadError] = useState<ApiError | Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [targetProjectForScan, setTargetProjectForScan] = useState<Project | null>(null);

  const loadProjects = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.getProjects();
      setInternalProjects(data);
    } catch (err) {
      // Surface real error — NEVER substitute mock data
      const apiErr = err instanceof ApiError ? err : new Error(String(err));
      setLoadError(apiErr);
      if (err instanceof ApiError && err.errorType === 'UNAUTHORIZED') {
        handleUnauthorized();
      }
      console.error("Failed to load projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!externalProjects) {
      loadProjects();
    }
  }, [externalProjects]);

  const handleProjectCreated = (newProject: Project) => {
    setInternalProjects((prev) => [newProject, ...prev]);
  };

  const handleStartScan = (project: Project) => {
    setTargetProjectForScan(project);
    setIsScanModalOpen(true);
  };

  const handleScanCreated = (scan: Scan) => {
    setInternalProjects((prev) =>
      prev.map((p) =>
        p.id === scan.project_id
          ? {
              ...p,
              last_scan_id: scan.id,
              last_scan_status: scan.status,
              last_scan_at: scan.created_at,
            }
          : p
      )
    );
  };

  // If external projects provided, use them directly
  if (externalProjects && externalProjects.length > 0) {
    return (
      <>
        <PageHeader
          title="Connected projects"
          description="Manage registered repositories, cryptographic scopes and continuous scan baselines."
          actions={
            <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Create project
            </button>
          }
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {externalProjects.map((p) => (
            <ProjectCard key={p.name} {...p} />
          ))}
        </div>
      </>
    );
  }

  // Filter internal projects
  const filtered = internalProjects.filter(
    (p) =>
      (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (p.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (p.branch?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Connected projects"
        description="Manage registered repositories, cryptographic scopes and continuous scan baselines."
        actions={
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Create project
          </button>
        }
      />

      {/* Search Filter Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter projects by repository or branch…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border bg-surface pl-9 pr-4 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="text-[12px] text-muted-foreground">
          Showing <span className="tabular font-medium text-foreground">{filtered.length}</span> repositories
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-64 p-5 skeleton" />
          ))}
        </div>
      ) : loadError ? (
        <ApiErrorBanner
          error={loadError}
          onRetry={loadProjects}
          onSignIn={loadError instanceof ApiError && loadError.errorType === 'UNAUTHORIZED' ? handleUnauthorized : undefined}
        />
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-muted-foreground">
            <FolderGit2 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-[16px] font-semibold">No repositories found</h3>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-sm">
            {searchQuery ? "No projects match your search query." : "Register your first repository to begin scanning."}
          </p>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary mt-5">
            <Plus className="h-4 w-4" /> Register Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((p) => {
            // A project has no scans if last_scan_status is absent
            const hasScans = !!p.last_scan_status;
            const validStatuses = ['queued', 'analyzing', 'completed'] as const;
            const rawStatus = hasScans && validStatuses.includes(p.last_scan_status!.toLowerCase() as typeof validStatuses[number])
              ? (p.last_scan_status!.toLowerCase() as typeof validStatuses[number])
              : undefined;
            // Only use real API finding counts — no invented defaults
            const counts = hasScans && p.findings_count ? {
              crit: p.findings_count.critical,
              high: p.findings_count.high,
              med: p.findings_count.medium,
              low: p.findings_count.low,
            } : undefined;
            // Only show a real scan date — never a hardcoded fallback
            const date = p.last_scan_at ? new Date(p.last_scan_at).toLocaleDateString() : undefined;
            return (
              <ProjectCard
                key={p.id || p.name}
                name={p.name}
                branch={p.branch || 'main'}
                description={p.description || 'No description provided'}
                state={rawStatus}
                counts={counts}
                date={date}
                onScan={() => handleStartScan(p)}
              />
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <ProjectForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* New Scan Modal */}
      <NewScanModal
        isOpen={isScanModalOpen}
        onClose={() => {
          setIsScanModalOpen(false);
          setTargetProjectForScan(null);
        }}
        projects={internalProjects}
        defaultProjectId={targetProjectForScan?.id}
        onScanCreated={handleScanCreated}
      />
    </>
  );
}

export default Projects;
