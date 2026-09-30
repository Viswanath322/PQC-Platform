import { ArrowRight, Check, Circle, LoaderCircle, ScanLine } from 'lucide-react';
import type { Scan } from '@/types';
import { ScanStatusBadge } from '@/components/scans/ScanStatusBadge';

const pipelineStages = [
  'Repository ingestion',
  'AST analysis',
  'Crypto analysis',
  'Dependency analysis',
];

const activeStageByStatus: Record<string, number> = {
  INGESTING: 0,
  ANALYZING: 1,
  PROCESSING: 2,
  AI_ANALYSIS: 3,
};

export function ScanPipelineCard({ scan, onViewScan }: { scan?: Scan | null; onViewScan: () => void }) {
  const status = scan?.status ?? 'QUEUED';
  const activeStage = activeStageByStatus[status] ?? -1;
  const completed = status === 'COMPLETED';

  return (
    <section className="scan-pipeline-card" aria-label="Active scan">
      <div className="scan-pipeline-identity">
        <div className="scan-pipeline-heading">
          <span className="scan-pipeline-icon"><ScanLine className="h-4 w-4" /></span>
          <span className="scan-pipeline-kicker">ACTIVE SCAN</span>
        </div>
        <strong className="scan-pipeline-id">{scan?.id ?? 'SCAN-001'}</strong>
        <span className="scan-pipeline-project">{scan?.project_name ?? 'Enterprise-Core-Services'}</span>
        <span className="scan-pipeline-file">{scan?.repository_name ?? 'core-services.zip'}</span>
      </div>

      <ol className="scan-pipeline-stages" aria-label="Scan pipeline">
        {pipelineStages.map((stage, index) => {
          const isComplete = completed || index < activeStage;
          const isActive = index === activeStage;
          const stateLabel = isComplete ? 'Complete' : isActive ? 'Current stage' : 'Pending';
          return (
            <li key={stage} className={`scan-pipeline-stage ${isComplete ? 'is-complete' : ''} ${isActive ? 'is-active' : ''}`} aria-label={`${stage}: ${stateLabel}`}>
              <span className="scan-stage-marker" aria-hidden="true">
                {isComplete ? <Check className="h-3 w-3" /> : isActive ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Circle className="h-3 w-3" />}
              </span>
              <span className="scan-stage-label">{stage}</span>
            </li>
          );
        })}
      </ol>

      <div className="scan-pipeline-footer">
        <div className="scan-pipeline-status-block">
          <span className="scan-pipeline-status-label">Status</span>
          <ScanStatusBadge status={status} size="sm" />
          {status === 'QUEUED' && <span className="scan-queue-position">Queue position <strong>#1</strong></span>}
        </div>
        <button type="button" onClick={onViewScan} className="scan-pipeline-view-link">
          View scan <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
