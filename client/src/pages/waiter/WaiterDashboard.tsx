import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  UtensilsCrossed,
  Layers,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  ChefHat,
  BellRing,
  ArrowRight,
  X,
  ReceiptIndianRupee,
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

const STATUS_CONFIG = {
  AVAILABLE: {
    label: "Available",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    cardBg: "hover:border-emerald-500/40",
    activeBtn: "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border-emerald-500",
  },
  OCCUPIED: {
    label: "Occupied",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    dot: "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]",
    cardBg: "hover:border-blue-500/40",
    activeBtn: "bg-blue-600 text-white shadow-lg shadow-blue-600/30 border-blue-500",
  },
  BILLING: {
    label: "Billing",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse",
    cardBg: "hover:border-amber-500/40",
    activeBtn: "bg-amber-600 text-white shadow-lg shadow-amber-600/30 border-amber-500",
  },
  CLEANING: {
    label: "Cleaning",
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    dot: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]",
    cardBg: "hover:border-purple-500/40",
    activeBtn: "bg-purple-600 text-white shadow-lg shadow-purple-600/30 border-purple-500",
  },
};

const QUICK_NOTES = ["Less Spicy", "No Onion/Garlic", "Extra Spicy", "Serve Fast", "Dressing on Side"];

export default function WaiterDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tableParam = searchParams.get("table");

  // State
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTableNum, setSelectedTableNum] = useState<number | null>(tableParam ? Number(tableParam) : null);
  const [activeTab, setActiveTab] = useState<"menu" | "orders" | "bill">("menu");
  const [floorFilter, setFloorFilter] = useState<string>("ALL");
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
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

  // Sound Chime for Ready / Billing
  const playAlertSound = (type: "ready" | "chime") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(type === "ready" ? 784 : 587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(type === "ready" ? 1046.5 : 880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // 1. Initial Load: Fetch Floor Tables & Menu Catalog
  useEffect(() => {
    fetchTables();
    fetchMenu();

    // Socket.IO Setup
    socket.emit("join:staff", "waiter");

    const handleTableUpdate = (updatedTable: any) => {
      setTables((prev) =>
        prev.map((tbl) => (tbl.tableNumber === updatedTable.tableNumber ? { ...tbl, ...updatedTable } : tbl))
      );
      if (selectedTableNum && updatedTable.tableNumber === selectedTableNum) {
        fetchTableDetail(selectedTableNum, false);
      }
    };

    const handleNewOrder = (order: any) => {
      fetchTables();
      const num = order.diningSession?.table?.tableNumber;
      if (num && selectedTableNum && num === selectedTableNum) {
        fetchTableDetail(selectedTableNum);
        toast.success(`New order registered for Table #${num}`, { icon: "🔔" });
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
    socket.on("order:status_update", handleOrderStatusUpdate);
    socket.on("order:served", handleOrderStatusUpdate);
    socket.on("inventory:stock_update", handleStockUpdate);

    return () => {
      socket.off("table:update", handleTableUpdate);
      socket.off("order:new", handleNewOrder);
      socket.off("order:status_update", handleOrderStatusUpdate);
      socket.off("order:served", handleOrderStatusUpdate);
      socket.off("inventory:stock_update", handleStockUpdate);
    };
  }, [selectedTableNum]);

  // Sync selected table with URL or initial table list
  useEffect(() => {
    if (tableParam) {
      const num = Number(tableParam);
      if (!isNaN(num)) {
        setSelectedTableNum(num);
      }
    } else if (tables.length > 0 && selectedTableNum === null) {
      setSelectedTableNum(tables[0].tableNumber);
      setSearchParams({ table: String(tables[0].tableNumber) });
    }
  }, [tableParam, tables]);

  // When selected table changes, fetch its detail
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

  const handleSelectTable = (tableNum: number) => {
    setSelectedTableNum(tableNum);
    setSearchParams({ table: String(tableNum) });
    setIsFloorModalOpen(false);
    setCart({});
    setOrderNotes("");
  };

  // Table Status Management
  const handleUpdateStatus = async (newStatus: "AVAILABLE" | "OCCUPIED" | "BILLING" | "CLEANING") => {
    if (!selectedTableNum) return;
    setStatusUpdating(true);
    try {
      await axios.patch(`${API_BASE}/table/${selectedTableNum}/status`, { status: newStatus });
      toast.success(`Table #${selectedTableNum} status set to ${newStatus}`, { icon: "✅" });
      setTableDetail((prev) => ({
        ...prev,
        table: prev.table ? { ...prev.table, status: newStatus } : null,
      }));
      setTables((prev) =>
        prev.map((t) => (t.tableNumber === selectedTableNum ? { ...t, status: newStatus } : t))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  // Request Bill
  const handleRequestBill = async () => {
    if (!selectedTableNum) return;
    try {
      await axios.post(`${API_BASE}/table/${selectedTableNum}/request-bill`);
      toast.success(`Bill requested for Table #${selectedTableNum}! Cashier alerted.`, {
        icon: "🧾",
        duration: 4000,
      });
      handleUpdateStatus("BILLING");
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
      toast.success(`Order status updated to ${newStatus}`);
      if (selectedTableNum) {
        fetchTableDetail(selectedTableNum, false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update order status");
    }
  };

  // Cart / Waiter Order Tray actions
  const handleAddToCart = (item: MenuItem) => {
    if (!item.isAvailable) {
      toast.error(`${item.name} is currently unavailable.`);
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

  // Submit Waiter Order
  const handleSubmitOrder = async () => {
    if (!selectedTableNum) {
      toast.error("Please select a table first.");
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
      toast.success(`Order sent to kitchen! (KOT #${res.data.order?.orderNumber})`, {
        icon: "👨‍🍳",
        duration: 4000,
      });

      // Clear cart
      setCart({});
      setOrderNotes("");
      setIsCartOpen(false);

      // Refresh table details and switch to Active Orders tab
      fetchTableDetail(selectedTableNum, false);
      fetchTables();
      setActiveTab("orders");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to place order.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Filtered Menu Items
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

  const currentTable = tableDetail.table || tables.find((t) => t.tableNumber === selectedTableNum) || null;
  const currentStatusConfig = currentTable ? STATUS_CONFIG[currentTable.status] : STATUS_CONFIG.AVAILABLE;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      <SwipeableToaster />

      {/* ── TOP APP BAR ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Mode */}
          <div className="flex items-center gap-2.5">
            <BrandCrest className="w-8 h-8 rounded-lg shadow-md border border-amber-500/30" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide text-white uppercase">Waiter Terminal</span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Mobile POS & Table Dispatcher</p>
            </div>
          </div>

          {/* Quick Table Switcher & Floor Map Trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFloorModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition active:scale-95"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Floor Map</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {tables.length}
              </span>
            </button>

            <button
              onClick={() => {
                fetchTables();
                if (selectedTableNum) fetchTableDetail(selectedTableNum);
                toast.success("Refreshed floor state");
              }}
              title="Refresh Data"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95 border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Quick Table Scrollbar */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {loadingTables ? (
            <div className="text-xs text-slate-500 py-1">Loading restaurant tables...</div>
          ) : (
            tables.map((t) => {
              const isSelected = t.tableNumber === selectedTableNum;
              const cfg = STATUS_CONFIG[t.status];
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTable(t.tableNumber)}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/50 scale-105"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span>T#{t.tableNumber}</span>
                  {t.hasReadyOrder && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="Order Ready to Serve!" />
                  )}
                  {t.activeSession && (
                    <span
                      className={`text-[10px] px-1 rounded ${
                        isSelected ? "bg-slate-950/20 text-slate-900 font-extrabold" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {t.activeSession.ordersCount} KOT
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </header>

      {/* ── SELECTED TABLE HERO CONTROL PANEL ──────────────── */}
      <section className="bg-slate-900 border-b border-slate-800/90 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          {currentTable ? (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Table Identity & Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex flex-col items-center justify-center text-amber-400 shadow-inner">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">TABLE</span>
                  <span className="text-xl font-black text-white">#{currentTable.tableNumber}</span>
                </div>

                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-white tracking-tight">Table #{currentTable.tableNumber}</h2>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${currentStatusConfig.badge}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${currentStatusConfig.dot}`} />
                      {currentStatusConfig.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    <span>Capacity: {currentTable.capacity} Seats</span>
                    <span>•</span>
                    <span>
                      Orders: <strong className="text-slate-200">{tableDetail.orders.length}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Current Bill:{" "}
                      <strong className="text-amber-400 font-semibold">
                        ₹{tableDetail.billPreview?.grandTotal.toFixed(2) || "0.00"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Switcher & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 4 Status Buttons */}
                <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                  {(["AVAILABLE", "OCCUPIED", "BILLING", "CLEANING"] as const).map((st) => {
                    const active = currentTable.status === st;
                    const cfg = STATUS_CONFIG[st];
                    return (
                      <button
                        key={st}
                        disabled={statusUpdating}
                        onClick={() => handleUpdateStatus(st)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          active
                            ? cfg.activeBtn
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>

                {/* Request Bill to Cashier */}
                <button
                  onClick={handleRequestBill}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition active:scale-95 shadow-sm"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Request Bill</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <p className="text-sm">No table selected. Pick a table above to start taking orders.</p>
            </div>
          )}

          {/* Nav Tabs: [ Take Order ] [ Active Orders (N) ] [ Bill & Receipt ] */}
          <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={() => setActiveTab("menu")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === "menu"
                  ? "bg-slate-800 text-amber-400 border border-slate-700 shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Take Order (POS)</span>
              {cartItemCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                  {cartItemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === "orders"
                  ? "bg-slate-800 text-amber-400 border border-slate-700 shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Active Orders</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold">
                {tableDetail.orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("bill")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === "bill"
                  ? "bg-slate-800 text-amber-400 border border-slate-700 shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <ReceiptIndianRupee className="w-3.5 h-3.5" />
              <span>Bill & Summary</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── TAB CONTENT ────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 pb-28">
        {/* ── TAB 1: TAKE ORDER (POS MENU) ────────────────────── */}
        {activeTab === "menu" && (
          <div className="space-y-4">
            {/* Search & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search dishes, drinks, starters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Veg Only Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVegOnlyFilter((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                    vegOnlyFilter
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-emerald-400 flex items-center justify-center p-0.5">
                    <span className="w-full h-full rounded-full bg-emerald-400" />
                  </span>
                  <span>Veg Only</span>
                </button>
              </div>
            </div>

            {/* Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedCategory === "ALL"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedCategory === cat.id
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {cat.name} ({cat.menuItems.length})
                </button>
              ))}
            </div>

            {/* Dish Grid */}
            {filteredDishes.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800/80">
                <UtensilsCrossed className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No dishes match your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredDishes.map((dish) => {
                  const inCartQty = cart[dish.id]?.quantity || 0;
                  const remaining = dish.inventory?.remainingQty;
                  const isSoldOut = !dish.isAvailable || remaining === 0;

                  return (
                    <div
                      key={dish.id}
                      className={`relative bg-slate-900 rounded-xl p-3 border transition-all flex flex-col justify-between ${
                        inCartQty > 0
                          ? "border-amber-500/60 shadow-lg shadow-amber-500/10 bg-slate-900/90 ring-1 ring-amber-500/30"
                          : "border-slate-800/80 hover:border-slate-700"
                      } ${isSoldOut ? "opacity-60 grayscale-[40%]" : ""}`}
                    >
                      <div>
                        {/* Image & Price Tag */}
                        <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-950 mb-2.5 border border-slate-800">
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
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur text-xs font-extrabold text-amber-400 border border-slate-800">
                            ₹{Number(dish.price).toFixed(2)}
                          </div>

                          {/* Inventory / Auto-86 Badge */}
                          {remaining !== undefined && (
                            <div className="absolute bottom-2 left-2">
                              {isSoldOut ? (
                                <span className="px-2 py-0.5 rounded bg-red-500/80 text-white text-[10px] font-bold">
                                  Sold Out (86)
                                </span>
                              ) : remaining <= 5 ? (
                                <span className="px-2 py-0.5 rounded bg-orange-500/80 text-white text-[10px] font-bold">
                                  {remaining} left
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <h4 className="font-bold text-sm text-white line-clamp-1">{dish.name}</h4>
                        {dish.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{dish.description}</p>
                        )}
                      </div>

                      {/* Add to Tray Action */}
                      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400">
                          ₹{Number(dish.price).toFixed(2)}
                        </span>

                        {isSoldOut ? (
                          <span className="text-[11px] text-red-400 font-semibold">Unavailable</span>
                        ) : inCartQty > 0 ? (
                          <div className="flex items-center gap-2 bg-amber-500 text-slate-950 rounded-lg px-2 py-1 shadow">
                            <button
                              onClick={() => handleRemoveFromCart(dish.id)}
                              className="hover:scale-110 active:scale-95 transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-black min-w-[16px] text-center">{inCartQty}</span>
                            <button
                              onClick={() => handleAddToCart(dish)}
                              className="hover:scale-110 active:scale-95 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(dish)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold border border-slate-700 transition active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
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

        {/* ── TAB 2: ACTIVE ORDERS ────────────────────────────── */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Live Kitchen Orders</h3>
                <p className="text-xs text-slate-400">Active dining session orders for Table #{selectedTableNum}</p>
              </div>
              <button
                onClick={() => selectedTableNum && fetchTableDetail(selectedTableNum)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh KOTs</span>
              </button>
            </div>

            {tableDetail.orders.length === 0 ? (
              <div className="text-center py-14 bg-slate-900/50 rounded-2xl border border-slate-800">
                <ChefHat className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-300">No Orders Placed Yet</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Use the "Take Order" tab to punch items for this table.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tableDetail.orders.map((order) => {
                  const isReady = order.status === "READY";
                  const isPreparing = order.status === "PREPARING";
                  const isPending = order.status === "PENDING";
                  const isServed = order.status === "SERVED";

                  return (
                    <div
                      key={order.id}
                      className={`bg-slate-900 rounded-xl p-4 border transition-all ${
                        isReady
                          ? "border-emerald-500/60 bg-emerald-950/10 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                          : "border-slate-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-sm text-white tracking-wide">
                            {order.orderNumber}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(order.orderedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {order.notes && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                              {order.notes}
                            </span>
                          )}
                        </div>

                        {/* Status Pipeline & Action */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                              isPending
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : isPreparing
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                : isReady
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
                                : isServed
                                ? "bg-slate-800 text-slate-300 border-slate-700"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                            }`}
                          >
                            {order.status}
                          </span>

                          {/* Action Button: Mark as Served */}
                          {isReady && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, "SERVED")}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark as Served</span>
                            </button>
                          )}

                          {isPreparing && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, "READY")}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700"
                            >
                              <span>Set Ready</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="divide-y divide-slate-800/60 mt-2">
                        {order.orderItems.map((oi) => (
                          <div key={oi.id} className="py-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[11px]">
                                {oi.quantity}x
                              </span>
                              <span className="font-semibold text-slate-200">{oi.menuItem.name}</span>
                            </div>
                            <span className="font-medium text-slate-400">
                              ₹{Number(oi.subtotal).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: BILL & SUMMARY ──────────────────────────── */}
        {activeTab === "bill" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white">Guest Bill Breakdown</h3>
                  <p className="text-xs text-slate-400">
                    Table #{selectedTableNum} • {tableDetail.billPreview?.totalItems || 0} Total Items
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold block">Total</span>
                  <span className="text-2xl font-black text-amber-400">
                    ₹{tableDetail.billPreview?.grandTotal.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>

              {/* Aggregated Item List */}
              <div className="divide-y divide-slate-800/80 my-4">
                {tableDetail.billPreview?.aggregatedItems && tableDetail.billPreview.aggregatedItems.length > 0 ? (
                  tableDetail.billPreview.aggregatedItems.map((agg, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded bg-slate-800 text-amber-400 font-bold flex items-center justify-center">
                          {agg.quantity}x
                        </span>
                        <div>
                          <span className="font-bold text-slate-200">{agg.menuItem.name}</span>
                          <span className="block text-[10px] text-slate-500">
                            ₹{Number(agg.menuItem.price).toFixed(2)} each
                          </span>
                        </div>
                      </div>
                      <span className="font-semibold text-slate-200">
                        ₹{agg.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No billable items on this table.</p>
                )}
              </div>

              {/* Tax & Total Summary */}
              {tableDetail.billPreview && (
                <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-200">₹{tableDetail.billPreview.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>CGST (2.5%):</span>
                    <span className="font-semibold text-slate-200">₹{tableDetail.billPreview.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>SGST (2.5%):</span>
                    <span className="font-semibold text-slate-200">₹{tableDetail.billPreview.sgst.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                    <span>Net Grand Total:</span>
                    <span className="text-amber-400">₹{tableDetail.billPreview.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleRequestBill}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 active:scale-98"
                >
                  <BellRing className="w-4 h-4" />
                  <span>Request Bill from Cashier</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FLOATING TRAY BAR (WHEN ITEMS IN CART) ─────────── */}
      {cartItemCount > 0 && activeTab === "menu" && (
        <aside className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-3 shadow-2xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow">
                {cartItemCount}
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Order Tray</span>
                <span className="text-base font-black text-white">₹{cartSubtotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/25 active:scale-95"
            >
              <span>Review & Dispatch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* ── REVIEW & SEND ORDER MODAL / DRAWER ──────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Review KOT Order</h3>
                <p className="text-xs text-slate-400">Dispatching to Kitchen for Table #{selectedTableNum}</p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-5 overflow-y-auto flex-1 divide-y divide-slate-800">
              {cartItems.map(({ item, quantity }) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-slate-100">{item.name}</h5>
                    <span className="text-xs text-amber-400">₹{Number(item.price).toFixed(2)} each</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                      <button
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white min-w-[16px] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-xs font-bold text-white min-w-[60px] text-right">
                      ₹{(Number(item.price) * quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Cooking Notes / Special Instructions */}
              <div className="pt-4 mt-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Kitchen Notes & Special Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g., Less salt, serve appetizer first, extra cutlery"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />

                {/* Quick Note Pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_NOTES.map((qn) => (
                    <button
                      key={qn}
                      type="button"
                      onClick={() => setOrderNotes((prev) => (prev ? `${prev}, ${qn}` : qn))}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition"
                    >
                      + {qn}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Order</span>
                <span className="text-lg font-black text-amber-400">₹{cartSubtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={submittingOrder}
                  onClick={handleSubmitOrder}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingOrder ? "Dispatching..." : "Send to Kitchen"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOOR MAP MODAL (ALL TABLES) ───────────────────── */}
      {isFloorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Floor Overview</h3>
                <p className="text-xs text-slate-400">Select any table to view or punch orders</p>
              </div>
              <button
                onClick={() => setIsFloorModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="px-5 py-3 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {["ALL", "OCCUPIED", "BILLING", "AVAILABLE", "CLEANING"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFloorFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    floorFilter === f
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {f === "ALL" ? "All Tables" : f}
                </button>
              ))}
            </div>

            {/* Tables Grid */}
            <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1">
              {filteredTables.map((tbl) => {
                const isSelected = tbl.tableNumber === selectedTableNum;
                const cfg = STATUS_CONFIG[tbl.status];
                return (
                  <button
                    key={tbl.id}
                    onClick={() => handleSelectTable(tbl.tableNumber)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? "bg-slate-800 border-amber-500 ring-2 ring-amber-500/30 scale-102"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-black text-white">#{tbl.tableNumber}</span>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    </div>

                    <div className="space-y-1">
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                      <div className="text-[11px] text-slate-400">
                        {tbl.activeSession ? (
                          <span>₹{tbl.activeSession.totalAmount.toFixed(2)}</span>
                        ) : (
                          <span>{tbl.capacity} seats</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
