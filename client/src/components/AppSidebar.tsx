import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  UtensilsCrossed,
  Shield,
  QrCode,
  Receipt,
  LogOut,
  Sparkles,
  Search,
} from "lucide-react";
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
  SidebarRail,
} from "@/components/ui/sidebar";

const navSections = [
  {
    label: "RESTAURANT MANAGEMENT",
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

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/[0.08] bg-[#161619]/95 text-neutral-200 backdrop-blur-2xl transition-all duration-300"
    >
      {/* Brand Header - Apple Music Monogram Style */}
      <SidebarHeader className="p-4 border-b border-white/[0.06] group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:border-none">
        <div className="flex h-11 w-full items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          {/* Glowing Apple Music style crest */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FA2D48] via-[#FF4565] to-[#FB7185] text-white shadow-lg shadow-[#FA2D48]/30">
            <Sparkles className="h-5 w-5 fill-white/20" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
          </div>

          <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5 font-sans">
              Serve_Sync
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[#FA2D48]/20 text-[#FA2D48] border border-[#FA2D48]/30">
                ADMIN
              </span>
            </span>
            <span className="text-[10px] text-neutral-400 font-medium tracking-wide">
              Restaurant Console
            </span>
          </div>
        </div>

        {/* Quick Search Bar in Sidebar (Apple Music Web style) */}
        <div className="mt-3 relative group-data-[collapsible=icon]:hidden">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Quick search..."
            readOnly
            onClick={() => navigate("/admin/menu")}
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-neutral-200 placeholder:text-neutral-500 border border-white/[0.06] cursor-pointer transition-colors focus:outline-none"
          />
        </div>
      </SidebarHeader>

      {/* Navigation Sections */}
      <SidebarContent className="px-2 py-3 space-y-4">
        {navSections.map((section) => (
          <SidebarGroup key={section.label} className="p-0">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-3 mb-1">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    location.pathname === item.url ||
                    (item.url === "/admin/menu" && location.pathname === "/admin");

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-[#FA2D48] to-[#FF4B68] text-white shadow-md shadow-[#FA2D48]/25 font-semibold"
                            : "text-neutral-300 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <NavLink to={item.url} className="flex items-center w-full">
                          <item.icon
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                              isActive ? "text-white" : "text-[#FA2D48]/80 group-hover:text-[#FA2D48]"
                            }`}
                          />
                          <span className="ml-2.5 truncate">{item.title}</span>

                          {item.badge && (
                            <span
                              className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider group-data-[collapsible=icon]:hidden ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-white/[0.08] text-neutral-400"
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
      <SidebarFooter className="p-3 border-t border-white/[0.06] group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2 border border-white/[0.06] hover:bg-white/[0.07] transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none">
          {/* Avatar with Apple Rose-Red gradient border */}
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#FA2D48] to-[#FB7185] text-white text-xs font-bold shadow-md shadow-[#FA2D48]/20">
            {getInitials(user.fullName)}
          </div>

          <div className="flex flex-col min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">
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

      <SidebarRail className="hover:after:bg-[#FA2D48]" />
    </Sidebar>
  );
}
