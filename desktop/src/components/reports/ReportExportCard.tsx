import React from 'react';
import { FileText, Code, FileSpreadsheet, Download, Clock } from 'lucide-react';
import type { ReportExportOption } from '../../types/pqc';

interface ReportExportCardProps {
  option: ReportExportOption;
  onExport: (format: string, title: string) => void;
}

export const ReportExportCard: React.FC<ReportExportCardProps> = ({ option, onExport }) => {
  const getFormatIcon = () => {
    switch (option.format) {
      case 'PDF':
        return <FileText size={24} color="var(--color-primary)" />;
      case 'JSON':
        return <Code size={24} color="var(--color-secondary-dark)" />;
      case 'CSV':
        return <FileSpreadsheet size={24} color="var(--color-accent-dark)" />;
    }
  };

  const getFormatBadgeStyle = () => {
    switch (option.format) {
      case 'PDF':
        return {
          background: 'rgba(36, 52, 71, 0.08)',
          color: 'var(--color-primary)',
          borderColor: 'rgba(36, 52, 71, 0.2)',
        };
      case 'JSON':
        return {
          background: 'var(--color-secondary-light)',
          color: 'var(--color-secondary-dark)',
          borderColor: 'rgba(42, 157, 143, 0.3)',
        };
      case 'CSV':
        return {
          background: 'var(--color-accent-light)',
          color: 'var(--color-accent-dark)',
          borderColor: 'rgba(233, 162, 59, 0.35)',
        };
    }
  };

  const badgeStyle = getFormatBadgeStyle();

  return (
    <div
      className="glass-panel"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '20px',
        position: 'relative',
      }}
    >
      <div>
        {/* Header with Format and Estimated Size */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: badgeStyle.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${badgeStyle.borderColor}`,
              }}
            >
              {getFormatIcon()}
            </div>
            <div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: badgeStyle.background,
                  color: badgeStyle.color,
                  display: 'inline-block',
                }}
              >
                {option.format}
              </span>
            </div>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
            Approx: {option.estimatedSize}
          </span>
        </div>

        {/* Title & Description */}
        <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
          {option.title}
        </h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
          {option.description}
        </p>

        {/* Target Audience */}
        <div
          style={{
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            backgroundColor: 'rgba(241, 245, 249, 0.6)',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(226, 232, 240, 0.7)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Target Audience: </span>
          {option.recommendedFor}
        </div>
      </div>

      {/* Export Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-glass)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          <Clock size={12} />
          <span>On-demand compilation</span>
        </div>

        <button
          onClick={() => onExport(option.format, option.title)}
          className={option.format === 'PDF' ? 'btn-primary' : option.format === 'JSON' ? 'btn-teal' : 'btn-secondary'}
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          <Download size={14} />
          Export {option.format}
        </button>
      </div>
    </div>
  );
};
