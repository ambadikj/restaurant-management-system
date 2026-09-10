import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  UtensilsCrossed,
  Shield,
  QrCode,
  Receipt,
  LogOut,
  ChefHat,
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

const navItems = [
  {
    title: "Menu & Auto-86",
    url: "/admin/menu",
    icon: UtensilsCrossed,
  },
  {
    title: "Staff & RBAC",
    url: "/admin/employees",
    icon: Shield,
  },
  {
    title: "QR Endpoints",
    url: "/admin/tables",
    icon: QrCode,
  },
  {
    title: "EOD & Reviews",
    url: "/admin/reports",
    icon: Receipt,
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
    if (!name) return "AK";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-neutral-200 dark:border-neutral-800">
      {/* Brand Header */}
      <SidebarHeader className="border-b border-neutral-200/80 dark:border-neutral-800 p-2 group-data-[collapsible=icon]:p-2">
        <div className="flex h-10 w-full items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/30">
            <ChefHat className="h-4 w-4" />
          </div>
          <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-neutral-50 uppercase leading-none">
              Serve_Sync
            </span>
            <span className="text-[10px] font-mono text-neutral-400 mt-0.5">
              CONSOLE v2.4
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation Links */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Console Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.url ||
                  (item.url === "/admin/menu" && location.pathname === "/admin");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Info & Logout Footer */}
      <SidebarFooter className="border-t border-neutral-200/80 dark:border-neutral-800 p-2 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={`Logout (${user.fullName || "Admin"})`}
              onClick={handleLogout}
              className="group/footer hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs dark:bg-neutral-800 dark:text-blue-400 border border-blue-200/60 dark:border-neutral-700">
                {getInitials(user.fullName)}
              </div>
              <div className="grid flex-1 text-left text-xs leading-tight truncate group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                  {user.fullName || "Ambadi KJ"}
                </span>
                <span className="truncate text-[10px] font-mono text-neutral-500 uppercase">
                  {user.role || "SUPER_ADMIN"}
                </span>
              </div>
              <LogOut className="ml-auto h-4 w-4 text-neutral-400 group-hover/footer:text-red-600 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
