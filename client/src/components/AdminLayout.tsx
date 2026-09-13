import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChevronLeft, ChevronRight, Store } from "lucide-react";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/admin": {
    title: "Menu & Inventory Limits",
    subtitle: "Real-time menu catalog, pricing, and automated Auto-86 depletion stock rules",
  },
  "/admin/menu": {
    title: "Menu & Inventory Limits",
    subtitle: "Real-time menu catalog, pricing, and automated Auto-86 depletion stock rules",
  },
  "/admin/employees": {
    title: "Staff Directory & RBAC",
    subtitle: "Role-based access control, employee credentials, and active system authorizations",
  },
  "/admin/tables": {
    title: "Floor Plan & QR Endpoints",
    subtitle: "Acoustic dining table pods, live table occupancy tracking, and QR standee printing",
  },
  "/admin/reports": {
    title: "End-of-Day (EOD) Analytics",
    subtitle: "Categorized settlement breakdowns, tax reconciliation, and guest feedback",
  },
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const pageInfo = PAGE_TITLES[currentPath] || {
    title: "Operations Console",
    subtitle: "Serve_Sync Real-Time Restaurant Management",
  };

  return (
    <SidebarProvider className="dark">
      <div className="relative flex min-h-screen w-full bg-[#121214] text-neutral-100 font-sans antialiased selection:bg-[#FA2D48] selection:text-white overflow-hidden">
        {/* Apple Music Ambient Mesh Glow (Subtle atmospheric lighting) */}
        <div className="pointer-events-none fixed -top-40 -left-40 h-96 w-96 rounded-full bg-[#FA2D48]/12 blur-3xl" />
        <div className="pointer-events-none fixed top-1/4 -right-40 h-[28rem] w-[28rem] rounded-full bg-violet-600/8 blur-3xl" />
        <div className="pointer-events-none fixed -bottom-40 left-1/3 h-80 w-80 rounded-full bg-[#FA2D48]/6 blur-3xl" />

        {/* Apple Music Frosted Sidebar */}
        <AppSidebar />

        {/* Main Application Shell */}
        <SidebarInset className="relative flex flex-1 flex-col overflow-hidden bg-transparent">
          {/* Header Bar - Apple Music Web Bar */}
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#121214]/80 px-4 md:px-6 backdrop-blur-2xl transition-all">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-neutral-400 hover:text-white hover:bg-white/[0.08] rounded-lg h-8 w-8" />

              {/* History Navigation Controls (< and >) */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => navigate(-1)}
                  title="Go Back"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white transition-all active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate(1)}
                  title="Go Forward"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white transition-all active:scale-95"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="h-4 w-[1px] bg-white/[0.08] hidden sm:block mx-1" />

              {/* Page Title */}
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  {pageInfo.title}
                </span>
                <span className="text-[10px] text-neutral-400 truncate hidden md:inline">
                  {pageInfo.subtitle}
                </span>
              </div>
            </div>

            {/* Right Header Status Pills */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Outlet / Store badge */}
              <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] px-3 py-1 text-[11px] text-neutral-300 font-medium">
                <Store className="h-3 w-3 text-[#FA2D48]" />
                <span>Serve_Sync Main Hub</span>
              </div>

              {/* Live Sync Pulse Capsule */}
              <div className="flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] px-3 py-1 text-[11px] font-medium text-neutral-200 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="tracking-wide">SYNCED</span>
              </div>
            </div>
          </header>

          {/* Main Scrollable Viewport */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
