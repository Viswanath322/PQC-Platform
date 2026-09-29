import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderGit2, Search, Play, LayoutGrid, List } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { ProjectCard } from '../components/projects/ProjectCard';
import { ProjectForm } from '../components/projects/ProjectForm';
import { NewScanModal } from '../components/scans/NewScanModal';
import { ScanStatusBadge } from '../components/scans/ScanStatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import type { Project, Scan } from '../types';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [targetProjectForScan, setTargetProjectForScan] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  const handleStartScan = (project: Project) => {
    setTargetProjectForScan(project);
    setIsScanModalOpen(true);
  };

  const handleScanCreated = (scan: Scan) => {
    // Update local project status
    setProjects((prev) =>
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

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.repository_url.toLowerCase().includes(q)
    );
  });

  return (
    <PageContainer
      title="Connected Projects"
      subtitle="Manage registered repositories, cryptographic scopes, and continuous scan baselines."
      actions={
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${
                viewMode === 'grid' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md ${
                viewMode === 'table' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-teal px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Project</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Search Bar & Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name, branch, or repo..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-400 transition-colors"
            />
          </div>

          <div className="text-xs text-slate-400">
            Total Projects: <strong className="text-slate-200">{projects.length}</strong>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <LoadingState message="Loading registered projects..." />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon={FolderGit2}
            title="No projects found"
            description={
              searchQuery
                ? `No projects matched "${searchQuery}". Try a different search query.`
                : "You haven't created any projects yet. Register a repository to begin security scanning."
            }
            actionText={searchQuery ? 'Clear Search' : 'Create Project'}
            onAction={() => (searchQuery ? setSearchQuery('') : setIsCreateModalOpen(true))}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((proj) => (
              <ProjectCard
                key={proj.id}
                project={proj}
                onStartScan={handleStartScan}
                onViewDetails={() => navigate(`/scans?project=${proj.id}`)}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold tracking-wider uppercase">
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Repository</th>
                  <th className="py-3 px-4">Last Scan</th>
                  <th className="py-3 px-4">Scan Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-400">
                      {p.description}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-teal-300 truncate max-w-[180px]">
                      {p.repository_url}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {p.last_scan_at ? p.last_scan_at.split(' ')[0] : 'Never scanned'}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.last_scan_status ? (
                        <ScanStatusBadge status={p.last_scan_status} size="sm" />
                      ) : (
                        <span className="text-slate-500 italic">No scans</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {p.created_at.split(' ')[0]}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleStartScan(p)}
                        className="btn-teal px-3 py-1 text-xs font-semibold rounded-md inline-flex items-center gap-1 shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Scan</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project Creation Modal */}
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
        projects={projects}
        defaultProjectId={targetProjectForScan?.id}
        onScanCreated={handleScanCreated}
      />
    </PageContainer>
  );
};
