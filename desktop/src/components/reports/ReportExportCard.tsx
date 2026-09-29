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
        return <FileText size={22} color="var(--color-graphite)" strokeWidth={1.9} />;
      case 'JSON':
        return <Code size={22} color="var(--color-muted-sage)" strokeWidth={1.9} />;
      case 'CSV':
        return <FileSpreadsheet size={22} color="var(--color-graphite)" strokeWidth={1.9} />;
    }
  };

  const getFormatBadgeStyle = () => {
    switch (option.format) {
      case 'PDF':
        return {
          background: 'rgba(41, 40, 36, 0.08)',
          color: 'var(--color-graphite)',
          borderColor: 'rgba(41, 40, 36, 0.16)',
        };
      case 'JSON':
        return {
          background: 'rgba(120, 135, 119, 0.14)',
          color: 'var(--color-muted-sage)',
          borderColor: 'rgba(120, 135, 119, 0.28)',
        };
      case 'CSV':
        return {
          background: 'rgba(140, 106, 56, 0.10)',
          color: '#8c6a38',
          borderColor: 'rgba(140, 106, 56, 0.22)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
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
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              }}
            >
              {getFormatIcon()}
            </div>
            <div>
              <span
                style={{
                  fontSize: '11.5px',
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
        <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-graphite)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
          {option.title}
        </h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
          {option.description}
        </p>

        {/* Target Audience */}
        <div
          style={{
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
            backgroundColor: 'rgba(241, 237, 228, 0.65)',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.7)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--color-graphite)' }}>Target Audience: </span>
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
          borderTop: '1px solid rgba(41, 40, 36, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          <Clock size={12} />
          <span>On-demand compilation</span>
        </div>

        <button
          onClick={() => onExport(option.format, option.title)}
          className={option.format === 'PDF' ? 'btn-primary' : option.format === 'JSON' ? 'btn-sage' : 'btn-secondary'}
          style={{ padding: '8px 16px', fontSize: '12.5px' }}
        >
          <Download size={13} />
          Export {option.format}
        </button>
      </div>
    </div>
  );
};
