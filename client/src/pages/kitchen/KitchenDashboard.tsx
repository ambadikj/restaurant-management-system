import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axiosInstance from "../../api/axiosInstance";
import { socket } from "../../lib/socket";
import {
  ChefHat,
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

  /* ── Fullscreen toggle ── */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

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
    <div className="flex flex-col h-screen w-screen bg-[#F0ECE4] text-neutral-900 font-mono select-none overflow-hidden antialiased">
      {/* ════════════════ STREAMLINED KDS TITLE BAR (Matching Paper Theme) ════════════════ */}
      <header className="h-12 bg-[#FAF8F5] border-b border-neutral-300/90 px-4 flex items-center justify-between shrink-0 z-30 shadow-sm">
        {/* Left: Clean Branding & Active Orders */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FA2D48] text-white shadow-sm">
            <ChefHat className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-sm text-neutral-900 tracking-tight font-sans">
              Kitchen Display
            </span>
            <span className="px-2 py-0.5 rounded-full bg-neutral-200/80 text-[11px] font-sans font-semibold text-neutral-800 border border-neutral-300/70">
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-xs font-sans font-semibold text-neutral-800 transition-all shadow-sm active:scale-95"
            title="Recall Recently Bumped Tickets"
          >
            <History className="h-3.5 w-3.5 text-neutral-600" />
            <span>Recall ({historyOrders.length})</span>
          </button>

          {/* Sound Mute/Unmute */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition-all shadow-sm active:scale-95 ${
              soundEnabled
                ? "bg-neutral-100 border-neutral-300 text-emerald-600 hover:bg-neutral-200"
                : "bg-neutral-100 border-neutral-300 text-neutral-400 hover:bg-neutral-200"
            }`}
            title={soundEnabled ? "Audio chime ON" : "Audio muted"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Live Clock with connection indicator */}
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-800 px-1 py-1">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-amber-500"
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
            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-rose-50 hover:border-rose-300 border border-neutral-300 text-neutral-600 hover:text-rose-600 transition-all ml-1 shadow-sm active:scale-95"
            title="Sign out of kitchen"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ════════════════ MAIN KDS TICKET TRACK (Grid Pattern Surface) ════════════════ */}
      <main
        className="flex-1 overflow-x-auto overflow-y-auto p-3 sm:p-4 bg-[#EDE8DF]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.055) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.055) 1px, transparent 1px)
          `,
          backgroundSize: "26px 26px",
        }}
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-[#FA2D48] border-t-transparent animate-spin" />
              <span className="text-xs text-neutral-600 font-sans font-semibold tracking-wide">
                INITIALIZING KDS TERMINAL...
              </span>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-500">
            <div className="h-16 w-16 rounded-2xl bg-white border border-neutral-300 flex items-center justify-center mb-3 shadow-sm">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-sans font-bold text-neutral-900">Cook Line Clear</h3>
            <p className="text-xs font-sans text-neutral-600 max-w-sm mt-1">
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
                  className="group relative flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-200 hover:-translate-y-0.5 bg-[#FAF8F5] border border-neutral-300/90"
                >
                  {/* ═════════ 1. STAINLESS STEEL TICKET RAIL CLIP ═════════ */}
                  <div className="h-4 bg-gradient-to-b from-neutral-300 via-neutral-100 to-neutral-400 border-b border-neutral-400/60 relative flex items-center justify-between px-3 shadow-inner select-none shrink-0">
                    {/* Left Silver Rivet */}
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)] border border-neutral-300" />
                    {/* Rail Channel Indicator */}
                    <div className="text-[8px] font-mono text-neutral-600 font-extrabold tracking-widest uppercase opacity-75">
                      SLIP #{order.orderNumber}
                    </div>
                    {/* Right Silver Rivet */}
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)] border border-neutral-300" />
                  </div>

                  {/* ═════════ 2. AUTHENTIC THERMAL PAPER DOCKET ═════════ */}
                  <div className="bg-[#FAF8F5] text-neutral-900 p-3.5 sm:p-4 font-mono select-none flex flex-col flex-1 relative">
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
                        <div className="border-2 border-neutral-900 bg-neutral-100/90 py-1 px-2.5 rounded text-center shadow-sm">
                          <span className="text-xl font-black font-mono tracking-tight text-neutral-950 block leading-none">
                            {tableText}
                          </span>
                          {isTakeaway && (
                            <span className="text-[9px] font-extrabold text-amber-700 tracking-wider uppercase block mt-0.5">
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
                              ? "bg-rose-600 text-white animate-pulse"
                              : urgency === "warning"
                              ? "bg-amber-400 text-neutral-950"
                              : "bg-neutral-200 text-neutral-800"
                          }`}
                        >
                          <Timer className="h-3.5 w-3.5" />
                          <span>{formatTimer(elapsedSec)}</span>
                        </div>
                        <span className="text-[9px] text-neutral-500 mt-0.5 font-bold">
                          {formatOrderTime(order.orderedAt || order.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Rubber Ink Status Stamp */}
                    <div className="flex items-center justify-between my-1.5">
                      <span className="text-[10px] text-neutral-500 font-bold">
                        POS #{order.diningSession?.id || "1"}
                      </span>

                      {/* Angled Rubber Ink Stamp */}
                      <div>
                        {isPending && (
                          <div className="inline-block border-2 border-dashed border-amber-600 text-amber-700 bg-amber-500/10 font-black text-[10px] px-2.5 py-0.5 rounded tracking-widest uppercase -rotate-2 shadow-sm">
                            NEW TICKET
                          </div>
                        )}
                        {isPreparing && (
                          <div className="inline-block border-2 border-dashed border-blue-600 text-blue-700 bg-blue-500/10 font-black text-[10px] px-2.5 py-0.5 rounded tracking-widest uppercase rotate-2 shadow-sm">
                            COOKING
                          </div>
                        )}
                        {isReady && (
                          <div className="inline-block border-2 border-dashed border-emerald-600 text-emerald-700 bg-emerald-500/10 font-black text-[10px] px-2.5 py-0.5 rounded tracking-widest uppercase -rotate-1 shadow-sm">
                            AT PASS
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Perforated Dashed Line & Column Headers */}
                    <div className="border-t-2 border-dashed border-neutral-300 pt-1.5 pb-1 flex items-center justify-between text-[9px] text-neutral-400 font-mono uppercase font-bold tracking-wider">
                      <span>QTY  ITEM</span>
                      <span className="italic text-[8px]">
                        {isPending
                          ? "AWAITING FIRE"
                          : isPreparing
                          ? `${checkedCount}/${totalItems} PLATED`
                          : "ALL PLATED"}
                      </span>
                    </div>

                    {/* ── DISH ITEMS LIST (With Chinagraph Red Marker Strikethrough) ── */}
                    <div className="divide-y divide-dashed divide-neutral-200 flex-1 my-1">
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
                                ? "bg-neutral-100/50"
                                : !isPending
                                ? "hover:bg-neutral-100/80"
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
                                  ? "bg-neutral-200/60 border-neutral-300 text-neutral-400 line-through decoration-rose-600 decoration-[2px]"
                                  : "bg-neutral-900 border-neutral-900 text-white shadow-sm"
                              }`}
                            >
                              {oi.quantity}×
                            </span>

                            {/* Dish Details */}
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-[14px] font-bold leading-tight block break-words transition-all ${
                                  isChecked && !isPending
                                    ? "line-through decoration-rose-600 decoration-[2.5px] text-neutral-400 italic"
                                    : "text-neutral-900"
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

                            {/* Chinagraph Grease Pencil Checkbox (Hidden when ticket is pending) */}
                            {!isPending && (
                              <div
                                className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                  isChecked
                                    ? "border-rose-600 text-rose-600 bg-rose-50"
                                    : "border-neutral-300 group-hover:border-neutral-500 text-transparent"
                                }`}
                              >
                                {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Customer Special Instructions (Memo Yellow Box) */}
                    {order.notes && (
                      <div className="mt-2.5 p-2 bg-amber-100/90 border-2 border-dashed border-amber-400/90 rounded text-amber-950 font-mono text-xs shadow-sm">
                        <div className="flex items-center gap-1 font-black text-[9px] uppercase tracking-wider text-amber-900">
                          <AlertTriangle className="h-3 w-3 text-amber-700 shrink-0" />
                          <span>SPECIAL INSTRUCTION:</span>
                        </div>
                        <p className="mt-0.5 font-bold text-[12px] leading-snug break-words">
                          "{order.notes}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ═════════ 3. MATCHING TACTILE BUMP BAR ═════════ */}
                  <div className="p-3 bg-[#FAF8F5] border-t-2 border-dashed border-neutral-300 rounded-b-2xl flex items-center gap-2">
                    {/* Step Back Button (if PREPARING or READY) */}
                    {!isPending && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.id}
                        onClick={() => handleStepBackStatus(order)}
                        className="h-10 w-10 rounded-xl bg-neutral-200/80 hover:bg-neutral-300 border border-neutral-300 text-neutral-700 hover:text-neutral-950 flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm"
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
                          ? "bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/25"
                          : isPreparing
                          ? allChecked
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 cursor-pointer"
                            : "bg-neutral-200/90 text-neutral-400 border border-neutral-300 shadow-none cursor-not-allowed active:scale-100"
                          : "bg-[#FA2D48] hover:bg-[#ff455d] text-white shadow-[#FA2D48]/25 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#F5F2EB] border-l border-neutral-300 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200 text-neutral-900 font-mono">
            {/* Drawer Header */}
            <div className="p-4 border-b border-neutral-300/80 flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#FA2D48] text-white shadow-sm">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-sans font-bold text-neutral-900">Bumped Order Recall</h3>
                  <p className="text-[10px] text-neutral-500 font-sans">Recently fulfilled tickets (Last 2 hours)</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyOrders.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-center text-neutral-500 text-xs font-sans">
                  No orders bumped recently.
                </div>
              ) : (
                historyOrders.map((hOrder) => {
                  const tableText = getTableDisplay(hOrder.diningSession?.table?.tableNumber || 1);
                  return (
                    <div
                      key={hOrder.id}
                      className="rounded-xl border border-neutral-300 bg-[#FAF8F5] p-3.5 flex flex-col gap-2 hover:border-neutral-400 transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-neutral-900 font-sans text-sm">{tableText}</span>
                          <span className="text-[10px] font-mono text-neutral-500 ml-2">
                            #{hOrder.orderNumber}
                          </span>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                          {hOrder.status}
                        </span>
                      </div>

                      {/* Items list */}
                      <div className="space-y-1 text-xs text-neutral-700 font-mono border-t border-dashed border-neutral-200 pt-2">
                        {hOrder.orderItems.map((oi) => (
                          <div key={oi.id} className="flex items-center gap-2">
                            <span className="font-mono text-neutral-900 font-bold text-[11px]">{oi.quantity}×</span>
                            <span className="truncate">{oi.menuItem?.name || `Item #${oi.menuItemId}`}</span>
                          </div>
                        ))}
                      </div>

                      {/* Recall Button */}
                      <div className="flex items-center justify-between border-t border-dashed border-neutral-200 pt-2 mt-1">
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {formatOrderTime(hOrder.updatedAt || hOrder.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRecallOrder(hOrder.id)}
                          className="flex items-center gap-1 text-xs font-sans font-bold text-[#FA2D48] hover:text-[#d9223a] hover:bg-[#FA2D48]/10 px-2 py-1 rounded transition-all active:scale-95"
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
