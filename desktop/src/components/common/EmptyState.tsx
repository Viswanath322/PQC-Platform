import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="empty-state card flex flex-col items-center justify-center p-10 text-center">
      <div className="icon-tile mb-4 flex h-11 w-11 items-center justify-center border border-primary/15 bg-primary/8 text-primary">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="mb-1 text-[15px] font-semibold text-foreground">{title}</h3>
      <p className="mb-6 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="btn-primary"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
