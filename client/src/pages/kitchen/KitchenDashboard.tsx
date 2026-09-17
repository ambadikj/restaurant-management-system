import { useState, useEffect, useMemo, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import { socket } from "../../lib/socket";
import {
  CheckCircle2,
  Timer,
  ArrowRight,
  History,
  X,
  RotateCcw,
  Volume2,
  VolumeX,
  LogOut,
  AlertTriangle,
  Check,
} from "lucide-react";
import { BrandCrest } from "@/components/BrandLogo";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────── TYPES ─────────────────────────── */

interface OrderItem {
  id: number;
  menuItemId: number;
  quantity: number;
  price: string | number;
  subtotal: string | number;
  menuItem: {
    id: number;
    name: string;
    price: string | number;
    imageUrl?: string;
    category?: { name: string };
  };
}

interface KitchenOrder {
  id: number;
  orderNumber: string;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED";
  notes: string | null;
  orderedAt: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
  diningSession: {
    id: number;
    table: {
      tableNumber: number;
      capacity?: number;
    };
  };
}

/* ─────────────────────────── HELPERS ─────────────────────────── */

function getElapsedSeconds(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 1000));
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatOrderTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTableDisplay(tableNumber: number): string {
  if (tableNumber === 999) return "TAKEAWAY";
  return `TBL ${tableNumber < 10 ? "0" : ""}${tableNumber}`;
}

type UrgencyLevel = "normal" | "warning" | "urgent";

function getUrgencyLevel(seconds: number): UrgencyLevel {
  if (seconds >= 600) return "urgent"; // 10+ mins
  if (seconds >= 300) return "warning"; // 5-10 mins
  return "normal"; // < 5 mins
}

/* ─────────────────────────── COMPONENT ─────────────────────────── */

export default function KitchenDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [showHistory, setShowHistory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  // Checked items state (Cook can tap items on tickets to check them off)
  // Format: { [orderId_itemId]: boolean }
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Clock tick (every second for real-time kitchen chronometer)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ── Audio Chime ── */
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.type = "sine";
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(1174.66, ctx.currentTime); // D6 note
        osc2.type = "sine";
        gain2.gain.setValueAtTime(0.25, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.35);
      }, 150);
    } catch {
      // Audio not permitted yet
    }
  }, [soundEnabled]);

  /* ── Data Fetching ── */
  const fetchOrders = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/kitchen/orders");
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to load kitchen orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/kitchen/orders/history");
      setHistoryOrders(res.data);
    } catch (err) {
      console.error("Failed to load order history:", err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchHistory();
  }, [fetchOrders, fetchHistory]);

  /* ── Socket.IO Real-Time ── */
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("join:staff", "kitchen");
    };
    const handleDisconnect = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      socket.emit("join:staff", "kitchen");
      setIsConnected(true);
    }

    // New order arrives
    socket.on("order:new", (data: { order: KitchenOrder; tableNumber: number | string; tableName?: string }) => {
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === data.order.id);
        if (exists) return prev;

        const enrichedOrder: KitchenOrder = {
          ...data.order,
          diningSession: data.order.diningSession || {
            id: 0,
            table: {
              tableNumber: typeof data.tableNumber === "string"
                ? (data.tableNumber === "Takeaway" ? 999 : parseInt(data.tableNumber) || 0)
                : data.tableNumber,
            },
          },
        };

        return [...prev, enrichedOrder];
      });
      playNotificationSound();
    });

    // Order status updated
    socket.on("order:status_update", (data: { orderId: number; status: string; order?: KitchenOrder }) => {
      if (data.status === "SERVED") {
        setOrders((prev) => prev.filter((o) => o.id !== data.orderId));
        fetchHistory();
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === data.orderId ? { ...o, status: data.status as KitchenOrder["status"] } : o
          )
        );
      }
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("order:new");
      socket.off("order:status_update");
    };
  }, [playNotificationSound, fetchHistory]);

  /* ── Status Progression Handler (Bump) ── */
  const handleProgressStatus = async (order: KitchenOrder) => {
    let nextStatus: KitchenOrder["status"];
    if (order.status === "PENDING") nextStatus = "PREPARING";
    else if (order.status === "PREPARING") nextStatus = "READY";
    else nextStatus = "SERVED";

    setUpdatingOrderId(order.id);
    try {
      await axiosInstance.patch(`/kitchen/orders/${order.id}/status`, { status: nextStatus });

      if (nextStatus === "SERVED") {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        fetchHistory();
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      console.error("Failed to bump order status:", err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  /* ── Step Back Status (Undo bump) ── */
  const handleStepBackStatus = async (order: KitchenOrder) => {
    let prevStatus: KitchenOrder["status"];
    if (order.status === "READY") prevStatus = "PREPARING";
    else if (order.status === "PREPARING") prevStatus = "PENDING";
    else return;

    setUpdatingOrderId(order.id);
    try {
      await axiosInstance.patch(`/kitchen/orders/${order.id}/status`, { status: prevStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: prevStatus } : o))
      );
    } catch (err) {
      console.error("Failed to step back status:", err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  /* ── Recall / Restore Order ── */
  const handleRecallOrder = async (orderId: number) => {
    try {
      await axiosInstance.patch(`/kitchen/orders/${orderId}/status`, { status: "READY" });
      await fetchOrders();
      await fetchHistory();
    } catch (err) {
      console.error("Failed to recall order:", err);
    }
  };

  /* ── Check item off line ── */
  const toggleItemCheck = (orderId: number, itemId: number) => {
    const key = `${orderId}_${itemId}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const liveTimeStr = useMemo(() => {
    return new Date(now).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }, [now]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#121214] text-neutral-100 font-mono select-none overflow-hidden antialiased relative dark">
      {/* Ambient Mesh Glows */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-96 w-96 rounded-full bg-[#FA2D48]/10 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 h-80 w-80 rounded-full bg-[#FA2D48]/5 blur-3xl" />

      {/* ════════════════ STREAMLINED KDS TITLE BAR (Dark Glass Theme) ════════════════ */}
      <header className="h-12 bg-[#121214]/90 border-b border-white/[0.08] px-4 flex items-center justify-between shrink-0 z-30 backdrop-blur-xl shadow-lg relative">
        {/* Left: Clean Branding & Active Orders */}
        <div className="flex items-center gap-3">
          <BrandCrest className="h-8 w-8 shrink-0" />
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-sm text-white tracking-tight font-sans">
              Kitchen Display
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[11px] font-sans font-semibold text-neutral-300 border border-white/[0.1]">
              {orders.length} {orders.length === 1 ? "Order" : "Orders"}
            </span>
          </div>
        </div>

        {/* Right: Recall, Sound, Clock, Logout */}
        <div className="flex items-center gap-3">
          {/* Recall / History */}
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-sans font-semibold text-neutral-200 transition-all shadow-sm active:scale-95"
            title="Recall Recently Bumped Tickets"
          >
            <History className="h-3.5 w-3.5 text-neutral-400" />
            <span>Recall ({historyOrders.length})</span>
          </button>

          {/* Sound Mute/Unmute */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition-all shadow-sm active:scale-95 ${
              soundEnabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-white/[0.05] border-white/[0.1] text-neutral-400 hover:bg-white/[0.1]"
            }`}
            title={soundEnabled ? "Audio chime ON" : "Audio muted"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Live Clock with connection indicator */}
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-200 px-1 py-1">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-amber-400"
              }`}
            />
            <span>{liveTimeStr}</span>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              navigate("/login");
            }}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/[0.1] text-neutral-400 hover:text-rose-300 transition-all ml-1 shadow-sm active:scale-95"
            title="Sign out of kitchen"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ════════════════ MAIN KDS TICKET TRACK (Dark Grid Surface) ════════════════ */}
      <main
        className="flex-1 overflow-x-auto overflow-y-auto p-3 sm:p-4 bg-[#0E0F12] relative z-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-[#FA2D48] border-t-transparent animate-spin" />
              <span className="text-xs text-neutral-400 font-sans font-semibold tracking-wide">
                INITIALIZING KDS TERMINAL...
              </span>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400">
            <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center mb-3 shadow-xl backdrop-blur-md">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-sans font-bold text-white">Cook Line Clear</h3>
            <p className="text-xs font-sans text-neutral-400 max-w-sm mt-1">
              All active tickets have been bumped. Incoming orders will appear instantly.
            </p>
          </div>
        ) : (
          /* Multi-Chute Continuous Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-5 items-start auto-rows-max pb-10">
            {orders.map((order) => {
              const elapsedSec = getElapsedSeconds(order.orderedAt || order.createdAt);
              const urgency = getUrgencyLevel(elapsedSec);
              const isTakeaway = order.diningSession?.table?.tableNumber === 999;
              const tableText = getTableDisplay(order.diningSession?.table?.tableNumber || 1);
              const isPending = order.status === "PENDING";
              const isPreparing = order.status === "PREPARING";
              const isReady = order.status === "READY";

              const totalItems = order.orderItems.length;
              const checkedCount = order.orderItems.filter(
                (oi) => isReady || !!checkedItems[`${order.id}_${oi.id}`]
              ).length;
              const allChecked = totalItems > 0 && checkedCount === totalItems;

              return (
                <div
                  key={order.id}
                  className="group relative flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-200 hover:-translate-y-0.5 bg-[#17181D] border border-white/[0.1]"
                >
                  {/* ═════════ 1. DARK ANODIZED STEEL TICKET RAIL CLIP ═════════ */}
                  <div className="h-4 bg-gradient-to-b from-[#2E303B] via-[#202128] to-[#17181D] border-b border-white/[0.08] relative flex items-center justify-between px-3 shadow-inner select-none shrink-0">
                    {/* Left Silver Rivet */}
                    <div className="w-1.5 h-1.5 rounded-full bg-[#111215] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-neutral-600" />
                    {/* Rail Channel Indicator */}
                    <div className="text-[8px] font-mono text-neutral-400 font-extrabold tracking-widest uppercase opacity-80">
                      SLIP #{order.orderNumber}
                    </div>
                    {/* Right Silver Rivet */}
                    <div className="w-1.5 h-1.5 rounded-full bg-[#111215] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-neutral-600" />
                  </div>

                  {/* ═════════ 2. SLEEK OBSIDIAN DOCKET ═════════ */}
                  <div className="bg-[#17181D] text-neutral-100 p-3.5 sm:p-4 font-mono select-none flex flex-col flex-1 relative">
                    {/* Top Chit Title */}
                    <div className="text-center pb-1">
                      <span className="text-[9px] font-mono font-bold tracking-[0.25em] text-neutral-500 uppercase">
                        *** KITCHEN ORDER TICKET ***
                      </span>
                    </div>

                    {/* Table Stamped Box & Stopwatch */}
                    <div className="flex items-center justify-between gap-2 my-1.5">
                      {/* Big Table Callout */}
                      <div className="flex-1">
                        <div className="border border-white/15 bg-white/[0.04] py-1 px-2.5 rounded text-center shadow-inner">
                          <span className="text-xl font-black font-mono tracking-tight text-white block leading-none">
                            {tableText}
                          </span>
                          {isTakeaway && (
                            <span className="text-[9px] font-extrabold text-amber-400 tracking-wider uppercase block mt-0.5">
                              [ TAKEAWAY PACK ]
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Chronometer Kitchen Stopwatch */}
                      <div className="shrink-0 flex flex-col items-end">
                        <div
                          className={`flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded shadow-sm ${
                            urgency === "urgent"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                              : urgency === "warning"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-white/[0.06] text-neutral-300 border border-white/10"
                          }`}
                        >
                          <Timer className="h-3.5 w-3.5" />
                          <span>{formatTimer(elapsedSec)}</span>
                        </div>
                        <span className="text-[9px] text-neutral-400 mt-0.5 font-bold">
                          {formatOrderTime(order.orderedAt || order.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Status Stamps */}
                    <div className="flex items-center justify-between my-1.5">
                      <span className="text-[10px] text-neutral-400 font-bold">
                        POS #{order.diningSession?.id || "1"}
                      </span>

                      {/* Angled Rubber Ink Stamp */}
                      <div>
                        {isPending && (
                          <div className="inline-block border border-dashed border-amber-500/50 text-amber-400 bg-amber-500/10 font-black text-[10px] px-2.5 py-0.5 rounded tracking-widest uppercase -rotate-2 shadow-sm">
                            NEW TICKET
                          </div>
                        )}
                        {isPreparing && (
                          <div className="inline-block border border-dashed border-sky-500/50 text-sky-400 bg-sky-500/10 font-black text-[10px] px-2.5 py-0.5 rounded tracking-widest uppercase rotate-2 shadow-sm">
                            COOKING
                          </div>
                        )}
                        {isReady && (
                          <div className="inline-block border border-dashed border-emerald-500/50 text-emerald-400 bg-emerald-500/10 font-black text-[10px] px-2.5 py-0.5 rounded tracking-widest uppercase -rotate-1 shadow-sm">
                            AT PASS
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Perforated Dashed Line & Column Headers */}
                    <div className="border-t border-dashed border-white/[0.1] pt-1.5 pb-1 flex items-center justify-between text-[9px] text-neutral-400 font-mono uppercase font-bold tracking-wider">
                      <span>QTY  ITEM</span>
                      <span className="italic text-[8px] text-neutral-400">
                        {isPending
                          ? "AWAITING FIRE"
                          : isPreparing
                          ? `${checkedCount}/${totalItems} PLATED`
                          : "ALL PLATED"}
                      </span>
                    </div>

                    {/* ── DISH ITEMS LIST (With Red Marker Strikethrough) ── */}
                    <div className="divide-y divide-dashed divide-white/[0.06] flex-1 my-1">
                      {order.orderItems.map((oi) => {
                        const checkKey = `${order.id}_${oi.id}`;
                        const isChecked = isReady || !!checkedItems[checkKey];

                        return (
                          <div
                            key={oi.id}
                            onClick={() => {
                              if (!isPending) {
                                toggleItemCheck(order.id, oi.id);
                              }
                            }}
                            className={`py-2 flex items-start gap-2.5 select-none rounded px-1 transition-all ${
                              isPending
                                ? "cursor-default"
                                : "cursor-pointer group"
                            } ${
                              isChecked && !isPending
                                ? "bg-white/[0.02]"
                                : !isPending
                                ? "hover:bg-white/[0.04]"
                                : ""
                            }`}
                            title={
                              isPending
                                ? "Fire ticket to begin plating"
                                : "Tap to mark item plated / cooked"
                            }
                          >
                            {/* Quantity Box */}
                            <span
                              className={`font-mono font-black text-sm px-1.5 py-0.5 rounded border leading-none shrink-0 min-w-[26px] text-center transition-all ${
                                isChecked && !isPending
                                  ? "bg-white/[0.03] border-white/5 text-neutral-600 line-through decoration-rose-500 decoration-[2px]"
                                  : "bg-white/[0.08] border-white/15 text-white shadow-sm"
                              }`}
                            >
                              {oi.quantity}×
                            </span>

                            {/* Dish Details */}
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-[14px] font-bold leading-tight block break-words transition-all ${
                                  isChecked && !isPending
                                    ? "line-through decoration-rose-500 decoration-[2.5px] text-neutral-500 italic"
                                    : "text-neutral-100"
                                }`}
                              >
                                {oi.menuItem?.name || `Item #${oi.menuItemId}`}
                              </span>
                              {oi.menuItem?.category?.name && (
                                <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider block mt-0.5">
                                  [{oi.menuItem.category.name}]
                                </span>
                              )}
                            </div>

                            {/* Chinagraph Grease Pencil Checkbox */}
                            {!isPending && (
                              <div
                                className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                  isChecked
                                    ? "border-rose-500 text-rose-400 bg-rose-500/10"
                                    : "border-white/20 group-hover:border-white/40 text-transparent"
                                }`}
                              >
                                {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Customer Special Instructions */}
                    {order.notes && (
                      <div className="mt-2.5 p-2 bg-amber-500/10 border border-dashed border-amber-500/30 rounded text-amber-300 font-mono text-xs shadow-sm">
                        <div className="flex items-center gap-1 font-black text-[9px] uppercase tracking-wider text-amber-400">
                          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                          <span>SPECIAL INSTRUCTION:</span>
                        </div>
                        <p className="mt-0.5 font-bold text-[12px] leading-snug break-words text-amber-200">
                          "{order.notes}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ═════════ 3. MATCHING TACTILE BUMP BAR ═════════ */}
                  <div className="p-3 bg-[#17181D] border-t border-dashed border-white/[0.1] rounded-b-2xl flex items-center gap-2">
                    {/* Step Back Button (if PREPARING or READY) */}
                    {!isPending && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.id}
                        onClick={() => handleStepBackStatus(order)}
                        className="h-10 w-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-neutral-300 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm"
                        title={isReady ? "Revert to Cooking" : "Revert to New Ticket"}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}

                    {/* Big Tactile Bump Button */}
                    <button
                      type="button"
                      disabled={updatingOrderId === order.id || (isPreparing && !allChecked)}
                      onClick={() => handleProgressStatus(order)}
                      className={`flex-1 h-10 px-3 rounded-xl font-sans font-black text-xs tracking-wider flex items-center justify-center gap-2 uppercase transition-all shadow-md active:scale-[0.98] ${
                        isPending
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-amber-500/30 font-extrabold cursor-pointer"
                          : isPreparing
                          ? allChecked
                            ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-500/30 cursor-pointer"
                            : "bg-white/[0.05] text-neutral-500 border border-white/[0.08] shadow-none cursor-not-allowed active:scale-100"
                          : "bg-gradient-to-r from-[#FA2D48] via-[#FF4565] to-[#FB7185] hover:opacity-95 text-white shadow-[#FA2D48]/30 cursor-pointer"
                      }`}
                      title={
                        isPreparing && !allChecked
                          ? `Check off all dishes (${checkedCount}/${totalItems}) before bumping to ready`
                          : undefined
                      }
                    >
                      {updatingOrderId === order.id ? (
                        <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : (
                        <>
                          <span>
                            {isPending && "Fire Ticket"}
                            {isPreparing &&
                              (allChecked
                                ? "Bump to Ready"
                                : `Plate All Items (${checkedCount}/${totalItems})`)}
                            {isReady && "Bump Order"}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ════════════════ RECALL / BUMP HISTORY DRAWER ════════════════ */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#16171B] border-l border-white/[0.08] flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200 text-neutral-100 font-mono">
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#191A20]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#FA2D48] text-white shadow-sm shadow-[#FA2D48]/30">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-sans font-bold text-white">Bumped Order Recall</h3>
                  <p className="text-[10px] text-neutral-400 font-sans">Recently fulfilled tickets (Last 2 hours)</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyOrders.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-center text-neutral-400 text-xs font-sans">
                  No orders bumped recently.
                </div>
              ) : (
                historyOrders.map((hOrder) => {
                  const tableText = getTableDisplay(hOrder.diningSession?.table?.tableNumber || 1);
                  return (
                    <div
                      key={hOrder.id}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 flex flex-col gap-2 hover:border-white/[0.15] transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white font-sans text-sm">{tableText}</span>
                          <span className="text-[10px] font-mono text-neutral-400 ml-2">
                            #{hOrder.orderNumber}
                          </span>
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                          {hOrder.status}
                        </span>
                      </div>

                      {/* Items list */}
                      <div className="space-y-1 text-xs text-neutral-300 font-mono border-t border-dashed border-white/[0.08] pt-2">
                        {hOrder.orderItems.map((oi) => (
                          <div key={oi.id} className="flex items-center gap-2">
                            <span className="font-mono text-white font-bold text-[11px]">{oi.quantity}×</span>
                            <span className="truncate">{oi.menuItem?.name || `Item #${oi.menuItemId}`}</span>
                          </div>
                        ))}
                      </div>

                      {/* Recall Button */}
                      <div className="flex items-center justify-between border-t border-dashed border-white/[0.08] pt-2 mt-1">
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {formatOrderTime(hOrder.updatedAt || hOrder.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRecallOrder(hOrder.id)}
                          className="flex items-center gap-1 text-xs font-sans font-bold text-[#FA2D48] hover:text-[#ff455d] hover:bg-[#FA2D48]/10 px-2 py-1 rounded transition-all active:scale-95"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Restore to Board</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
