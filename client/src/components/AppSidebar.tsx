import { useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  UtensilsCrossed,
  Shield,
  QrCode,
  Receipt,
  LogOut,
  PanelLeftClose,
  Layers,
  ShoppingBag,
  FileText,
  TrendingUp,
} from "lucide-react";
import { BrandLogo, BrandCrest } from "@/components/BrandLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";

const adminNavSections = [
  {
    label: "OPERATIONS",
    items: [
      {
        title: "Menu & Auto-86",
        url: "/admin/menu",
        icon: UtensilsCrossed,
        badge: "Live",
      },
      {
        title: "Floor Plan & QR",
        url: "/admin/tables",
        icon: QrCode,
        badge: null,
      },
    ],
  },
  {
    label: "ORGANIZATION & AUDIT",
    items: [
      {
        title: "Staff & RBAC",
        url: "/admin/employees",
        icon: Shield,
        badge: null,
      },
      {
        title: "EOD & Reports",
        url: "/admin/reports",
        icon: Receipt,
        badge: "Beta",
      },
    ],
  },
];

const cashierNavSections = [
  {
    label: "CASHIER POS",
    items: [
      {
        title: "Floor & Live Bills",
        url: "/cashier?tab=floor",
        icon: Layers,
        badge: "Live",
      },
      {
        title: "Takeaway POS",
        url: "/cashier?tab=takeaway",
        icon: ShoppingBag,
        badge: "Counter",
      },
      {
        title: "Closed Bills Log",
        url: "/cashier?tab=history",
        icon: FileText,
        badge: null,
      },
      {
        title: "Shift Metrics",
        url: "/cashier?tab=stats",
        icon: TrendingUp,
        badge: null,
      },
    ],
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const userString = localStorage.getItem("user");
  const user = userString
    ? JSON.parse(userString)
    : { fullName: "Ambadi KJ", role: "Super Admin", email: "admin@restaurant.com" };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getInitials = (name: string) => {
    if (!name) return "AD";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const userRole = (user?.role || "Staff").toUpperCase();
  const isCashier = userRole === "CASHIER";
  const isCashierRoute = location.pathname.startsWith("/cashier");

  const visibleSections = useMemo(() => {
    if (isCashier || isCashierRoute) {
      return cashierNavSections;
    }
    return adminNavSections;
  }, [isCashier, isCashierRoute]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/[0.08] bg-[#161619]/95 text-neutral-200 backdrop-blur-2xl"
      style={
        {
          "--sidebar-accent": "rgba(255, 255, 255, 0.08)",
          "--sidebar-accent-foreground": "#ffffff",
        } as React.CSSProperties
      }
    >
      {/* Brand Header & Close Icon - Perfectly Aligned */}
      <SidebarHeader className="p-3 border-b border-white/[0.06] group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:border-b-transparent">
        {/* Expanded State: Logo + Title + Panel Close Button */}
        <div className="flex h-9 w-full items-center justify-between px-1 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-3 min-w-0">
            {/* Minimal, Sleek & Professional Brand Crest */}
            <BrandCrest className="h-8 w-8 shrink-0" />

            <div className="flex flex-col min-w-0 overflow-hidden whitespace-nowrap">
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5 font-sans">
                Serve_Sync
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/[0.08] text-neutral-300 border border-white/[0.1] tracking-wider uppercase">
                  {userRole}
                </span>
              </span>
              <span className="text-[10px] text-neutral-400 font-medium tracking-wide truncate">
                Restaurant Console
              </span>
            </div>
          </div>

          {/* Close / Collapse Trigger with PanelLeftClose Icon */}
          <SidebarTrigger
            className="text-neutral-400 hover:text-white hover:bg-white/[0.08] rounded-lg size-8 shrink-0 transition-colors cursor-pointer"
            title="Collapse Sidebar (Ctrl+B)"
          >
            <PanelLeftClose className="h-4 w-4" />
          </SidebarTrigger>
        </div>

        {/* Collapsed State: Centered Minimal Logo Toggle */}
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full py-0.5">
          <SidebarTrigger
            className="group relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1f1f23] to-[#141416] border border-white/[0.12] hover:border-white/[0.25] text-white shadow-md shadow-black/40 transition-all hover:scale-105 active:scale-95 cursor-pointer p-0"
            title="Expand Sidebar (Ctrl+B)"
          >
            <BrandLogo size={18} className="transition-transform group-hover:scale-110" />
          </SidebarTrigger>
        </div>
      </SidebarHeader>

      {/* Navigation Sections */}
      <SidebarContent className="px-2.5 py-3 space-y-4 group-data-[collapsible=icon]:px-1.5">
        {visibleSections.map((section) => (
          <SidebarGroup key={section.label} className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-2 mb-1.5 overflow-hidden whitespace-nowrap group-data-[collapsible=icon]:hidden">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {section.items.map((item) => {
                  const isCashierItem = item.url.startsWith("/cashier");
                  const currentTab = new URLSearchParams(location.search).get("tab") || "floor";
                  const itemTab = isCashierItem
                    ? new URLSearchParams(item.url.split("?")[1] || "").get("tab") || "floor"
                    : null;

                  const isActive = isCashierItem
                    ? location.pathname.startsWith("/cashier") && currentTab === itemTab
                    : location.pathname === item.url ||
                      (item.url === "/admin/menu" && location.pathname === "/admin");

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={`group relative flex items-center rounded-xl text-xs transition-colors duration-200 group-data-[collapsible=icon]:!h-9 group-data-[collapsible=icon]:!w-9 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto ${
                          isActive
                            ? "bg-gradient-to-r from-[#FA2D48] to-[#FF4565] text-white shadow-lg shadow-[#FA2D48]/25 font-semibold"
                            : "text-neutral-400 hover:text-white hover:bg-white/[0.06]"
                        }`}
                      >
                        <NavLink
                          to={item.url}
                          className="flex items-center w-full px-3 py-2.5 group-data-[collapsible=icon]:!h-9 group-data-[collapsible=icon]:!w-9 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center"
                        >
                          <item.icon
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                              isActive
                                ? "text-white scale-105"
                                : "text-neutral-400 group-hover:text-white group-hover:scale-110"
                            }`}
                          />
                          <span
                            className={`ml-2.5 flex-1 truncate group-data-[collapsible=icon]:hidden ${
                              isActive ? "text-white font-semibold" : "text-neutral-300 group-hover:text-white"
                            }`}
                          >
                            {item.title}
                          </span>

                          {item.badge && (
                            <span
                              className={`ml-auto shrink-0 inline-flex items-center justify-center text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap group-data-[collapsible=icon]:hidden ${
                                isActive
                                  ? "bg-white/25 text-white shadow-sm border border-white/30"
                                  : "bg-white/[0.08] text-neutral-400 group-hover:text-white border border-white/[0.08]"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* User Profile & Session Footer */}
      <SidebarFooter className="p-3 border-t border-white/[0.06] group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:border-t-transparent">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-2 border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none">
          {/* Avatar with Apple Rose-Red gradient border */}
          <button
            onClick={handleLogout}
            title={`Logged in as ${user.fullName} (${user.role}) • Click to log out`}
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#FA2D48] to-[#FB7185] text-white text-xs font-bold shadow-md shadow-[#FA2D48]/20 transition-transform hover:scale-105 active:scale-95"
          >
            {getInitials(user.fullName)}
          </button>

          <div className="flex flex-col min-w-0 flex-1 overflow-hidden whitespace-nowrap group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-semibold text-white">
              {user.fullName || "Admin User"}
            </span>
            <span className="truncate text-[10px] text-neutral-400 font-medium">
              {user.role || "Super Admin"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out of Console"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors group-data-[collapsible=icon]:hidden"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>

      {/* Official shadcn desktop rail on the border edge */}
      <SidebarRail />
    </Sidebar>
  );
}
