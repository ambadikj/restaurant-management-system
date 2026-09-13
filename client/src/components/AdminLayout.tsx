import { useState, useEffect, useCallback, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import {
  Store,
  Bell,
  Utensils,
  Receipt,
  ChefHat,
  AlertTriangle,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { socket } from "@/lib/socket";

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

interface AdminAlert {
  id: string;
  type: "order" | "service" | "stock" | "kitchen";
  title: string;
  description: string;
  time: string;
}

export default function AdminLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  const pageInfo = PAGE_TITLES[currentPath] || {
    title: "Operations Console",
    subtitle: "Serve_Sync Real-Time Restaurant Management",
  };

  const [isConnected, setIsConnected] = useState(socket.connected);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const playChime = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext might be blocked until user interacts
    }
  }, []);

  const addAlert = useCallback((alert: Omit<AdminAlert, "id" | "time">) => {
    const newAlert: AdminAlert = {
      ...alert,
      id: `${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };

    setAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
    playChime();

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
    }, 6000);
  }, [playChime]);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      socket.emit("join:staff", "admin");
    };
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("join:staff", "admin");
    }

    // New Order received
    const handleNewOrder = (data: any) => {
      const tableText = data.tableName || `Table ${data.tableNumber}`;
      const orderNum = data.order?.orderNumber || "ORD";
      const total = data.order?.diningSession?.totalAmount || data.order?.totalAmount;
      const totalStr = total ? ` • $${Number(total).toFixed(2)}` : "";
      addAlert({
        type: "order",
        title: "New Order Placed",
        description: `${tableText} • #${orderNum}${totalStr}`,
      });
    };

    // Service request (call waiter / bill)
    const handleServiceAlert = (data: any) => {
      const isBill = data.type === "REQUEST_BILL";
      addAlert({
        type: "service",
        title: isBill ? "Bill Requested" : "Guest Assistance",
        description: `Table ${data.tableNumber}: ${data.message || (isBill ? "Bill settlement requested" : "Waiter called")}`,
      });
    };

    // Auto-86 depletion or stock out
    const handleStockUpdate = (data: any) => {
      if (data.remainingQty === 0 || data.isAvailable === false) {
        addAlert({
          type: "stock",
          title: "Auto-86 Depleted",
          description: `Item #${data.menuItemId} is now SOLD OUT`,
        });
      }
    };

    // Kitchen status changes
    const handleKitchenUpdate = (data: any) => {
      if (data.status === "READY") {
        addAlert({
          type: "kitchen",
          title: "Order Ready for Pickup",
          description: `Order #${data.orderNumber} for Table ${data.tableNumber || "Table"} is ready to run!`,
        });
      }
    };

    socket.on("order:new", handleNewOrder);
    socket.on("service:alert", handleServiceAlert);
    socket.on("inventory:stock_update", handleStockUpdate);
    socket.on("order:status_update", handleKitchenUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("order:new", handleNewOrder);
      socket.off("service:alert", handleServiceAlert);
      socket.off("inventory:stock_update", handleStockUpdate);
      socket.off("order:status_update", handleKitchenUpdate);
    };
  }, [addAlert]);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <SidebarProvider className="dark">
      <div className="relative flex min-h-screen w-full bg-[#121214] text-neutral-100 font-sans antialiased selection:bg-[#FA2D48] selection:text-white overflow-hidden">
        {/* Apple Music Ambient Mesh Glow */}
        <div className="pointer-events-none fixed -top-40 -left-40 h-96 w-96 rounded-full bg-[#FA2D48]/12 blur-3xl" />
        <div className="pointer-events-none fixed top-1/4 -right-40 h-[28rem] w-[28rem] rounded-full bg-violet-600/8 blur-3xl" />
        <div className="pointer-events-none fixed -bottom-40 left-1/3 h-80 w-80 rounded-full bg-[#FA2D48]/6 blur-3xl" />

        {/* Apple Music Frosted Sidebar */}
        <AppSidebar />

        {/* Main Application Shell */}
        <SidebarInset className="relative flex flex-1 flex-col overflow-hidden bg-transparent">
          {/* Header Bar - Apple Music Web Bar */}
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#121214]/80 px-4 md:px-6 backdrop-blur-2xl transition-all">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-neutral-400 hover:text-white hover:bg-white/[0.08] rounded-lg h-8 w-8" />

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
              {/* Audio Chime Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled((v) => !v)}
                title={soundEnabled ? "Mute alert chimes" : "Unmute alert chimes"}
                className={`p-1.5 rounded-full border transition-all ${
                  soundEnabled
                    ? "bg-white/[0.06] border-white/[0.1] text-neutral-200 hover:text-white"
                    : "bg-white/[0.02] border-white/[0.05] text-neutral-500"
                }`}
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>

              {/* Outlet / Store badge */}
              <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] px-3 py-1 text-[11px] text-neutral-300 font-medium">
                <Store className="h-3 w-3 text-[#FA2D48]" />
                <span>Serve_Sync Main Hub</span>
              </div>

              {/* Live Sync Pulse Capsule */}
              <div
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-md transition-all ${
                  isConnected
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isConnected ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isConnected ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                </span>
                <span className="tracking-wide">{isConnected ? "LIVE SYNC" : "RECONNECTING"}</span>
              </div>
            </div>
          </header>

          {/* Floating Live Real-Time Toast Notifications (Apple Music Glass) */}
          <div className="fixed top-16 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/[0.12] bg-[#1a1a1d]/90 p-3.5 shadow-2xl backdrop-blur-2xl transition-all animate-in slide-in-from-top-3 fade-in duration-200 hover:border-white/20"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${
                    alert.type === "order"
                      ? "bg-gradient-to-tr from-[#FA2D48] to-[#FF4565] shadow-[#FA2D48]/30"
                      : alert.type === "service"
                      ? "bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/30"
                      : alert.type === "kitchen"
                      ? "bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-emerald-500/30"
                      : "bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-purple-500/30"
                  }`}
                >
                  {alert.type === "order" && <Utensils className="h-4 w-4" />}
                  {alert.type === "service" && <Receipt className="h-4 w-4" />}
                  {alert.type === "kitchen" && <ChefHat className="h-4 w-4" />}
                  {alert.type === "stock" && <AlertTriangle className="h-4 w-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-white tracking-tight truncate">
                      {alert.title}
                    </p>
                    <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                      {alert.time}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-neutral-300 leading-snug line-clamp-2">
                    {alert.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => dismissAlert(alert.id)}
                  className="shrink-0 p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Main Scrollable Viewport */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
