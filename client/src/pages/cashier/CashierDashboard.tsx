import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  UtensilsCrossed,
  Receipt,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  Printer,
  X,
  CreditCard,
  QrCode,
  Banknote,
  RefreshCw,
  TrendingUp,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { socket } from "../../lib/socket";
import SwipeableToaster from "@/components/SwipeableToaster";

const BACKEND_HOST =
  typeof window !== "undefined" && window.location.hostname
    ? window.location.hostname
    : "localhost";
const API_BASE = `http://${BACKEND_HOST}:5000/api/cashier`;
const MENU_API = `http://${BACKEND_HOST}:5000/api/menu`;
const UPLOADS_BASE = `http://${BACKEND_HOST}:5000`;

interface OrderItemDetail {
  id: number;
  menuItemId: number;
  quantity: number;
  price: string | number;
  subtotal: string | number;
  menuItem: {
    name: string;
    imageUrl?: string;
  };
}

interface OrderDetail {
  id: number;
  orderNumber: string;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
  notes?: string | null;
  orderedAt: string;
  orderItems: OrderItemDetail[];
}

interface TableSession {
  id: number;
  sessionCode: string;
  startTime: string;
  guestCount?: number;
  ordersCount: number;
  totalItems: number;
  totalAmount: number;
  orders: OrderDetail[];
}

interface FloorTable {
  id: number;
  tableNumber: number;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "BILLING" | "CLEANING";
  qrCodeToken: string;
  hasPendingAccess: boolean;
  pendingAccessInfo?: {
    tableNumber: number;
    requestedAt: string;
    guestCount?: number;
  } | null;
  activeSession: TableSession | null;
}

interface PendingAccessItem {
  tableNumber: number;
  requestedAt: string;
  guestCount?: number;
  capacity?: number;
}

interface ShiftStats {
  totalRevenue: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  settledBillsCount: number;
  activeTablesCount: number;
  billingTablesCount: number;
  pendingAccessCount: number;
}

interface SettledBill {
  id: number;
  invoiceNumber: string;
  sessionCode: string;
  tableNumber: number | string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  itemsCount: number;
  payments: Array<{ method: "CASH" | "CARD" | "UPI"; amount: number }>;
  items: Array<{ name: string; quantity: number; price: number; subtotal: number }>;
}

interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: string | number;
  imageUrl: string;
  isAvailable: boolean;
}

interface Category {
  id: number;
  name: string;
  menuItems: MenuItem[];
}

export default function CashierDashboard() {
  // User auth details
  const user = useMemo(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, []);

  // Main UI Tab (driven by URL search params ?tab=...)
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: "floor" | "takeaway" | "history" | "stats" =
    rawTab === "takeaway" || rawTab === "history" || rawTab === "stats" ? rawTab : "floor";

  // Floor & Table states
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingAccessItem[]>([]);
  const [stats, setStats] = useState<ShiftStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Bill Settlement Modal State
  const [settlementTable, setSettlementTable] = useState<FloorTable | null>(null);
  const [billDetails, setBillDetails] = useState<any | null>(null);
  const [isLoadingBill, setIsLoadingBill] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"SINGLE" | "SPLIT">("SINGLE");
  const [singleMethod, setSingleMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [splitCash, setSplitCash] = useState<string>("");
  const [splitUpi, setSplitUpi] = useState<string>("");
  const [splitCard, setSplitCard] = useState<string>("");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [isSettling, setIsSettling] = useState(false);

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  // History Tab state
  const [history, setHistory] = useState<SettledBill[]>([]);
  const [historySearch, setHistorySearch] = useState("");

  // Takeaway POS state
  const [categories, setCategories] = useState<Category[]>([]);
  const [takeawayCart, setTakeawayCart] = useState<Array<{ item: MenuItem; quantity: number }>>([]);
  const [takeawayCustomerName, setTakeawayCustomerName] = useState("");
  const [takeawayPaymentMethod, setTakeawayPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("UPI");
  const [takeawayActiveCat, setTakeawayActiveCat] = useState<number | "ALL">("ALL");
  const [takeawaySearch, setTakeawaySearch] = useState("");
  const [isSubmittingTakeaway, setIsSubmittingTakeaway] = useState(false);

  // Live digital clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Axios Authorization header config
  const authConfig = useMemo(() => {
    const token = localStorage.getItem("token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }, []);

  // Load all floor tables and pending requests
  const loadFloorData = async () => {
    try {
      const [tablesRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/tables`, authConfig),
        axios.get(`${API_BASE}/stats`, authConfig).catch(() => ({ data: null })),
      ]);

      setTables(tablesRes.data.tables || []);
      setPendingRequests(tablesRes.data.pendingRequests || []);
      if (statsRes?.data) setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load cashier floor data:", err);
      toast.error("Failed to sync floor tables.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load menu items for Takeaway POS
  const loadMenuData = async () => {
    try {
      const res = await axios.get(MENU_API);
      setCategories(res.data || []);
    } catch (err) {
      console.error("Failed to load menu for takeaway:", err);
    }
  };

  // Load closed bills history
  const loadHistoryData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/history`, authConfig);
      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to load bill history:", err);
    }
  };

  useEffect(() => {
    loadFloorData();
    loadMenuData();
  }, [authConfig]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistoryData();
    } else if (activeTab === "floor") {
      loadFloorData();
    }
  }, [activeTab]);

  // Real-time Socket.IO synchronization
  useEffect(() => {
    socket.emit("join:staff", "cashier");

    // Live access request when guest scans QR
    const handleAccessRequest = (data: PendingAccessItem) => {
      toast(
        () => (
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-white">QR Access Requested</span>
            <span className="text-xs text-[#AAAAAA]">
              Table #{data.tableNumber} is waiting for authorization.
            </span>
          </div>
        ),
        { duration: 6000 }
      );
      loadFloorData();
    };

    // Live table state changes (orders placed, bill requested, etc.)
    const handleTableUpdate = () => {
      loadFloorData();
    };

    // Customer pressed "Request Bill"
    const handleServiceAlert = (data: any) => {
      if (data.type === "REQUEST_BILL") {
        toast.success(`Table #${data.tableNumber} has requested the bill!`, {
          duration: 5000,
        });
        loadFloorData();
      }
    };

    // Live order placed
    const handleOrderPlaced = () => {
      loadFloorData();
    };

    socket.on("cashier:access_request", handleAccessRequest);
    socket.on("table:update", handleTableUpdate);
    socket.on("service:alert", handleServiceAlert);
    socket.on("order:placed", handleOrderPlaced);
    socket.on("order:status_update", handleTableUpdate);

    return () => {
      socket.off("cashier:access_request", handleAccessRequest);
      socket.off("table:update", handleTableUpdate);
      socket.off("service:alert", handleServiceAlert);
      socket.off("order:placed", handleOrderPlaced);
      socket.off("order:status_update", handleTableUpdate);
    };
  }, []);

  // Quick Table Status Changer
  const handleUpdateTableStatus = async (
    tableNumber: number,
    newStatus: "AVAILABLE" | "OCCUPIED" | "BILLING" | "CLEANING"
  ) => {
    try {
      await axios.patch(
        `${API_BASE}/table/${tableNumber}/status`,
        { status: newStatus },
        authConfig
      );
      toast.success(`Table #${tableNumber} set to ${newStatus}`);
      loadFloorData();
    } catch (err) {
      toast.error("Failed to update table status");
    }
  };

  // QR Scan Authorization: Approve
  const handleApproveAccess = async (tableNumber: number) => {
    try {
      await axios.post(`${API_BASE}/table/${tableNumber}/approve-access`, {}, authConfig);
      toast.success(`Access approved for Table #${tableNumber}`);
      loadFloorData();
    } catch (err) {
      toast.error("Failed to approve access");
    }
  };

  // QR Scan Authorization: Decline
  const handleDeclineAccess = async (tableNumber: number) => {
    try {
      await axios.post(`${API_BASE}/table/${tableNumber}/decline-access`, {}, authConfig);
      toast.success(`Access declined for Table #${tableNumber}`);
      loadFloorData();
    } catch (err) {
      toast.error("Failed to decline access");
    }
  };

  // Open Bill Settlement Modal
  const openSettlementModal = async (tbl: FloorTable) => {
    if (!tbl.activeSession) {
      toast.error(`Table #${tbl.tableNumber} does not have an active session to bill.`);
      return;
    }

    setSettlementTable(tbl);
    setIsLoadingBill(true);
    setPaymentMode("SINGLE");
    setSingleMethod("CASH");
    setCashTendered("");
    setDiscountAmount("0");

    try {
      const res = await axios.get(
        `${API_BASE}/session/${tbl.activeSession.id}/bill`,
        authConfig
      );
      setBillDetails(res.data);
      // Auto-populate split defaults
      const grand = res.data.grandTotal || 0;
      setSplitCash(String(Math.floor(grand / 2)));
      setSplitUpi(String(Math.ceil(grand / 2)));
      setSplitCard("0");
    } catch (err) {
      toast.error("Failed to fetch itemized bill details.");
      setSettlementTable(null);
    } finally {
      setIsLoadingBill(false);
    }
  };

  // Calculate Net Bill Totals
  const currentNetTotal = useMemo(() => {
    if (!billDetails) return 0;
    const sub = Number(billDetails.subtotal || 0);
    const tax = Number(billDetails.taxAmount || 0);
    const disc = Number(discountAmount) || 0;
    return Math.max(0, Number((sub + tax - disc).toFixed(2)));
  }, [billDetails, discountAmount]);

  // Settle Bill
  const handleExecuteSettlement = async () => {
    if (!settlementTable || !billDetails) return;

    let paymentsPayload: Array<{ method: "CASH" | "CARD" | "UPI"; amount: number }> = [];

    if (paymentMode === "SINGLE") {
      paymentsPayload = [{ method: singleMethod, amount: currentNetTotal }];
    } else {
      const c = Number(splitCash) || 0;
      const u = Number(splitUpi) || 0;
      const cd = Number(splitCard) || 0;
      const sum = c + u + cd;

      if (Math.abs(sum - currentNetTotal) > 0.5) {
        toast.error(
          `Split sum (₹${sum.toFixed(2)}) must equal total bill (₹${currentNetTotal.toFixed(2)}). Difference: ₹${(
            currentNetTotal - sum
          ).toFixed(2)}`
        );
        return;
      }

      if (c > 0) paymentsPayload.push({ method: "CASH", amount: c });
      if (u > 0) paymentsPayload.push({ method: "UPI", amount: u });
      if (cd > 0) paymentsPayload.push({ method: "CARD", amount: cd });
    }

    try {
      setIsSettling(true);
      const res = await axios.post(
        `${API_BASE}/settle`,
        {
          sessionId: billDetails.session.id,
          tableNumber: settlementTable.tableNumber,
          payments: paymentsPayload,
          discount: Number(discountAmount) || 0,
        },
        authConfig
      );

      toast.success("Bill settled successfully!");
      setSettlementTable(null);
      setBillDetails(null);
      loadFloorData();

      // Show receipt modal
      if (res.data.receipt) {
        setActiveReceipt(res.data.receipt);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to settle bill.");
    } finally {
      setIsSettling(false);
    }
  };

  // Takeaway Cart Operations
  const addToTakeawayCart = (dish: MenuItem) => {
    setTakeawayCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === dish.id);
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === dish.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item: dish, quantity: 1 }];
    });
  };

  const updateTakeawayQty = (dishId: number, delta: number) => {
    setTakeawayCart((prev) =>
      prev
        .map((ci) => (ci.item.id === dishId ? { ...ci, quantity: ci.quantity + delta } : ci))
        .filter((ci) => ci.quantity > 0)
    );
  };

  const takeawaySubtotal = useMemo(() => {
    return takeawayCart.reduce((sum, ci) => sum + Number(ci.item.price) * ci.quantity, 0);
  }, [takeawayCart]);

  const takeawayTax = useMemo(() => Number((takeawaySubtotal * 0.05).toFixed(2)), [takeawaySubtotal]);
  const takeawayGrandTotal = useMemo(() => Number((takeawaySubtotal + takeawayTax).toFixed(2)), [
    takeawaySubtotal,
    takeawayTax,
  ]);

  // Submit Takeaway Order & Bill
  const handleSettleTakeaway = async () => {
    if (takeawayCart.length === 0) {
      toast.error("Please add at least one item.");
      return;
    }

    try {
      setIsSubmittingTakeaway(true);
      const res = await axios.post(
        `${API_BASE}/takeaway`,
        {
          customerName: takeawayCustomerName.trim() || "Walk-in Guest",
          items: takeawayCart.map((ci) => ({
            menuItemId: ci.item.id,
            quantity: ci.quantity,
          })),
          payments: [{ method: takeawayPaymentMethod, amount: takeawayGrandTotal }],
        },
        authConfig
      );

      toast.success("Takeaway bill paid & sent to kitchen!");
      setTakeawayCart([]);
      setTakeawayCustomerName("");
      loadFloorData();

      if (res.data.receipt) {
        setActiveReceipt(res.data.receipt);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to process takeaway order.");
    } finally {
      setIsSubmittingTakeaway(false);
    }
  };

  // Filtered menu for takeaway
  const filteredTakeawayDishes = useMemo(() => {
    const q = takeawaySearch.toLowerCase().trim();
    let dishes = categories.flatMap((c) =>
      takeawayActiveCat === "ALL" || c.id === takeawayActiveCat ? c.menuItems : []
    );
    if (q) {
      dishes = dishes.filter((d) => d.name.toLowerCase().includes(q));
    }
    return dishes;
  }, [categories, takeawayActiveCat, takeawaySearch]);

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in duration-300">
      <SwipeableToaster />

      {/* Header Bar - Apple Music Editorial Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent border border-white/[0.09] p-6 sm:p-7 backdrop-blur-2xl shadow-2xl">
        {/* Ambient Bloom Halos */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#FA2D48]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.1] px-3 py-1 text-[11px] font-semibold text-neutral-300 backdrop-blur-md">
              <Receipt className="h-3.5 w-3.5 text-[#FA2D48]" />
              <span className="tracking-widest uppercase text-[10px] font-bold text-white/90">
                Point of Sale & Billing Terminal
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
              Cashier POS & Floor Checkout
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl font-normal leading-relaxed">
              Real-time table settlement, split payments (Cash / UPI / Card), floor status control, and walk-in takeaway counter.
            </p>
          </div>

          {/* Action Pills */}
          <div className="relative z-10 flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.08] border border-white/[0.12] text-neutral-300 backdrop-blur-xl shadow-sm">
              <Clock className="h-3.5 w-3.5 text-neutral-400" />
              <span>{currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>

            <button
              onClick={loadFloorData}
              className="flex items-center gap-2 rounded-full px-4.5 py-2 text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-neutral-200 hover:text-white border border-white/[0.12] backdrop-blur-xl shadow-sm transition-all active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5 text-neutral-400" />
              <span>Refresh Floor</span>
            </button>
          </div>
        </div>
      </div>


        {/* ================= PENDING QR SCAN ACCESS REQUESTS BANNER ================= */}
        {pendingRequests.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#18181B] to-transparent border border-amber-500/30 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-['Outfit'] text-sm font-bold">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
                <span>Customer QR Scan Access Requests ({pendingRequests.length})</span>
              </div>
              <span className="text-[11px] text-amber-300/80">Authorize guest tables to start ordering</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.tableNumber}
                  className="p-3 rounded-xl bg-[#141416] border border-amber-500/30 flex items-center justify-between gap-3 shadow-md"
                >
                  <div>
                    <span className="font-['Outfit'] text-base font-black text-white block leading-none">
                      Table #{req.tableNumber < 10 ? `0${req.tableNumber}` : req.tableNumber}
                    </span>
                    <span className="text-[11px] text-[#888888] mt-1 block">
                      {new Date(req.requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeclineAccess(req.tableNumber)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[#888888] hover:text-rose-400 text-xs font-bold transition-all"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleApproveAccess(req.tableNumber)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 1: FLOOR & LIVE BILLS ================= */}
        {activeTab === "floor" && (
          <div className="space-y-6">
            {/* Quick Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-[#161619]/90 border border-white/[0.08] backdrop-blur-xl flex items-center gap-3.5 shadow-xl">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider block">
                    Occupied Tables
                  </span>
                  <span className="font-['Outfit'] text-lg font-black text-white">
                    {tables.filter((t) => t.status === "OCCUPIED" || t.status === "BILLING").length} / {tables.length}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#161619]/90 border border-white/[0.08] backdrop-blur-xl flex items-center gap-3.5 shadow-xl">
                <div className="h-10 w-10 rounded-xl bg-[#FA2D48]/15 border border-[#FA2D48]/25 flex items-center justify-center text-[#FA2D48] shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider block">
                    Bill Requested
                  </span>
                  <span className="font-['Outfit'] text-lg font-black text-[#FA2D48]">
                    {tables.filter((t) => t.status === "BILLING").length}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#161619]/90 border border-white/[0.08] backdrop-blur-xl flex items-center gap-3.5 shadow-xl">
                <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider block">
                    Today's Invoices
                  </span>
                  <span className="font-['Outfit'] text-lg font-black text-white">
                    {stats?.settledBillsCount || 0}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#161619]/90 border border-white/[0.08] backdrop-blur-xl flex items-center gap-3.5 shadow-xl">
                <div className="h-10 w-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider block">
                    Shift Sales
                  </span>
                  <span className="font-['Outfit'] text-lg font-black text-white">
                    ₹{stats?.totalRevenue ? stats.totalRevenue.toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>
            </div>

            {/* Floor Tables Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-['Outfit'] text-base font-black text-white tracking-tight flex items-center gap-2">
                  <span>Dining Room Tables</span>
                  <span className="text-xs text-[#888888] font-normal">
                    (Click a table to manage status or settle bill)
                  </span>
                </h2>

                <button
                  onClick={loadFloorData}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#888] hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
                  title="Refresh floor"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {isLoading && tables.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-center text-[#888888]">
                  <RefreshCw className="h-5 w-5 animate-spin text-white" />
                  <span className="text-xs">Loading restaurant tables...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tables.map((tbl) => {
                    const isBilling = tbl.status === "BILLING";
                    const isOccupied = tbl.status === "OCCUPIED";
                    const isCleaning = tbl.status === "CLEANING";

                  let cardBorder = "border-white/[0.08]";
                  let statusBadgeBg = "bg-white/5 text-[#888888] border-white/10";
                  let statusLabel = "Available";

                  if (isBilling) {
                    cardBorder = "border-[#FA2D48] shadow-xl shadow-[#FA2D48]/15 ring-1 ring-[#FA2D48]/40";
                    statusBadgeBg = "bg-[#FA2D48]/20 text-[#FA2D48] border-[#FA2D48]/50 animate-pulse";
                    statusLabel = "Bill Requested";
                  } else if (isOccupied) {
                    cardBorder = "border-amber-500/30";
                    statusBadgeBg = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                    statusLabel = "Dining Active";
                  } else if (isCleaning) {
                    cardBorder = "border-sky-500/30";
                    statusBadgeBg = "bg-sky-500/15 text-sky-300 border-sky-500/30";
                    statusLabel = "Needs Cleaning";
                  } else {
                    cardBorder = "border-emerald-500/20";
                    statusBadgeBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    statusLabel = "Available";
                  }

                  return (
                    <div
                      key={tbl.id}
                      className={`p-4 rounded-2xl bg-[#161619]/90 backdrop-blur-xl border ${cardBorder} flex flex-col justify-between transition-all duration-200 hover:border-white/20 shadow-lg`}
                    >
                      {/* Table Header: Table Number & Status Pill */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                        <div>
                          <span className="font-['Outfit'] text-xl font-black text-white tracking-tight leading-none block">
                            Table #{tbl.tableNumber < 10 ? `0${tbl.tableNumber}` : tbl.tableNumber}
                          </span>
                          <span className="text-[11px] text-neutral-400 mt-1 block">
                            Capacity: {tbl.capacity} Guests
                          </span>
                        </div>

                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadgeBg}`}>
                          {statusLabel}
                        </div>
                      </div>

                      {/* Middle Body: Orders & Bill Amount */}
                      <div className="py-3.5 space-y-2">
                        {tbl.activeSession ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-400">Courses Placed:</span>
                              <span className="text-white font-bold">{tbl.activeSession.ordersCount}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-400">Total Items:</span>
                              <span className="text-white font-bold">{tbl.activeSession.totalItems} portions</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                              <span className="text-xs font-bold text-neutral-300">Running Total:</span>
                              <span className="font-['Outfit'] text-base font-black text-white">
                                ₹{tbl.activeSession.totalAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-2 text-center text-xs text-neutral-500">
                            No active dining session
                          </div>
                        )}
                      </div>

                      {/* Bottom Controls: Direct Status Dropdown & Settle Button */}
                      <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                        {/* Status Switcher */}
                        <select
                          value={tbl.status}
                          onChange={(e) =>
                            handleUpdateTableStatus(
                              tbl.tableNumber,
                              e.target.value as FloorTable["status"]
                            )
                          }
                          className="flex-1 bg-[#1c1c20] text-xs font-semibold text-neutral-200 px-2.5 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-white/30 cursor-pointer"
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="OCCUPIED">Occupied</option>
                          <option value="BILLING">Billing</option>
                          <option value="CLEANING">Cleaning</option>
                        </select>

                        {/* Settle Bill Button */}
                        {tbl.activeSession && (
                          <button
                            onClick={() => openSettlementModal(tbl)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer ${
                              isBilling
                                ? "bg-[#FA2D48] text-white hover:bg-[#ff3b56] shadow-lg shadow-[#FA2D48]/30"
                                : "bg-white text-black hover:bg-neutral-200"
                            }`}
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Settle</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: TAKEAWAY POS ================= */}
        {activeTab === "takeaway" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Dish Selector */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={takeawaySearch}
                    onChange={(e) => setTakeawaySearch(e.target.value)}
                    placeholder="Search menu items for takeaway..."
                    className="w-full pl-10 pr-4 py-2 rounded-full bg-white/[0.05] border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FA2D48]/50 backdrop-blur-xl"
                  />
                </div>

                {/* Category Chips - Apple Music Pill Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setTakeawayActiveCat("ALL")}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                      takeawayActiveCat === "ALL"
                        ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
                        : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.08]"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setTakeawayActiveCat(cat.id)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                        takeawayActiveCat === cat.id
                          ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
                          : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.08]"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dishes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[620px] overflow-y-auto scrollbar-none pr-1">
                {filteredTakeawayDishes.map((dish) => {
                  const cartEntry = takeawayCart.find((ci) => ci.item.id === dish.id);
                  return (
                    <div
                      key={dish.id}
                      onClick={() => addToTakeawayCart(dish)}
                      className="p-3 rounded-2xl bg-[#161619]/90 border border-white/[0.08] hover:border-white/20 backdrop-blur-xl transition-all cursor-pointer flex flex-col justify-between group active:scale-98 shadow-md"
                    >
                      <div className="aspect-square w-full rounded-xl bg-black/30 overflow-hidden mb-2 relative">
                        <img
                          src={
                            dish.imageUrl?.startsWith("http")
                              ? dish.imageUrl
                              : `${UPLOADS_BASE}/${dish.imageUrl?.replace(/^\/+/, "")}`
                          }
                          alt={dish.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e: any) => {
                            e.target.src =
                              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80";
                          }}
                        />
                        {cartEntry && (
                          <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-[#FA2D48] text-white text-[11px] font-black flex items-center justify-center shadow-lg shadow-[#FA2D48]/40">
                            {cartEntry.quantity}
                          </div>
                        )}
                      </div>

                      <div className="leading-snug">
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#FA2D48]">
                          {dish.name}
                        </h4>
                        <span className="font-['Outfit'] text-xs font-black text-white mt-1 block">
                          ₹{Number(dish.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Takeaway Order Tray & Quick Checkout */}
            <div className="p-5 rounded-3xl bg-[#161619]/90 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between space-y-4 shadow-xl">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="font-['Outfit'] text-base font-black text-white">Takeaway Order</h3>
                  <button
                    onClick={() => setTakeawayCart([])}
                    className="text-xs text-[#FA2D48] font-bold hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {/* Customer Name */}
                <div className="mt-3">
                  <label className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider block mb-1">
                    Customer Name / Reference
                  </label>
                  <input
                    type="text"
                    value={takeawayCustomerName}
                    onChange={(e) => setTakeawayCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-[#FA2D48]/50"
                  />
                </div>

                {/* Cart Items List */}
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
                  {takeawayCart.length === 0 ? (
                    <div className="text-center py-12 text-xs text-neutral-500">
                      Tray is empty. Tap dishes to add.
                    </div>
                  ) : (
                    takeawayCart.map((ci) => (
                      <div
                        key={ci.item.id}
                        className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-white truncate">{ci.item.name}</h5>
                          <span className="text-[11px] text-neutral-400">
                            ₹{Number(ci.item.price).toFixed(2)} × {ci.quantity}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateTakeawayQty(ci.item.id, -1)}
                            className="h-6 w-6 rounded-md bg-white/[0.08] text-white flex items-center justify-center text-xs active:scale-90"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-white">
                            {ci.quantity}
                          </span>
                          <button
                            onClick={() => updateTakeawayQty(ci.item.id, 1)}
                            className="h-6 w-6 rounded-md bg-[#FA2D48] text-white flex items-center justify-center text-xs active:scale-90 font-bold"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payment Method & Total */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal:</span>
                    <span className="text-white">₹{takeawaySubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>GST (5%):</span>
                    <span className="text-white">₹{takeawayTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-white/10">
                    <span>Grand Total:</span>
                    <span className="font-['Outfit'] text-lg font-black text-white">
                      ₹{takeawayGrandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider block mb-1.5">
                    Payment Method
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["UPI", "CASH", "CARD"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTakeawayPaymentMethod(m)}
                        className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                          takeawayPaymentMethod === m
                            ? "bg-white text-black border-white shadow-md"
                            : "bg-white/[0.04] text-neutral-300 border-white/10 hover:border-white/20"
                        }`}
                      >
                        {m === "UPI" && <QrCode className="h-3.5 w-3.5" />}
                        {m === "CASH" && <Banknote className="h-3.5 w-3.5" />}
                        {m === "CARD" && <CreditCard className="h-3.5 w-3.5" />}
                        <span>{m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Settle & Dispatch */}
                <button
                  disabled={takeawayCart.length === 0 || isSubmittingTakeaway}
                  onClick={handleSettleTakeaway}
                  className="w-full py-3.5 rounded-2xl bg-[#FA2D48] hover:bg-[#ff3b56] disabled:opacity-50 text-white font-['Outfit'] font-black text-sm tracking-wide transition-all active:scale-98 shadow-xl shadow-[#FA2D48]/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingTakeaway ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Collect ₹{takeawayGrandTotal.toFixed(2)} & Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: SETTLED BILLS HISTORY ================= */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-['Outfit'] text-lg font-black text-white">
                  Today's Settled Bills ({history.length})
                </h3>
                <span className="text-xs text-[#888888]">
                  Closed transactions eligible for reprint and inspection
                </span>
              </div>

              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#888888]" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Filter by table or invoice..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#111114] border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.03] text-[#888888] uppercase font-bold border-b border-white/[0.06]">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Table / Type</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Payment Methods</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {history
                      .filter(
                        (h) =>
                          h.invoiceNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
                          String(h.tableNumber).toLowerCase().includes(historySearch.toLowerCase())
                      )
                      .map((bill) => (
                        <tr key={bill.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            {bill.invoiceNumber}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {bill.tableNumber === "Takeaway"
                              ? "Takeaway"
                              : `Table #${bill.tableNumber}`}
                          </td>
                          <td className="py-3.5 px-4 text-[#AAAAAA]">
                            {new Date(bill.endTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-[#AAAAAA]">
                            {bill.itemsCount} portions
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {bill.payments.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white"
                                >
                                  {p.method}: ₹{p.amount.toFixed(2)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-['Outfit'] font-black text-sm text-white">
                            ₹{bill.totalAmount.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() =>
                                setActiveReceipt({
                                  invoiceNumber: bill.invoiceNumber,
                                  tableNumber: bill.tableNumber,
                                  dateTime: bill.endTime,
                                  subtotal: bill.totalAmount / 1.05,
                                  taxAmount: bill.totalAmount - bill.totalAmount / 1.05,
                                  discount: 0,
                                  grandTotal: bill.totalAmount,
                                  payments: bill.payments,
                                  items: bill.items,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs inline-flex items-center gap-1.5"
                            >
                              <Printer className="h-3 w-3" />
                              <span>Print</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SHIFT METRICS ================= */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-gradient-to-b from-[#18181D] to-[#111114] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#888888] uppercase tracking-wider block">
                    Cashier Shift Summary
                  </span>
                  <h2 className="font-['Outfit'] text-2xl font-black text-white mt-1">
                    Today's Total Gross: ₹{stats?.totalRevenue ? stats.totalRevenue.toFixed(2) : "0.00"}
                  </h2>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="p-4 rounded-2xl bg-[#141418] border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Banknote className="h-4 w-4" />
                    <span>Cash in Drawer</span>
                  </div>
                  <span className="font-['Outfit'] text-xl font-black text-white block">
                    ₹{stats?.cashTotal ? stats.cashTotal.toFixed(2) : "0.00"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#141418] border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                    <QrCode className="h-4 w-4" />
                    <span>UPI Collections</span>
                  </div>
                  <span className="font-['Outfit'] text-xl font-black text-white block">
                    ₹{stats?.upiTotal ? stats.upiTotal.toFixed(2) : "0.00"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#141418] border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-violet-400 font-bold text-xs">
                    <CreditCard className="h-4 w-4" />
                    <span>Card Volume</span>
                  </div>
                  <span className="font-['Outfit'] text-xl font-black text-white block">
                    ₹{stats?.cardTotal ? stats.cardTotal.toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* ================= BILL SETTLEMENT & SPLIT PAYMENT MODAL ================= */}
      {settlementTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#121216] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {isLoadingBill || !billDetails ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
                <RefreshCw className="h-7 w-7 text-white animate-spin" />
                <span className="text-xs text-[#AAAAAA]">Retrieving table bill and items...</span>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider block">
                  Table Settlement & Checkout
                </span>
                <h3 className="font-['Outfit'] text-xl font-black text-white mt-0.5">
                  Table #{settlementTable.tableNumber} • Session {billDetails.session.sessionCode}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSettlementTable(null);
                  setBillDetails(null);
                }}
                className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/15 text-[#AAAAAA] hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: Two Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Itemized Dish Summary */}
              <div className="space-y-3 bg-[#17171C] p-4 rounded-2xl border border-white/5">
                <span className="text-xs font-bold text-[#AAAAAA] uppercase tracking-wide block">
                  Itemized Order Breakdown
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {billDetails.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="truncate pr-2">
                        <span className="font-bold text-white">{item.name}</span>
                        <span className="text-[#888888] ml-1.5">× {item.quantity}</span>
                      </div>
                      <span className="font-mono text-white font-bold shrink-0">
                        ₹{item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#888]">
                    <span>Subtotal:</span>
                    <span className="text-white">₹{billDetails.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#888]">
                    <span>GST (5%):</span>
                    <span className="text-white">₹{billDetails.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#888]">
                    <span>Discount (₹):</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="w-20 px-2 py-0.5 rounded bg-[#24242A] border border-white/10 text-right text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                    <span>Net Grand Total:</span>
                    <span className="font-['Outfit'] text-xl font-black text-white">
                      ₹{currentNetTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Payment Mode (Single vs Split) */}
              <div className="space-y-4">
                {/* Mode Selector Toggle */}
                <div>
                  <span className="text-xs font-bold text-[#AAAAAA] uppercase tracking-wide block mb-1.5">
                    Payment Mode
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.04] border border-white/10">
                    <button
                      type="button"
                      onClick={() => setPaymentMode("SINGLE")}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        paymentMode === "SINGLE"
                          ? "bg-white text-black shadow-md"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Single Method
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode("SPLIT")}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        paymentMode === "SPLIT"
                          ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Split (Cash + UPI)
                    </button>
                  </div>
                </div>

                {/* Single Method Form */}
                {paymentMode === "SINGLE" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(["CASH", "UPI", "CARD"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSingleMethod(m)}
                          className={`py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                            singleMethod === m
                              ? "bg-white text-black border-white shadow-md"
                              : "bg-[#17171C] text-[#AAAAAA] border-white/10 hover:border-white/20"
                          }`}
                        >
                          {m === "CASH" && <Banknote className="h-4 w-4" />}
                          {m === "UPI" && <QrCode className="h-4 w-4" />}
                          {m === "CARD" && <CreditCard className="h-4 w-4" />}
                          <span>{m}</span>
                        </button>
                      ))}
                    </div>

                    {singleMethod === "CASH" && (
                      <div className="p-3 rounded-xl bg-[#17171C] border border-white/5 space-y-2">
                        <label className="text-[11px] text-[#888888] font-bold block">
                          Cash Tendered (₹)
                        </label>
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder={`Enter amount e.g. ${Math.ceil(currentNetTotal / 100) * 100}`}
                          className="w-full px-3 py-2 rounded-xl bg-[#24242A] border border-white/10 text-sm font-bold text-white focus:outline-none"
                        />
                        {Number(cashTendered) >= currentNetTotal && (
                          <div className="flex justify-between text-xs font-bold text-emerald-400 pt-1">
                            <span>Change Return:</span>
                            <span>₹{(Number(cashTendered) - currentNetTotal).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Split Payment Form (Cash + UPI + Card) */
                  <div className="p-3.5 rounded-2xl bg-[#17171C] border border-white/10 space-y-3">
                    <span className="text-[11px] text-amber-400 font-bold block">
                      Enter Split Portions (Total must equal ₹{currentNetTotal.toFixed(2)})
                    </span>

                    <div className="space-y-2 text-xs">
                      {/* Cash Portion */}
                      <div className="flex items-center gap-2">
                        <div className="w-20 text-[#888] flex items-center gap-1 font-bold">
                          <Banknote className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Cash:</span>
                        </div>
                        <input
                          type="number"
                          value={splitCash}
                          onChange={(e) => setSplitCash(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#24242A] border border-white/10 text-white font-bold focus:outline-none"
                          placeholder="₹ 0"
                        />
                      </div>

                      {/* UPI Portion */}
                      <div className="flex items-center gap-2">
                        <div className="w-20 text-[#888] flex items-center gap-1 font-bold">
                          <QrCode className="h-3.5 w-3.5 text-sky-400" />
                          <span>UPI:</span>
                        </div>
                        <input
                          type="number"
                          value={splitUpi}
                          onChange={(e) => setSplitUpi(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#24242A] border border-white/10 text-white font-bold focus:outline-none"
                          placeholder="₹ 0"
                        />
                      </div>

                      {/* Card Portion */}
                      <div className="flex items-center gap-2">
                        <div className="w-20 text-[#888] flex items-center gap-1 font-bold">
                          <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                          <span>Card:</span>
                        </div>
                        <input
                          type="number"
                          value={splitCard}
                          onChange={(e) => setSplitCard(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#24242A] border border-white/10 text-white font-bold focus:outline-none"
                          placeholder="₹ 0"
                        />
                      </div>

                      {/* Sum check */}
                      {(() => {
                        const sum =
                          (Number(splitCash) || 0) +
                          (Number(splitUpi) || 0) +
                          (Number(splitCard) || 0);
                        const diff = currentNetTotal - sum;
                        return (
                          <div className="pt-2 border-t border-white/10 flex justify-between text-xs font-bold">
                            <span className="text-[#888]">Allocated / Total:</span>
                            <span className={Math.abs(diff) < 0.5 ? "text-emerald-400" : "text-amber-400"}>
                              ₹{sum.toFixed(2)} / ₹{currentNetTotal.toFixed(2)}
                              {Math.abs(diff) > 0.5 && (
                                <span className="block text-[10px] text-right text-rose-400">
                                  Remaining: ₹{diff.toFixed(2)}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Settle Button */}
                <button
                  disabled={isSettling}
                  onClick={handleExecuteSettlement}
                  className="w-full py-3.5 rounded-2xl bg-[#FA2D48] hover:bg-[#ff3b56] disabled:opacity-50 text-white font-['Outfit'] font-black text-sm tracking-wide transition-all active:scale-98 shadow-xl shadow-[#FA2D48]/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isSettling ? (
                    <span>Processing Settlement...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Complete Settlement & Print</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            </>
          )}
          </div>
        </div>
      )}

      {/* ================= PRINTABLE THERMAL RECEIPT MODAL ================= */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white text-black p-6 rounded-3xl shadow-2xl space-y-4 font-mono text-xs">
            {/* Action Bar (Hidden when printing) */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-300 print:hidden">
              <span className="font-bold text-neutral-600 uppercase text-[10px]">
                Receipt Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-black text-white font-bold flex items-center gap-1.5 active:scale-95"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-1 rounded-lg hover:bg-neutral-200"
                >
                  <X className="h-4 w-4 text-black" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Content */}
            <div id="thermal-receipt" className="text-center space-y-2">
              <div className="text-center">
                <h2 className="font-black text-base uppercase tracking-wider">SERVE_SYNC DINING</h2>
                <p className="text-[10px] text-neutral-600">Contactless Table & POS System</p>
                <p className="text-[10px] text-neutral-600">GSTIN: 29ABCDE1234F1Z5</p>
              </div>

              <div className="border-t border-b border-dashed border-neutral-400 py-2 text-[11px] text-left space-y-1">
                <div className="flex justify-between">
                  <span>INV: {activeReceipt.invoiceNumber}</span>
                  <span>TBL: #{activeReceipt.tableNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE: {new Date(activeReceipt.dateTime).toLocaleDateString()}</span>
                  <span>TIME: {new Date(activeReceipt.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div>CASHIER: {user?.fullName || "Staff"}</div>
              </div>

              {/* Items Table */}
              <div className="text-left space-y-1 py-1">
                <div className="flex justify-between font-bold border-b border-neutral-300 pb-1">
                  <span>ITEM</span>
                  <span>QTY</span>
                  <span>PRICE</span>
                </div>
                {activeReceipt.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[140px]">{item.name}</span>
                    <span>{item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-neutral-400 pt-2 text-left space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{activeReceipt.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (5%):</span>
                  <span>₹{activeReceipt.taxAmount.toFixed(2)}</span>
                </div>
                {activeReceipt.discount > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Discount:</span>
                    <span>-₹{activeReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t border-neutral-400 pt-1">
                  <span>NET TOTAL:</span>
                  <span>₹{activeReceipt.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="border-t border-b border-dashed border-neutral-400 py-1.5 text-left text-[11px]">
                <span className="font-bold block">PAID VIA:</span>
                {activeReceipt.payments?.map((p: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>• {p.method}:</span>
                    <span>₹{Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-neutral-600 pt-1">
                <p>Thank you for dining with us!</p>
                <p>Visit again soon.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
