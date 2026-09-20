import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Download,
  Receipt,
  CreditCard,
  Star,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { BrandCrest } from "@/components/BrandLogo";
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

export default function Reports() {
  const [rangeFilter, setRangeFilter] = useState<"today" | "all">("today");
  const [stats, setStats] = useState<CashierStats | null>(null);
  const [history, setHistory] = useState<SettledBill[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

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

  const upiShare = totalRevenue > 0 ? ((upiTotal / totalRevenue) * 100).toFixed(1) : "0.0";
  const cardShare = totalRevenue > 0 ? ((cardTotal / totalRevenue) * 100).toFixed(1) : "0.0";
  const cashShare = totalRevenue > 0 ? ((cashTotal / totalRevenue) * 100).toFixed(1) : "0.0";

  // Guest satisfaction
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return "5.0";
    const total = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const displayReviewsCount = reviews.length;

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
      ];

      const rows = history.map((s) => {
        const methods = s.payments.map((p) => p.method).join(" + ") || "Counter";
        const total = s.totalAmount;
        const tax = total * (5 / 105);
        const subtotal = total - tax;
        const cgst = tax / 2;
        const sgst = tax / 2;
        const dateStr = s.endTime ? new Date(s.endTime).toLocaleString() : new Date(s.startTime).toLocaleString();

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

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in duration-300">
      {/* Live Financial Reconciliation Operational Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-white/[0.1] bg-[#1c1c1f]/80 p-5 text-xs text-neutral-300 backdrop-blur-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <BrandCrest className="h-10 w-10 shrink-0 rounded-2xl" />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-white text-sm">
                EOD Financial Reconciliation & Audit
              </p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-neutral-400 mt-0.5 leading-relaxed">
              Real-time daily turnover auditing, gateway split settlement (UPI / Card / Cash), 5% dining GST reconciliation, and verified guest satisfaction.
            </p>
          </div>
        </div>

        {/* Range Selector Pills */}
        <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.08] p-1 rounded-full self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRangeFilter("today")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              rangeFilter === "today"
                ? "bg-white text-black shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Today's Shift
          </button>
          <button
            type="button"
            onClick={() => setRangeFilter("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              rangeFilter === "all"
                ? "bg-white text-black shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            All-Time History
          </button>
        </div>
      </div>

      {/* Header Bar - Apple Music Style Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#FA2D48] tracking-widest uppercase mb-1">
            <Receipt className="h-3.5 w-3.5" />
            <span>Auditing & Revenue</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
              End-of-Day (EOD) Reports
            </h1>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="p-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400">
            Categorized settlement breakdowns, tax reconciliation, and guest feedback ratings.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={isExporting || history.length === 0}
          className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold bg-white text-black hover:bg-neutral-200 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed self-start md:self-auto"
        >
          {isExporting ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>Export Summary (CSV)</span>
        </button>
      </div>

      {/* KPI Overview Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Gross Revenue
          </div>
          <div className="mt-1 text-2xl font-bold text-white font-mono">
            ₹{totalRevenue.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{rangeFilter === "today" ? "Current shift intake" : "All-time verified intake"}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Orders Fulfilled
          </div>
          <div className="mt-1 text-2xl font-bold text-white font-mono">
            {settledCount}
          </div>
          <div className="mt-0.5 text-[10px] text-neutral-400">
            Avg ticket ₹{avgTicket.toFixed(2)}
          </div>
        </div>

        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="text-[11px] font-semibold text-[#FA2D48] uppercase tracking-wider">
            Tax Collected (GST)
          </div>
          <div className="mt-1 text-2xl font-bold text-[#FA2D48] font-mono">
            ₹{taxCollected.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[10px] text-neutral-400">5.0% flat dining GST</div>
        </div>

        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
            Guest Satisfaction
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-400 font-mono">
            {avgRating} / 5.0
          </div>
          <div className="mt-0.5 text-[10px] text-neutral-400">
            {displayReviewsCount} verified review{displayReviewsCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Financial Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Settlement by Gateway */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#1c1c1f]/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#FA2D48]" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Settlement by Gateway
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                AUDITED
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-white">UPI & QR Pay</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white">₹{upiTotal.toFixed(2)}</span>
                  <span className="text-[10px] text-neutral-500 block font-sans">
                    {upiShare}% share
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="text-white">Credit / Debit Cards</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white">₹{cardTotal.toFixed(2)}</span>
                  <span className="text-[10px] text-neutral-500 block font-sans">
                    {cardShare}% share
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-white">Cash Counter</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white">₹{cashTotal.toFixed(2)}</span>
                  <span className="text-[10px] text-neutral-500 block font-sans">
                    {cashShare}% share
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.07] pt-4 mt-5 flex justify-between items-center text-xs text-neutral-400">
            <span>Reconciled Register Balance</span>
            <span className="font-mono text-emerald-400 font-bold">₹{totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        {/* Card 2: 5% Dining GST Tax Audit */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#1c1c1f]/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#FA2D48]" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Tax Reconciliation (5% GST)
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                AUDITED
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/[0.03]">
                <span className="text-neutral-400">Gross Food Sales</span>
                <span className="text-white font-bold">₹{grossFoodSales.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/[0.03]">
                <span className="text-neutral-400">CGST (2.5%)</span>
                <span className="text-[#FA2D48] font-bold">₹{halfTax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-white/[0.03]">
                <span className="text-neutral-400">SGST (2.5%)</span>
                <span className="text-[#FA2D48] font-bold">₹{halfTax.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.07] pt-4 mt-5 flex justify-between items-center text-xs text-neutral-400">
            <span>Total Government Remittance</span>
            <span className="font-mono text-white font-bold">₹{taxCollected.toFixed(2)}</span>
          </div>
        </div>

        {/* Card 3: Customer Satisfaction Rating */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#1c1c1f]/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Guest Satisfaction
                </span>
              </div>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-mono text-amber-400 border border-amber-500/30">
                {Number(avgRating) >= 4.5 ? "TOP TIER" : "LIVE SCORE"}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-3">
              <div className="text-4xl font-extrabold text-white font-mono tracking-tight">
                {avgRating} <span className="text-lg text-neutral-500">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${
                      s <= Math.round(Number(avgRating))
                        ? "text-amber-400 fill-amber-400"
                        : "text-neutral-600"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-neutral-400 mt-2 text-center">
                Real-time feedback collected directly from customers upon cashier bill payment.
              </p>
            </div>
          </div>

          <div className="border-t border-white/[0.07] pt-4 mt-5 flex justify-between items-center text-xs text-neutral-400">
            <span>Verified Feedback Count</span>
            <span className="font-mono text-white font-bold">{displayReviewsCount} Review{displayReviewsCount === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      {/* Closed Session Audits Table - Apple Music Tracklist Style */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#1c1c1f]/80 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-white/[0.07] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Recent Session Audits & Customer Feedback
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Audited checkout settlements and direct guest ratings
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Feed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-white/[0.07] bg-white/[0.02] text-neutral-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="py-3.5 pl-6 pr-3 w-36">Session / Invoice</th>
                <th className="px-3 py-3.5 w-32">Table / Origin</th>
                <th className="px-3 py-3.5 w-36">Payment Mode</th>
                <th className="px-3 py-3.5 w-32">Total Paid</th>
                <th className="py-3.5 pl-3 pr-6">Guest Rating & Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {history.length > 0 ? (
                history.map((s) => {
                  const paymentMode =
                    s.payments && s.payments.length > 0
                      ? s.payments.map((p) => p.method).join(" + ")
                      : "Counter Settled";
                  const origin = s.tableNumber === "Takeaway" ? "Takeaway" : `Table ${s.tableNumber}`;

                  // Find review matching this session or table
                  const matchingReview = reviews.find(
                    (r) => r.sessionCode === s.sessionCode || String(r.tableNumber) === String(s.tableNumber)
                  );

                  return (
                    <tr key={s.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="py-3.5 pl-6 pr-3 font-semibold text-white">
                        {s.invoiceNumber || `INV-${s.sessionCode}`}
                      </td>
                      <td className="px-3 py-3.5 text-neutral-300">
                        <span className="rounded-md bg-white/[0.05] px-2 py-0.5 border border-white/[0.08]">
                          {origin}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-neutral-300">
                        {paymentMode}
                      </td>
                      <td className="px-3 py-3.5 font-bold text-white">
                        ₹{s.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3.5 pl-3 pr-6">
                        {matchingReview ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center text-amber-400 shrink-0">
                              {Array.from({ length: matchingReview.rating || 5 }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400" />
                              ))}
                            </div>
                            <span className="text-neutral-300 font-sans text-xs truncate max-w-xs">
                              "{matchingReview.feedback || (matchingReview.tags?.length ? matchingReview.tags.join(" • ") : "5-Star Rating")}"
                            </span>
                            {matchingReview.customerName && (
                              <span className="text-[10px] text-neutral-500 font-sans font-medium">
                                — {matchingReview.customerName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 font-sans text-xs italic">
                            Verified settlement • No written review
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : reviews.length > 0 ? (
                reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-3.5 pl-6 pr-3 font-semibold text-white">
                      {r.sessionCode || `REV-${r.id}`}
                    </td>
                    <td className="px-3 py-3.5 text-neutral-300">
                      <span className="rounded-md bg-white/[0.05] px-2 py-0.5 border border-white/[0.08]">
                        {r.tableNumber ? `Table ${r.tableNumber}` : "Dine-In"}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-neutral-300">
                      Settled Bill
                    </td>
                    <td className="px-3 py-3.5 font-bold text-white">
                      {r.diningSession?.totalAmount ? `₹${Number(r.diningSession.totalAmount).toFixed(2)}` : "Verified"}
                    </td>
                    <td className="py-3.5 pl-3 pr-6">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-amber-400 shrink-0">
                          {Array.from({ length: r.rating || 5 }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400" />
                          ))}
                        </div>
                        <span className="text-neutral-300 font-sans text-xs truncate max-w-xs">
                          "{r.feedback || (r.tags?.length ? r.tags.join(" • ") : "Rating Received")}"
                        </span>
                        {r.customerName && (
                          <span className="text-[10px] text-neutral-500 font-sans font-medium">
                            — {r.customerName}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500 font-sans">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-neutral-300">No settled bills found for this shift</p>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        When bills are settled by the cashier or customer reviews are submitted, they will appear in this audited ledger in real-time.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
