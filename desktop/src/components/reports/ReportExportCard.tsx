import React from 'react';
import { FileText, Code, FileSpreadsheet, Download, Clock } from 'lucide-react';
import type { ReportExportOption } from '../../types/pqc';

interface ReportExportCardProps {
  option: ReportExportOption;
  onExport: (format: string, title: string) => void;
}

export const ReportExportCard: React.FC<ReportExportCardProps> = ({ option, onExport }) => {
  const formatConfig = {
    PDF: {
      icon: <FileText className="h-6 w-6 text-primary" />,
      iconBg: 'bg-primary/10 ring-primary/25',
      badge: 'bg-primary/10 text-primary ring-primary/25',
    },
    JSON: {
      icon: <Code className="h-6 w-6 text-sky-700" />,
      iconBg: 'bg-sky-500/10 ring-sky-500/25',
      badge: 'bg-sky-500/10 text-sky-700 ring-sky-500/25',
    },
    CSV: {
      icon: <FileSpreadsheet className="h-6 w-6 text-amber-700" />,
      iconBg: 'bg-amber-500/10 ring-amber-500/25',
      badge: 'bg-amber-500/10 text-amber-700 ring-amber-500/25',
    },
  }[option.format] ?? {
    icon: <FileText className="h-6 w-6 text-primary" />,
    iconBg: 'bg-primary/10 ring-primary/25',
    badge: 'bg-primary/10 text-primary ring-primary/25',
  };

  return (
    <div className="card card-hover flex flex-col justify-between gap-5 p-6">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`icon-tile grid h-11 w-11 place-items-center rounded-lg ring-1 ${formatConfig.iconBg}`}>
              {formatConfig.icon}
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${formatConfig.badge}`}>
              {option.format}
            </span>
          </div>
          <span className="text-[12px] text-slate-500 font-medium">
            Approx: {option.estimatedSize}
          </span>
        </div>

        {/* Title & Description */}
        <h4 className="text-[16px] font-semibold text-slate-900 mb-2">{option.title}</h4>
        <p className="text-[13px] text-slate-600 leading-relaxed mb-4">{option.description}</p>

        {/* Target Audience */}
        <div className="rounded-lg border border-slate-200/60 bg-white/60 px-3 py-2 text-[12px] text-slate-600">
          <span className="font-semibold text-slate-700">Target Audience: </span>
          {option.recommendedFor}
        </div>
      </div>

      {/* Export Action */}
      <div className="flex items-center justify-between border-t border-slate-200/60 pt-4">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>On-demand compilation</span>
        </div>
        <button
          onClick={() => onExport(option.format, option.title)}
          className={option.format === 'PDF' ? 'btn-primary' : 'btn'}
        >
          <Download className="h-3.5 w-3.5" />
          Export {option.format}
        </button>
      </div>
    </div>
  );
};
