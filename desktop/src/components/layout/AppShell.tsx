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
    <div className="app-frame flex h-screen w-screen gap-3 overflow-hidden p-3">
      <Sidebar />

      <div className="app-workspace flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <Topbar
          page={page}
          project={project}
          branch={branch}
          online={online}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="app-main min-w-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-[1480px] min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
