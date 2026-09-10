import { Outlet, useLocation } from "react-router-dom";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/admin": {
    title: "Menu & Inventory Limits",
    subtitle: "Configure batch quantity limits, price tags, and auto-86 depletion rules",
  },
  "/admin/menu": {
    title: "Menu & Inventory Limits",
    subtitle: "Configure batch quantity limits, price tags, and auto-86 depletion rules",
  },
  "/admin/employees": {
    title: "Staff Auth & RBAC Management",
    subtitle: "Manage role-based logins (Admin, Cashier/POS, Kitchen/KDS) and JWT tokens",
  },
  "/admin/tables": {
    title: "Table QR & Floor Management",
    subtitle: "Floor plan dining tables, live occupancy status, and QR standee printing",
  },
  "/admin/reports": {
    title: "End-of-Day (EOD) Reports & Feedback",
    subtitle: "Categorized settlement breakdowns, tax reconciliation and customer feedback ratings",
  },
};

export default function AdminLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  const pageInfo = PAGE_TITLES[currentPath] || {
    title: "Operations Console",
    subtitle: "Serve_Sync Real-Time Restaurant Management",
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-neutral-50/60 dark:bg-neutral-950 font-sans">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          {/* Header Bar */}
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-neutral-200/80 bg-white/95 px-4 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/95">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {pageInfo.title}
                </span>
              </div>
            </div>

            {/* Quick Live System Pill */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>WS: SYNCED</span>
              </div>
            </div>
          </header>

          {/* Main Scrollable Viewport */}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
