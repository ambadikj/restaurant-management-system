import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Search,
  Clock,
  Send,
  RefreshCw,
  ChefHat,
  BellRing,
  ArrowRight,
  X,
  ReceiptIndianRupee,
  ChevronLeft,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import SwipeableToaster from "@/components/SwipeableToaster";
import { socket } from "../../lib/socket";
import { BrandCrest } from "@/components/BrandLogo";

interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: string | number;
  imageUrl: string;
  isAvailable: boolean;
  inventory?: {
    dailyLimit: number;
    remainingQty: number;
    isAvailable: boolean;
  } | null;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  menuItems: MenuItem[];
}

interface OrderItem {
  id: number;
  menuItemId: number;
  quantity: number;
  price: string | number;
  subtotal: string | number;
  menuItem: MenuItem;
}

interface TableOrder {
  id: number;
  orderNumber: string;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
  notes?: string | null;
  orderedAt: string;
  orderItems: OrderItem[];
}

interface RestaurantTable {
  id: number;
  tableNumber: number;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "BILLING" | "CLEANING";
  hasReadyOrder?: boolean;
  activeSession?: {
    id: number;
    sessionCode: string;
    startTime: string;
    ordersCount: number;
    totalItems: number;
    totalAmount: number;
    orders?: TableOrder[];
  } | null;
}

interface BillPreview {
  totalItems: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  tax: number;
  grandTotal: number;
  aggregatedItems: Array<{
    menuItem: MenuItem;
    quantity: number;
    subtotal: number;
  }>;
}

const BACKEND_HOST = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
const API_BASE = `http://${BACKEND_HOST}:5000/api/waiter`;
const PUBLIC_MENU_API = `http://${BACKEND_HOST}:5000/api/customer/menu`;
const UPLOADS_BASE = `http://${BACKEND_HOST}:5000`;

const STATUS_THEME = {
  AVAILABLE: {
    label: "Available",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]",
    activeBtn: "bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/30",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    glow: "rgba(16, 185, 129, 0.08)",
  },
  OCCUPIED: {
    label: "Occupied",
    badge: "bg-[#FF0000]/10 text-[#FF4D4D] border-[#FF0000]/30",
    dot: "bg-[#FF0000] shadow-[0_0_10px_rgba(255,0,0,0.8)]",
    activeBtn: "bg-[#FF0000] text-white font-black shadow-lg shadow-[#FF0000]/40",
    border: "border-[#FF0000]/30 hover:border-[#FF0000]/60",
    glow: "rgba(255, 0, 0, 0.08)",
  },
  BILLING: {
    label: "Billing",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse",
    activeBtn: "bg-amber-500 text-black font-black shadow-lg shadow-amber-500/30",
    border: "border-amber-500/30 hover:border-amber-500/60",
    glow: "rgba(245, 158, 11, 0.08)",
  },
  CLEANING: {
    label: "Cleaning",
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    dot: "bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.8)]",
    activeBtn: "bg-purple-600 text-white font-black shadow-lg shadow-purple-600/30",
    border: "border-purple-500/30 hover:border-purple-500/60",
    glow: "rgba(168, 85, 247, 0.08)",
  },
};

const QUICK_NOTES = ["Less Spicy", "No Onion/Garlic", "Extra Spicy", "Serve Fast", "Dressing on Side"];

export default function WaiterDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tableParam = searchParams.get("table");

  // Navigation: "floor" (All Tables) vs. "table" (Active table workspace)
  const [viewMode, setViewMode] = useState<"floor" | "table">(tableParam ? "table" : "floor");
  const [tableSubTab, setTableSubTab] = useState<"menu" | "orders" | "bill">("menu");

  // State
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTableNum, setSelectedTableNum] = useState<number | null>(tableParam ? Number(tableParam) : null);
  const [floorFilter, setFloorFilter] = useState<string>("ALL");
  const [loadingTables, setLoadingTables] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Menu Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnlyFilter, setVegOnlyFilter] = useState(false);

  // Active Table Detail & Cart
  const [tableDetail, setTableDetail] = useState<{
    table: RestaurantTable | null;
    orders: TableOrder[];
    billPreview: BillPreview | null;
  }>({ table: null, orders: [], billPreview: null });

  // Waiter Order Tray (Cart)
  const [cart, setCart] = useState<{ [menuItemId: number]: { item: MenuItem; quantity: number } }>({});
  const [orderNotes, setOrderNotes] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Audio Alerts
  const playAlertSound = (type: "ready" | "chime") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(type === "ready" ? 880 : 587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(type === "ready" ? 1174.66 : 880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignore audio policy restrictions
    }
  };

  // 1. Initial Load & WebSockets
  useEffect(() => {
    fetchTables();
    fetchMenu();

    socket.emit("join:staff", "waiter");

    const handleTableUpdate = (updatedTable: any) => {
      setTables((prev) =>
        prev.map((tbl) => (tbl.tableNumber === updatedTable.tableNumber ? { ...tbl, ...updatedTable } : tbl))
      );
      if (selectedTableNum && Number(updatedTable.tableNumber) === Number(selectedTableNum)) {
        fetchTableDetail(selectedTableNum, false);
      }
    };

    const handleNewOrder = (data: any) => {
      fetchTables();
      const orderObj = data?.order || data;
      const rawNum =
        data?.tableNumber ??
        orderObj?.tableNumber ??
        orderObj?.diningSession?.table?.tableNumber;
      const num = rawNum !== undefined && !isNaN(Number(rawNum)) ? Number(rawNum) : null;

      playAlertSound("ready");

      if (num) {
        toast.success(`🔔 New order placed on Table #${num}!`, {
          icon: "🍽️",
          duration: 6000,
        });

        if (selectedTableNum && Number(selectedTableNum) === num) {
          fetchTableDetail(selectedTableNum, false);
        }
      } else {
        toast.success(`🔔 New order received!`, { duration: 5000 });
      }
    };

    const handleServiceAlert = (data: any) => {
      playAlertSound("chime");
      const isBill = data.type === "REQUEST_BILL";
      toast(
        () => (
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{isBill ? "🧾" : "🔔"}</span>
            <div>
              <p className="font-extrabold text-xs text-white">Table #{data.tableNumber}</p>
              <p className="text-[11px] text-[#AAAAAA]">
                {data.message || (isBill ? "Customer requested bill" : "Customer called for assistance")}
              </p>
            </div>
          </div>
        ),
        {
          duration: 7000,
        }
      );
      fetchTables();
      if (selectedTableNum && Number(selectedTableNum) === Number(data.tableNumber)) {
        fetchTableDetail(selectedTableNum, false);
      }
    };

    const handleOrderStatusUpdate = (data: any) => {
      if (data.status === "READY") {
        playAlertSound("ready");
        toast.success(`Order #${data.orderNumber} is READY to serve!`, {
          icon: "🍽️",
          duration: 5000,
        });
      }
      fetchTables();
      if (selectedTableNum) {
        fetchTableDetail(selectedTableNum, false);
      }
    };

    const handleStockUpdate = (data: { menuItemId: number; remainingQty: number; isAvailable: boolean }) => {
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          menuItems: cat.menuItems.map((item) =>
            item.id === data.menuItemId
              ? {
                  ...item,
                  isAvailable: data.isAvailable,
                  inventory: item.inventory
                    ? {
                        ...item.inventory,
                        remainingQty: data.remainingQty,
                        isAvailable: data.isAvailable,
                      }
                    : null,
                }
              : item
          ),
        }))
      );
    };

    socket.on("table:update", handleTableUpdate);
    socket.on("order:new", handleNewOrder);
    socket.on("order:placed", handleNewOrder);
    socket.on("service:alert", handleServiceAlert);
    socket.on("order:status_update", handleOrderStatusUpdate);
    socket.on("order:served", handleOrderStatusUpdate);
    socket.on("inventory:stock_update", handleStockUpdate);

    return () => {
      socket.off("table:update", handleTableUpdate);
      socket.off("order:new", handleNewOrder);
      socket.off("order:placed", handleNewOrder);
      socket.off("service:alert", handleServiceAlert);
      socket.off("order:status_update", handleOrderStatusUpdate);
      socket.off("order:served", handleOrderStatusUpdate);
      socket.off("inventory:stock_update", handleStockUpdate);
    };
  }, [selectedTableNum]);

  // Sync with URL parameters
  useEffect(() => {
    if (tableParam) {
      const num = Number(tableParam);
      if (!isNaN(num)) {
        setSelectedTableNum(num);
        setViewMode("table");
      }
    }
  }, [tableParam]);

  // Fetch table details when selected table changes
  useEffect(() => {
    if (selectedTableNum) {
      fetchTableDetail(selectedTableNum);
      socket.emit("join:table", selectedTableNum);
    }
  }, [selectedTableNum]);

  const fetchTables = async () => {
    try {
      const res = await axios.get(`${API_BASE}/tables`);
      setTables(res.data.tables || []);
    } catch (err) {
      console.error("Failed to load tables:", err);
      toast.error("Could not load floor tables.");
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await axios.get(PUBLIC_MENU_API);
      setCategories(res.data || []);
    } catch (err) {
      console.error("Failed to load menu:", err);
      toast.error("Could not load menu catalog.");
    }
  };

  const fetchTableDetail = async (tableNum: number, _showLoading = true) => {
    try {
      const res = await axios.get(`${API_BASE}/table/${tableNum}`);
      const orders = res.data.activeSession?.orders || [];
      setTableDetail({
        table: {
          id: res.data.id,
          tableNumber: res.data.tableNumber,
          capacity: res.data.capacity,
          status: res.data.status,
          activeSession: res.data.activeSession,
        },
        orders,
        billPreview: res.data.billPreview,
      });
    } catch (err) {
      console.error("Failed to fetch table detail:", err);
    }
  };

  // Open Table Workspace
  const handleOpenTable = (tableNum: number, initialTab: "menu" | "orders" | "bill" = "menu") => {
    setSelectedTableNum(tableNum);
    setViewMode("table");
    setTableSubTab(initialTab);
    setSearchParams({ table: String(tableNum) });
    setCart({});
    setOrderNotes("");
  };

  // Back to Floor Overview
  const handleBackToFloor = () => {
    setViewMode("floor");
    setSearchParams({});
    fetchTables();
  };

  // Update Status for any table (directly from floor or from table view)
  const handleUpdateStatus = async (
    tableNum: number,
    newStatus: "AVAILABLE" | "OCCUPIED" | "BILLING" | "CLEANING"
  ) => {
    setStatusUpdating(true);
    try {
      await axios.patch(`${API_BASE}/table/${tableNum}/status`, { status: newStatus });
      toast.success(`Table #${tableNum} is now ${newStatus}`, { icon: "✅" });

      setTables((prev) =>
        prev.map((t) => (t.tableNumber === tableNum ? { ...t, status: newStatus } : t))
      );

      if (selectedTableNum === tableNum) {
        setTableDetail((prev) => ({
          ...prev,
          table: prev.table ? { ...prev.table, status: newStatus } : null,
        }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  // Request Bill to Cashier
  const handleRequestBill = async (tableNum: number) => {
    try {
      await axios.post(`${API_BASE}/table/${tableNum}/request-bill`);
      toast.success(`Bill requested for Table #${tableNum}! Cashier alerted.`, {
        icon: "🧾",
        duration: 4000,
      });
      handleUpdateStatus(tableNum, "BILLING");
      playAlertSound("chime");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to request bill");
    }
  };

  // Order Status Progression (e.g. Mark as Served)
  const handleUpdateOrderStatus = async (
    orderId: number,
    newStatus: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED"
  ) => {
    try {
      await axios.patch(`${API_BASE}/order/${orderId}/status`, { status: newStatus });
      toast.success(`Order updated to ${newStatus}`);
      if (selectedTableNum) {
        fetchTableDetail(selectedTableNum, false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update order status");
    }
  };

  // Cart / Waiter Order Tray
  const handleAddToCart = (item: MenuItem) => {
    if (!item.isAvailable) {
      toast.error(`${item.name} is sold out.`);
      return;
    }
    const currentQty = cart[item.id]?.quantity || 0;
    const remainingStock = item.inventory?.remainingQty;
    if (remainingStock !== undefined && currentQty + 1 > remainingStock) {
      toast.error(`Only ${remainingStock} left in stock.`);
      return;
    }

    setCart((prev) => ({
      ...prev,
      [item.id]: { item, quantity: currentQty + 1 },
    }));
  };

  const handleRemoveFromCart = (itemId: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (!next[itemId]) return prev;
      if (next[itemId].quantity > 1) {
        next[itemId] = { ...next[itemId], quantity: next[itemId].quantity - 1 };
      } else {
        delete next[itemId];
      }
      return next;
    });
  };

  const cartItems = Object.values(cart);
  const cartItemCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, curr) => acc + Number(curr.item.price) * curr.quantity, 0);

  // Submit Order to Kitchen
  const handleSubmitOrder = async () => {
    if (!selectedTableNum) {
      toast.error("Please select a table.");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("Please add items to the order tray.");
      return;
    }

    setSubmittingOrder(true);
    try {
      const payload = {
        tableNumber: selectedTableNum,
        items: cartItems.map((ci) => ({
          menuItemId: ci.item.id,
          quantity: ci.quantity,
        })),
        notes: orderNotes.trim() || undefined,
      };

      const res = await axios.post(`${API_BASE}/order`, payload);
      toast.success(`KOT #${res.data.order?.orderNumber} dispatched!`, {
        icon: "👨‍🍳",
        duration: 4000,
      });

      setCart({});
      setOrderNotes("");
      setIsCartOpen(false);

      fetchTableDetail(selectedTableNum, false);
      fetchTables();
      setTableSubTab("orders");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to dispatch order.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Filtered dishes for POS menu
  const filteredDishes = useMemo(() => {
    let list: MenuItem[] = [];
    if (selectedCategory === "ALL") {
      categories.forEach((c) => {
        list.push(...c.menuItems);
      });
    } else {
      const cat = categories.find((c) => c.id === selectedCategory);
      if (cat) list = cat.menuItems;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (dish) =>
          dish.name.toLowerCase().includes(q) ||
          (dish.description && dish.description.toLowerCase().includes(q))
      );
    }

    if (vegOnlyFilter) {
      list = list.filter((dish) => {
        const desc = (dish.description || "").toLowerCase();
        const name = dish.name.toLowerCase();
        return (
          desc.includes("veg") &&
          !desc.includes("non-veg") &&
          !name.includes("chicken") &&
          !name.includes("mutton") &&
          !name.includes("fish") &&
          !name.includes("prawn")
        );
      });
    }

    return list;
  }, [categories, selectedCategory, searchQuery, vegOnlyFilter]);

  // Filtered Floor Tables
  const filteredTables = useMemo(() => {
    if (floorFilter === "ALL") return tables;
    return tables.filter((t) => t.status === floorFilter);
  }, [tables, floorFilter]);

  // Current selected table
  const currentTable = tableDetail.table || tables.find((t) => t.tableNumber === selectedTableNum) || null;
  const currentStatusTheme = currentTable ? STATUS_THEME[currentTable.status] : STATUS_THEME.AVAILABLE;

  // Stats for Floor View
  const stats = useMemo(() => {
    const occupied = tables.filter((t) => t.status === "OCCUPIED").length;
    const billing = tables.filter((t) => t.status === "BILLING").length;
    const cleaning = tables.filter((t) => t.status === "CLEANING").length;
    const available = tables.filter((t) => t.status === "AVAILABLE").length;
    const readyOrders = tables.filter((t) => t.hasReadyOrder).length;
    return { occupied, billing, cleaning, available, readyOrders };
  }, [tables]);

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col font-sans selection:bg-[#FF0000]/30 select-none pb-8">
      <SwipeableToaster />

      {/* ================= YOUTUBE MUSIC TOP APP BAR ================= */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#030303]/90 border-b border-[#1F1F1F] px-4 py-3 w-full">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Brand & View Indicator */}
          <div className="flex items-center gap-3">
            {viewMode === "table" ? (
              <button
                onClick={handleBackToFloor}
                className="h-9 w-9 rounded-full bg-[#212121] hover:bg-[#303030] text-white flex items-center justify-center active:scale-90 transition cursor-pointer"
                title="Back to All Tables"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <BrandCrest className="h-8 w-8 shrink-0" />
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Outfit'] font-black text-base tracking-tight text-white block leading-none">
                  {viewMode === "table" && currentTable ? `Table #${currentTable.tableNumber}` : "Waiter Floor"}
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live Synced" />
              </div>
              <span className="text-[11px] text-[#AAAAAA] font-medium mt-0.5 block leading-none">
                {viewMode === "table" && currentTable
                  ? `${currentTable.capacity} Seats • ${currentStatusTheme.label}`
                  : `${tables.length} Dining Tables • Live POS`}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {viewMode === "table" ? (
              <button
                onClick={() => selectedTableNum && handleRequestBill(selectedTableNum)}
                className="h-9 px-3.5 rounded-full bg-[#FF0000]/15 hover:bg-[#FF0000]/25 text-[#FF4D4D] border border-[#FF0000]/30 flex items-center gap-1.5 text-xs font-bold active:scale-95 transition cursor-pointer"
              >
                <BellRing className="h-3.5 w-3.5" />
                <span>Bill</span>
              </button>
            ) : null}

            <button
              onClick={() => {
                fetchTables();
                if (selectedTableNum) fetchTableDetail(selectedTableNum, false);
                toast.success("Floor refreshed");
              }}
              className="h-9 w-9 rounded-full bg-[#212121] hover:bg-[#303030] text-[#AAAAAA] hover:text-white flex items-center justify-center active:scale-90 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================= */}
      {/* ── VIEW 1: FLOOR OVERVIEW (ALL TABLES) ───────────────────── */}
      {/* ============================================================= */}
      {viewMode === "floor" && (
        <main className="w-full max-w-4xl mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-200">
          {/* YT Music Pill Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { key: "ALL", label: `All (${tables.length})` },
              { key: "OCCUPIED", label: `Occupied (${stats.occupied})` },
              { key: "BILLING", label: `Billing (${stats.billing})` },
              { key: "AVAILABLE", label: `Available (${stats.available})` },
              { key: "CLEANING", label: `Cleaning (${stats.cleaning})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFloorFilter(f.key)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  floorFilter === f.key
                    ? "bg-white text-black shadow-md font-extrabold"
                    : "bg-[#212121] text-[#AAAAAA] hover:text-white border border-transparent hover:border-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Floor Tables Grid (Mobile 2-col, Tablet 3-4 col) */}
          {loadingTables ? (
            <div className="text-center py-16 text-[#717171] text-xs">Loading floor tables...</div>
          ) : filteredTables.length === 0 ? (
            <div className="text-center py-16 bg-[#121212] rounded-3xl border border-white/5 text-xs text-[#717171]">
              No tables in this status filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {filteredTables.map((tbl) => {
                const theme = STATUS_THEME[tbl.status];
                const activeSession = tbl.activeSession;
                const hasReadyKOT = tbl.hasReadyOrder;

                return (
                  <div
                    key={tbl.id}
                    className={`group relative bg-[#121212] rounded-3xl p-4 border transition-all duration-200 flex flex-col justify-between ${theme.border} hover:bg-[#181818] shadow-lg`}
                    style={{ background: `linear-gradient(180deg, #161616 0%, #0F0F0F 100%)` }}
                  >
                    {/* Top Table Number & Glow Indicator */}
                    <div
                      onClick={() => handleOpenTable(tbl.tableNumber)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-['Outfit'] font-black text-2xl text-white tracking-tight">
                            #{tbl.tableNumber < 10 ? `0${tbl.tableNumber}` : tbl.tableNumber}
                          </span>
                          <span className="text-[10px] text-[#717171] font-semibold">{tbl.capacity}P</span>
                        </div>
                        <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
                      </div>

                      {/* Ready KOT alert badge */}
                      {hasReadyKOT && (
                        <div className="mb-2 py-1 px-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                          <ChefHat className="h-3 w-3" />
                          <span>Food Ready to Serve!</span>
                        </div>
                      )}

                      {/* Active Session Summary */}
                      <div className="space-y-1 mb-3">
                        <span
                          className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${theme.badge}`}
                        >
                          {theme.label}
                        </span>

                        <div className="flex items-center justify-between text-xs pt-1">
                          {activeSession ? (
                            <>
                              <span className="text-[#AAAAAA] text-[11px]">{activeSession.ordersCount} KOTs</span>
                              <span className="font-mono font-bold text-white">
                                ₹{activeSession.totalAmount.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-[#717171]">Ready for guests</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Status Bar on Card (Touch Friendly) */}
                    <div className="pt-2.5 border-t border-white/5">
                      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#0A0A0A] border border-white/5">
                        {(["AVAILABLE", "OCCUPIED", "BILLING", "CLEANING"] as const).map((st) => {
                          const isActive = tbl.status === st;
                          const tConfig = STATUS_THEME[st];
                          return (
                            <button
                              key={st}
                              disabled={statusUpdating}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(tbl.tableNumber, st);
                              }}
                              className={`py-1 text-[9px] font-black rounded-lg transition-all cursor-pointer ${
                                isActive
                                  ? tConfig.activeBtn
                                  : "text-[#717171] hover:text-white hover:bg-[#1F1F1F]"
                              }`}
                              title={`Set ${st}`}
                            >
                              {st === "AVAILABLE"
                                ? "Avail"
                                : st === "OCCUPIED"
                                ? "Occ"
                                : st === "BILLING"
                                ? "Bill"
                                : "Clean"}
                            </button>
                          );
                        })}
                      </div>

                      {/* Tap to open button */}
                      <button
                        onClick={() => handleOpenTable(tbl.tableNumber)}
                        className="w-full mt-2 py-2 rounded-xl bg-[#212121] hover:bg-[#FF0000] hover:text-white text-[#AAAAAA] text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <UtensilsCrossed className="h-3 w-3" />
                        <span>Manage & Order</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ============================================================= */}
      {/* ── VIEW 2: ACTIVE TABLE WORKSPACE ────────────────────────── */}
      {/* ============================================================= */}
      {viewMode === "table" && currentTable && (
        <div className="w-full max-w-4xl mx-auto px-4 py-3 space-y-4 animate-in fade-in duration-200">
          {/* Table Header Card */}
          <div className="bg-[#121212] border border-white/5 rounded-3xl p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[#1F1F1F] border border-white/10 flex flex-col items-center justify-center">
                  <span className="text-[9px] text-[#717171] font-bold uppercase">TBL</span>
                  <span className="font-['Outfit'] font-black text-lg text-white">#{currentTable.tableNumber}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Table #{currentTable.tableNumber}</span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${currentStatusTheme.badge}`}
                    >
                      {currentStatusTheme.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#AAAAAA]">
                    {currentTable.capacity} Seats • {tableDetail.orders.length} KOTs • Total: ₹
                    {tableDetail.billPreview?.grandTotal.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>

              {/* Status Switcher Strip */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#0A0A0A] border border-white/5">
                {(["AVAILABLE", "OCCUPIED", "BILLING", "CLEANING"] as const).map((st) => {
                  const isActive = currentTable.status === st;
                  const cfg = STATUS_THEME[st];
                  return (
                    <button
                      key={st}
                      disabled={statusUpdating}
                      onClick={() => handleUpdateStatus(currentTable.tableNumber, st)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        isActive ? cfg.activeBtn : "text-[#717171] hover:text-white"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-tabs: [ Menu (POS) ] [ Active KOT ] [ Bill ] */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
              <button
                onClick={() => setTableSubTab("menu")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  tableSubTab === "menu"
                    ? "bg-[#FF0000] text-white shadow-lg shadow-[#FF0000]/20"
                    : "bg-[#1E1E1E] text-[#AAAAAA] hover:text-white"
                }`}
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                <span>Take Order</span>
                {cartItemCount > 0 && (
                  <span className="h-4 w-4 rounded-full bg-white text-black font-black text-[10px] flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setTableSubTab("orders")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  tableSubTab === "orders"
                    ? "bg-[#FF0000] text-white shadow-lg shadow-[#FF0000]/20"
                    : "bg-[#1E1E1E] text-[#AAAAAA] hover:text-white"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Active KOT</span>
                <span className="text-[10px] px-1.5 rounded-full bg-white/10 text-white font-bold">
                  {tableDetail.orders.length}
                </span>
              </button>

              <button
                onClick={() => setTableSubTab("bill")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  tableSubTab === "bill"
                    ? "bg-[#FF0000] text-white shadow-lg shadow-[#FF0000]/20"
                    : "bg-[#1E1E1E] text-[#AAAAAA] hover:text-white"
                }`}
              >
                <ReceiptIndianRupee className="h-3.5 w-3.5" />
                <span>Guest Bill</span>
              </button>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 1: MENU (TAKE ORDER) ───────────────────────────────── */}
          {/* ────────────────────────────────────────────────────────── */}
          {tableSubTab === "menu" && (
            <div className="space-y-3 pb-24">
              {/* Search & Veg toggle */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#717171]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dishes, drinks..."
                    className="w-full pl-10 pr-4 py-2 rounded-full bg-[#181818] border border-transparent focus:border-white/20 text-xs text-white placeholder-[#717171] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#AAAAAA] hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setVegOnlyFilter((v) => !v)}
                  className={`px-3 py-2 rounded-full text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    vegOnlyFilter
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-[#181818] text-[#AAAAAA] border-transparent"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Veg</span>
                </button>
              </div>

              {/* Category Pills (YouTube Music Style) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    selectedCategory === "ALL"
                      ? "bg-white text-black font-extrabold"
                      : "bg-[#212121] text-[#AAAAAA] hover:text-white"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-white text-black font-extrabold"
                        : "bg-[#212121] text-[#AAAAAA] hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Dishes Grid (Phone 2-col, Tablet 3-col) */}
              {filteredDishes.length === 0 ? (
                <div className="text-center py-16 text-[#717171] text-xs">No dishes match your search.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredDishes.map((dish) => {
                    const inCart = cart[dish.id]?.quantity || 0;
                    const remaining = dish.inventory?.remainingQty;
                    const isSoldOut = !dish.isAvailable || remaining === 0;

                    return (
                      <div
                        key={dish.id}
                        className={`bg-[#121212] rounded-2xl p-3 border transition-all flex flex-col justify-between ${
                          inCart > 0
                            ? "border-[#FF0000]/60 bg-[#1A1111]"
                            : "border-white/5 hover:border-white/15"
                        } ${isSoldOut ? "opacity-50 grayscale" : ""}`}
                      >
                        <div>
                          {/* Dish Artwork */}
                          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#1E1E1E] mb-2.5">
                            <img
                              src={
                                dish.imageUrl.startsWith("http")
                                  ? dish.imageUrl
                                  : `${UPLOADS_BASE}/${dish.imageUrl}`
                              }
                              alt={dish.name}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur font-mono text-[11px] font-bold text-white">
                              ₹{Number(dish.price).toFixed(2)}
                            </div>

                            {/* Auto-86 Stock Badge */}
                            {remaining !== undefined && (
                              <div className="absolute bottom-2 left-2">
                                {isSoldOut ? (
                                  <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-black uppercase">
                                    Sold Out
                                  </span>
                                ) : remaining <= 5 ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black text-[9px] font-black">
                                    {remaining} left
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>

                          <h4 className="font-bold text-xs text-white line-clamp-1">{dish.name}</h4>
                          {dish.description && (
                            <p className="text-[10px] text-[#717171] line-clamp-1 mt-0.5">{dish.description}</p>
                          )}
                        </div>

                        {/* Add / Qty Controls */}
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white">
                            ₹{Number(dish.price).toFixed(2)}
                          </span>

                          {isSoldOut ? (
                            <span className="text-[10px] text-red-400 font-bold">86'd</span>
                          ) : inCart > 0 ? (
                            <div className="flex items-center gap-2 bg-[#FF0000] text-white rounded-full px-2 py-1 shadow-md">
                              <button
                                onClick={() => handleRemoveFromCart(dish.id)}
                                className="active:scale-75 transition cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs font-black min-w-[14px] text-center">{inCart}</span>
                              <button
                                onClick={() => handleAddToCart(dish)}
                                className="active:scale-75 transition cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(dish)}
                              className="h-7 px-3 rounded-full bg-[#212121] hover:bg-white hover:text-black text-white text-xs font-bold flex items-center gap-1 transition active:scale-90 cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 2: ACTIVE KOT PIPELINE ─────────────────────────────── */}
          {/* ────────────────────────────────────────────────────────── */}
          {tableSubTab === "orders" && (
            <div className="space-y-3 pb-24">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#AAAAAA]">
                  {tableDetail.orders.length} Orders for Table #{currentTable.tableNumber}
                </span>
                <button
                  onClick={() => selectedTableNum && fetchTableDetail(selectedTableNum)}
                  className="text-xs text-[#FF4D4D] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {tableDetail.orders.length === 0 ? (
                <div className="text-center py-16 bg-[#121212] rounded-3xl border border-white/5 space-y-2">
                  <ChefHat className="h-10 w-10 text-[#717171] mx-auto" />
                  <p className="text-xs text-[#AAAAAA]">No orders active on this table yet.</p>
                  <button
                    onClick={() => setTableSubTab("menu")}
                    className="px-4 py-2 rounded-full bg-[#FF0000] text-white text-xs font-bold cursor-pointer"
                  >
                    Take First Order
                  </button>
                </div>
              ) : (
                tableDetail.orders.map((order) => {
                  const isReady = order.status === "READY";
                  const isPreparing = order.status === "PREPARING";
                  const isPending = order.status === "PENDING";

                  const step = isPending ? 1 : isPreparing ? 2 : isReady ? 3 : 4;

                  return (
                    <div
                      key={order.id}
                      className={`bg-[#121212] rounded-3xl p-4 border transition ${
                        isReady ? "border-emerald-500/60 bg-emerald-950/10" : "border-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="font-['Outfit'] font-black text-sm text-white">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] text-[#717171]">
                            {new Date(order.orderedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            isPending
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : isPreparing
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              : isReady
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
                              : "bg-[#1F1F1F] text-[#AAAAAA] border-transparent"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      {/* YouTube Music Style Progress Scrubber */}
                      <div className="py-2 space-y-1">
                        <div className="h-1.5 w-full bg-[#212121] rounded-full overflow-hidden flex">
                          <div
                            className={`transition-all duration-500 rounded-full ${
                              isReady ? "bg-emerald-400" : "bg-[#FF0000]"
                            }`}
                            style={{ width: `${step * 25}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-[#717171] font-bold">
                          <span className={step >= 1 ? "text-white" : ""}>Sent</span>
                          <span className={step >= 2 ? "text-white" : ""}>Cooking</span>
                          <span className={step >= 3 ? "text-emerald-400" : ""}>Ready</span>
                          <span className={step >= 4 ? "text-white" : ""}>Served</span>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="divide-y divide-white/5 py-1">
                        {order.orderItems.map((oi) => (
                          <div key={oi.id} className="py-1.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-[#AAAAAA]">
                              <span className="font-['Outfit'] font-black text-white">{oi.quantity}×</span>
                              <span>{oi.menuItem.name}</span>
                            </div>
                            <span className="font-mono text-white font-bold">
                              ₹{Number(oi.subtotal).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Notes & Mark Served Action */}
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[11px] text-[#717171] italic">
                          {order.notes || "No special instructions"}
                        </span>

                        {isReady ? (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, "SERVED")}
                            className="h-8 px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg active:scale-90 transition cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark Served</span>
                          </button>
                        ) : isPreparing ? (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, "READY")}
                            className="h-7 px-3 rounded-full bg-[#212121] text-xs text-[#AAAAAA] hover:text-white cursor-pointer"
                          >
                            Set Ready
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* TAB 3: GUEST BILL & RECEIPT ────────────────────────────── */}
          {/* ────────────────────────────────────────────────────────── */}
          {tableSubTab === "bill" && (
            <div className="space-y-4 pb-24">
              <div className="bg-[#121212] border border-white/5 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <h3 className="font-['Outfit'] font-black text-lg text-white">Guest Check</h3>
                    <span className="text-xs text-[#717171]">
                      Table #{currentTable.tableNumber} • {tableDetail.billPreview?.totalItems || 0} Items
                    </span>
                  </div>
                  <span className="font-mono text-2xl font-black text-[#FF4D4D]">
                    ₹{tableDetail.billPreview?.grandTotal.toFixed(2) || "0.00"}
                  </span>
                </div>

                {/* Aggregated Items */}
                <div className="divide-y divide-white/5 max-h-64 overflow-y-auto no-scrollbar">
                  {tableDetail.billPreview?.aggregatedItems && tableDetail.billPreview.aggregatedItems.length > 0 ? (
                    tableDetail.billPreview.aggregatedItems.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-[#AAAAAA]">
                          <span className="font-['Outfit'] font-black text-white">{item.quantity}×</span>
                          <span>{item.menuItem.name}</span>
                        </div>
                        <span className="font-mono text-white font-bold">₹{item.subtotal.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#717171] py-4 text-center">No billable items on this table.</p>
                  )}
                </div>

                {/* Tax Breakdown */}
                {tableDetail.billPreview && (
                  <div className="bg-[#0A0A0A] rounded-2xl p-4 border border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between text-[#AAAAAA]">
                      <span>Subtotal:</span>
                      <span className="font-mono text-white font-bold">
                        ₹{tableDetail.billPreview.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#AAAAAA]">
                      <span>CGST (2.5%):</span>
                      <span className="font-mono text-white">₹{tableDetail.billPreview.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#AAAAAA]">
                      <span>SGST (2.5%):</span>
                      <span className="font-mono text-white">₹{tableDetail.billPreview.sgst.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-black text-white">
                      <span>Grand Total:</span>
                      <span className="font-mono text-[#FF4D4D]">
                        ₹{tableDetail.billPreview.grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Request Bill Button */}
                <button
                  onClick={() => handleRequestBill(currentTable.tableNumber)}
                  className="w-full py-3.5 rounded-full bg-[#FF0000] hover:bg-[#FF2222] text-white font-['Outfit'] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#FF0000]/30 active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <BellRing className="h-4 w-4" />
                  <span>Request Bill from Cashier</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= YOUTUBE MUSIC SIGNATURE MINI-PLAYER TRAY BAR ================= */}
      {cartItemCount > 0 && viewMode === "table" && tableSubTab === "menu" && (
        <div
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-3 left-3 right-3 max-w-4xl mx-auto z-40 cursor-pointer bg-[#212121]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 flex items-center justify-between shadow-2xl active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-[#FF0000] text-white flex items-center justify-center font-['Outfit'] font-black text-sm shadow-md shrink-0">
              {cartItemCount}
            </div>
            <div className="truncate leading-tight">
              <div className="text-xs font-bold text-white truncate">
                {cartItems[0]?.item.name} {cartItems.length > 1 ? `+${cartItems.length - 1} more` : ""}
              </div>
              <div className="text-[11px] text-[#AAAAAA] mt-0.5">
                {cartItemCount} items in tray • ₹{cartSubtotal.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="h-9 w-9 rounded-full bg-[#FF0000] text-white flex items-center justify-center shadow-md">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}

      {/* ================= ORDER REVIEW & DISPATCH MODAL ================= */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-white/10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-['Outfit'] font-black text-base text-white">
                  Send KOT to Kitchen (Table #{selectedTableNum})
                </h3>
                <span className="text-xs text-[#717171]">{cartItemCount} Items selected</span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="h-8 w-8 rounded-full bg-[#212121] text-[#AAAAAA] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 divide-y divide-white/5">
              {cartItems.map(({ item, quantity }) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-white">{item.name}</h5>
                    <span className="font-mono text-[11px] text-[#AAAAAA]">₹{Number(item.price).toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-2 bg-[#1E1E1E] rounded-full px-2 py-1">
                    <button
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="text-[#AAAAAA] hover:text-white cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-black text-white min-w-[14px] text-center">{quantity}</span>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="text-[#AAAAAA] hover:text-white cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Kitchen Notes */}
              <div className="pt-4 space-y-2">
                <span className="text-xs font-bold text-white block">Cooking Instructions</span>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, serve fast, no garlic"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-[#717171] focus:outline-none focus:border-white/30"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_NOTES.map((qn) => (
                    <button
                      key={qn}
                      type="button"
                      onClick={() => setOrderNotes((prev) => (prev ? `${prev}, ${qn}` : qn))}
                      className="px-2.5 py-1 rounded-full bg-[#212121] text-[10px] font-semibold text-[#AAAAAA] hover:text-white border border-white/5 cursor-pointer"
                    >
                      + {qn}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0A0A0A] flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-[#717171] uppercase font-bold block">Total</span>
                <span className="font-mono text-lg font-black text-[#FF4D4D]">₹{cartSubtotal.toFixed(2)}</span>
              </div>

              <button
                disabled={submittingOrder}
                onClick={handleSubmitOrder}
                className="flex-1 py-3 rounded-full bg-[#FF0000] hover:bg-[#FF2222] text-white font-['Outfit'] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#FF0000]/30 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submittingOrder ? "Dispatching..." : "Send to Kitchen"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
