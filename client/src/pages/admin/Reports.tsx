import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Download,
  Receipt,
  Star,
  RefreshCw,
  TrendingUp,
  Printer,
  PieChart as PieChartIcon,
  ShoppingBag,
  X,
  Search,
  FileText,
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
import axiosInstance from "../../api/axiosInstance";
import { socket } from "../../lib/socket";

interface CashierStats {
  totalRevenue: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  settledBillsCount: number;
  activeTablesCount: number;
  billingTablesCount: number;
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
  payments: { method: string; amount: number }[];
  items: { name: string; quantity: number; price: number; subtotal: number }[];
  review?: {
    id?: number;
    rating: number;
    feedback?: string | null;
    tags?: string[];
    customerName?: string | null;
    createdAt?: string;
  } | null;
}

interface ReviewItem {
  id: number;
  tableNumber: number | string | null;
  sessionCode: string | null;
  customerName?: string | null;
  rating: number;
  feedback?: string | null;
  tags?: string[];
  createdAt: string;
  diningSession?: {
    sessionCode: string;
    totalAmount: string | number;
    payments?: Array<{ paymentMethod: string; amount: string | number }>;
  } | null;
}

interface ActiveReceiptData {
  isShiftReport?: boolean;
  cashierName?: string;
  dateTime: string;
  invoiceNumber?: string;
  tableNumber?: number | string;
  subtotal?: number;
  taxAmount?: number;
  discount?: number;
  packagingCharge?: number;
  grandTotal?: number;
  totalRevenue?: number;
  cashTotal?: number;
  upiTotal?: number;
  cardTotal?: number;
  settledBillsCount?: number;
  activeTablesCount?: number;
  payments?: { method: string; amount: number }[];
  items?: { name: string; quantity: number; price: number; subtotal: number }[];
  customerName?: string;
  notes?: string;
  review?: {
    id?: number;
    rating: number;
    feedback?: string | null;
    tags?: string[];
    customerName?: string | null;
  } | null;
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
  stats: CashierStats | null;
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
  const aov = totalBills > 0 ? (totalRevenue / totalBills).toFixed(2) : "0.00";

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
              <h3 className="font-sans font-bold text-white text-sm">Payment Methods Breakdown</h3>
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
            <p className="text-[11px] text-neutral-600">Settle bills to view tender distribution</p>
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
              {/* Centered Donut Label */}
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
                      Reconciled Total
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
                    <span className="text-xs font-bold text-white">Cash Register</span>
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
                    <span className="text-xs font-bold text-white">UPI & QR Pay</span>
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
                    <span className="text-xs font-bold text-white">Card Terminal (POS)</span>
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

      {/* 6 cols: Hourly Revenue Curve / Bar Chart */}
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
                  <span>Live Auditing</span>
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
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Awaiting Settlement Data</h4>
                <p className="text-[11px] text-neutral-400 max-w-xs mx-auto leading-relaxed">
                  Hourly revenue bars will plot dynamically as closed bills are registered.
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
                    <linearGradient id="reportsBarGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FA2D48" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#FA2D48" stopOpacity={0.25} />
                    </linearGradient>
                    <linearGradient id="reportsPeakBarGlow" x1="0" y1="0" x2="0" y2="1">
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
                          fill={isPeak ? "url(#reportsPeakBarGlow)" : "url(#reportsBarGlow)"}
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

/* ─────────────────────────── MAIN EOD & REPORTS COMPONENT ─────────────────────────── */
export default function Reports() {
  const user = useMemo(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, []);

  const [rangeFilter, setRangeFilter] = useState<"today" | "all">("today");
  const [stats, setStats] = useState<CashierStats | null>(null);
  const [history, setHistory] = useState<SettledBill[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Search & Type Filters for Ledger
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "table" | "takeaway">("all");

  // Active Receipt / Shift Report Modal State
  const [activeReceipt, setActiveReceipt] = useState<ActiveReceiptData | null>(null);

  const loadData = useCallback(async (showToast = false) => {
    try {
      setIsLoading(true);
      const [statsRes, historyRes, reviewsRes] = await Promise.all([
        axiosInstance.get(`/cashier/stats?range=${rangeFilter}`).catch(() => ({ data: null })),
        axiosInstance.get(`/cashier/history?range=${rangeFilter}`).catch(() => ({ data: [] })),
        axiosInstance.get(`/customer/reviews`).catch(() => ({ data: [] })),
      ]);

      if (statsRes?.data) setStats(statsRes.data);
      if (Array.isArray(historyRes?.data)) setHistory(historyRes.data);
      if (Array.isArray(reviewsRes?.data)) setReviews(reviewsRes.data);

      if (showToast) {
        toast.success("EOD metrics synchronized live");
      }
    } catch (err) {
      console.error("Error loading EOD data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [rangeFilter]);

  useEffect(() => {
    loadData();

    const handleBillSettled = () => {
      loadData();
    };

    const handleNewReview = (newReview: any) => {
      setReviews((prev) => [newReview, ...prev]);
      if (newReview.sessionCode) {
        setHistory((prev) =>
          prev.map((s) =>
            s.sessionCode === newReview.sessionCode
              ? {
                  ...s,
                  review: {
                    id: newReview.id,
                    rating: newReview.rating,
                    feedback: newReview.feedback,
                    tags: newReview.tags,
                    customerName: newReview.customerName,
                    createdAt: newReview.createdAt,
                  },
                }
              : s
          )
        );
      }
    };

    socket.on("cashier:bill_settled", handleBillSettled);
    socket.on("customer:review", handleNewReview);

    return () => {
      socket.off("cashier:bill_settled", handleBillSettled);
      socket.off("customer:review", handleNewReview);
    };
  }, [loadData]);

  // Derived Financial Metrics
  const totalRevenue = stats?.totalRevenue ?? history.reduce((sum, h) => sum + h.totalAmount, 0);
  const settledCount = stats?.settledBillsCount ?? history.length;
  const avgTicket = settledCount > 0 ? totalRevenue / settledCount : 0;

  // 5% GST inclusive: Tax = Total * (5 / 105)
  const taxCollected = totalRevenue * (5 / 105);
  const grossFoodSales = totalRevenue - taxCollected;
  const halfTax = taxCollected / 2; // CGST (2.5%) & SGST (2.5%)

  // Gateway breakdown
  const upiTotal = stats?.upiTotal ?? history.reduce((sum, h) => sum + h.payments.filter(p => p.method === "UPI").reduce((pSum, p) => pSum + p.amount, 0), 0);
  const cardTotal = stats?.cardTotal ?? history.reduce((sum, h) => sum + h.payments.filter(p => p.method === "CARD").reduce((pSum, p) => pSum + p.amount, 0), 0);
  const cashTotal = stats?.cashTotal ?? history.reduce((sum, h) => sum + h.payments.filter(p => p.method === "CASH").reduce((pSum, p) => pSum + p.amount, 0), 0);

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
    if (!history || history.length === 0) return [];

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

  // Guest satisfaction
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return "5.0";
    const total = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const displayReviewsCount = reviews.length;

  // Filter Counts
  const dineInCount = useMemo(() => history.filter((b) => b.tableNumber !== "Takeaway").length, [history]);
  const takeawayCount = useMemo(() => history.filter((b) => b.tableNumber === "Takeaway").length, [history]);

  // Filtered History for Ledger
  const filteredHistory = useMemo(() => {
    return history.filter((b) => {
      if (typeFilter === "table" && b.tableNumber === "Takeaway") return false;
      if (typeFilter === "takeaway" && b.tableNumber !== "Takeaway") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inv = (b.invoiceNumber || "").toLowerCase();
        const code = (b.sessionCode || "").toLowerCase();
        const tbl = String(b.tableNumber).toLowerCase();
        const matchPayments = b.payments?.some((p) => p.method.toLowerCase().includes(q));
        const matchItems = b.items?.some((i) => i.name.toLowerCase().includes(q));
        const matchFeedback = b.review?.feedback?.toLowerCase().includes(q);
        const matchCustomer = b.review?.customerName?.toLowerCase().includes(q);
        const matchTags = b.review?.tags?.some((t) => t.toLowerCase().includes(q));

        if (
          !inv.includes(q) &&
          !code.includes(q) &&
          !tbl.includes(q) &&
          !matchPayments &&
          !matchItems &&
          !matchFeedback &&
          !matchCustomer &&
          !matchTags
        ) {
          return false;
        }
      }

      return true;
    });
  }, [history, typeFilter, searchQuery]);

  // CSV Export
  const handleExportCSV = () => {
    if (history.length === 0) {
      toast.error("No settlement records to export for this period.");
      return;
    }

    try {
      setIsExporting(true);
      const headers = [
        "Invoice Number",
        "Session Code",
        "Table / Origin",
        "Settled At",
        "Payment Methods",
        "Items Count",
        "Pre-Tax Subtotal (INR)",
        "CGST 2.5% (INR)",
        "SGST 2.5% (INR)",
        "5% GST Total (INR)",
        "Grand Total (INR)",
        "Guest Rating (Stars)",
        "Guest Feedback",
      ];

      const rows = history.map((s) => {
        const methods = s.payments.map((p) => p.method).join(" + ") || "Counter";
        const total = s.totalAmount;
        const tax = total * (5 / 105);
        const subtotal = total - tax;
        const cgst = tax / 2;
        const sgst = tax / 2;
        const dateStr = s.endTime ? new Date(s.endTime).toLocaleString() : new Date(s.startTime).toLocaleString();
        const ratingStr = s.review ? `${s.review.rating} / 5` : "Unrated";
        const feedbackStr = s.review?.feedback
          ? `"${s.review.feedback.replace(/"/g, '""')}"`
          : s.review?.tags?.length
          ? `"${s.review.tags.join(" • ")}"`
          : '""';

        return [
          s.invoiceNumber,
          s.sessionCode,
          s.tableNumber === "Takeaway" ? "Takeaway" : `Table ${s.tableNumber}`,
          `"${dateStr}"`,
          `"${methods}"`,
          s.itemsCount,
          subtotal.toFixed(2),
          cgst.toFixed(2),
          sgst.toFixed(2),
          tax.toFixed(2),
          total.toFixed(2),
          `"${ratingStr}"`,
          feedbackStr,
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `EOD_Report_${rangeFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("EOD report exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export summary CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  // Open Daily Shift Register Report Modal
  const handlePrintShiftReport = () => {
    setActiveReceipt({
      isShiftReport: true,
      cashierName: user?.fullName || "Admin",
      dateTime: new Date().toISOString(),
      totalRevenue: totalRevenue,
      cashTotal: cashTotal,
      upiTotal: upiTotal,
      cardTotal: cardTotal,
      settledBillsCount: settledCount,
      activeTablesCount: stats?.activeTablesCount || 0,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in duration-300">
      {/* Header Bar - Apple Music Editorial Hero (Standard across Admin Pages) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent border border-white/[0.09] p-6 sm:p-7 backdrop-blur-2xl shadow-2xl">
        {/* Apple Music Ambient Bloom Halos */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#FA2D48]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
              Sales & EOD Reports
            </h1>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Action Controls in a Clean, Aligned Row */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Range Selector Pills: Today's Shift vs All-Time */}
            <div className="flex items-center gap-1 bg-black/40 border border-white/[0.1] p-1 rounded-full backdrop-blur-xl shrink-0">
              <button
                type="button"
                onClick={() => setRangeFilter("today")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  rangeFilter === "today"
                    ? "bg-white text-black shadow-md font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Today's Shift
              </button>
              <button
                type="button"
                onClick={() => setRangeFilter("all")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  rangeFilter === "all"
                    ? "bg-white text-black shadow-md font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                All-Time
              </button>
            </div>

            {/* Print Shift Audit */}
            <button
              type="button"
              onClick={handlePrintShiftReport}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-neutral-200 hover:text-white border border-white/[0.12] backdrop-blur-xl shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Printer className="h-4 w-4 text-neutral-300" />
              <span>Print Shift Audit</span>
            </button>

            {/* Export Summary (CSV) */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting || history.length === 0}
              className="flex items-center gap-2 rounded-full px-4.5 py-2 text-xs font-semibold bg-[#FA2D48] hover:bg-[#ff3b56] text-white shadow-lg shadow-[#FA2D48]/30 transition-all active:scale-95 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isExporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Export Summary (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Bar - Single Bar Divided into 4 with Unified Header */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#1c1c1f]/80 p-5 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#FA2D48]" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Executive Shift Turnover & Performance Metrics
            </span>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE AUDITED
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] text-xs">
          {/* Segment 1: Gross Revenue */}
          <div className="py-2 lg:py-0 lg:pr-5 space-y-1">
            <span className="text-[11px] text-neutral-400 font-sans block">Gross Sales Turnover</span>
            <span className="text-2xl font-black text-white block font-mono">₹{totalRevenue.toFixed(2)}</span>
            <span className="text-[10px] text-neutral-500 font-sans block">Net food volume: ₹{grossFoodSales.toFixed(2)}</span>
          </div>

          {/* Segment 2: Orders Fulfilled */}
          <div className="py-2 lg:py-0 lg:px-5 space-y-1">
            <span className="text-[11px] text-neutral-400 font-sans block">Orders Fulfilled</span>
            <span className="text-2xl font-black text-white block font-mono">{settledCount}</span>
            <span className="text-[10px] text-neutral-500 font-sans block">Dine-in: {dineInCount} • Takeaway: {takeawayCount}</span>
          </div>

          {/* Segment 3: Average Ticket Size */}
          <div className="py-2 lg:py-0 lg:px-5 space-y-1">
            <span className="text-[11px] text-neutral-400 font-sans block">Average Ticket Size</span>
            <span className="text-2xl font-black text-white block font-mono">₹{avgTicket.toFixed(2)}</span>
            <span className="text-[10px] text-neutral-500 font-sans block">Per settled guest invoice</span>
          </div>

          {/* Segment 4: Guest Satisfaction */}
          <div className="py-2 lg:py-0 lg:pl-5 space-y-1">
            <span className="text-[11px] text-neutral-400 font-sans block">Guest Satisfaction</span>
            <span className="text-2xl font-black text-amber-400 block font-mono">
              {avgRating} <span className="text-sm text-neutral-500 font-sans font-normal">/ 5.0</span>
            </span>
            <span className="text-[10px] text-neutral-500 font-sans block">
              {displayReviewsCount} verified review{displayReviewsCount === 1 ? "" : "s"}
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

      {/* Statutory 5% Dining GST Tax Audit & Register Reconciliation Strip (Matching Screenshot) */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#1c1c1f]/80 p-5 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#FA2D48]" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              TAX RECONCILIATION & REGISTER AUDIT (5% DINING GST)
            </span>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400">
            AUDITED COMPLIANCE
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] text-xs">
          <div className="py-2 lg:py-0 lg:pr-5 space-y-1">
            <span className="text-[11px] text-neutral-400 font-sans block">Gross Food Sales (Pre-Tax)</span>
            <span className="text-2xl font-black text-white block font-mono">₹{grossFoodSales.toFixed(2)}</span>
            <span className="text-[10px] text-neutral-500 font-sans block">Tax-exclusive food volume</span>
          </div>

          <div className="py-2 lg:py-0 lg:px-5 space-y-1">
            <span className="text-[11px] text-neutral-400 font-sans block">CGST (2.5%)</span>
            <span className="text-2xl font-black text-[#FA2D48] block font-mono">₹{halfTax.toFixed(2)}</span>
            <span className="text-[10px] text-neutral-500 font-sans block">Central Govt remittance</span>
          </div>

          <div className="py-2 lg:py-0 lg:px-5 space-y-1">
            <span className="text-[11px] text-neutral-400 font-sans block">SGST (2.5%)</span>
            <span className="text-2xl font-black text-[#FA2D48] block font-mono">₹{halfTax.toFixed(2)}</span>
            <span className="text-[10px] text-neutral-500 font-sans block">State Govt remittance</span>
          </div>

          <div className="py-2 lg:py-0 lg:pl-5 space-y-1">
            <span className="text-[11px] text-neutral-400 font-sans block">Total GST Remittance</span>
            <span className="text-2xl font-black text-white block font-mono">₹{taxCollected.toFixed(2)}</span>
            <span className="text-[10px] text-emerald-400 font-sans block font-semibold">Physical Cash: ₹{cashTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Closed Session Audits Table - Full Closed Bills Log Integration */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#1c1c1f]/80 backdrop-blur-xl overflow-hidden shadow-2xl space-y-0">
        {/* Table Top Controls Bar: Status Filter Tabs (Apple Music Pill Row) & Search */}
        <div className="p-5 sm:p-6 border-b border-white/[0.07] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Audited Closed Bills & Receipt Ledger
                </h3>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Feed
                </span>
              </div>
            </div>

            <span className="text-xs font-mono text-neutral-400 self-start sm:self-auto bg-white/[0.04] px-3 py-1 rounded-full border border-white/5">
              Showing <span className="text-white font-bold">{filteredHistory.length}</span> of {history.length} bills
            </span>
          </div>

          {/* Filter Pills & Search Input Row matching Tables & Menu Inventory */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            {/* Apple Music Pill Capsule Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  typeFilter === "all"
                    ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30 font-bold"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
                }`}
              >
                <span>All Invoices</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                  {history.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter("table")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  typeFilter === "table"
                    ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30 font-bold"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
                }`}
              >
                <span>Dine-In Tables</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                  {dineInCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter("takeaway")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  typeFilter === "takeaway"
                    ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30 font-bold"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
                }`}
              >
                <ShoppingBag className="h-3 w-3" />
                <span>Takeaway Orders</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                  {takeawayCount}
                </span>
              </button>
            </div>

            {/* Search Bar - Apple Music Pill */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search invoice, table, payment, or dish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 text-xs rounded-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.1] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-[#FA2D48] transition-all focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-white/[0.07] bg-white/[0.02] text-neutral-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="py-3.5 pl-6 pr-3 w-40">Invoice #</th>
                <th className="px-3 py-3.5 w-32">Table / Type</th>
                <th className="px-3 py-3.5 w-36">Settled Time</th>
                <th className="px-3 py-3.5 w-28">Items</th>
                <th className="px-3 py-3.5">Payment Breakdown</th>
                <th className="px-3 py-3.5 w-32">Total Amount</th>
                <th className="px-3 py-3.5 w-48">Guest Rating & Note</th>
                <th className="py-3.5 pl-3 pr-6 text-right w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((s) => {
                  // Find review matching this exact session (prefer direct bill review, fallback to exact sessionCode match only)
                  const matchingReview =
                    s.review ||
                    (s.sessionCode ? reviews.find((r) => r.sessionCode === s.sessionCode) : null);

                  return (
                    <tr key={s.id} className="hover:bg-white/[0.04] transition-colors">
                      {/* Invoice # */}
                      <td className="py-4 pl-6 pr-3 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                          <span className="font-mono text-xs text-white">
                            {s.invoiceNumber || `INV-${s.sessionCode}`}
                          </span>
                        </div>
                      </td>

                      {/* Table / Type */}
                      <td className="px-3 py-4 text-neutral-300">
                        {s.tableNumber === "Takeaway" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#FA2D48]/15 px-2 py-0.5 border border-[#FA2D48]/25 text-[#FA2D48] text-[11px] font-sans font-bold">
                            <ShoppingBag className="h-3 w-3" />
                            <span>Takeaway</span>
                          </span>
                        ) : (
                          <span className="rounded-md bg-white/[0.05] px-2 py-0.5 border border-white/[0.08] text-[11px]">
                            Table #{s.tableNumber}
                          </span>
                        )}
                      </td>

                      {/* Settled Time */}
                      <td className="px-3 py-4 text-neutral-400 font-mono text-[11px]">
                        <div>
                          {s.endTime
                            ? new Date(s.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {new Date(s.endTime || s.startTime).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Portions */}
                      <td className="px-3 py-4 text-neutral-300 font-sans">
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/5 text-[11px]">
                          {s.itemsCount} portion{s.itemsCount === 1 ? "" : "s"}
                        </span>
                      </td>

                      {/* Payment Breakdown */}
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {s.payments && s.payments.length > 0 ? (
                            s.payments.map((p, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  p.method === "CASH"
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : p.method === "UPI"
                                    ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                                    : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                                }`}
                              >
                                {p.method}: ₹{p.amount.toFixed(2)}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-500 text-xs font-sans">Counter Settled</span>
                          )}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-3 py-4 font-['Outfit'] font-black text-white text-sm">
                        ₹{s.totalAmount.toFixed(2)}
                      </td>

                      {/* Guest Rating & Note */}
                      <td className="px-3 py-4">
                        {matchingReview ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-0.5 shrink-0">
                                {[1, 2, 3, 4, 5].map((starVal) => (
                                  <Star
                                    key={starVal}
                                    className={`h-3 w-3 ${
                                      starVal <= (matchingReview.rating || 5)
                                        ? "fill-amber-400 text-amber-400"
                                        : "fill-neutral-700/60 text-neutral-700/60"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-mono text-[11px] font-bold text-amber-400">
                                {Number(matchingReview.rating || 5).toFixed(1)}
                              </span>
                            </div>
                            {matchingReview.feedback ? (
                              <p
                                className="text-neutral-300 font-sans text-xs truncate max-w-[170px]"
                                title={matchingReview.feedback}
                              >
                                "{matchingReview.feedback}"
                              </p>
                            ) : matchingReview.tags && matchingReview.tags.length > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                {matchingReview.tags.slice(0, 2).map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-neutral-400"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {matchingReview.customerName && (
                              <span className="text-[10px] text-neutral-500 font-sans truncate max-w-[120px] block">
                                — {matchingReview.customerName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 font-sans text-xs italic">
                            Verified settlement
                          </span>
                        )}
                      </td>

                      {/* Action: Receipt Modal */}
                      <td className="py-4 pl-3 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveReceipt({
                              invoiceNumber: s.invoiceNumber,
                              tableNumber: s.tableNumber,
                              dateTime: s.endTime || s.startTime,
                              subtotal: s.totalAmount / 1.05,
                              taxAmount: s.totalAmount - s.totalAmount / 1.05,
                              discount: 0,
                              packagingCharge: 0,
                              grandTotal: s.totalAmount,
                              payments: s.payments,
                              items: s.items,
                              cashierName: user?.fullName || "Admin / Cashier",
                              review: matchingReview,
                            })
                          }
                          className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-white/5 shadow-sm"
                          title="Preview Itemized Tax Invoice"
                        >
                          <Printer className="h-3 w-3 text-neutral-400" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500 font-sans">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-neutral-300">
                        {searchQuery ? "No matching settled bills found" : "No settled bills found for this shift"}
                      </p>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {searchQuery
                          ? "Try searching for a different invoice number, table number, or payment method."
                          : "When bills are settled by the cashier or customer reviews are submitted, they will appear in this audited ledger in real-time."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: ITEMIZED TAX INVOICE & SHIFT CLOSEOUT AUDIT RECEIPT ================= */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#161618] text-white p-6 rounded-3xl border border-white/[0.08] shadow-2xl space-y-4 font-mono text-xs print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
            {/* Modal Action Bar (Hidden When Printing) */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 print:hidden">
              <span className="font-bold text-neutral-400 uppercase text-[10px] tracking-wider">
                {activeReceipt.isShiftReport ? "Shift Closeout Audit Report" : "Tax Invoice & Thermal Receipt"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer text-xs transition-all shadow-md"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReceipt(null)}
                  className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Thermal Receipt Body */}
            {activeReceipt.isShiftReport ? (
              /* FORMAT A: Daily Register Shift Closeout Report */
              <div id="thermal-receipt" className="text-center space-y-2 text-white print:text-black">
                <div>
                  <h2 className="font-black text-base uppercase tracking-wider">SERVE_SYNC POS</h2>
                  <p className="text-[10px] text-neutral-400 print:text-neutral-600 font-bold">
                    DAILY REGISTER SHIFT REPORT
                  </p>
                  <p className="text-[9px] text-neutral-500 print:text-neutral-600">
                    GSTIN: 29ABCDE1234F1Z5
                  </p>
                </div>

                <div className="border-t border-b border-dashed border-white/15 print:border-neutral-400 py-2 text-[11px] text-left space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">AUDITOR / CASHIER:</span>
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
                    <span className="text-neutral-400 print:text-neutral-600">ACTIVE DINING LOAD:</span>
                    <span>{activeReceipt.activeTablesCount} tables</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-white/15 print:border-neutral-400 pt-2 text-left space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">CASH IN DRAWER:</span>
                    <span className="font-bold text-emerald-400 print:text-black">
                      ₹{Number(activeReceipt.cashTotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">UPI & QR COLLECTIONS:</span>
                    <span className="font-bold text-sky-400 print:text-black">
                      ₹{Number(activeReceipt.upiTotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 print:text-neutral-600">CARD POS VOLUME:</span>
                    <span className="font-bold text-violet-400 print:text-black">
                      ₹{Number(activeReceipt.cardTotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-sm border-t border-white/15 print:border-neutral-400 pt-1">
                    <span>TOTAL GROSS:</span>
                    <span className="font-bold text-white print:text-black">
                      ₹{Number(activeReceipt.totalRevenue).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-dashed border-white/15 print:border-neutral-400 pt-6 space-y-4 text-[10px] text-left text-neutral-400 print:text-neutral-600">
                  <div className="border-t border-white/15 print:border-neutral-400 pt-1 flex justify-between">
                    <span>Cashier Signature</span>
                    <span>Manager Verification</span>
                  </div>
                </div>
              </div>
            ) : (
              /* FORMAT B: Standard Itemized Tax Invoice */
              <div id="thermal-receipt" className="text-center space-y-2 text-white print:text-black">
                <div className="text-center">
                  <h2 className="font-black text-base uppercase tracking-wider text-white print:text-black">
                    SERVE_SYNC DINING
                  </h2>
                  <p className="text-[10px] text-neutral-400 print:text-neutral-600">Contactless Table & POS System</p>
                  <p className="text-[10px] text-neutral-400 print:text-neutral-600 font-bold">GSTIN: 29ABCDE1234F1Z5</p>
                </div>

                <div className="border-t border-b border-dashed border-white/15 print:border-neutral-400 py-2 text-[11px] text-left space-y-1">
                  <div className="flex justify-between text-neutral-300 print:text-black">
                    <span>INV: {activeReceipt.invoiceNumber}</span>
                    <span>
                      {activeReceipt.tableNumber === "Takeaway"
                        ? "TAKEAWAY"
                        : `TBL: #${activeReceipt.tableNumber}`}
                    </span>
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
                    <span>STAFF: {activeReceipt.cashierName || "Staff"}</span>
                    {activeReceipt.customerName && (
                      <span className="truncate max-w-[140px] text-neutral-200 print:text-black">
                        CUST: {activeReceipt.customerName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="text-left space-y-1.5 py-1">
                  <div className="grid grid-cols-12 gap-1 font-bold border-b border-white/15 print:border-neutral-300 pb-1 text-neutral-300 print:text-black text-[11px]">
                    <span className="col-span-6 text-left">ITEM</span>
                    <span className="col-span-2 text-center">QTY</span>
                    <span className="col-span-4 text-right">PRICE</span>
                  </div>
                  {activeReceipt.items && activeReceipt.items.length > 0 ? (
                    activeReceipt.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-1 text-[11px] text-neutral-200 print:text-black items-center py-0.5"
                      >
                        <span className="col-span-6 truncate text-left font-medium" title={item.name}>
                          {item.name}
                        </span>
                        <span className="col-span-2 text-center font-mono font-semibold">
                          × {item.quantity}
                        </span>
                        <span className="col-span-4 text-right font-mono tabular-nums font-semibold">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2 text-neutral-500 print:text-neutral-600 italic">
                      Dine-in Course Order
                    </div>
                  )}
                </div>

                {/* Totals & Tax Breakdown */}
                <div className="border-t border-dashed border-white/15 print:border-neutral-400 pt-2 text-left space-y-1.5">
                  <div className="flex justify-between text-neutral-400 print:text-neutral-600">
                    <span>Subtotal:</span>
                    <span className="text-white print:text-black font-mono tabular-nums">
                      ₹{Number(activeReceipt.subtotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400 print:text-neutral-600">
                    <span>CGST (2.5%):</span>
                    <span className="text-white print:text-black font-mono tabular-nums">
                      ₹{(Number(activeReceipt.taxAmount) / 2).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400 print:text-neutral-600">
                    <span>SGST (2.5%):</span>
                    <span className="text-white print:text-black font-mono tabular-nums">
                      ₹{(Number(activeReceipt.taxAmount) / 2).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-sm border-t border-white/15 print:border-neutral-400 pt-1.5 text-white print:text-black">
                    <span>NET TOTAL:</span>
                    <span className="font-mono tabular-nums text-base">
                      ₹{Number(activeReceipt.grandTotal).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Breakdown (Settled) */}
                {activeReceipt.payments && activeReceipt.payments.length > 0 && (
                  <div className="border-t border-b border-dashed border-white/15 print:border-neutral-400 py-1.5 text-left text-[11px] space-y-1">
                    <span className="font-bold block text-neutral-300 print:text-black">PAID VIA:</span>
                    {activeReceipt.payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-neutral-300 print:text-black">
                        <span>• {p.method}:</span>
                        <span className="font-mono tabular-nums">₹{Number(p.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Guest Rating (if available) */}
                {activeReceipt.review && (
                  <div className="border-b border-dashed border-white/15 print:border-neutral-400 py-1.5 text-left text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-300 print:text-black">GUEST RATING:</span>
                      <span className="font-bold text-amber-400 print:text-black font-mono">
                        {Number(activeReceipt.review.rating || 5).toFixed(1)} / 5.0 Stars
                      </span>
                    </div>
                    {activeReceipt.review.feedback && (
                      <p className="italic text-neutral-300 print:text-neutral-700 text-[10px]">
                        "{activeReceipt.review.feedback}"
                      </p>
                    )}
                  </div>
                )}

                <div className="text-[10px] text-neutral-400 print:text-neutral-600 pt-1">
                  <p>Thank you for dining with Serve_Sync!</p>
                  <p>Visit again soon.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
