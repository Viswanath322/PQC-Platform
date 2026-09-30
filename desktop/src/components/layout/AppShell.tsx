import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({
  children,
  page = "Dashboard",
  project = "Enterprise-Core-Services",
  branch = "main",
  online = false,
  onRefresh,
  isRefreshing = false,
}: {
  children: ReactNode;
  page?: string;
  project?: string;
  branch?: string;
  online?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <div className="h-screen w-screen p-2.5 sm:p-3 flex gap-2 overflow-hidden box-border">
      {/* Container 1: Independent Floating Navigation Sidebar */}
      <Sidebar />

      {/* Container 2: Separate Workspace Container Beside It */}
      <div className="flex flex-1 min-w-0 h-full flex-col rounded-2xl border border-white/10 bg-slate-950/60 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl backdrop-saturate-180 overflow-hidden">
        <Topbar
          page={page}
          project={project}
          branch={branch}
          online={online}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="flex-1 min-w-0 overflow-y-auto px-4 py-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-[1440px] min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
