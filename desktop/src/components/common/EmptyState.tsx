import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'card flex flex-col items-center justify-center p-10 text-center',
        className
      )}
    >
      <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/80 bg-white/70 text-slate-500 shadow-2xs backdrop-blur-md">
        <Icon className="h-6 w-6 stroke-[1.75]" />
      </div>
      <h3 className="mt-4 text-[16px] font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      <p className="mt-1 max-w-md text-[13px] text-muted-foreground leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="btn-primary mt-5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          {actionText}
        </button>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default EmptyState;
