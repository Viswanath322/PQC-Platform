import type { ReactNode } from "react";

export function Panel({
  title,
  sub,
  right,
  children,
  footer,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="glass flex h-full min-w-0 flex-col rounded-xl">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200/60 px-6 py-4">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {sub && <p className="section-sub mt-0.5">{sub}</p>}
        </div>
        {right && <div className="shrink-0 text-[12px] text-muted-foreground">{right}</div>}
      </header>
      <div className="flex-1 p-6">{children}</div>
      {footer && (
        <footer className="rounded-b-xl border-t border-slate-200/60 bg-white/40 px-6 py-3 text-[13px]">
          {footer}
        </footer>
      )}
    </section>
  );
}
