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
    <div className="h-screen w-screen p-3 md:p-3.5 lg:p-4 flex gap-3 lg:gap-3.5 overflow-hidden box-border">
      {/* Container 1: Independent Floating Navigation Sidebar */}
      <Sidebar />

      {/* Container 2: Separate Workspace Container Beside It */}
      <div className="flex flex-1 min-w-0 h-full flex-col rounded-2xl border border-white/80 bg-white/55 shadow-[0_8px_32px_rgba(41,56,77,0.06)] backdrop-blur-xl overflow-hidden">
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
