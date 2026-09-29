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
        return <FileText size={22} color="#2B2B28" />;
      case 'JSON':
        return <Code size={22} color="#718071" />;
      case 'CSV':
        return <FileSpreadsheet size={22} color="#C89B55" />;
    }
  };

  const getFormatBadgeStyle = () => {
    switch (option.format) {
      case 'PDF':
        return {
          background: 'rgba(43, 43, 40, 0.06)',
          color: '#2B2B28',
          borderColor: 'rgba(43, 43, 40, 0.12)',
        };
      case 'JSON':
        return {
          background: 'rgba(113, 128, 113, 0.1)',
          color: '#718071',
          borderColor: 'rgba(113, 128, 113, 0.22)',
        };
      case 'CSV':
        return {
          background: 'rgba(200, 155, 85, 0.1)',
          color: '#C89B55',
          borderColor: 'rgba(200, 155, 85, 0.22)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
      }}
    >
      <div>
        {/* Header with Format and Estimated Size */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
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
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
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
        <h4 style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
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
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 0, 0, 0.05)',
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
          borderTop: '1px solid rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          <Clock size={12} />
          <span>On-demand compilation</span>
        </div>

        {/* Apple Graphite Button */}
        <button
          onClick={() => onExport(option.format, option.title)}
          className="btn-primary"
          style={{
            padding: '7px 16px',
            fontSize: '12.5px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Download size={13} />
          Export {option.format}
        </button>
      </div>
    </div>
  );
};
