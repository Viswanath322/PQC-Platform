import React from 'react';

interface PageContainerProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  badge,
  actions,
  children,
}) => {
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-150">
      {/* Page Header (Only if title or actions provided) */}
      {(title || actions) && (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3"
          style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.85)' }}
        >
          <div>
            {title && (
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="title-level-1">{title}</h2>
                {badge}
              </div>
            )}
            {subtitle && <p className="subtitle-muted">{subtitle}</p>}
          </div>

          {actions && <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">{actions}</div>}
        </div>
      )}

      {/* Main Content Body */}
      <div>{children}</div>
    </div>
  );
};
