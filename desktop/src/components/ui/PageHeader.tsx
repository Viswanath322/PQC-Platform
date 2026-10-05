import type { ReactNode } from "react";

export function PageHeader({
  title,
  badge,
  description,
  actions,
}: {
  title: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-semibold leading-9 tracking-tight">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  );
}

