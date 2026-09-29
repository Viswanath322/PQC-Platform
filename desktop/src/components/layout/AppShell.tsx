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
    <div className="grid min-h-screen grid-cols-[64px_minmax(0,1fr)] lg:grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <Topbar
          page={page}
          project={project}
          branch={branch}
          online={online}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 lg:px-8 lg:py-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
