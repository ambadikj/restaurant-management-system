import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Receipt,
  Layers,
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
  Clock,
  ArrowRightLeft,
  PlusCircle,
  ShoppingBag,
  FileSpreadsheet,
  Bell,
  Phone,
  ChefHat,
  Check,
  Edit3,
  FileText,
  Sparkles,
  TrendingUp,
  PieChart as PieChartIcon,
  Flame,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import toast from "react-hot-toast";
import { socket } from "../../lib/socket";
import SwipeableToaster from "@/components/SwipeableToaster";

const BACKEND_HOST =
  typeof window !== "undefined" && window.location.hostname
    ? window.location.hostname
    : "localhost";
const API_BASE = `http://${BACKEND_HOST}:5000/api/cashier`;
const MENU_API = `http://${BACKEND_HOST}:5000/api/customer/menu`;
const UPLOADS_BASE = `http://${BACKEND_HOST}:5000`;

// Web Audio API Synth Chime for access and bill alerts
const playChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);
  } catch {
    // Audio autoplay restrictions
  }
};

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
  inventory?: {
    id: number;
    menuItemId: number;
    dailyLimit: number;
    remainingQty: number;
    isAvailable: boolean;
  } | null;
}

interface Category {
  id: number;
  name: string;
  menuItems: MenuItem[];
}

interface TakeawayOrder {
  id: number;
  orderNumber: string;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
  createdAt: string;
  orderedAt: string;
  notes: string;
  rawNotes?: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  sessionCode: string;
  payments: Array<{
    id: number;
    method: string;
    amount: number;
    status: string;
    paidAt: string;
  }>;
  items: Array<{
    id: number;
    menuItemId: number;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
    imageUrl?: string;
    categoryName?: string;
  }>;
}

/* ─────────────────────────── CHART TOOLTIP ─────────────────────────── */
const ChartCustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const val = Number(data.value) || 0;
    return (
      <div className="px-3.5 py-2.5 rounded-2xl bg-[#1c1c1f]/95 border border-white/10 shadow-2xl backdrop-blur-xl text-xs font-mono space-y-1">
        <p className="text-neutral-400 font-bold text-[11px]">{label || data.name}</p>
        <p className="text-white font-black text-sm">
          ₹{val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </p>
        {data.payload?.percent && (
          <p className="text-[10px] text-neutral-400">
            Share: <span className="text-emerald-400 font-bold">{data.payload.percent}%</span>
          </p>
        )}
        {data.payload?.bills !== undefined && (
          <p className="text-[10px] text-neutral-400">
            Orders Settled: <span className="text-white font-bold">{data.payload.bills}</span>
          </p>
        )}
        {data.payload?.bills > 0 && val > 0 && (
          <p className="text-[10px] text-neutral-400">
            Avg / Bill: <span className="text-purple-300 font-bold">₹{(val / data.payload.bills).toFixed(2)}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

/* ─────────────────────────── VISUAL ANALYTICS CHARTS ─────────────────────────── */
const ShiftAnalyticsCharts = ({
  paymentPieData,
  hourlyRevenueData,
  peakHour,
  stats,
  history,
}: {
  paymentPieData: Array<{ name: string; value: number; color: string; percent: string }>;
  hourlyRevenueData: Array<{ time: string; revenue: number; bills: number }>;
  peakHour: { time: string; revenue: number; bills: number } | null;
  stats: ShiftStats | null;
  history: SettledBill[];
}) => {
  const [activeTender, setActiveTender] = useState<{
    name: string;
    value: number;
    color: string;
    percent: string;
  } | null>(null);

  const totalRevenue =
    stats?.totalRevenue ??
    history.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  const totalBills = stats?.settledBillsCount ?? history.length;
  const aov =
    totalBills > 0 ? (totalRevenue / totalBills).toFixed(2) : "0.00";

  const cashItem = paymentPieData.find((p) => p.name === "Cash");
  const upiItem = paymentPieData.find((p) => p.name === "UPI / QR");
  const cardItem = paymentPieData.find((p) => p.name === "Card POS");

  const cashAmt = Number(stats?.cashTotal || cashItem?.value || 0);
  const upiAmt = Number(stats?.upiTotal || upiItem?.value || 0);
  const cardAmt = Number(stats?.cardTotal || cardItem?.value || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
      {/* 6 cols: Payment Methods Pie / Donut Chart */}
      <div className="lg:col-span-6 p-6 rounded-3xl bg-gradient-to-b from-[#1c1c1f]/95 via-[#18181b]/95 to-[#121214]/95 border border-white/[0.08] shadow-2xl backdrop-blur-2xl flex flex-col justify-between">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500/25 to-indigo-600/15 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10">
              <PieChartIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-white text-sm">Payment Methods</h3>
              <p className="text-[11px] text-neutral-400">Tender share across all settled bills</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/[0.04] text-neutral-400 border border-white/10">
            {totalBills} {totalBills === 1 ? "Bill" : "Bills"}
          </span>
        </div>

        {paymentPieData.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-6 space-y-2 text-neutral-500">
            <PieChartIcon className="h-10 w-10 opacity-30 stroke-[1.5]" />
            <p className="text-xs">No settled payment transactions yet</p>
            <p className="text-[11px] text-neutral-600">Settle your first bill to view tender distribution</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6 pt-4 pb-1 flex-1 justify-center">
            {/* Donut Chart (Left Side) */}
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex-shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="rgba(28,28,31,0.95)"
                    strokeWidth={3}
                    onMouseEnter={(_, index) => setActiveTender(paymentPieData[index])}
                    onMouseLeave={() => setActiveTender(null)}
                  >
                    {paymentPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="cursor-pointer transition-opacity duration-200"
                        opacity={activeTender && activeTender.name !== entry.name ? 0.35 : 1}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Centered Donut Label (Dynamically transforms on hover - no floating tooltip overlap!) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
                {activeTender ? (
                  <div className="text-center space-y-0.5 animate-fadeIn">
                    <span
                      className="text-[10px] font-black uppercase tracking-wider block"
                      style={{ color: activeTender.color }}
                    >
                      {activeTender.name}
                    </span>
                    <span className="font-['Outfit'] font-black text-white text-lg tracking-tight block">
                      ₹{Number(activeTender.value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-300 font-mono block">
                      {activeTender.percent}% share
                    </span>
                  </div>
                ) : (
                  <div className="text-center space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 block">
                      Total
                    </span>
                    <span className="font-['Outfit'] font-black text-white text-lg tracking-tight block">
                      ₹{Math.round(totalRevenue).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[9px] text-neutral-500 font-mono block">
                      {totalBills} {totalBills === 1 ? "Bill" : "Bills"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tender Progress Rows (Right Side) */}
            <div className="flex-1 w-full flex flex-col justify-center space-y-3 min-w-0">
              {/* Cash */}
              <div
                onMouseEnter={() => setActiveTender(cashItem || null)}
                onMouseLeave={() => setActiveTender(null)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                  activeTender?.name === "Cash"
                    ? "bg-white/[0.08] border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" />
                    <span className="text-xs font-bold text-white">Cash</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Outfit'] font-bold text-white text-xs">
                      ₹{cashAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      {cashItem?.percent || "0"}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${cashItem?.percent || 0}%` }}
                  />
                </div>
              </div>

              {/* UPI / QR */}
              <div
                onMouseEnter={() => setActiveTender(upiItem || null)}
                onMouseLeave={() => setActiveTender(null)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                  activeTender?.name === "UPI / QR"
                    ? "bg-white/[0.08] border-sky-500/40 shadow-lg shadow-sky-500/10"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-500/50" />
                    <span className="text-xs font-bold text-white">UPI / QR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Outfit'] font-bold text-white text-xs">
                      ₹{upiAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/20">
                      {upiItem?.percent || "0"}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-400 rounded-full transition-all duration-500"
                    style={{ width: `${upiItem?.percent || 0}%` }}
                  />
                </div>
              </div>

              {/* Card POS */}
              <div
                onMouseEnter={() => setActiveTender(cardItem || null)}
                onMouseLeave={() => setActiveTender(null)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                  activeTender?.name === "Card POS"
                    ? "bg-white/[0.08] border-purple-500/40 shadow-lg shadow-purple-500/10"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-500/50" />
                    <span className="text-xs font-bold text-white">Card POS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Outfit'] font-bold text-white text-xs">
                      ₹{cardAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/20">
                      {cardItem?.percent || "0"}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-400 rounded-full transition-all duration-500"
                    style={{ width: `${cardItem?.percent || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6 cols: Hourly Revenue Curve / Area Chart (Redesigned) */}
      <div className="lg:col-span-6 min-w-0 relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1c1c1f]/95 via-[#18181b]/95 to-[#121214]/95 border border-white/[0.08] shadow-2xl backdrop-blur-2xl p-6 flex flex-col justify-between">
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#FA2D48]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#FA2D48]/25 to-rose-600/15 text-[#FA2D48] border border-[#FA2D48]/30 shadow-lg shadow-[#FA2D48]/10">
                <TrendingUp className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-sans font-bold text-white text-sm tracking-tight">Revenue Trajectory</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/[0.06] text-neutral-400 border border-white/10">
                    Hourly Volume
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">Hourly transaction volume & collection momentum</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] font-mono text-neutral-300">
                AOV: <span className="font-bold text-emerald-400">₹{aov}</span>
              </span>

              {peakHour && peakHour.revenue > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.1] shadow-lg backdrop-blur-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Peak Hour
                  </span>

                  <div className="h-3 w-[1px] bg-white/15" />

                  <span className="text-xs font-['Outfit'] font-extrabold text-white">
                    {peakHour.time}
                  </span>

                  <span className="px-2 py-0.5 rounded-lg bg-[#FA2D48]/15 border border-[#FA2D48]/30 font-['Outfit'] text-xs font-black text-[#FA2D48] tracking-tight">
                    ₹{Number(peakHour.revenue).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-400 text-[10px] font-mono backdrop-blur-xl">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FA2D48] animate-pulse" />
                  <span>Live Audit</span>
                </div>
              )}
            </div>
          </div>

          {hourlyRevenueData.length === 0 || hourlyRevenueData.every((d) => d.revenue === 0) ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-[#FA2D48]/10 border border-[#FA2D48]/20 flex items-center justify-center text-[#FA2D48] shadow-lg shadow-[#FA2D48]/10">
                  <TrendingUp className="h-6 w-6 stroke-[1.8]" />
                </div>
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 animate-ping" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Awaiting Shift Settlement Data</h4>
                <p className="text-[11px] text-neutral-400 max-w-xs mx-auto leading-relaxed">
                  Hourly revenue bars will plot dynamically as tables and takeaway orders are paid.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-56 my-2 -ml-2 w-full">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={hourlyRevenueData}
                  margin={{ top: 14, right: 12, left: -15, bottom: 4 }}
                  barCategoryGap={hourlyRevenueData.length > 8 ? "20%" : "28%"}
                >
                  <defs>
                    <linearGradient id="cashierBarGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FA2D48" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#FA2D48" stopOpacity={0.25} />
                    </linearGradient>
                    <linearGradient id="cashierPeakBarGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF6B81" stopOpacity={1} />
                      <stop offset="100%" stopColor="#FA2D48" stopOpacity={0.65} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#71717a"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    dy={6}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-4}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                  />
                  <RechartsTooltip
                    content={<ChartCustomTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.04)", radius: 8 }}
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[6, 6, 2, 2]}
                    background={{ fill: "rgba(255,255,255,0.03)", radius: 6 }}
                    maxBarSize={44}
                  >
                    {hourlyRevenueData.map((entry, index) => {
                      const isPeak = peakHour && entry.time === peakHour.time && entry.revenue > 0;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isPeak ? "url(#cashierPeakBarGlow)" : "url(#cashierBarGlow)"}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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

  // Floor filtering & search
  const [floorFilter, setFloorFilter] = useState<
    "ALL" | "OCCUPIED" | "BILLING" | "AVAILABLE" | "CLEANING"
  >("ALL");
  const [tableSearch, setTableSearch] = useState("");

  // Modals state
  const [inspectTable, setInspectTable] = useState<FloorTable | null>(null);
  const [settlementTable, setSettlementTable] = useState<FloorTable | null>(null);
  const [billDetails, setBillDetails] = useState<any | null>(null);
  const [isLoadingBill, setIsLoadingBill] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"SINGLE" | "SPLIT">("SINGLE");
  const [singleMethod, setSingleMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [splitCash, setSplitCash] = useState<string>("");
  const [splitUpi, setSplitUpi] = useState<string>("");
  const [splitCard, setSplitCard] = useState<string>("");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  // Discount configuration (Flat ₹ vs %)
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [discountInput, setDiscountInput] = useState<string>("0");
  const [isSettling, setIsSettling] = useState(false);

  // Table Transfer Modal State
  const [transferSourceTable, setTransferSourceTable] = useState<FloorTable | null>(null);
  const [transferDestTableNumber, setTransferDestTableNumber] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Direct Table Order Punching State
  const [punchTable, setPunchTable] = useState<FloorTable | null>(null);
  const [punchCart, setPunchCart] = useState<Array<{ item: MenuItem; quantity: number }>>([]);
  const [punchNotes, setPunchNotes] = useState("");
  const [punchSearch, setPunchSearch] = useState("");
  const [punchActiveCat, setPunchActiveCat] = useState<number | "ALL">("ALL");
  const [isPunching, setIsPunching] = useState(false);

  // Thermal Receipt Modal State (handles final invoice, pro-forma check, or shift report)
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  // History Tab state
  const [history, setHistory] = useState<SettledBill[]>([]);

  // Takeaway POS state
  const [takeawaySubTab, setTakeawaySubTab] = useState<"register" | "queue">("register");
  const [takeawayOrders, setTakeawayOrders] = useState<TakeawayOrder[]>([]);
  const [isLoadingTakeawayOrders, setIsLoadingTakeawayOrders] = useState(false);
  const [takeawayQueueFilter, setTakeawayQueueFilter] = useState<"ALL" | "PREPARING" | "READY" | "SERVED">("ALL");
  const [takeawayQueueSearch, setTakeawayQueueSearch] = useState("");
  const [updatingTakeawayOrderId, setUpdatingTakeawayOrderId] = useState<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [takeawayCart, setTakeawayCart] = useState<Array<{ item: MenuItem; quantity: number; notes?: string }>>([]);
  const [takeawayCustomerName, setTakeawayCustomerName] = useState("");
  const [takeawayCustomerPhone, setTakeawayCustomerPhone] = useState("");
  const [takeawayNotes, setTakeawayNotes] = useState("");
  const [takeawayPackagingCharge, setTakeawayPackagingCharge] = useState<number>(0);
  const [takeawayDiscountType, setTakeawayDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [takeawayDiscountValue, setTakeawayDiscountValue] = useState<number>(0);

  const [takeawayPaymentMode, setTakeawayPaymentMode] = useState<"SINGLE" | "SPLIT">("SINGLE");
  const [takeawayPaymentMethod, setTakeawayPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("UPI");
  const [takeawayCashTendered, setTakeawayCashTendered] = useState<string>("");
  const [takeawaySplitAmounts, setTakeawaySplitAmounts] = useState<{ CASH: string; UPI: string; CARD: string }>({
    CASH: "",
    UPI: "",
    CARD: "",
  });

  const [takeawayActiveCat, setTakeawayActiveCat] = useState<number | "ALL">("ALL");
  const [takeawaySearch, setTakeawaySearch] = useState("");
  const [isSubmittingTakeaway, setIsSubmittingTakeaway] = useState(false);
  // Edit Token Modal state
  const [editingTokenOrder, setEditingTokenOrder] = useState<TakeawayOrder | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editOrderNotes, setEditOrderNotes] = useState("");
  const [isSavingTokenEdit, setIsSavingTokenEdit] = useState(false);

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

  // Load menu items for Takeaway POS & Table Punching
  const loadMenuData = async () => {
    try {
      const res = await axios.get(MENU_API);
      setCategories(res.data || []);
    } catch (err) {
      console.error("Failed to load menu:", err);
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

  // Load takeaway orders queue
  const loadTakeawayOrders = useCallback(async () => {
    try {
      setIsLoadingTakeawayOrders(true);
      const res = await axios.get(`${API_BASE}/takeaway/orders`, authConfig);
      setTakeawayOrders(res.data?.orders || []);
    } catch (err) {
      console.error("Failed to load takeaway orders:", err);
    } finally {
      setIsLoadingTakeawayOrders(false);
    }
  }, [authConfig]);

  useEffect(() => {
    loadFloorData();
    loadMenuData();
    loadTakeawayOrders();
    loadHistoryData();
  }, [authConfig, loadTakeawayOrders]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistoryData();
    } else if (activeTab === "floor") {
      loadFloorData();
    } else if (activeTab === "takeaway") {
      loadTakeawayOrders();
    } else if (activeTab === "stats") {
      loadFloorData();
      loadHistoryData();
    }
  }, [activeTab, loadTakeawayOrders]);

  // Real-time Socket.IO synchronization
  useEffect(() => {
    socket.emit("join:staff", "cashier");

    // Live access request when guest scans QR
    const handleAccessRequest = (data: PendingAccessItem) => {
      playChime();
      toast(
        () => (
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-white">QR Access Requested</span>
            <span className="text-xs text-neutral-400">
              Table #{data.tableNumber} is waiting for authorization.
            </span>
          </div>
        ),
        { duration: 6000 }
      );
      loadFloorData();
    };

    // Live table state changes
    const handleTableUpdate = () => {
      loadFloorData();
      loadTakeawayOrders();
      loadHistoryData();
    };

    // Customer pressed "Request Bill"
    const handleServiceAlert = (data: any) => {
      if (data.type === "REQUEST_BILL") {
        playChime();
        toast.success(`Table #${data.tableNumber} has requested the bill!`, {
          duration: 5000,
        });
        loadFloorData();
      }
    };

    // Live order placed
    const handleOrderPlaced = (data?: any) => {
      loadFloorData();
      loadTakeawayOrders();
      if (data?.tableNumber === "Takeaway" || data?.orderNumber?.startsWith("TK-")) {
        playChime();
        toast.success(`⚡ Takeaway Token #${data.orderNumber} sent to kitchen!`, {
          duration: 4000,
        });
      }
    };

    // Live order status updates (e.g. from kitchen)
    const handleOrderStatusUpdate = (data: any) => {
      loadFloorData();
      loadTakeawayOrders();
      if (data?.status === "READY" && (data?.tableNumber === "Takeaway" || data?.orderNumber?.startsWith("TK-"))) {
        playChime();
        toast(
          () => (
            <div className="flex items-center gap-2.5 text-white">
              <span className="text-xl">🔔</span>
              <div>
                <span className="font-black text-xs block text-emerald-400 tracking-wider">
                  TOKEN #{data.orderNumber} IS READY!
                </span>
                <span className="text-[11px] text-neutral-300">
                  Kitchen prep complete. Hand over to customer!
                </span>
              </div>
            </div>
          ),
          { duration: 7000 }
        );
      }
    };

    // Live inventory stock updates
    const handleStockUpdate = (data: { menuItemId: number; remainingQty: number; isAvailable: boolean }) => {
      setCategories((prevCats) =>
        prevCats.map((cat) => ({
          ...cat,
          menuItems: cat.menuItems.map((dish) => {
            if (dish.id === data.menuItemId) {
              return {
                ...dish,
                isAvailable: data.isAvailable,
                inventory: dish.inventory
                  ? { ...dish.inventory, remainingQty: data.remainingQty, isAvailable: data.isAvailable }
                  : {
                      id: 0,
                      menuItemId: data.menuItemId,
                      dailyLimit: data.remainingQty,
                      remainingQty: data.remainingQty,
                      isAvailable: data.isAvailable,
                    },
              };
            }
            return dish;
          }),
        }))
      );

      setTakeawayCart((prevCart) =>
        prevCart
          .map((ci) => {
            if (ci.item.id === data.menuItemId && ci.quantity > data.remainingQty) {
              toast.error(`Quantity for "${ci.item.name}" adjusted to available stock (${data.remainingQty}).`);
              return { ...ci, quantity: data.remainingQty };
            }
            return ci;
          })
          .filter((ci) => ci.quantity > 0)
      );

      setPunchCart((prevCart) =>
        prevCart
          .map((ci) => {
            if (ci.item.id === data.menuItemId && ci.quantity > data.remainingQty) {
              toast.error(`Quantity for "${ci.item.name}" adjusted to available stock (${data.remainingQty}).`);
              return { ...ci, quantity: data.remainingQty };
            }
            return ci;
          })
          .filter((ci) => ci.quantity > 0)
      );
    };

    socket.on("cashier:access_request", handleAccessRequest);
    socket.on("table:update", handleTableUpdate);
    socket.on("service:alert", handleServiceAlert);
    socket.on("order:placed", handleOrderPlaced);
    socket.on("order:status_update", handleOrderStatusUpdate);
    socket.on("stock:update", handleStockUpdate);

    return () => {
      socket.off("cashier:access_request", handleAccessRequest);
      socket.off("table:update", handleTableUpdate);
      socket.off("service:alert", handleServiceAlert);
      socket.off("order:placed", handleOrderPlaced);
      socket.off("order:status_update", handleOrderStatusUpdate);
      socket.off("stock:update", handleStockUpdate);
    };
  }, [loadTakeawayOrders]);

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

  // Pre-Bill / Pro-forma Check Printer
  const handlePrintEstimate = async (tbl: FloorTable) => {
    if (!tbl.activeSession) return;
    try {
      const res = await axios.get(`${API_BASE}/session/${tbl.activeSession.id}/bill`, authConfig);
      const data = res.data;
      setActiveReceipt({
        isProforma: true,
        invoiceNumber: `EST-${tbl.activeSession.sessionCode}`,
        tableNumber: tbl.tableNumber,
        dateTime: new Date().toISOString(),
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        discount: 0,
        grandTotal: data.grandTotal,
        payments: [],
        items: data.items,
      });
    } catch {
      toast.error("Failed to generate pre-bill check.");
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
    setDiscountType("FLAT");
    setDiscountInput("0");
    setCustomerPhone("");

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

  // Calculate Discount Amount & Net Total
  const calculatedDiscount = useMemo(() => {
    if (!billDetails) return 0;
    const gross = (Number(billDetails.subtotal) || 0) + (Number(billDetails.taxAmount) || 0);
    const val = Number(discountInput) || 0;
    if (val <= 0) return 0;
    if (discountType === "PERCENT") {
      return Math.min(gross, Number(((gross * val) / 100).toFixed(2)));
    }
    return Math.min(gross, val);
  }, [billDetails, discountType, discountInput]);

  const currentNetTotal = useMemo(() => {
    if (!billDetails) return 0;
    const sub = Number(billDetails.subtotal || 0);
    const tax = Number(billDetails.taxAmount || 0);
    return Math.max(0, Number((sub + tax - calculatedDiscount).toFixed(2)));
  }, [billDetails, calculatedDiscount]);

  // Execute Bill Settlement
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
          discount: calculatedDiscount,
          customerPhone: customerPhone.trim() || undefined,
        },
        authConfig
      );

      toast.success("Bill settled successfully!");
      setSettlementTable(null);
      setBillDetails(null);
      setInspectTable(null);
      loadFloorData();
      loadHistoryData();

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

  // Execute Table Transfer
  const handleExecuteTransfer = async () => {
    if (!transferSourceTable || !transferDestTableNumber) {
      toast.error("Please select a target table.");
      return;
    }

    try {
      setIsTransferring(true);
      const res = await axios.post(
        `${API_BASE}/table/transfer`,
        {
          fromTableNumber: transferSourceTable.tableNumber,
          toTableNumber: transferDestTableNumber,
        },
        authConfig
      );

      toast.success(res.data.message || "Table transferred successfully!");
      setTransferSourceTable(null);
      setTransferDestTableNumber(null);
      setInspectTable(null);
      loadFloorData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to transfer table.");
    } finally {
      setIsTransferring(false);
    }
  };

  // Direct Table Order Punching Operations
  const addToPunchCart = (dish: MenuItem) => {
    const isOutOfStock =
      !dish.isAvailable ||
      (dish.inventory !== undefined && dish.inventory !== null && dish.inventory.remainingQty <= 0);

    if (isOutOfStock) {
      toast.error(`"${dish.name}" is out of stock!`);
      return;
    }

    const maxAvailable =
      dish.inventory !== undefined && dish.inventory !== null ? dish.inventory.remainingQty : 999;

    setPunchCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === dish.id);
      const currentQty = existing ? existing.quantity : 0;

      if (currentQty + 1 > maxAvailable) {
        toast.error(`Only ${maxAvailable} portion(s) left for "${dish.name}".`);
        return prev;
      }

      if (existing) {
        return prev.map((ci) =>
          ci.item.id === dish.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item: dish, quantity: 1 }];
    });
  };

  const updatePunchQty = (dishId: number, delta: number) => {
    setPunchCart((prev) => {
      const targetItem = prev.find((ci) => ci.item.id === dishId);
      if (!targetItem) return prev;

      if (delta > 0) {
        let currentDish = targetItem.item;
        for (const cat of categories) {
          const found = cat.menuItems.find((d) => d.id === dishId);
          if (found) {
            currentDish = found;
            break;
          }
        }

        const maxAvailable =
          currentDish.inventory !== undefined && currentDish.inventory !== null
            ? currentDish.inventory.remainingQty
            : 999;

        if (targetItem.quantity + delta > maxAvailable) {
          toast.error(`Only ${maxAvailable} portion(s) left for "${targetItem.item.name}".`);
          return prev;
        }
      }

      return prev
        .map((ci) => (ci.item.id === dishId ? { ...ci, quantity: ci.quantity + delta } : ci))
        .filter((ci) => ci.quantity > 0);
    });
  };

  const handleExecutePunch = async () => {
    if (!punchTable || punchCart.length === 0) {
      toast.error("Please select at least one item to add.");
      return;
    }

    try {
      setIsPunching(true);
      const res = await axios.post(
        `${API_BASE}/table/${punchTable.tableNumber}/add-items`,
        {
          items: punchCart.map((ci) => ({ menuItemId: ci.item.id, quantity: ci.quantity })),
          notes: punchNotes.trim() || undefined,
        },
        authConfig
      );

      toast.success(res.data.message || `Items added to Table #${punchTable.tableNumber}!`);
      setPunchTable(null);
      setPunchCart([]);
      setPunchNotes("");
      setInspectTable(null);
      loadFloorData();
      loadMenuData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add items to table.");
    } finally {
      setIsPunching(false);
    }
  };

  // Print Daily Shift Register Report
  const handlePrintShiftReport = () => {
    if (!stats) return;
    setActiveReceipt({
      isShiftReport: true,
      cashierName: user?.fullName || "Staff",
      dateTime: new Date().toISOString(),
      totalRevenue: stats.totalRevenue,
      cashTotal: stats.cashTotal,
      upiTotal: stats.upiTotal,
      cardTotal: stats.cardTotal,
      settledBillsCount: stats.settledBillsCount,
      activeTablesCount: stats.activeTablesCount,
    });
  };

  // Filtered Tables for Floor Grid
  const filteredTables = useMemo(() => {
    return tables.filter((tbl) => {
      if (floorFilter === "OCCUPIED" && tbl.status !== "OCCUPIED") return false;
      if (floorFilter === "BILLING" && tbl.status !== "BILLING") return false;
      if (floorFilter === "AVAILABLE" && tbl.status !== "AVAILABLE") return false;
      if (floorFilter === "CLEANING" && tbl.status !== "CLEANING") return false;
      if (tableSearch.trim()) {
        const q = tableSearch.trim();
        return String(tbl.tableNumber).includes(q);
      }
      return true;
    });
  }, [tables, floorFilter, tableSearch]);

  // Available Destination Tables for Transfer Modal
  const availableDestTables = useMemo(() => {
    if (!transferSourceTable) return [];
    return tables.filter(
      (t) => t.status === "AVAILABLE" && t.tableNumber !== transferSourceTable.tableNumber
    );
  }, [tables, transferSourceTable]);

  // Takeaway Cart Operations
  const addToTakeawayCart = (dish: MenuItem) => {
    const isOutOfStock =
      !dish.isAvailable ||
      (dish.inventory !== undefined && dish.inventory !== null && dish.inventory.remainingQty <= 0);

    if (isOutOfStock) {
      toast.error(`"${dish.name}" is out of stock!`);
      return;
    }

    const maxAvailable =
      dish.inventory !== undefined && dish.inventory !== null ? dish.inventory.remainingQty : 999;

    setTakeawayCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === dish.id);
      const currentQty = existing ? existing.quantity : 0;

      if (currentQty + 1 > maxAvailable) {
        toast.error(`Only ${maxAvailable} portion(s) left for "${dish.name}".`);
        return prev;
      }

      if (existing) {
        return prev.map((ci) =>
          ci.item.id === dish.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item: dish, quantity: 1 }];
    });
  };

  const updateTakeawayQty = (dishId: number, delta: number) => {
    setTakeawayCart((prev) => {
      const targetItem = prev.find((ci) => ci.item.id === dishId);
      if (!targetItem) return prev;

      if (delta > 0) {
        // Find latest dish info to get remaining quantity
        let currentDish = targetItem.item;
        for (const cat of categories) {
          const found = cat.menuItems.find((d) => d.id === dishId);
          if (found) {
            currentDish = found;
            break;
          }
        }

        const maxAvailable =
          currentDish.inventory !== undefined && currentDish.inventory !== null
            ? currentDish.inventory.remainingQty
            : 999;

        if (targetItem.quantity + delta > maxAvailable) {
          toast.error(`Only ${maxAvailable} portion(s) left for "${targetItem.item.name}".`);
          return prev;
        }
      }

      return prev
        .map((ci) => (ci.item.id === dishId ? { ...ci, quantity: ci.quantity + delta } : ci))
        .filter((ci) => ci.quantity > 0);
    });
  };

  // Edit Token Handlers
  const handleOpenEditTokenModal = (ord: TakeawayOrder) => {
    setEditingTokenOrder(ord);
    setEditCustomerName(ord.customerName || "");
    setEditCustomerPhone(ord.customerPhone || "");
    setEditOrderNotes(ord.notes || "");
  };

  const handleSaveTokenEdit = async () => {
    if (!editingTokenOrder) return;
    try {
      setIsSavingTokenEdit(true);
      await axios.patch(
        `${API_BASE}/takeaway/order/${editingTokenOrder.id}`,
        {
          customerName: editCustomerName.trim(),
          customerPhone: editCustomerPhone.trim(),
          notes: editOrderNotes.trim(),
        },
        authConfig
      );
      toast.success(`Token #${editingTokenOrder.orderNumber} updated!`);
      // Update active receipt if currently open
      if (activeReceipt?.orderNumber === editingTokenOrder.orderNumber) {
        setActiveReceipt((prev: any) => ({
          ...prev,
          customerName: editCustomerName.trim() || "Customer",
          customerPhone: editCustomerPhone.trim(),
          notes: editOrderNotes.trim(),
        }));
      }
      setEditingTokenOrder(null);
      await loadTakeawayOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update token");
    } finally {
      setIsSavingTokenEdit(false);
    }
  };

  // Financial calculations
  const takeawaySubtotal = useMemo(() => {
    return takeawayCart.reduce((sum, ci) => sum + Number(ci.item.price) * ci.quantity, 0);
  }, [takeawayCart]);

  const takeawayTax = useMemo(() => Number((takeawaySubtotal * 0.05).toFixed(2)), [takeawaySubtotal]);

  const takeawayDiscountAmount = useMemo(() => {
    if (takeawayDiscountType === "PERCENT") {
      return Number(((takeawaySubtotal * (Number(takeawayDiscountValue) || 0)) / 100).toFixed(2));
    }
    return Number(Math.min(takeawaySubtotal, Number(takeawayDiscountValue) || 0).toFixed(2));
  }, [takeawaySubtotal, takeawayDiscountType, takeawayDiscountValue]);

  const takeawayGrandTotal = useMemo(() => {
    const raw = takeawaySubtotal + takeawayTax + Number(takeawayPackagingCharge || 0) - takeawayDiscountAmount;
    return Math.max(0, Number(raw.toFixed(2)));
  }, [takeawaySubtotal, takeawayTax, takeawayPackagingCharge, takeawayDiscountAmount]);

  // Cash change calculation
  const takeawayCashTenderedNum = Number(takeawayCashTendered) || 0;
  const takeawayCashChange = useMemo(() => {
    if (takeawayPaymentMode === "SINGLE" && takeawayPaymentMethod === "CASH") {
      return Math.max(0, Number((takeawayCashTenderedNum - takeawayGrandTotal).toFixed(2)));
    }
    return 0;
  }, [takeawayPaymentMode, takeawayPaymentMethod, takeawayCashTenderedNum, takeawayGrandTotal]);

  // Split payment breakdown
  const takeawaySplitTotal = useMemo(() => {
    return (
      (Number(takeawaySplitAmounts.CASH) || 0) +
      (Number(takeawaySplitAmounts.UPI) || 0) +
      (Number(takeawaySplitAmounts.CARD) || 0)
    );
  }, [takeawaySplitAmounts]);

  const takeawaySplitRemaining = useMemo(() => {
    return Number((takeawayGrandTotal - takeawaySplitTotal).toFixed(2));
  }, [takeawayGrandTotal, takeawaySplitTotal]);

  // Takeaway Queue Counts
  const takeawayPreparingCount = useMemo(
    () => takeawayOrders.filter((o) => o.status === "PREPARING" || o.status === "PENDING").length,
    [takeawayOrders]
  );
  const takeawayReadyCount = useMemo(
    () => takeawayOrders.filter((o) => o.status === "READY").length,
    [takeawayOrders]
  );
  const takeawayServedCount = useMemo(
    () => takeawayOrders.filter((o) => o.status === "SERVED").length,
    [takeawayOrders]
  );
  const takeawayActiveCount = takeawayPreparingCount + takeawayReadyCount;

  // Visual Analytics Computations
  const paymentPieData = useMemo(() => {
    let cash = Number(stats?.cashTotal) || 0;
    let upi = Number(stats?.upiTotal) || 0;
    let card = Number(stats?.cardTotal) || 0;

    if (cash === 0 && upi === 0 && card === 0 && history.length > 0) {
      history.forEach((b) => {
        (b.payments || []).forEach((p) => {
          const amt = Number(p.amount) || 0;
          if (p.method === "CASH") cash += amt;
          else if (p.method === "UPI") upi += amt;
          else if (p.method === "CARD") card += amt;
        });
      });
    }

    const total = cash + upi + card;

    if (total === 0) return [];

    return [
      { name: "Cash", value: cash, color: "#10B981", percent: ((cash / total) * 100).toFixed(1) },
      { name: "UPI / QR", value: upi, color: "#38BDF8", percent: ((upi / total) * 100).toFixed(1) },
      { name: "Card POS", value: card, color: "#A855F7", percent: ((card / total) * 100).toFixed(1) },
    ].filter((d) => d.value > 0);
  }, [stats, history]);

  const hourlyRevenueData = useMemo(() => {
    if (!history || history.length === 0) {
      return [];
    }

    // Sort history chronologically by endTime / startTime
    const sorted = [...history].sort((a, b) => {
      const ta = new Date(a.endTime || a.startTime).getTime();
      const tb = new Date(b.endTime || b.startTime).getTime();
      return ta - tb;
    });

    const buckets: Record<string, { label: string; revenue: number; bills: number; timestamp: number }> = {};

    sorted.forEach((bill) => {
      const d = new Date(bill.endTime || bill.startTime);
      if (isNaN(d.getTime())) return;

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const h = d.getHours();
      const key = `${y}-${m}-${day} ${String(h).padStart(2, "0")}:00`;

      const period = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const label = `${displayH} ${period}`;

      if (!buckets[key]) {
        buckets[key] = {
          label,
          revenue: 0,
          bills: 0,
          timestamp: new Date(y, d.getMonth(), d.getDate(), h).getTime(),
        };
      }

      buckets[key].revenue += Number(bill.totalAmount) || 0;
      buckets[key].bills += 1;
    });

    const entries = Object.values(buckets).sort((a, b) => a.timestamp - b.timestamp);
    if (entries.length === 0) return [];

    // If only 1 hour has transactions, pad previous and next hour so the chart renders with context
    if (entries.length === 1) {
      const single = entries[0];
      const prevDate = new Date(single.timestamp - 3600000);
      const nextDate = new Date(single.timestamp + 3600000);
      const prevH = prevDate.getHours();
      const nextH = nextDate.getHours();

      return [
        {
          time: `${prevH % 12 === 0 ? 12 : prevH % 12} ${prevH >= 12 ? "PM" : "AM"}`,
          revenue: 0,
          bills: 0,
        },
        {
          time: single.label,
          revenue: Math.round(single.revenue * 100) / 100,
          bills: single.bills,
        },
        {
          time: `${nextH % 12 === 0 ? 12 : nextH % 12} ${nextH >= 12 ? "PM" : "AM"}`,
          revenue: 0,
          bills: 0,
        },
      ];
    }

    // If shift spans across multiple hours within 14 hours, fill continuous timeline so quiet hours show clean empty tracks
    const minTime = entries[0].timestamp;
    const maxTime = entries[entries.length - 1].timestamp;
    const diffHours = Math.round((maxTime - minTime) / 3600000);

    if (diffHours >= 1 && diffHours <= 14) {
      const continuous: Array<{ time: string; revenue: number; bills: number }> = [];
      for (let t = minTime; t <= maxTime; t += 3600000) {
        const d = new Date(t);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const h = d.getHours();
        const key = `${y}-${m}-${day} ${String(h).padStart(2, "0")}:00`;
        const period = h >= 12 ? "PM" : "AM";
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const label = `${displayH} ${period}`;

        if (buckets[key]) {
          continuous.push({
            time: label,
            revenue: Math.round(buckets[key].revenue * 100) / 100,
            bills: buckets[key].bills,
          });
        } else {
          continuous.push({
            time: label,
            revenue: 0,
            bills: 0,
          });
        }
      }
      return continuous;
    }

    return entries.map((e) => ({
      time: e.label,
      revenue: Math.round(e.revenue * 100) / 100,
      bills: e.bills,
    }));
  }, [history]);

  const peakHour = useMemo(() => {
    if (!hourlyRevenueData || hourlyRevenueData.length === 0) return null;
    const max = [...hourlyRevenueData].sort((a, b) => b.revenue - a.revenue)[0];
    return max && max.revenue > 0 ? max : null;
  }, [hourlyRevenueData]);

  // Tab Header Information (Badge, Main Heading H1, Description)
  const tabHeaderInfo = useMemo(() => {
    switch (activeTab) {
      case "takeaway":
        return {
          icon: ShoppingBag,
          badge: "Walk-in & Counter Register",
          title: "Takeaway POS & Token Terminal",
          description:
            "Rapid counter order punching, kitchen dispatch, live token pickup queue, and customer handover alerts.",
        };
      case "history":
        return {
          icon: FileText,
          badge: "Daily Audit Trail",
          title: "Settled Invoices & Closed Bills Log",
          description:
            "Daily closed bills, hourly revenue trajectory, tender breakdown charts, and receipt reprint audit trail.",
        };
      case "stats":
        return {
          icon: TrendingUp,
          badge: "EOD Closeout & Metrics",
          title: "Shift Register & Financial Metrics",
          description:
            "Drawer cash reconciliation, UPI & card volume totals, average order value, and shift closeout reporting.",
        };
      case "floor":
      default:
        return {
          icon: Layers,
          badge: "Point of Sale & Floor Checkout",
          title: "Floor POS & Table Checkout",
          description:
            "Real-time table settlement, split payments, floor status control, dining session inspection, and direct order punching.",
        };
    }
  }, [activeTab]);

  // Filtered Queue Orders
  const filteredTakeawayOrders = useMemo(() => {
    return takeawayOrders.filter((ord) => {
      if (takeawayQueueFilter === "PREPARING" && ord.status !== "PREPARING" && ord.status !== "PENDING") return false;
      if (takeawayQueueFilter === "READY" && ord.status !== "READY") return false;
      if (takeawayQueueFilter === "SERVED" && ord.status !== "SERVED") return false;
      if (takeawayQueueSearch.trim()) {
        const q = takeawayQueueSearch.toLowerCase().trim();
        const matchOrder = ord.orderNumber.toLowerCase().includes(q);
        const matchCustomer = ord.customerName.toLowerCase().includes(q);
        const matchPhone = ord.customerPhone.toLowerCase().includes(q);
        const matchItem = ord.items.some((i) => i.name.toLowerCase().includes(q));
        return matchOrder || matchCustomer || matchPhone || matchItem;
      }
      return true;
    });
  }, [takeawayOrders, takeawayQueueFilter, takeawayQueueSearch]);

  // Update Takeaway Status (Mark Ready, Hand Over, Cancel)
  const handleUpdateTakeawayStatus = async (
    orderId: number,
    orderNumber: string,
    newStatus: "PREPARING" | "READY" | "SERVED" | "CANCELLED"
  ) => {
    try {
      setUpdatingTakeawayOrderId(orderId);
      await axios.patch(
        `${API_BASE}/takeaway/order/${orderId}/status`,
        { status: newStatus },
        authConfig
      );
      toast.success(`Token #${orderNumber} marked as ${newStatus}`);
      await loadTakeawayOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdatingTakeawayOrderId(null);
    }
  };

  // Thermal Prints for Takeaway
  const handlePrintTakeawayToken = (ord: TakeawayOrder) => {
    setActiveReceipt({
      invoiceNumber: `TKN-${ord.orderNumber}`,
      orderNumber: ord.orderNumber,
      customerName: ord.customerName,
      customerPhone: ord.customerPhone,
      tableNumber: "Takeaway",
      dateTime: new Date(ord.createdAt || Date.now()).toISOString(),
      subtotal: ord.totalAmount,
      taxAmount: 0,
      discount: 0,
      grandTotal: ord.totalAmount,
      payments: ord.payments,
      items: ord.items,
      isTokenSlip: true,
      notes: ord.notes,
    });
  };

  const handlePrintTakeawayKOT = (ord: TakeawayOrder) => {
    setActiveReceipt({
      invoiceNumber: `KOT-${ord.orderNumber}`,
      orderNumber: ord.orderNumber,
      customerName: ord.customerName,
      customerPhone: ord.customerPhone,
      tableNumber: "Takeaway (Counter)",
      dateTime: new Date(ord.createdAt || Date.now()).toISOString(),
      subtotal: 0,
      taxAmount: 0,
      discount: 0,
      grandTotal: 0,
      items: ord.items,
      isKOT: true,
      notes: ord.notes,
    });
  };

  const handlePrintTakeawayInvoice = (ord: TakeawayOrder) => {
    setActiveReceipt({
      invoiceNumber: `INV-${ord.sessionCode}`,
      orderNumber: ord.orderNumber,
      customerName: ord.customerName,
      customerPhone: ord.customerPhone,
      tableNumber: "Takeaway",
      dateTime: new Date(ord.createdAt || Date.now()).toISOString(),
      subtotal: Number((ord.totalAmount * 0.9524).toFixed(2)),
      taxAmount: Number((ord.totalAmount * 0.0476).toFixed(2)),
      discount: 0,
      grandTotal: ord.totalAmount,
      payments: ord.payments,
      items: ord.items,
      notes: ord.notes,
    });
  };

  // Submit Takeaway Order & Bill
  const handleSettleTakeaway = async () => {
    if (takeawayCart.length === 0) {
      toast.error("Please add at least one item.");
      return;
    }

    let payments: Array<{ method: "CASH" | "UPI" | "CARD"; amount: number }> = [];

    if (takeawayPaymentMode === "SINGLE") {
      payments = [{ method: takeawayPaymentMethod, amount: takeawayGrandTotal }];
    } else {
      if (Math.abs(takeawaySplitRemaining) > 1.0) {
        toast.error(`Please allocate the full amount. ₹${Math.abs(takeawaySplitRemaining).toFixed(2)} remaining.`);
        return;
      }
      const methods: Array<"CASH" | "UPI" | "CARD"> = ["CASH", "UPI", "CARD"];
      methods.forEach((m) => {
        const val = Number(takeawaySplitAmounts[m]);
        if (val > 0) {
          payments.push({ method: m, amount: val });
        }
      });
    }

    try {
      setIsSubmittingTakeaway(true);
      const res = await axios.post(
        `${API_BASE}/takeaway`,
        {
          customerName: takeawayCustomerName.trim() || "Walk-in Guest",
          customerPhone: takeawayCustomerPhone.trim() || undefined,
          notes: takeawayNotes.trim() || undefined,
          packagingCharge: takeawayPackagingCharge,
          discount: takeawayDiscountAmount,
          items: takeawayCart.map((ci) => ({
            menuItemId: ci.item.id,
            quantity: ci.quantity,
          })),
          payments,
        },
        authConfig
      );

      toast.success("Takeaway order paid & sent to kitchen!");
      setTakeawayCart([]);
      setTakeawayCustomerName("");
      setTakeawayCustomerPhone("");
      setTakeawayNotes("");
      setTakeawayCashTendered("");
      setTakeawayDiscountValue(0);
      setTakeawayPackagingCharge(0);
      setTakeawaySplitAmounts({ CASH: "", UPI: "", CARD: "" });
      loadFloorData();
      loadTakeawayOrders();
      loadHistoryData();
      loadMenuData();

      if (res.data.receipt) {
        // Automatically pop up Customer Token Slip for 1-click printing
        setActiveReceipt({
          ...res.data.receipt,
          isTokenSlip: true,
        });
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

  // Filtered menu for table punch modal
  const filteredPunchDishes = useMemo(() => {
    const q = punchSearch.toLowerCase().trim();
    let dishes = categories.flatMap((c) =>
      punchActiveCat === "ALL" || c.id === punchActiveCat ? c.menuItems : []
    );
    if (q) {
      dishes = dishes.filter((d) => d.name.toLowerCase().includes(q));
    }
    return dishes;
  }, [categories, punchActiveCat, punchSearch]);

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in duration-300">
      <SwipeableToaster />

      {/* ================= HEADER BAR: APPLE MUSIC EDITORIAL HERO ================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent border border-white/[0.09] p-6 sm:p-7 backdrop-blur-2xl shadow-2xl">
        {/* Apple Music Signature Ambient Bloom Halos */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#FA2D48]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.1] px-3 py-1 text-[11px] font-semibold text-neutral-300 backdrop-blur-md">
              <tabHeaderInfo.icon className="h-3.5 w-3.5 text-[#FA2D48]" />
              <span className="tracking-widest uppercase text-[10px] font-bold text-white/90">
                {tabHeaderInfo.badge}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
              {tabHeaderInfo.title}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl font-normal leading-relaxed">
              {tabHeaderInfo.description}
            </p>
          </div>

          {/* Action Pills */}
          <div className="relative z-10 flex flex-wrap items-center gap-2.5">
            {activeTab === "takeaway" ? (
              <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-2xl shadow-xl">
                <button
                  type="button"
                  onClick={() => setTakeawaySubTab("register")}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    takeawaySubTab === "register"
                      ? "bg-[#FA2D48] text-white shadow-lg shadow-[#FA2D48]/35"
                      : "bg-white/[0.06] text-neutral-300 hover:text-white hover:bg-white/10 border border-white/10"
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Counter Register</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTakeawaySubTab("queue");
                    loadTakeawayOrders();
                  }}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 relative ${
                    takeawaySubTab === "queue"
                      ? "bg-[#FA2D48] text-white shadow-lg shadow-[#FA2D48]/35"
                      : "bg-white/[0.06] text-neutral-300 hover:text-white hover:bg-white/10 border border-white/10"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Orders & Pickup Queue</span>
                  {takeawayActiveCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-black ml-1 shadow-sm">
                      {takeawayActiveCount}
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.08] border border-white/[0.12] text-neutral-300 backdrop-blur-xl shadow-sm">
                  <Clock className="h-3.5 w-3.5 text-neutral-400" />
                  <span>{currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                </div>

                <button
                  onClick={handlePrintShiftReport}
                  className="flex items-center gap-2 rounded-full px-4.5 py-2 text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-neutral-200 hover:text-white border border-white/[0.12] backdrop-blur-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Shift Register</span>
                </button>

                <button
                  onClick={loadFloorData}
                  className="flex items-center gap-2 rounded-full px-4.5 py-2 text-xs font-semibold bg-[#FA2D48] hover:bg-[#ff3b56] text-white shadow-lg shadow-[#FA2D48]/30 transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================= PENDING QR SCAN ACCESS REQUESTS BANNER ================= */}
      {pendingRequests.length > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#18181c]/90 to-transparent border border-amber-500/30 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-3 duration-300 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-sans text-sm font-bold">
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
                className="p-3.5 rounded-2xl bg-[#1c1c1f]/90 border border-amber-500/30 flex items-center justify-between gap-3 shadow-md backdrop-blur-xl"
              >
                <div>
                  <span className="font-mono text-base font-black text-white block leading-none">
                    Table #{req.tableNumber < 10 ? `0${req.tableNumber}` : req.tableNumber}
                  </span>
                  <span className="text-[11px] text-neutral-400 mt-1 block">
                    {new Date(req.requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeclineAccess(req.tableNumber)}
                    className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 text-xs font-bold transition-all cursor-pointer border border-white/5"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleApproveAccess(req.tableNumber)}
                    className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
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

          {/* Controls Bar: Status Filter Tabs (Apple Music Pill Row matching TablesQR.tsx) */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFloorFilter("ALL")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  floorFilter === "ALL"
                    ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
                }`}
              >
                <span>All Tables</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                  {tables.length}
                </span>
              </button>

              <button
                onClick={() => setFloorFilter("BILLING")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  floorFilter === "BILLING"
                    ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
                }`}
              >
                <span>Bill Requested</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                  {tables.filter((t) => t.status === "BILLING").length}
                </span>
              </button>

              <button
                onClick={() => setFloorFilter("OCCUPIED")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  floorFilter === "OCCUPIED"
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
                }`}
              >
                <span>Occupied</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                  {tables.filter((t) => t.status === "OCCUPIED").length}
                </span>
              </button>

              <button
                onClick={() => setFloorFilter("AVAILABLE")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  floorFilter === "AVAILABLE"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
                }`}
              >
                <span>Available</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                  {tables.filter((t) => t.status === "AVAILABLE").length}
                </span>
              </button>

              <button
                onClick={() => setFloorFilter("CLEANING")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  floorFilter === "CLEANING"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
                }`}
              >
                <span>Cleaning</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                  {tables.filter((t) => t.status === "CLEANING").length}
                </span>
              </button>
            </div>

            {/* Quick Table Search */}
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300 z-10 pointer-events-none stroke-[2.2]" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search table #..."
                className="w-full pl-10 pr-4 py-2 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-[#FA2D48]/50 backdrop-blur-xl"
              />
            </div>
          </div>

          {/* ================= APPLE MUSIC STATION / TABLE CARD GRID ================= */}
          {isLoading && tables.length === 0 ? (
            <div className="py-24 text-center text-xs text-neutral-500 font-mono">
              Loading floor plan stations...
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#1c1c1f]/60 p-12 text-center text-neutral-400 text-xs backdrop-blur-xl">
              No dining tables found matching the selected status filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredTables.map((table) => {
                const isAvail = table.status === "AVAILABLE";
                const isOccupied = table.status === "OCCUPIED";
                const isBilling = table.status === "BILLING";
                const isCleaning = table.status === "CLEANING";

                return (
                  <div
                    key={table.id}
                    className={`group relative flex flex-col justify-between rounded-3xl p-4 sm:p-5 bg-[#18181b]/95 hover:bg-[#1f1f25] border transition-all duration-300 shadow-xl hover:shadow-2xl overflow-hidden ${
                      isBilling
                        ? "border-[#FA2D48]/50 shadow-[#FA2D48]/10"
                        : isOccupied
                        ? "border-sky-500/30 shadow-sky-500/10"
                        : isCleaning
                        ? "border-purple-500/30 shadow-purple-500/10"
                        : "border-white/[0.08] hover:border-white/[0.18]"
                    }`}
                  >
                    {/* Top ambient color glow */}
                    <div
                      className={`absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500 group-hover:opacity-35 ${
                        isBilling
                          ? "bg-[#FA2D48]"
                          : isOccupied
                          ? "bg-sky-500"
                          : isCleaning
                          ? "bg-purple-500"
                          : "bg-emerald-500"
                      }`}
                    />

                    {/* Top Header: Table # + Capacity + Status Pill */}
                    <div className="flex items-start justify-between gap-2 z-10">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-['Outfit'] text-lg xl:text-xl font-black text-white tracking-tight whitespace-nowrap">
                            Table {table.tableNumber < 10 ? `0${table.tableNumber}` : table.tableNumber}
                          </span>
                          <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[11px] font-semibold text-neutral-300 whitespace-nowrap shrink-0">
                            {table.capacity} Guests
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400 mt-0.5 block truncate">
                          {table.activeSession
                            ? `Session #${table.activeSession.sessionCode?.slice(-6) || table.activeSession.id} • Active`
                            : "Dining Station • Ready for Seating"}
                        </span>
                      </div>

                      {/* Live Status Pill */}
                      <div className="shrink-0 whitespace-nowrap">
                        {isAvail && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            Ready
                          </span>
                        )}
                        {isOccupied && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-sky-400 border border-sky-500/30 whitespace-nowrap">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500" />
                            </span>
                            Occupied
                          </span>
                        )}
                        {isBilling && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FA2D48]/20 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-[#FA2D48] border border-[#FA2D48]/30 animate-pulse whitespace-nowrap">
                            <Sparkles className="h-3 w-3 text-[#FA2D48]" />
                            Bill Due
                          </span>
                        )}
                        {isCleaning && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-purple-400 border border-purple-500/30 whitespace-nowrap">
                            <RefreshCw className="h-3 w-3 text-purple-400 animate-spin" />
                            Cleaning
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Section: NET PAYABLE / RUNNING BILL BUTTON (Image 2 Design) */}
                    <div className="my-4 z-10">
                      {table.activeSession ? (
                        <button
                          type="button"
                          onClick={() => openSettlementModal(table)}
                          className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#FA2D48]/15 via-rose-950/20 to-transparent border border-[#FA2D48]/30 hover:border-[#FA2D48]/60 flex items-center justify-between shadow-lg transition-all active:scale-98 cursor-pointer group/btn"
                        >
                          <div className="text-left">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 block group-hover/btn:text-white transition-colors">
                              {isBilling ? "Net Payable • Settle" : "Running Bill"}
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              {table.activeSession.totalItems} items • {table.activeSession.ordersCount} rounds
                            </span>
                          </div>
                          <span className="font-['Outfit'] text-3xl font-black text-white tracking-tight group-hover/btn:text-[#FA2D48] transition-colors">
                            ₹{table.activeSession.totalAmount.toFixed(2)}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPunchTable(table);
                            setPunchCart([]);
                            setPunchNotes("");
                          }}
                          className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-950/20 to-transparent border border-emerald-500/25 hover:border-emerald-500/50 flex items-center justify-between shadow-lg transition-all active:scale-98 cursor-pointer group/btn"
                        >
                          <div className="text-left">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block group-hover/btn:text-white transition-colors">
                              Ready for Guests
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              Sanitized • Up to {table.capacity} seats
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 group-hover/btn:bg-emerald-500 group-hover/btn:text-black transition-all">
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>Punch</span>
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Bottom Half: Segmented Status Controller & Actions */}
                    <div className="space-y-2.5 z-10">
                      {/* Apple iOS 4-Segmented Status Controller */}
                      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateTableStatus(table.tableNumber, "AVAILABLE");
                          }}
                          className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            isAvail
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                              : "text-neutral-400 hover:text-white"
                          }`}
                          title="Set Ready / Available"
                        >
                          Ready
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateTableStatus(table.tableNumber, "OCCUPIED");
                          }}
                          className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            isOccupied
                              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                              : "text-neutral-400 hover:text-white"
                          }`}
                          title="Set Occupied"
                        >
                          Occ
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateTableStatus(table.tableNumber, "BILLING");
                          }}
                          className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            isBilling
                              ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
                              : "text-neutral-400 hover:text-white"
                          }`}
                          title="Set Bill Due"
                        >
                          Bill
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateTableStatus(table.tableNumber, "CLEANING");
                          }}
                          className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            isCleaning
                              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                              : "text-neutral-400 hover:text-white"
                          }`}
                          title="Set Cleaning"
                        >
                          Clean
                        </button>
                      </div>

                      {/* Cashier Operational Action Buttons */}
                      {table.activeSession ? (
                        <div className="grid grid-cols-4 gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintEstimate(table);
                            }}
                            title="Print Pre-bill Check"
                            className="py-2 px-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-neutral-200 border border-white/10 flex items-center justify-center gap-1 font-bold text-[11px] transition-all cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5 text-neutral-400" />
                            <span>Check</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTransferSourceTable(table);
                              setTransferDestTableNumber(null);
                            }}
                            title="Transfer table"
                            className="py-2 px-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-neutral-200 border border-white/10 flex items-center justify-center gap-1 font-bold text-[11px] transition-all cursor-pointer"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 text-neutral-400" />
                            <span>Move</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPunchTable(table);
                              setPunchCart([]);
                              setPunchNotes("");
                            }}
                            title="Add dishes"
                            className="py-2 px-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-neutral-200 border border-white/10 flex items-center justify-center gap-1 font-bold text-[11px] transition-all cursor-pointer"
                          >
                            <PlusCircle className="h-3.5 w-3.5 text-[#FA2D48]" />
                            <span>Add</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSettlementModal(table);
                            }}
                            title="Settle & Checkout Bill"
                            className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-md cursor-pointer ${
                              isBilling
                                ? "bg-[#FA2D48] hover:bg-[#ff3b56] text-white shadow-[#FA2D48]/30 animate-pulse"
                                : "bg-white text-black hover:bg-neutral-200"
                            }`}
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Settle</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPunchTable(table);
                              setPunchCart([]);
                              setPunchNotes("");
                            }}
                            className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>Punch Order</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateTableStatus(table.tableNumber, "OCCUPIED");
                            }}
                            className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-neutral-300 border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>Seat Guests</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: TAKEAWAY POS & ORDERS QUEUE ================= */}
      {activeTab === "takeaway" && (
        <div className="space-y-6">

          {/* SUB-TAB 1: COUNTER REGISTER (NEW TAKEAWAY ORDER) */}
          {takeawaySubTab === "register" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Menu Selection */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300 z-10 pointer-events-none stroke-[2.2]" />
                    <input
                      type="text"
                      value={takeawaySearch}
                      onChange={(e) => setTakeawaySearch(e.target.value)}
                      placeholder="Search dishes for takeaway by name..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-[#FA2D48]/50 backdrop-blur-xl"
                    />
                  </div>

                  {/* Category Chips - Apple Music Pill Row */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => setTakeawayActiveCat("ALL")}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
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
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[660px] overflow-y-auto scrollbar-none pr-1">
                  {filteredTakeawayDishes.map((dish) => {
                    const cartEntry = takeawayCart.find((ci) => ci.item.id === dish.id);
                    const isVeg = !/chicken|meat|fish|beef|pork|egg|mutton|prawn|seafood/i.test(dish.name);
                    const isSoldOut =
                      !dish.isAvailable ||
                      (dish.inventory !== undefined && dish.inventory !== null && dish.inventory.remainingQty <= 0);
                    const remaining =
                      dish.inventory !== undefined && dish.inventory !== null ? dish.inventory.remainingQty : null;
                    const isLowStock = remaining !== null && remaining > 0 && remaining <= 5 && !isSoldOut;

                    return (
                      <div
                        key={dish.id}
                        onClick={() => {
                          if (isSoldOut) {
                            toast.error(`"${dish.name}" is out of stock!`);
                            return;
                          }
                          addToTakeawayCart(dish);
                        }}
                        className={`group relative flex flex-col justify-between rounded-3xl p-3.5 bg-[#18181b]/90 hover:bg-[#202026] border transition-all duration-300 select-none overflow-hidden ${
                          isSoldOut
                            ? "opacity-60 cursor-not-allowed border-white/[0.05]"
                            : cartEntry
                            ? "cursor-pointer border-[#FA2D48]/50 ring-1 ring-[#FA2D48]/30 shadow-[#FA2D48]/10"
                            : "cursor-pointer border-white/[0.08] hover:border-white/[0.25]"
                        }`}
                      >
                        {/* Artwork Area with gradient overlay and badges */}
                        <div className="aspect-[4/3] w-full rounded-2xl bg-black/50 overflow-hidden mb-3 relative border border-white/[0.06]">
                          <img
                            src={
                              dish.imageUrl?.startsWith("http")
                                ? dish.imageUrl
                                : `${UPLOADS_BASE}/${dish.imageUrl?.replace(/^\/+/, "")}`
                            }
                            alt={dish.name}
                            className={`h-full w-full object-cover transition-transform duration-500 ${
                              isSoldOut ? "grayscale" : "group-hover:scale-110"
                            }`}
                            onError={(e: any) => {
                              e.target.src =
                                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80";
                            }}
                          />

                          {/* Subtle Bottom Gradient Vignette */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                          {/* Veg / Non-Veg Indicator Badge */}
                          <div className="absolute top-2 left-2 z-10">
                            <div
                              className={`h-4 w-4 rounded-md border flex items-center justify-center bg-black/75 backdrop-blur-md ${
                                isVeg ? "border-emerald-500/80" : "border-rose-500/80"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${isVeg ? "bg-emerald-400" : "bg-rose-500"}`} />
                            </div>
                          </div>

                          {/* Out of Stock Overlay */}
                          {isSoldOut && (
                            <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center z-20">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#FF4D4D] bg-[#202024]/90 px-3 py-1 rounded-full border border-[#FF0000]/40 shadow-lg">
                                Out of Stock
                              </span>
                            </div>
                          )}

                          {/* Urgency Low Stock Badge */}
                          {isLowStock && (
                            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-xl border border-[#FA2D48]/40 text-white text-[10px] font-bold shadow-xl shadow-[#FA2D48]/20 animate-in fade-in zoom-in-95 duration-200">
                              <Flame className="h-3 w-3 text-[#FA2D48] fill-[#FA2D48] animate-pulse" />
                              <span className="text-neutral-200">Only <strong className="text-[#FA2D48] font-black">{remaining}</strong> left</span>
                            </div>
                          )}

                          {/* In-Tray Quantity Badge */}
                          {cartEntry && (
                            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FA2D48] text-white text-[11px] font-black shadow-lg shadow-[#FA2D48]/50 backdrop-blur-md animate-in zoom-in-50 duration-200">
                              <span>×{cartEntry.quantity}</span>
                            </div>
                          )}

                          {/* Apple Music Hover Center Play/Add Button */}
                          {!isSoldOut && (
                            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                              <div className="h-10 w-10 rounded-full bg-[#FA2D48] text-white flex items-center justify-center shadow-2xl shadow-[#FA2D48]/50 transform scale-90 group-hover:scale-100 transition-transform">
                                <Plus className="h-5 w-5" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Dish Details */}
                        <div className="flex flex-col justify-between flex-1">
                          <h4 className="font-['Outfit'] text-sm font-extrabold text-white line-clamp-1 group-hover:text-[#FA2D48] transition-colors">
                            {dish.name}
                          </h4>

                          {dish.description && (
                            <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                              {dish.description}
                            </p>
                          )}

                          {/* Price & Interactive Action */}
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
                            <span className="font-['Outfit'] text-sm font-black text-white group-hover:text-emerald-400 transition-colors tracking-tight">
                              ₹{Number(dish.price).toFixed(2)}
                            </span>

                            {isSoldOut ? (
                              <button
                                type="button"
                                disabled
                                className="h-7 px-3 rounded-xl bg-white/[0.04] text-neutral-500 text-xs font-bold flex items-center gap-1 border border-white/5 cursor-not-allowed"
                              >
                                <span>Out of Stock</span>
                              </button>
                            ) : cartEntry ? (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 bg-white/[0.08] p-0.5 rounded-xl border border-white/10"
                              >
                                <button
                                  type="button"
                                  onClick={() => updateTakeawayQty(dish.id, -1)}
                                  className="h-6 w-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="font-mono text-xs font-bold text-white px-1.5">
                                  {cartEntry.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addToTakeawayCart(dish)}
                                  disabled={remaining !== null && cartEntry.quantity >= remaining}
                                  className={`h-6 w-6 rounded-lg text-white flex items-center justify-center transition-colors ${
                                    remaining !== null && cartEntry.quantity >= remaining
                                      ? "bg-neutral-700/60 opacity-50 cursor-not-allowed"
                                      : "bg-[#FA2D48] hover:bg-[#ff3b56] cursor-pointer"
                                  }`}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToTakeawayCart(dish);
                                }}
                                className="h-7 px-3 rounded-xl bg-white/[0.08] group-hover:bg-[#FA2D48] group-hover:text-white text-neutral-300 text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Takeaway Order Tray & Quick Checkout */}
              <div className="p-6 rounded-3xl bg-[#1c1c1f]/95 border border-white/[0.08] backdrop-blur-2xl flex flex-col justify-between space-y-4 shadow-2xl">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-[#FA2D48]" />
                      <h3 className="font-sans text-sm font-bold text-white uppercase tracking-wider">
                        Takeaway Tray ({takeawayCart.reduce((sum, ci) => sum + ci.quantity, 0)})
                      </h3>
                    </div>
                    {takeawayCart.length > 0 && (
                      <button
                        onClick={() => setTakeawayCart([])}
                        className="text-xs text-[#FA2D48] font-bold hover:underline cursor-pointer"
                      >
                        Clear Tray
                      </button>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block mb-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        value={takeawayCustomerName}
                        onChange={(e) => setTakeawayCustomerName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-[#FA2D48]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block mb-1">
                        Phone (For Token Alert)
                      </label>
                      <input
                        type="tel"
                        value={takeawayCustomerPhone}
                        onChange={(e) => setTakeawayCustomerPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-[#FA2D48]/50"
                      />
                    </div>
                  </div>

                  {/* Kitchen Special Instructions */}
                  <div>
                    <input
                      type="text"
                      value={takeawayNotes}
                      onChange={(e) => setTakeawayNotes(e.target.value)}
                      placeholder="Kitchen instruction (e.g. Pack gravy separately, extra tissues)..."
                      className="w-full px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FA2D48]/50"
                    />
                  </div>

                  {/* Cart Items List */}
                  <div
                    className="space-y-2 max-h-56 overflow-y-auto pr-2 scrollbar-none"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.12) transparent" }}
                  >
                    {takeawayCart.length === 0 ? (
                      <div className="text-center py-10 text-xs text-neutral-500">
                        Tray is empty. Tap dishes on the left to add items.
                      </div>
                    ) : (
                      takeawayCart.map((ci) => {
                        const liveDish = categories.flatMap((c) => c.menuItems).find((d) => d.id === ci.item.id) || ci.item;
                        const liveRemaining = liveDish.inventory !== undefined && liveDish.inventory !== null ? liveDish.inventory.remainingQty : null;
                        const isMaxReached = liveRemaining !== null && ci.quantity >= liveRemaining;

                        return (
                          <div
                            key={ci.item.id}
                            className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                  <span className="truncate">{ci.item.name}</span>
                                  {liveRemaining !== null && liveRemaining <= 5 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FA2D48]/15 border border-[#FA2D48]/35 text-[#FA2D48] text-[9px] font-black uppercase tracking-wider shrink-0 shadow-sm">
                                      <Flame className="h-2.5 w-2.5 fill-[#FA2D48]" />
                                      Only {liveRemaining} left
                                    </span>
                                  )}
                                </h5>
                                <span className="text-[11px] text-neutral-400">
                                  ₹{Number(ci.item.price).toFixed(2)} × {ci.quantity} = ₹
                                  {(Number(ci.item.price) * ci.quantity).toFixed(2)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateTakeawayQty(ci.item.id, -1)}
                                  className="h-6 w-6 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center text-xs active:scale-90 cursor-pointer transition-colors"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-5 text-center text-xs font-bold text-white font-mono">
                                  {ci.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateTakeawayQty(ci.item.id, 1)}
                                  disabled={isMaxReached}
                                  className={`h-6 w-6 rounded-lg text-white flex items-center justify-center text-xs active:scale-90 font-bold transition-colors ${
                                    isMaxReached
                                      ? "bg-neutral-700/60 opacity-50 cursor-not-allowed"
                                      : "bg-[#FA2D48] hover:bg-[#ff3b56] cursor-pointer"
                                  }`}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Packaging & Discount Selectors */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  {/* Packaging Charge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                      Parcel / Packaging Fee:
                    </span>
                    <div className="flex items-center gap-1">
                      {[0, 15, 30, 50].map((fee) => (
                        <button
                          key={fee}
                          type="button"
                          onClick={() => setTakeawayPackagingCharge(fee)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            takeawayPackagingCharge === fee
                              ? "bg-white text-black"
                              : "bg-white/[0.04] text-neutral-400 hover:text-white border border-white/5"
                          }`}
                        >
                          {fee === 0 ? "Free" : `₹${fee}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Discount Selector */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                        Discount:
                      </span>
                      <button
                        onClick={() =>
                          setTakeawayDiscountType(
                            takeawayDiscountType === "PERCENT" ? "FLAT" : "PERCENT"
                          )
                        }
                        className="px-1.5 py-0.5 rounded text-[9px] font-black bg-white/10 text-white uppercase cursor-pointer"
                      >
                        {takeawayDiscountType === "PERCENT" ? "%" : "₹ Flat"}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {takeawayDiscountType === "PERCENT" ? (
                        [0, 5, 10, 15].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setTakeawayDiscountValue(pct)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              takeawayDiscountValue === pct
                                ? "bg-[#FA2D48] text-white"
                                : "bg-white/[0.04] text-neutral-400 hover:text-white border border-white/5"
                            }`}
                          >
                            {pct === 0 ? "None" : `${pct}%`}
                          </button>
                        ))
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={takeawayDiscountValue}
                            onChange={(e) => setTakeawayDiscountValue(Number(e.target.value) || 0)}
                            className="w-16 px-2 py-0.5 rounded-lg bg-black/40 border border-white/20 text-[11px] text-white text-right focus:outline-none"
                            placeholder="₹"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div className="space-y-1 text-xs pt-1 border-t border-white/5">
                    <div className="flex justify-between text-neutral-400">
                      <span>Subtotal:</span>
                      <span className="text-white">₹{takeawaySubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>GST (5%):</span>
                      <span className="text-white">₹{takeawayTax.toFixed(2)}</span>
                    </div>
                    {takeawayPackagingCharge > 0 && (
                      <div className="flex justify-between text-neutral-400">
                        <span>Packaging Fee:</span>
                        <span className="text-white">₹{takeawayPackagingCharge.toFixed(2)}</span>
                      </div>
                    )}
                    {takeawayDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Discount ({takeawayDiscountType === "PERCENT" ? `${takeawayDiscountValue}%` : "Flat"}):</span>
                        <span>-₹{takeawayDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-white/10">
                      <span>Grand Total:</span>
                      <span className="font-['Outfit'] text-2xl font-black text-white">
                        ₹{takeawayGrandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Mode Selector: Single vs Split */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                        Payment Mode
                      </span>
                      <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/10">
                        <button
                          type="button"
                          onClick={() => setTakeawayPaymentMode("SINGLE")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            takeawayPaymentMode === "SINGLE"
                              ? "bg-white text-black"
                              : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTakeawayPaymentMode("SPLIT");
                            setTakeawaySplitAmounts({
                              CASH: "",
                              UPI: "",
                              CARD: "",
                            });
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            takeawayPaymentMode === "SPLIT"
                              ? "bg-white text-black"
                              : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          Split
                        </button>
                      </div>
                    </div>

                    {/* Single Mode: 3 Buttons */}
                    {takeawayPaymentMode === "SINGLE" ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-3 gap-2">
                          {(["UPI", "CASH", "CARD"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setTakeawayPaymentMethod(m)}
                              className={`py-2 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
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

                        {/* If Cash: Change Calculator & Denomination Quick-Tender */}
                        {takeawayPaymentMethod === "CASH" && (
                          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                                Cash Tendered (₹)
                              </label>
                              <div className="flex items-center gap-1">
                                {[
                                  takeawayGrandTotal,
                                  Math.ceil(takeawayGrandTotal / 100) * 100,
                                  500,
                                  2000,
                                ].map((denom, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setTakeawayCashTendered(String(denom))}
                                    className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] font-mono text-neutral-300 cursor-pointer"
                                  >
                                    ₹{denom}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={takeawayCashTendered}
                                onChange={(e) => setTakeawayCashTendered(e.target.value)}
                                placeholder="Amount handed by customer..."
                                className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white focus:outline-none"
                              />
                            </div>

                            {takeawayCashTenderedNum >= takeawayGrandTotal && (
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5 font-bold">
                                <span className="text-neutral-400">Change Due to Customer:</span>
                                <span className="text-emerald-400 font-mono text-sm">
                                  ₹{takeawayCashChange.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Split Mode: Multiple Currencies Inputs */
                      <div className="p-4 rounded-3xl bg-[#1c1c1f]/90 border border-white/[0.08] backdrop-blur-2xl space-y-3.5 shadow-2xl">
                        <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                          <span className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                            <span className="p-1 rounded-lg bg-[#FA2D48]/10 text-[#FA2D48] border border-[#FA2D48]/20">
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </span>
                            <span>Split Allocation</span>
                          </span>
                          <span className="font-mono text-xs font-bold text-neutral-200 bg-white/[0.06] px-3 py-1 rounded-full border border-white/[0.08]">
                            Target: <span className="text-white">₹{takeawayGrandTotal.toFixed(2)}</span>
                          </span>
                        </div>

                        {(["CASH", "UPI", "CARD"] as const).map((method) => {
                          const icon =
                            method === "CASH" ? (
                              <Banknote className="h-3.5 w-3.5 text-emerald-400" />
                            ) : method === "UPI" ? (
                              <QrCode className="h-3.5 w-3.5 text-sky-400" />
                            ) : (
                              <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                            );
                          const bgTint =
                            method === "CASH"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : method === "UPI"
                              ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                              : "bg-violet-500/10 border-violet-500/20 text-violet-400";

                          return (
                            <div
                              key={method}
                              className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all"
                            >
                              <div
                                className={`w-20 px-2.5 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold shrink-0 ${bgTint}`}
                              >
                                {icon}
                                <span>{method}</span>
                              </div>
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-500">
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  value={takeawaySplitAmounts[method]}
                                  onChange={(e) =>
                                    setTakeawaySplitAmounts((prev) => ({
                                      ...prev,
                                      [method]: e.target.value,
                                    }))
                                  }
                                  placeholder="0.00"
                                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#121214] border border-white/[0.08] focus:border-[#FA2D48]/50 focus:ring-1 focus:ring-[#FA2D48]/30 text-sm font-mono font-bold text-white focus:outline-none transition-all placeholder-neutral-600"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setTakeawaySplitAmounts((prev) => {
                                    const otherSum = (["CASH", "UPI", "CARD"] as const)
                                      .filter((m) => m !== method)
                                      .reduce((sum, m) => sum + (parseFloat(prev[m]) || 0), 0);
                                    const rem = Math.max(0, parseFloat((takeawayGrandTotal - otherSum).toFixed(2)));
                                    return {
                                      ...prev,
                                      [method]: rem > 0 ? (Number.isInteger(rem) ? String(rem) : rem.toFixed(2)) : "0",
                                    };
                                  });
                                }}
                                className="shrink-0 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-[#FA2D48] text-neutral-300 hover:text-white border border-white/[0.08] hover:border-transparent text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                              >
                                Fill Rem.
                              </button>
                            </div>
                          );
                        })}

                        {/* Status Footer: No bar, clean Apple badge */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs font-mono">
                          <div className="flex items-center gap-1.5 text-neutral-400">
                            <span>Allocated:</span>
                            <span className="text-white font-bold text-sm">₹{takeawaySplitTotal.toFixed(2)}</span>
                          </div>
                          {Math.abs(takeawaySplitRemaining) <= 0.05 ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5" /> Fully Allocated
                            </span>
                          ) : takeawaySplitRemaining > 0 ? (
                            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs">
                              ₹{takeawaySplitRemaining.toFixed(2)} remaining
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-xs">
                              ₹{Math.abs(takeawaySplitRemaining).toFixed(2)} over
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Settle & Dispatch */}
                  <button
                    disabled={
                      takeawayCart.length === 0 ||
                      isSubmittingTakeaway ||
                      (takeawayPaymentMode === "SPLIT" && Math.abs(takeawaySplitRemaining) > 1.0)
                    }
                    onClick={handleSettleTakeaway}
                    className="w-full py-3.5 rounded-2xl bg-[#FA2D48] hover:bg-[#ff3b56] disabled:opacity-50 text-white font-sans font-bold text-xs tracking-wide transition-all active:scale-98 shadow-xl shadow-[#FA2D48]/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingTakeaway ? (
                      <span>Punching & Printing Token...</span>
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

          {/* SUB-TAB 2: LIVE ORDERS & PICKUP QUEUE */}
          {takeawaySubTab === "queue" && (
            <div className="space-y-4">
              {/* Filter Row & Queue Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: "ALL", label: `All Orders (${takeawayOrders.length})` },
                    { id: "PREPARING", label: `🔥 Cooking (${takeawayPreparingCount})` },
                    { id: "READY", label: `🔔 Ready for Pickup (${takeawayReadyCount})` },
                    { id: "SERVED", label: `✓ Handed Over (${takeawayServedCount})` },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setTakeawayQueueFilter(filter.id as any)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        takeawayQueueFilter === filter.id
                          ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
                          : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.08]"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300 z-10 pointer-events-none stroke-[2.2]" />
                    <input
                      type="text"
                      value={takeawayQueueSearch}
                      onChange={(e) => setTakeawayQueueSearch(e.target.value)}
                      placeholder="Search token #, customer, phone..."
                      className="w-full pl-10 pr-4 py-2 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-[#FA2D48]/50 backdrop-blur-xl"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => loadTakeawayOrders()}
                    disabled={isLoadingTakeawayOrders}
                    title="Refresh Queue"
                    className="p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer shrink-0 active:scale-95"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isLoadingTakeawayOrders ? "animate-spin text-[#FA2D48]" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {/* Orders Grid */}
              {filteredTakeawayOrders.length === 0 ? (
                <div className="text-center py-16 rounded-3xl bg-[#1c1c1f]/80 border border-white/[0.08] backdrop-blur-2xl space-y-3">
                  <ShoppingBag className="h-10 w-10 mx-auto text-neutral-600" />
                  <h4 className="text-sm font-bold text-white">No takeaway orders found</h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Takeaway orders punched through the Counter Register will appear here with live
                    kitchen preparation status.
                  </p>
                  <button
                    onClick={() => setTakeawaySubTab("register")}
                    className="px-4 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 cursor-pointer"
                  >
                    Punch New Order
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTakeawayOrders.map((ord) => {
                    const isReady = ord.status === "READY";
                    const isPreparing = ord.status === "PREPARING" || ord.status === "PENDING";
                    const isServed = ord.status === "SERVED";

                    return (
                      <div
                        key={ord.id}
                        className={`p-5 rounded-3xl bg-[#1c1c1f]/90 border backdrop-blur-2xl flex flex-col justify-between space-y-3.5 shadow-xl transition-all ${
                          isReady
                            ? "border-emerald-500/40 shadow-emerald-500/10"
                            : isPreparing
                            ? "border-amber-500/30 shadow-amber-500/10"
                            : "border-white/[0.08]"
                        }`}
                      >
                        {/* Header: Token #, Elapsed Time, Status */}
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-xl bg-white text-black font-mono font-black text-sm tracking-wider shadow-sm">
                                {ord.orderNumber}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {new Date(ord.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {isPreparing && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  In Kitchen
                                </span>
                              )}
                              {isReady && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 px-2.5 py-1 text-[10px] font-black text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  READY FOR PICKUP
                                </span>
                              )}
                              {isServed && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-500/20 px-2.5 py-1 text-[10px] font-bold text-neutral-400 border border-neutral-500/30">
                                  <Check className="h-3 w-3" />
                                  Handed Over
                                </span>
                              )}
                              {ord.status === "CANCELLED" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] font-bold text-red-400 border border-red-500/30">
                                  Cancelled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Customer & Phone info */}
                          <div className="pt-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                              <span className="font-bold text-white truncate">{ord.customerName}</span>
                              <button
                                onClick={() => handleOpenEditTokenModal(ord)}
                                title="Edit Customer or Notes"
                                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                            </div>
                            {ord.customerPhone && (
                              <span className="font-mono text-[11px] text-neutral-400 flex items-center gap-1">
                                <Phone className="h-3 w-3 text-[#FA2D48]" />
                                {ord.customerPhone}
                              </span>
                            )}
                          </div>

                          {/* Order Notes */}
                          {ord.notes && (
                            <div className="mt-1 text-[10px] text-amber-300/90 italic bg-amber-500/10 px-2 py-1 rounded-xl border border-amber-500/20">
                              Note: {ord.notes}
                            </div>
                          )}

                          {/* Items List */}
                          <div className="mt-3 space-y-1 py-2 border-t border-b border-white/5 max-h-36 overflow-y-auto">
                            {ord.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs text-neutral-300"
                              >
                                <span className="truncate max-w-[180px]">
                                  <strong className="text-white font-mono mr-1.5">
                                    {item.quantity}×
                                  </strong>
                                  {item.name}
                                </span>
                                <span className="font-mono text-neutral-400 text-[11px]">
                                  ₹{item.subtotal.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Bill summary */}
                          <div className="pt-2 flex items-center justify-between text-xs">
                            <span className="text-neutral-400">Total Paid:</span>
                            <div className="text-right">
                              <span className="font-['Outfit'] font-black text-sm text-white block">
                                ₹{ord.totalAmount.toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1 justify-end">
                                {ord.payments.map((p) => (
                                  <span
                                    key={p.id}
                                    className="text-[9px] font-mono text-neutral-400 uppercase"
                                  >
                                    {p.method}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          {/* Main Workflow Action */}
                          {isPreparing && (
                            <button
                              disabled={updatingTakeawayOrderId === ord.id}
                              onClick={() =>
                                handleUpdateTakeawayStatus(ord.id, ord.orderNumber, "READY")
                              }
                              className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-md shadow-amber-500/20 cursor-pointer"
                            >
                              <Bell className="h-3.5 w-3.5" />
                              <span>Mark Ready for Pickup</span>
                            </button>
                          )}

                          {isReady && (
                            <button
                              disabled={updatingTakeawayOrderId === ord.id}
                              onClick={() =>
                                handleUpdateTakeawayStatus(ord.id, ord.orderNumber, "SERVED")
                              }
                              className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-md shadow-emerald-500/20 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Hand Over to Customer</span>
                            </button>
                          )}

                          {/* Print Actions & Edit Token */}
                          <div className="grid grid-cols-4 gap-1.5">
                            <button
                              onClick={() => handleOpenEditTokenModal(ord)}
                              className="py-1.5 px-2 rounded-xl bg-white/[0.05] hover:bg-[#FA2D48] text-neutral-200 hover:text-white border border-white/10 hover:border-transparent flex items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer"
                              title="Edit Customer Info or Cooking Notes"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handlePrintTakeawayToken(ord)}
                              className="py-1.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 border border-white/10 flex items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer"
                            >
                              <Printer className="h-3 w-3 text-neutral-400" />
                              <span>Token</span>
                            </button>

                            <button
                              onClick={() => handlePrintTakeawayKOT(ord)}
                              className="py-1.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 border border-white/10 flex items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer"
                            >
                              <ChefHat className="h-3 w-3 text-[#FA2D48]" />
                              <span>KOT</span>
                            </button>

                            <button
                              onClick={() => handlePrintTakeawayInvoice(ord)}
                              className="py-1.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 border border-white/10 flex items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer"
                            >
                              <FileText className="h-3 w-3 text-neutral-400" />
                              <span>Invoice</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: SETTLED BILLS HISTORY ================= */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-sans text-lg font-black text-white">
                Today's Settled Bills ({history.length})
              </h3>
              <span className="text-xs text-neutral-400">
                Closed audit trail eligible for reprint, receipt verification, and tax summary
              </span>
            </div>
          </div>

          {/* Visual Analytics Graphs & Donut Chart */}
          <ShiftAnalyticsCharts
            paymentPieData={paymentPieData}
            hourlyRevenueData={hourlyRevenueData}
            peakHour={peakHour}
            stats={stats}
            history={history}
          />

          <div className="rounded-3xl bg-[#1c1c1f]/85 border border-white/[0.08] overflow-hidden shadow-2xl backdrop-blur-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] text-neutral-400 uppercase font-bold border-b border-white/[0.06]">
                  <tr>
                    <th className="py-3.5 px-5">Invoice #</th>
                    <th className="py-3.5 px-5">Table / Type</th>
                    <th className="py-3.5 px-5">Settled Time</th>
                    <th className="py-3.5 px-5">Items</th>
                    <th className="py-3.5 px-5">Payment Breakdown</th>
                    <th className="py-3.5 px-5">Total Amount</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-500">
                        No settled bills logged for today's shift yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((bill) => (
                        <tr key={bill.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-5 font-mono font-bold text-white">
                            {bill.invoiceNumber}
                          </td>
                          <td className="py-4 px-5 font-bold text-white">
                            {bill.tableNumber === "Takeaway" ? (
                              <span className="inline-flex items-center gap-1 text-[#FA2D48]">
                                <ShoppingBag className="h-3 w-3" />
                                <span>Takeaway</span>
                              </span>
                            ) : (
                              `Table #${bill.tableNumber}`
                            )}
                          </td>
                          <td className="py-4 px-5 text-neutral-400 font-mono">
                            {new Date(bill.endTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-4 px-5 text-neutral-300">
                            {bill.itemsCount} portions
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {bill.payments.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white"
                                >
                                  {p.method}: ₹{p.amount.toFixed(2)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-5 font-['Outfit'] font-black text-sm text-white">
                            ₹{bill.totalAmount.toFixed(2)}
                          </td>
                          <td className="py-4 px-5 text-right">
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
                              className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            >
                              <Printer className="h-3 w-3 text-neutral-400" />
                              <span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: SHIFT METRICS & REGISTER ================= */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          <div className="p-7 rounded-3xl bg-gradient-to-b from-[#1c1c1f]/95 to-[#141417]/95 border border-white/10 space-y-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Today's Cashier Closeout Summary
                </span>
                <h2 className="font-['Outfit'] text-3xl font-black text-white mt-1 tracking-tight">
                  Gross Shift Revenue: ₹{stats?.totalRevenue ? stats.totalRevenue.toFixed(2) : "0.00"}
                </h2>
              </div>

              <button
                onClick={handlePrintShiftReport}
                className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs flex items-center gap-2 hover:bg-neutral-200 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Register Report</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Banknote className="h-4 w-4" />
                  <span>Cash in Register Drawer</span>
                </div>
                <span className="font-['Outfit'] text-2xl font-black text-white block">
                  ₹{stats?.cashTotal ? stats.cashTotal.toFixed(2) : "0.00"}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                  <QrCode className="h-4 w-4" />
                  <span>UPI / QR Collections</span>
                </div>
                <span className="font-['Outfit'] text-2xl font-black text-white block">
                  ₹{stats?.upiTotal ? stats.upiTotal.toFixed(2) : "0.00"}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-violet-400 font-bold text-xs">
                  <CreditCard className="h-4 w-4" />
                  <span>Card POS Volume</span>
                </div>
                <span className="font-['Outfit'] text-2xl font-black text-white block">
                  ₹{stats?.cardTotal ? stats.cardTotal.toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Analytics Graphs & Donut Chart */}
          <ShiftAnalyticsCharts
            paymentPieData={paymentPieData}
            hourlyRevenueData={hourlyRevenueData}
            peakHour={peakHour}
            stats={stats}
            history={history}
          />

          {/* Operational Shift Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 rounded-3xl bg-[#1c1c1f]/85 border border-white/[0.08] space-y-1 shadow-xl">
              <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                Total Closed Invoices
              </span>
              <span className="font-['Outfit'] text-2xl font-black text-white">
                {stats?.settledBillsCount || 0} bills
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-[#1c1c1f]/85 border border-white/[0.08] space-y-1 shadow-xl">
              <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                Average Bill Value (AOV)
              </span>
              <span className="font-['Outfit'] text-2xl font-black text-white">
                ₹
                {stats && stats.settledBillsCount > 0
                  ? (stats.totalRevenue / stats.settledBillsCount).toFixed(2)
                  : "0.00"}
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-[#1c1c1f]/85 border border-white/[0.08] space-y-1 shadow-xl">
              <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                Active Dining Rooms
              </span>
              <span className="font-['Outfit'] text-2xl font-black text-white">
                {stats?.activeTablesCount || 0} occupied
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 0: TABLE SESSION DETAILS & LIVE KOT INSPECTION ================= */}
      {inspectTable && inspectTable.activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#1c1c1f]/95 border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-black/75 px-3 py-1 text-xs font-mono font-black text-white border border-white/[0.14]">
                  TABLE {inspectTable.tableNumber < 10 ? `0${inspectTable.tableNumber}` : inspectTable.tableNumber}
                </span>
                <h3 className="font-sans text-base font-bold text-white">
                  Active Dining Session ({inspectTable.activeSession.sessionCode})
                </h3>
              </div>
              <button
                onClick={() => setInspectTable(null)}
                className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Courses and Order Items */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                Ordered Courses ({inspectTable.activeSession.orders.length})
              </span>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {inspectTable.activeSession.orders.map((ord, idx) => (
                  <div key={ord.id} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">
                        Course #{idx + 1} ({ord.orderNumber})
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-neutral-300">
                        {ord.status}
                      </span>
                    </div>

                    <div className="divide-y divide-white/[0.04] text-xs">
                      {ord.orderItems.map((oi) => (
                        <div key={oi.id} className="py-1.5 flex items-center justify-between">
                          <div className="truncate pr-2">
                            <span className="text-white font-medium">{oi.menuItem.name}</span>
                            <span className="text-neutral-400 ml-1.5">× {oi.quantity}</span>
                          </div>
                          <span className="font-mono text-white font-bold">
                            ₹{Number(oi.subtotal).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {ord.notes && (
                      <div className="pt-1 text-[11px] text-amber-300 italic">
                        Note: {ord.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Running Bill Total */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-400 block font-semibold">Running Bill Amount</span>
                  <span className="text-[10px] text-neutral-500">Includes all kitchen dispatched courses</span>
                </div>
                <span className="font-['Outfit'] text-2xl font-black text-white">
                  ₹{inspectTable.activeSession.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  handlePrintEstimate(inspectTable);
                }}
                className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-neutral-400" />
                <span>Print Check</span>
              </button>

              <button
                onClick={() => {
                  setPunchTable(inspectTable);
                  setPunchCart([]);
                  setPunchNotes("");
                }}
                className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5 text-[#FA2D48]" />
                <span>Add Dishes</span>
              </button>

              <button
                onClick={() => {
                  setTransferSourceTable(inspectTable);
                  setTransferDestTableNumber(null);
                }}
                className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 cursor-pointer"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-neutral-400" />
                <span>Transfer Table</span>
              </button>

              <button
                onClick={() => openSettlementModal(inspectTable)}
                className="px-5 py-2 rounded-full bg-[#FA2D48] hover:bg-[#ff3b56] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#FA2D48]/30 cursor-pointer active:scale-95"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Settle Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: BILL SETTLEMENT & SPLIT PAYMENT ================= */}
      {settlementTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-[#141417]/95 border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto backdrop-blur-3xl">
            {isLoadingBill || !billDetails ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
                <RefreshCw className="h-7 w-7 text-white animate-spin" />
                <span className="text-xs text-neutral-400 font-mono">Retrieving table bill and items...</span>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-black text-[#FA2D48] uppercase tracking-wider block">
                      Checkout & Payment Gateway
                    </span>
                    <h3 className="font-['Outfit'] text-xl font-black text-white mt-0.5 flex items-center gap-2">
                      <span>Table #{settlementTable.tableNumber}</span>
                      <span className="text-neutral-500 font-light">•</span>
                      <span className="font-mono text-xs font-bold text-neutral-400 bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-white/10">
                        {billDetails.session.sessionCode}
                      </span>
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setSettlementTable(null);
                      setBillDetails(null);
                    }}
                    className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body: Two Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Itemized Dish Summary */}
                  <div className="space-y-3.5 bg-black/50 p-5 rounded-3xl border border-white/[0.08] flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5 text-[#FA2D48]" />
                        <span>Itemized Order Breakdown</span>
                      </span>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                        {billDetails.items && billDetails.items.length > 0 ? (
                          billDetails.items.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]"
                            >
                              <div className="truncate pr-2">
                                <span className="font-bold text-white">{item.name}</span>
                                <span className="text-neutral-400 ml-1.5 font-mono">× {item.quantity}</span>
                              </div>
                              <span className="font-mono text-white font-bold shrink-0">
                                ₹{item.subtotal.toFixed(2)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="py-6 text-center text-xs text-neutral-500 font-mono">
                            No dishes recorded in this session
                          </div>
                        )}
                      </div>

                      <div className="pt-3 mt-3 border-t border-dashed border-white/15 space-y-2 text-xs">
                        <div className="flex justify-between text-neutral-400">
                          <span>Subtotal:</span>
                          <span className="text-white font-mono font-bold">₹{billDetails.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>GST (5%):</span>
                          <span className="text-white font-mono font-bold">₹{billDetails.taxAmount.toFixed(2)}</span>
                        </div>

                        {/* Discount Options: Flat vs Percent */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 font-bold text-neutral-300 text-xs">
                              <span>Discount:</span>
                              <span className="text-[10px] text-emerald-400 font-mono">
                                (-₹{calculatedDiscount.toFixed(2)})
                              </span>
                            </span>

                            <div className="flex items-center gap-1 bg-white/[0.05] p-0.5 rounded-full border border-white/10">
                              <button
                                type="button"
                                onClick={() => setDiscountType("FLAT")}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                  discountType === "FLAT"
                                    ? "bg-white text-black"
                                    : "text-neutral-400 hover:text-white"
                                }`}
                              >
                                ₹ Flat
                              </button>
                              <button
                                type="button"
                                onClick={() => setDiscountType("PERCENT")}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                  discountType === "PERCENT"
                                    ? "bg-white text-black"
                                    : "text-neutral-400 hover:text-white"
                                }`}
                              >
                                % Pct
                              </button>
                            </div>
                          </div>

                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-neutral-500 font-bold">
                              {discountType === "FLAT" ? "₹" : "%"}
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={discountInput}
                              onChange={(e) => setDiscountInput(e.target.value)}
                              placeholder="0"
                              className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono font-bold focus:outline-none focus:border-white/30"
                            />
                          </div>

                          {/* Quick Discount Presets */}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            {["5", "10", "15", "20"].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => {
                                  setDiscountType("PERCENT");
                                  setDiscountInput(pct);
                                }}
                                className="px-2.5 py-0.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-[10px] font-mono font-bold text-neutral-300 border border-white/5 cursor-pointer transition-colors"
                              >
                                {pct}%
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setDiscountType("FLAT");
                                setDiscountInput("0");
                              }}
                              className="px-2.5 py-0.5 rounded-full bg-white/[0.05] hover:bg-rose-500/20 text-[10px] font-bold text-rose-400 border border-white/5 cursor-pointer transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Net Grand Total Banner */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FA2D48]/15 via-rose-950/20 to-transparent border border-[#FA2D48]/30 flex items-center justify-between shadow-lg">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 block">
                          Net Payable
                        </span>
                        <span className="text-[11px] text-neutral-400">All taxes included</span>
                      </div>
                      <span className="font-['Outfit'] text-3xl font-black text-white tracking-tight">
                        ₹{currentNetTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Payment Mode (Single vs Split) */}
                  <div className="space-y-4">
                    {/* Mode Selector Toggle */}
                    <div>
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide block mb-1.5">
                        Payment Mode
                      </span>
                      <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-white/[0.04] border border-white/10">
                        <button
                          type="button"
                          onClick={() => setPaymentMode("SINGLE")}
                          className={`py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
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
                          className={`py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            paymentMode === "SPLIT"
                              ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
                              : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          Split Payment
                        </button>
                      </div>
                    </div>

                    {/* Customer Phone */}
                    <div>
                      <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block mb-1">
                        Customer Mobile (Digital Invoice)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                        <input
                          type="text"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-white/30"
                        />
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
                              className={`py-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 border transition-all cursor-pointer ${
                                singleMethod === m
                                  ? "bg-white text-black border-white shadow-lg shadow-white/10 scale-[1.02]"
                                  : "bg-white/[0.04] text-neutral-300 border-white/10 hover:border-white/25 hover:bg-white/[0.08]"
                              }`}
                            >
                              {m === "CASH" && <Banknote className="h-4 w-4 text-emerald-500" />}
                              {m === "UPI" && <QrCode className="h-4 w-4 text-sky-500" />}
                              {m === "CARD" && <CreditCard className="h-4 w-4 text-violet-500" />}
                              <span>{m}</span>
                            </button>
                          ))}
                        </div>

                        {singleMethod === "CASH" && (
                          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] text-neutral-400 font-bold block">
                                Cash Tendered (₹)
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setCashTendered(String(currentNetTotal))}
                                  className="px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[10px] font-bold text-neutral-300 border border-white/5 cursor-pointer"
                                >
                                  Exact
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCashTendered(String(Math.ceil(currentNetTotal / 100) * 100))
                                  }
                                  className="px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[10px] font-bold text-neutral-300 border border-white/5 cursor-pointer"
                                >
                                  Round 100
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCashTendered(String(Math.ceil(currentNetTotal / 500) * 500))
                                  }
                                  className="px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[10px] font-bold text-neutral-300 border border-white/5 cursor-pointer"
                                >
                                  Round 500
                                </button>
                              </div>
                            </div>

                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neutral-500 font-bold">
                                ₹
                              </span>
                              <input
                                type="number"
                                value={cashTendered}
                                onChange={(e) => setCashTendered(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm font-mono font-bold text-white focus:outline-none focus:border-white/30"
                              />
                            </div>

                            {Number(cashTendered) >= currentNetTotal && (
                              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center text-xs font-bold text-emerald-400">
                                <span>Change Return:</span>
                                <span className="font-mono text-sm font-black">
                                  ₹{(Number(cashTendered) - currentNetTotal).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Split Payment Form (Cash + UPI + Card) */
                      <div className="p-4 rounded-3xl bg-black/60 border border-white/10 space-y-3 shadow-inner">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                            <ArrowRightLeft className="h-3.5 w-3.5 text-[#FA2D48]" />
                            <span>Split Breakdown</span>
                          </span>
                          <span className="font-mono text-xs font-bold text-white bg-white/[0.08] px-2.5 py-0.5 rounded-full border border-white/10">
                            Target: ₹{currentNetTotal.toFixed(2)}
                          </span>
                        </div>

                      <div className="p-4 rounded-3xl bg-[#1c1c1f]/90 border border-white/[0.08] backdrop-blur-2xl space-y-3.5 shadow-2xl">
                        <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                          <span className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                            <span className="p-1 rounded-lg bg-[#FA2D48]/10 text-[#FA2D48] border border-[#FA2D48]/20">
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </span>
                            <span>Split Allocation</span>
                          </span>
                          <span className="font-mono text-xs font-bold text-neutral-200 bg-white/[0.06] px-3 py-1 rounded-full border border-white/[0.08]">
                            Target: <span className="text-white">₹{currentNetTotal.toFixed(2)}</span>
                          </span>
                        </div>

                        <div className="space-y-2">
                          {/* Cash Portion */}
                          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all">
                            <div className="w-20 px-2.5 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 flex items-center gap-1.5 text-xs font-bold shrink-0">
                              <Banknote className="h-3.5 w-3.5" />
                              <span>Cash</span>
                            </div>
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-500">
                                ₹
                              </span>
                              <input
                                type="number"
                                value={splitCash}
                                onChange={(e) => setSplitCash(e.target.value)}
                                className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#121214] border border-white/[0.08] focus:border-[#FA2D48]/50 focus:ring-1 focus:ring-[#FA2D48]/30 text-sm font-mono font-bold text-white focus:outline-none transition-all placeholder-neutral-600"
                                placeholder="0.00"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const other = (parseFloat(splitUpi) || 0) + (parseFloat(splitCard) || 0);
                                const rem = Math.max(0, parseFloat((currentNetTotal - other).toFixed(2)));
                                setSplitCash(rem > 0 ? (Number.isInteger(rem) ? String(rem) : rem.toFixed(2)) : "0");
                              }}
                              className="shrink-0 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-[#FA2D48] text-neutral-300 hover:text-white border border-white/[0.08] hover:border-transparent text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                            >
                              Fill Rem.
                            </button>
                          </div>

                          {/* UPI Portion */}
                          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all">
                            <div className="w-20 px-2.5 py-2 rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-400 flex items-center gap-1.5 text-xs font-bold shrink-0">
                              <QrCode className="h-3.5 w-3.5" />
                              <span>UPI</span>
                            </div>
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-500">
                                ₹
                              </span>
                              <input
                                type="number"
                                value={splitUpi}
                                onChange={(e) => setSplitUpi(e.target.value)}
                                className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#121214] border border-white/[0.08] focus:border-[#FA2D48]/50 focus:ring-1 focus:ring-[#FA2D48]/30 text-sm font-mono font-bold text-white focus:outline-none transition-all placeholder-neutral-600"
                                placeholder="0.00"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const other = (parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0);
                                const rem = Math.max(0, parseFloat((currentNetTotal - other).toFixed(2)));
                                setSplitUpi(rem > 0 ? (Number.isInteger(rem) ? String(rem) : rem.toFixed(2)) : "0");
                              }}
                              className="shrink-0 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-[#FA2D48] text-neutral-300 hover:text-white border border-white/[0.08] hover:border-transparent text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                            >
                              Fill Rem.
                            </button>
                          </div>

                          {/* Card Portion */}
                          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all">
                            <div className="w-20 px-2.5 py-2 rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400 flex items-center gap-1.5 text-xs font-bold shrink-0">
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Card</span>
                            </div>
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-neutral-500">
                                ₹
                              </span>
                              <input
                                type="number"
                                value={splitCard}
                                onChange={(e) => setSplitCard(e.target.value)}
                                className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#121214] border border-white/[0.08] focus:border-[#FA2D48]/50 focus:ring-1 focus:ring-[#FA2D48]/30 text-sm font-mono font-bold text-white focus:outline-none transition-all placeholder-neutral-600"
                                placeholder="0.00"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const other = (parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0);
                                const rem = Math.max(0, parseFloat((currentNetTotal - other).toFixed(2)));
                                setSplitCard(rem > 0 ? (Number.isInteger(rem) ? String(rem) : rem.toFixed(2)) : "0");
                              }}
                              className="shrink-0 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-[#FA2D48] text-neutral-300 hover:text-white border border-white/[0.08] hover:border-transparent text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                            >
                              Fill Rem.
                            </button>
                          </div>
                        </div>

                        {/* Status Footer: No bar, clean Apple badge */}
                        {(() => {
                          const cashVal = Number(splitCash) || 0;
                          const upiVal = Number(splitUpi) || 0;
                          const cardVal = Number(splitCard) || 0;
                          const sum = cashVal + upiVal + cardVal;
                          const diff = currentNetTotal - sum;

                          return (
                            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs font-mono">
                              <div className="flex items-center gap-1.5 text-neutral-400">
                                <span>Allocated:</span>
                                <span className="text-white font-bold text-sm">₹{sum.toFixed(2)}</span>
                              </div>
                              {Math.abs(diff) <= 0.05 ? (
                                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                                  <Check className="h-3.5 w-3.5" /> Fully Balanced
                                </span>
                              ) : diff > 0 ? (
                                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs">
                                  ₹{diff.toFixed(2)} remaining
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-xs">
                                  ₹{Math.abs(diff).toFixed(2)} over
                                </span>
                              )}
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
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FA2D48] to-[#ff3b56] hover:from-[#ff3b56] hover:to-[#ff526c] disabled:opacity-50 text-white font-['Outfit'] font-black text-sm tracking-wider uppercase transition-all duration-200 active:scale-[0.99] shadow-xl shadow-[#FA2D48]/30 flex items-center justify-center gap-2 cursor-pointer mt-3"
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

      {/* ================= MODAL 2: TABLE TRANSFER ================= */}
      {transferSourceTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#1c1c1f]/95 border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-[#FA2D48]" />
                <h3 className="font-sans text-base font-bold text-white">
                  Transfer Table #{transferSourceTable.tableNumber}
                </h3>
              </div>
              <button
                onClick={() => setTransferSourceTable(null)}
                className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Move active dining session and pending kitchen courses from Table #{transferSourceTable.tableNumber} to an unoccupied destination table.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">
                Select Destination Table
              </label>

              {availableDestTables.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center text-xs text-amber-400">
                  No other tables are currently available for transfer.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {availableDestTables.map((dest) => (
                    <button
                      key={dest.id}
                      type="button"
                      onClick={() => setTransferDestTableNumber(dest.tableNumber)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        transferDestTableNumber === dest.tableNumber
                          ? "bg-white text-black border-white shadow-lg font-black"
                          : "bg-white/[0.04] text-white border-white/10 hover:border-white/20 font-bold"
                      }`}
                    >
                      <span className="block text-sm">Table #{dest.tableNumber}</span>
                      <span className="block text-[10px] text-neutral-400">
                        Cap: {dest.capacity}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setTransferSourceTable(null)}
                className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!transferDestTableNumber || isTransferring}
                onClick={handleExecuteTransfer}
                className="px-5 py-2 rounded-full bg-[#FA2D48] hover:bg-[#ff3b56] disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-[#FA2D48]/30"
              >
                {isTransferring ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: DIRECT TABLE ORDER ENTRY (ADD DISHES) ================= */}
      {punchTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-[#1c1c1f]/95 border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-[#FA2D48]" />
                <h3 className="font-sans text-base font-bold text-white">
                  Add Dishes to Table #{punchTable.tableNumber}
                </h3>
              </div>
              <button
                onClick={() => setPunchTable(null)}
                className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Menu Browser */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-300 z-10 pointer-events-none stroke-[2.2]" />
                  <input
                    type="text"
                    value={punchSearch}
                    onChange={(e) => setPunchSearch(e.target.value)}
                    placeholder="Search dishes to add..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-[#FA2D48]/50 backdrop-blur-xl"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setPunchActiveCat("ALL")}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                      punchActiveCat === "ALL"
                        ? "bg-[#FA2D48] text-white"
                        : "bg-white/[0.04] text-neutral-400 hover:text-white"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setPunchActiveCat(c.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                        punchActiveCat === c.id
                          ? "bg-[#FA2D48] text-white"
                          : "bg-white/[0.04] text-neutral-400 hover:text-white"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {filteredPunchDishes.map((dish) => {
                    const cartEntry = punchCart.find((ci) => ci.item.id === dish.id);
                    const isSoldOut =
                      !dish.isAvailable ||
                      (dish.inventory !== undefined && dish.inventory !== null && dish.inventory.remainingQty <= 0);
                    const remaining =
                      dish.inventory !== undefined && dish.inventory !== null ? dish.inventory.remainingQty : null;
                    const isLowStock = remaining !== null && remaining > 0 && remaining <= 5 && !isSoldOut;

                    return (
                      <div
                        key={dish.id}
                        onClick={() => {
                          if (isSoldOut) {
                            toast.error(`"${dish.name}" is out of stock!`);
                            return;
                          }
                          addToPunchCart(dish);
                        }}
                        className={`p-3 rounded-2xl border transition-all flex flex-col justify-between select-none ${
                          isSoldOut
                            ? "bg-white/[0.01] border-white/5 opacity-50 cursor-not-allowed"
                            : cartEntry
                            ? "bg-[#FA2D48]/10 border-[#FA2D48]/40 cursor-pointer shadow-md shadow-[#FA2D48]/10"
                            : "bg-white/[0.03] hover:bg-white/[0.08] border-white/5 cursor-pointer"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className={`text-xs font-bold block line-clamp-1 ${isSoldOut ? "text-neutral-500" : "text-white"}`}>
                              {dish.name}
                            </span>
                            {isSoldOut ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                                Sold Out
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FA2D48]/15 border border-[#FA2D48]/35 text-[#FA2D48] text-[9px] font-black uppercase tracking-wider shrink-0 shadow-sm">
                                <Flame className="h-2.5 w-2.5 fill-[#FA2D48]" />
                                {remaining} left
                              </span>
                            ) : null}
                          </div>

                          <span className="font-['Outfit'] text-xs font-black text-[#FA2D48] mt-1 block">
                            ₹{Number(dish.price).toFixed(2)}
                          </span>
                        </div>

                        {cartEntry && (
                          <div className="mt-2 text-right">
                            <span className="px-2 py-0.5 rounded-full bg-[#FA2D48] text-white text-[10px] font-black">
                              Qty: {cartEntry.quantity}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Order Basket */}
              <div className="bg-white/[0.03] p-4.5 rounded-3xl border border-white/5 flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-wide">Selected Items</span>
                    <button
                      onClick={() => setPunchCart([])}
                      className="text-[11px] text-[#FA2D48] font-bold hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  <div
                    className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-none"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.12) transparent" }}
                  >
                    {punchCart.length === 0 ? (
                      <div className="text-center py-8 text-xs text-neutral-500">
                        No dishes selected. Tap dishes on the left to add.
                      </div>
                    ) : (
                      punchCart.map((ci) => {
                        const liveDish = categories.flatMap((c) => c.menuItems).find((d) => d.id === ci.item.id) || ci.item;
                        const liveRemaining = liveDish.inventory !== undefined && liveDish.inventory !== null ? liveDish.inventory.remainingQty : null;
                        const isMaxReached = liveRemaining !== null && ci.quantity >= liveRemaining;

                        return (
                          <div
                            key={ci.item.id}
                            className="p-2.5 rounded-2xl bg-white/[0.04] flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white block truncate">
                                  {ci.item.name}
                                </span>
                                {liveRemaining !== null && liveRemaining <= 5 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FA2D48]/15 border border-[#FA2D48]/35 text-[#FA2D48] text-[9px] font-black uppercase tracking-wider shrink-0 shadow-sm">
                                    <Flame className="h-2.5 w-2.5 fill-[#FA2D48]" />
                                    Only {liveRemaining} left
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                ₹{Number(ci.item.price).toFixed(2)} × {ci.quantity}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updatePunchQty(ci.item.id, -1)}
                                className="h-6 w-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs active:scale-90 cursor-pointer transition-colors"
                              >
                                -
                              </button>
                              <span className="w-5 text-center text-xs font-bold text-white font-mono">
                                {ci.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updatePunchQty(ci.item.id, 1)}
                                disabled={isMaxReached}
                                className={`h-6 w-6 rounded-lg text-white flex items-center justify-center text-xs font-bold transition-colors ${
                                  isMaxReached
                                    ? "bg-neutral-700/60 opacity-50 cursor-not-allowed"
                                    : "bg-[#FA2D48] hover:bg-[#ff3b56] cursor-pointer active:scale-90"
                                }`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Kitchen Special Note */}
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">
                      Kitchen Instructions / Notes
                    </label>
                    <input
                      type="text"
                      value={punchNotes}
                      onChange={(e) => setPunchNotes(e.target.value)}
                      placeholder="e.g. Extra spicy, less oil"
                      className="w-full px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <button
                    disabled={punchCart.length === 0 || isPunching}
                    onClick={handleExecutePunch}
                    className="w-full py-3 rounded-full bg-[#FA2D48] hover:bg-[#ff3b56] disabled:opacity-50 text-white font-bold text-xs tracking-wide transition-all cursor-pointer shadow-lg shadow-[#FA2D48]/30"
                  >
                    {isPunching ? "Sending to Kitchen..." : "Dispatch Order to Kitchen"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: EDIT TAKEAWAY TOKEN / ORDER DETAILS ================= */}
      {editingTokenOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#1c1c1f]/95 text-white p-6 rounded-3xl border border-white/[0.08] backdrop-blur-2xl shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-2xl bg-[#FA2D48]/10 text-[#FA2D48] border border-[#FA2D48]/20">
                  <Edit3 className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span>Edit Token</span>
                    <span className="font-mono px-2 py-0.5 rounded-lg bg-white text-black text-xs font-black">
                      {editingTokenOrder.orderNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">Update guest info & cooking instructions</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTokenOrder(null)}
                className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] text-neutral-300 font-semibold uppercase tracking-wider block mb-1.5">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#111113] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#FA2D48]/50 focus:ring-1 focus:ring-[#FA2D48]/30 transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-300 font-semibold uppercase tracking-wider block mb-1.5">
                  Phone (For Token Alert)
                </label>
                <input
                  type="tel"
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#111113] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#FA2D48]/50 focus:ring-1 focus:ring-[#FA2D48]/30 transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-300 font-semibold uppercase tracking-wider block mb-1.5">
                  Kitchen Instruction Note (All Items)
                </label>
                <textarea
                  rows={3}
                  value={editOrderNotes}
                  onChange={(e) => setEditOrderNotes(e.target.value)}
                  placeholder="e.g. Extra spicy, pack separately, extra napkins..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#111113] border border-white/[0.08] text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#FA2D48]/50 focus:ring-1 focus:ring-[#FA2D48]/30 transition-all resize-none"
                />
              </div>

              {/* Items in Token summary */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                  Items in Token ({editingTokenOrder.items?.length || 0})
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {editingTokenOrder.items?.map((it) => (
                    <div key={it.id} className="flex justify-between text-xs text-neutral-300">
                      <span>{it.quantity}× {it.name}</span>
                      <span className="font-mono text-neutral-400">₹{Number(it.subtotal).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingTokenOrder(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingTokenEdit}
                onClick={handleSaveTokenEdit}
                className="px-5 py-2 rounded-xl bg-[#FA2D48] hover:bg-[#ff3b56] text-white text-xs font-bold transition-all shadow-md shadow-[#FA2D48]/30 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingTokenEdit ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: THERMAL RECEIPT / TOKEN SLIP / KOT / SHIFT REPORT ================= */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#161618] text-white p-6 rounded-3xl border border-white/[0.08] shadow-2xl space-y-4 font-mono text-xs print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
            {/* Action Bar (Hidden when printing) */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 print:hidden">
              <span className="font-bold text-neutral-400 uppercase text-[10px]">
                {activeReceipt.isShiftReport
                  ? "Shift Closeout Report"
                  : activeReceipt.isTokenSlip
                  ? "Customer Token Slip"
                  : activeReceipt.isKOT
                  ? "Kitchen Order Ticket (KOT)"
                  : activeReceipt.isProforma
                  ? "Pre-bill Check Preview"
                  : "Tax Invoice Preview"}
              </span>
              <div className="flex items-center gap-2">
                {activeReceipt.isTokenSlip && activeReceipt.orderNumber && (
                  <button
                    onClick={() => {
                      const found = takeawayOrders.find(
                        (o) => o.orderNumber === activeReceipt.orderNumber
                      );
                      if (found) {
                        handleOpenEditTokenModal(found);
                      } else {
                        handleOpenEditTokenModal({
                          id: activeReceipt.orderId || 0,
                          orderNumber: activeReceipt.orderNumber,
                          status: "PREPARING",
                          customerName: activeReceipt.customerName || "",
                          customerPhone: activeReceipt.customerPhone || "",
                          notes: activeReceipt.notes || "",
                          totalAmount: activeReceipt.grandTotal || 0,
                          items: activeReceipt.items || [],
                          payments: activeReceipt.payments || [],
                          sessionCode: activeReceipt.invoiceNumber || "",
                          createdAt: activeReceipt.dateTime || new Date().toISOString(),
                          orderedAt: activeReceipt.dateTime || new Date().toISOString(),
                        });
                      }
                    }}
                    className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-[#FA2D48] text-neutral-300 hover:text-white border border-white/10 hover:border-transparent text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Edit Customer Info or Cooking Notes"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer text-xs transition-all"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* If Takeaway Order: Format Switcher Tabs (Hidden when printing) */}
            {(activeReceipt.orderNumber?.startsWith("TK-") || activeReceipt.tableNumber === "Takeaway") &&
              !activeReceipt.isShiftReport && (
                <div className="flex items-center justify-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/10 print:hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReceipt((prev: any) => ({
                        ...prev,
                        isTokenSlip: true,
                        isKOT: false,
                        isProforma: false,
                      }))
                    }
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      activeReceipt.isTokenSlip
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Token Slip
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReceipt((prev: any) => ({
                        ...prev,
                        isTokenSlip: false,
                        isKOT: true,
                        isProforma: false,
                      }))
                    }
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      activeReceipt.isKOT
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Kitchen KOT
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReceipt((prev: any) => ({
                        ...prev,
                        isTokenSlip: false,
                        isKOT: false,
                        isProforma: false,
                      }))
                    }
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      !activeReceipt.isTokenSlip && !activeReceipt.isKOT
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Tax Invoice
                  </button>
                </div>
              )}

            {/* FORMAT 1: Shift Closeout Report */}
            {activeReceipt.isShiftReport ? (
              <div id="thermal-receipt" className="text-center space-y-2 text-white print:text-black">
                <div>
                  <h2 className="font-black text-base uppercase tracking-wider">SERVE_SYNC POS</h2>
                  <p className="text-[10px] text-neutral-400 print:text-neutral-600">DAILY REGISTER SHIFT REPORT</p>
                </div>

                <div className="border-t border-b border-dashed border-white/15 print:border-neutral-400 py-2 text-[11px] text-left space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">CASHIER:</span>
                    <span className="font-bold">{activeReceipt.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">DATE:</span>
                    <span>{new Date(activeReceipt.dateTime).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">TIME:</span>
                    <span>
                      {new Date(activeReceipt.dateTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="text-left space-y-1 py-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">TOTAL SETTLED BILLS:</span>
                    <span className="font-bold">{activeReceipt.settledBillsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">ACTIVE TABLES LOAD:</span>
                    <span>{activeReceipt.activeTablesCount}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-white/15 print:border-neutral-400 pt-2 text-left space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">CASH IN DRAWER:</span>
                    <span className="font-bold text-emerald-400 print:text-black">₹{Number(activeReceipt.cashTotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">UPI COLLECTIONS:</span>
                    <span className="font-bold text-sky-400 print:text-black">₹{Number(activeReceipt.upiTotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">CARD VOLUME:</span>
                    <span className="font-bold text-violet-400 print:text-black">₹{Number(activeReceipt.cardTotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm border-t border-white/15 print:border-neutral-400 pt-1">
                    <span>TOTAL GROSS:</span>
                    <span className="font-bold text-white print:text-black">₹{Number(activeReceipt.totalRevenue).toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-white/15 print:border-neutral-400 pt-6 space-y-4 text-[10px] text-left text-neutral-400 print:text-neutral-600">
                  <div className="border-t border-white/15 print:border-neutral-400 pt-1 flex justify-between">
                    <span>Cashier Signature</span>
                    <span>Manager Verification</span>
                  </div>
                </div>
              </div>
            ) : activeReceipt.isTokenSlip ? (
              /* FORMAT 2: Customer Takeaway Token Slip */
              <div id="thermal-receipt" className="text-center space-y-3 text-white print:text-black">
                <div className="text-center">
                  <h2 className="font-black text-base uppercase tracking-wider text-white print:text-black">SERVE_SYNC DINING</h2>
                  <p className="text-[10px] text-neutral-400 print:text-neutral-600 uppercase font-semibold tracking-wider">
                    Customer Takeaway Token
                  </p>
                </div>

                {/* Massive Token Box: Apple Wallet Ticket on screen, Solid Black on print */}
                <div className="py-4 px-3 bg-gradient-to-b from-[#222226] to-[#121214] text-white text-center rounded-2xl border border-white/10 shadow-lg print:bg-black print:text-white print:border-neutral-800">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 print:text-neutral-400 block">
                    YOUR PICKUP TOKEN
                  </span>
                  <span className="text-4xl font-black font-mono tracking-widest text-[#FA2D48] print:text-white block my-1 drop-shadow-[0_0_12px_rgba(250,45,72,0.35)] print:drop-shadow-none">
                    {activeReceipt.orderNumber || "TK-0000"}
                  </span>
                  <span className="text-xs text-neutral-200 print:text-neutral-300 block font-semibold">
                    {activeReceipt.customerName || "Walk-in Guest"}{" "}
                    {activeReceipt.customerPhone ? `• ${activeReceipt.customerPhone}` : ""}
                  </span>
                </div>

                <div className="border-t border-b border-dashed border-white/15 print:border-neutral-400 py-1.5 text-[10px] text-left flex justify-between text-neutral-400 print:text-neutral-600">
                  <span>DATE: {new Date(activeReceipt.dateTime).toLocaleDateString()}</span>
                  <span>
                    TIME:{" "}
                    {new Date(activeReceipt.dateTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Items Summary */}
                <div className="text-left space-y-1 py-1">
                  <div className="flex justify-between font-bold border-b border-white/15 print:border-neutral-300 pb-1 text-[11px] text-neutral-300 print:text-black">
                    <span>ITEM</span>
                    <span>QTY</span>
                  </div>
                  {activeReceipt.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs py-0.5 text-neutral-200 print:text-black">
                      <span className="truncate max-w-[200px] font-semibold">{item.name}</span>
                      <span className="font-mono font-bold">× {item.quantity}</span>
                    </div>
                  ))}
                </div>

                {activeReceipt.notes && (
                  <div className="text-[10px] text-left p-2 bg-white/[0.04] border border-white/10 rounded-xl text-neutral-300 print:bg-neutral-100 print:border-neutral-200 print:text-black">
                    <span className="font-bold block text-[#FA2D48] print:text-neutral-600">NOTE:</span>
                    <span>{activeReceipt.notes}</span>
                  </div>
                )}

                <div className="border-t border-dashed border-white/15 print:border-neutral-400 pt-2 flex justify-between font-bold text-xs text-white print:text-black">
                  <span>TOTAL PAID:</span>
                  <span className="font-mono text-sm">₹{Number(activeReceipt.grandTotal).toFixed(2)}</span>
                </div>

                <div className="text-[10px] text-neutral-400 print:text-neutral-600 pt-2 border-t border-dashed border-white/15 print:border-neutral-300 space-y-0.5">
                  <p className="font-bold text-neutral-300 print:text-black">Please retain this slip.</p>
                  <p>Wait for your token number to be announced at the counter.</p>
                  <p>Estimated prep time: 10 - 15 minutes.</p>
                </div>
              </div>
            ) : activeReceipt.isKOT ? (
              /* FORMAT 3: Kitchen Order Ticket (KOT) */
              <div id="thermal-receipt" className="text-center space-y-2 text-white print:text-black">
                <div className="py-1 bg-white/[0.08] text-white print:bg-black print:text-white font-black text-xs uppercase tracking-widest rounded-lg">
                  *** KITCHEN ORDER TICKET (KOT) ***
                </div>

                <div className="border-b border-dashed border-white/15 print:border-neutral-400 py-1.5 text-left text-xs space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>STATION: TAKEAWAY</span>
                    <span className="text-sm font-black font-mono text-[#FA2D48] print:text-black">
                      TOKEN: {activeReceipt.orderNumber}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400 print:text-neutral-600">
                    <span>GUEST: {activeReceipt.customerName || "Takeaway"}</span>
                    <span>
                      {new Date(activeReceipt.dateTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Items Big List */}
                <div className="text-left space-y-1.5 py-1">
                  <div className="flex justify-between font-bold border-b border-white/15 print:border-neutral-400 pb-1 text-xs text-neutral-300 print:text-black">
                    <span>QTY</span>
                    <span>DISH NAME & INSTRUCTIONS</span>
                  </div>
                  {activeReceipt.items?.map((item: any, idx: number) => (
                    <div key={idx} className="border-b border-white/5 print:border-neutral-200 pb-1">
                      <div className="flex items-baseline gap-2 text-sm font-black">
                        <span className="font-mono text-base text-white print:text-black">{item.quantity}×</span>
                        <span className="text-neutral-200 print:text-black">{item.name}</span>
                      </div>
                      {item.notes && (
                        <span className="text-[11px] text-amber-400 print:text-neutral-600 italic block pl-6">
                          * {item.notes}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {activeReceipt.notes && (
                  <div className="text-left p-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs font-bold text-neutral-200 print:bg-neutral-100 print:border-neutral-300 print:text-black">
                    INSTRUCTION: {activeReceipt.notes}
                  </div>
                )}
              </div>
            ) : (
              /* FORMAT 4: Standard Tax Invoice or Pre-Bill Check */
              <div id="thermal-receipt" className="text-center space-y-2 text-white print:text-black">
                <div className="text-center">
                  <h2 className="font-black text-base uppercase tracking-wider text-white print:text-black">SERVE_SYNC DINING</h2>
                  <p className="text-[10px] text-neutral-400 print:text-neutral-600">Contactless Table & POS System</p>
                  <p className="text-[10px] text-neutral-400 print:text-neutral-600">GSTIN: 29ABCDE1234F1Z5</p>
                  {activeReceipt.isProforma && (
                    <div className="mt-1 py-0.5 px-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 print:bg-neutral-100 print:border-neutral-300 font-bold text-[10px] uppercase tracking-wider print:text-black rounded-lg">
                      *** PRE-BILL / CHECK - NOT AN INVOICE ***
                    </div>
                  )}
                  {activeReceipt.orderNumber && (
                    <div className="mt-1 font-mono font-bold text-xs bg-white/[0.06] text-white print:bg-neutral-100 print:text-black py-1 rounded-xl">
                      TOKEN #{activeReceipt.orderNumber}
                    </div>
                  )}
                </div>

                <div className="border-t border-b border-dashed border-white/15 print:border-neutral-400 py-2 text-[11px] text-left space-y-1">
                  <div className="flex justify-between text-neutral-300 print:text-black">
                    <span>{activeReceipt.isProforma ? "REF:" : "INV:"} {activeReceipt.invoiceNumber}</span>
                    <span>TBL: #{activeReceipt.tableNumber}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400 print:text-neutral-600">
                    <span>DATE: {new Date(activeReceipt.dateTime).toLocaleDateString()}</span>
                    <span>
                      TIME:{" "}
                      {new Date(activeReceipt.dateTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400 print:text-neutral-600">
                    <span>CASHIER: {user?.fullName || "Staff"}</span>
                    {activeReceipt.customerName && (
                      <span className="truncate max-w-[140px] text-neutral-200 print:text-black">
                        CUST: {activeReceipt.customerName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="text-left space-y-1 py-1">
                  <div className="flex justify-between font-bold border-b border-white/15 print:border-neutral-300 pb-1 text-neutral-300 print:text-black">
                    <span>ITEM</span>
                    <span>QTY</span>
                    <span>PRICE</span>
                  </div>
                  {activeReceipt.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px] text-neutral-200 print:text-black">
                      <span className="truncate max-w-[140px]">{item.name}</span>
                      <span className="font-mono">× {item.quantity}</span>
                      <span className="font-mono">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-white/15 print:border-neutral-400 pt-2 text-left space-y-1">
                  <div className="flex justify-between text-neutral-400 print:text-neutral-600">
                    <span>Subtotal:</span>
                    <span className="text-white print:text-black">₹{Number(activeReceipt.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400 print:text-neutral-600">
                    <span>GST (5%):</span>
                    <span className="text-white print:text-black">₹{Number(activeReceipt.taxAmount).toFixed(2)}</span>
                  </div>
                  {activeReceipt.packagingCharge > 0 && (
                    <div className="flex justify-between text-neutral-400 print:text-neutral-600">
                      <span>Packaging Fee:</span>
                      <span className="text-white print:text-black">₹{Number(activeReceipt.packagingCharge).toFixed(2)}</span>
                    </div>
                  )}
                  {activeReceipt.discount > 0 && (
                    <div className="flex justify-between text-emerald-400 print:text-neutral-600">
                      <span>Discount:</span>
                      <span>-₹{Number(activeReceipt.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm border-t border-white/15 print:border-neutral-400 pt-1 text-white print:text-black">
                    <span>{activeReceipt.isProforma ? "AMOUNT DUE:" : "NET TOTAL:"}</span>
                    <span className="font-mono">₹{Number(activeReceipt.grandTotal).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Methods (If Settled) */}
                {!activeReceipt.isProforma && activeReceipt.payments && activeReceipt.payments.length > 0 && (
                  <div className="border-t border-b border-dashed border-white/15 print:border-neutral-400 py-1.5 text-left text-[11px]">
                    <span className="font-bold block text-neutral-300 print:text-black">PAID VIA:</span>
                    {activeReceipt.payments.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-neutral-300 print:text-black">
                        <span>• {p.method}:</span>
                        <span className="font-mono">₹{Number(p.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-neutral-400 print:text-neutral-600 pt-1">
                  {activeReceipt.isProforma ? (
                    <p>Please pay at the cashier counter. Thank you!</p>
                  ) : (
                    <>
                      <p>Thank you for choosing Serve_Sync!</p>
                      <p>Visit again soon.</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
