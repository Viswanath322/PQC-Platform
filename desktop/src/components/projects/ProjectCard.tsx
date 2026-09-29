import React from 'react';
import { FolderGit2, Calendar, GitBranch, Shield, Play } from 'lucide-react';
import type { Project } from '../../types';
import { ScanStatusBadge } from '../scans/ScanStatusBadge';

interface ProjectCardProps {
  project: Project;
  onStartScan: (project: Project) => void;
  onViewDetails: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onStartScan,
  onViewDetails,
}) => {
  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-slate-500/50 transition-all duration-200">
      <div>
        {/* Top line: Icon, Project Name, Status */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400 flex-shrink-0">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 group-hover:text-teal-300 transition-colors">
                {project.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <GitBranch className="w-3.5 h-3.5" />
                <span>{project.branch || 'main'}</span>
              </div>
            </div>
          </div>

          {project.last_scan_status && (
            <ScanStatusBadge status={project.last_scan_status} size="sm" />
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {project.description || 'No description provided.'}
        </p>

        {/* Findings Summary Pills if available */}
        {project.findings_count && (
          <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <Shield className="w-4 h-4 text-slate-400 mr-1" />
            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">
                {project.findings_count.critical} Crit
              </span>
              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-medium">
                {project.findings_count.high} High
              </span>
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-medium">
                {project.findings_count.medium} Med
              </span>
              <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-medium">
                {project.findings_count.low} Low
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 text-slate-500 text-[11.5px]">
          <Calendar className="w-3.5 h-3.5" />
          <span>{project.created_at.split(' ')[0]}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewDetails(project)}
            className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
          >
            Details
          </button>
          <button
            onClick={() => onStartScan(project)}
            className="btn-teal px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Scan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
