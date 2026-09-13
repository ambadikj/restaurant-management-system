import { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import axios from "axios";
import {
  QrCode,
  Printer,
  ShoppingBag,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Users,
  Sparkles,
  Timer,
  RefreshCw,
  ExternalLink,
  Layers,
} from "lucide-react";

interface RestaurantTable {
  id: number;
  tableNumber: number;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "BILLING" | "CLEANING";
}

function TableVisualPod({
  table,
  onShowQR,
}: {
  table: RestaurantTable;
  onShowQR: () => void;
}) {
  const isAvail = table.status === "AVAILABLE";
  const isOccupied = table.status === "OCCUPIED";
  const isBilling = table.status === "BILLING";
  const isCleaning = table.status === "CLEANING";
  const seats = table.capacity;

  const chairBase = isOccupied
    ? "bg-gradient-to-b from-sky-400 to-blue-600 border-sky-300 shadow-md shadow-blue-500/25"
    : isBilling
    ? "bg-gradient-to-b from-amber-400 to-orange-500 border-amber-300 shadow-md shadow-amber-500/25"
    : isCleaning
    ? "bg-gradient-to-b from-purple-400 to-violet-600 border-purple-300 shadow-md shadow-purple-500/25"
    : "bg-gradient-to-b from-emerald-400 to-teal-600 border-emerald-300 shadow-md shadow-emerald-500/20";

  return (
    <div className="relative my-3 flex items-center justify-center p-3 select-none">
      {/* 2-Seat Circular Bistro */}
      {seats <= 2 ? (
        <div className="relative flex items-center justify-center">
          {/* Left Cushioned Chair */}
          <div
            className={`absolute -left-4.5 h-8 w-3 rounded-l-xl border transition-all duration-300 ${chairBase}`}
          >
            <div className="h-full w-1 border-r border-white/20" />
          </div>

          {/* Bistro Table Top - Apple Acoustic Glass Style */}
          <div
            onClick={onShowQR}
            className={`group/pod relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-full border-2 transition-all duration-300 shadow-lg ${
              isAvail
                ? "bg-[#18231c] border-emerald-500/60 text-emerald-100 shadow-emerald-500/10 hover:border-emerald-400"
                : isOccupied
                ? "bg-[#16212e] border-sky-500/60 text-sky-100 shadow-sky-500/10 hover:border-sky-400"
                : isBilling
                ? "bg-[#271f16] border-amber-500/60 text-amber-100 shadow-amber-500/10 hover:border-amber-400"
                : "bg-[#221829] border-purple-500/60 text-purple-100 shadow-purple-500/10 hover:border-purple-400"
            }`}
            title="Click to view QR Standee"
          >
            {/* Center QR Medallion */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] backdrop-blur-md border border-white/10 shadow-xs group-hover/pod:scale-110 transition-transform">
              <QrCode className="h-4 w-4 text-white" />
            </div>

            <div className="mt-1.5 flex flex-col items-center leading-tight">
              <span className="font-mono text-xs font-black tracking-tight text-white">
                T • {table.tableNumber < 10 ? `0${table.tableNumber}` : table.tableNumber}
              </span>
              <span className="text-[9px] font-semibold text-neutral-400">Bistro (2P)</span>
            </div>
          </div>

          {/* Right Cushioned Chair */}
          <div
            className={`absolute -right-4.5 h-8 w-3 rounded-r-xl border transition-all duration-300 ${chairBase}`}
          >
            <div className="h-full w-1 border-l border-white/20 ml-auto" />
          </div>
        </div>
      ) : seats <= 4 ? (
        /* 4-Seat Square Booth */
        <div className="relative flex items-center justify-center">
          {/* Top Chairs */}
          <div className="absolute -top-4 flex gap-5">
            <div className={`h-3 w-8 rounded-t-xl border transition-all duration-300 ${chairBase}`}>
              <div className="w-full h-1 border-b border-white/20" />
            </div>
            <div className={`h-3 w-8 rounded-t-xl border transition-all duration-300 ${chairBase}`}>
              <div className="w-full h-1 border-b border-white/20" />
            </div>
          </div>

          {/* Table Top */}
          <div
            onClick={onShowQR}
            className={`group/pod relative flex h-28 w-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 transition-all duration-300 shadow-lg ${
              isAvail
                ? "bg-[#18231c] border-emerald-500/60 text-emerald-100 shadow-emerald-500/10 hover:border-emerald-400"
                : isOccupied
                ? "bg-[#16212e] border-sky-500/60 text-sky-100 shadow-sky-500/10 hover:border-sky-400"
                : isBilling
                ? "bg-[#271f16] border-amber-500/60 text-amber-100 shadow-amber-500/10 hover:border-amber-400"
                : "bg-[#221829] border-purple-500/60 text-purple-100 shadow-purple-500/10 hover:border-purple-400"
            }`}
            title="Click to view QR Standee"
          >
            {/* Center QR Medallion */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] backdrop-blur-md border border-white/10 shadow-xs group-hover/pod:scale-110 transition-transform">
              <QrCode className="h-4 w-4 text-white" />
            </div>

            <div className="mt-1.5 flex flex-col items-center leading-tight">
              <span className="font-mono text-xs font-black tracking-tight text-white">
                TABLE {table.tableNumber}
              </span>
              <span className="text-[9px] font-semibold text-neutral-400">Booth (4P)</span>
            </div>
          </div>

          {/* Bottom Chairs */}
          <div className="absolute -bottom-4 flex gap-5">
            <div className={`h-3 w-8 rounded-b-xl border transition-all duration-300 ${chairBase}`}>
              <div className="w-full h-1 border-t border-white/20 mt-auto" />
            </div>
            <div className={`h-3 w-8 rounded-b-xl border transition-all duration-300 ${chairBase}`}>
              <div className="w-full h-1 border-t border-white/20 mt-auto" />
            </div>
          </div>
        </div>
      ) : (
        /* 6+ Seat Grand Banquet */
        <div className="relative flex items-center justify-center">
          {/* Top Chairs */}
          <div className="absolute -top-4 flex gap-3">
            {Array.from({ length: Math.ceil(seats / 2) }).map((_, i) => (
              <div
                key={`t-${i}`}
                className={`h-3 w-7 rounded-t-xl border transition-all duration-300 ${chairBase}`}
              >
                <div className="w-full h-1 border-b border-white/20" />
              </div>
            ))}
          </div>

          {/* Banquet Table Top */}
          <div
            onClick={onShowQR}
            className={`group/pod relative flex h-28 w-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 transition-all duration-300 shadow-lg ${
              isAvail
                ? "bg-[#18231c] border-emerald-500/60 text-emerald-100 shadow-emerald-500/10 hover:border-emerald-400"
                : isOccupied
                ? "bg-[#16212e] border-sky-500/60 text-sky-100 shadow-sky-500/10 hover:border-sky-400"
                : isBilling
                ? "bg-[#271f16] border-amber-500/60 text-amber-100 shadow-amber-500/10 hover:border-amber-400"
                : "bg-[#221829] border-purple-500/60 text-purple-100 shadow-purple-500/10 hover:border-purple-400"
            }`}
            title="Click to view QR Standee"
          >
            {/* Center QR Medallion */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] backdrop-blur-md border border-white/10 shadow-xs group-hover/pod:scale-110 transition-transform">
              <QrCode className="h-4 w-4 text-white" />
            </div>

            <div className="mt-1.5 flex flex-col items-center leading-tight">
              <span className="font-mono text-xs font-black tracking-tight text-white">
                TABLE {table.tableNumber}
              </span>
              <span className="text-[9px] font-semibold text-neutral-400">Banquet ({seats}P)</span>
            </div>
          </div>

          {/* Bottom Chairs */}
          <div className="absolute -bottom-4 flex gap-3">
            {Array.from({ length: Math.floor(seats / 2) }).map((_, i) => (
              <div
                key={`b-${i}`}
                className={`h-3 w-7 rounded-b-xl border transition-all duration-300 ${chairBase}`}
              >
                <div className="w-full h-1 border-t border-white/20 mt-auto" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TablesQR() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmTable, setDeleteConfirmTable] = useState<RestaurantTable | null>(null);
  const [selectedQR, setSelectedQR] = useState<{
    title: string;
    url: string;
    imgUrl: string;
    tableNumber: number | string;
    capacity?: number;
  } | null>(null);

  // Form State: Add Table
  const [capacity, setCapacity] = useState("4");

  const nextTableNumber = tables.length > 0 ? Math.max(...tables.map((t) => t.tableNumber)) + 1 : 1;

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/tables");
      setTables(res.data);
    } catch (err) {
      console.error("Failed to load tables from server.", err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axiosInstance.post("/tables", { capacity: Number(capacity || 4) });
      setCapacity("4");
      setIsAddModalOpen(false);
      showNotification(`Table ${res.data.tableNumber} (Seats ${res.data.capacity}) created!`);
      fetchTables();
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.message || "Error creating table");
      }
    }
  };

  const handleDeleteTable = async () => {
    if (!deleteConfirmTable) return;
    try {
      await axiosInstance.delete(`/tables/${deleteConfirmTable.id}`);
      showNotification(`Table ${deleteConfirmTable.tableNumber} deleted.`);
      setDeleteConfirmTable(null);
      fetchTables();
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.message || "Cannot delete table with existing order history");
      }
    }
  };

  const handleUpdateStatus = async (tableId: number, newStatus: RestaurantTable["status"]) => {
    try {
      await axiosInstance.patch(`/tables/${tableId}/status`, { status: newStatus });
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t))
      );
      showNotification(`Table status updated to ${newStatus}`);
    } catch (err) {
      alert("Error updating table status");
      fetchTables();
    }
  };

  const handleShowTableQR = async (table: RestaurantTable) => {
    try {
      const res = await axiosInstance.get(`/tables/${table.tableNumber}/qr`);
      setSelectedQR({
        title: `Table ${table.tableNumber}`,
        url: res.data.url,
        imgUrl: res.data.qrCode,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
      });
    } catch (err) {
      alert("Error generating table QR code");
    }
  };

  const handleShowTakeawayQR = async () => {
    try {
      const res = await axiosInstance.get("/tables/takeaway/qr");
      setSelectedQR({
        title: "Takeaway & Walk-In Standee",
        url: res.data.url,
        imgUrl: res.data.qrCode,
        tableNumber: "TAKEAWAY",
      });
    } catch (err) {
      alert("Error generating takeaway QR code");
    }
  };

  const handlePrintQR = () => {
    if (!selectedQR) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${selectedQR.title} Standee</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 90vh;
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
                margin: 0;
                padding: 20px;
                background: #0d0d0f;
                color: #ffffff;
              }
              .standee {
                border: 2px solid #FA2D48;
                border-radius: 24px;
                padding: 40px 32px;
                max-width: 360px;
                background: #18181c;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
              }
              .brand {
                font-size: 24px;
                font-weight: 800;
                color: #FA2D48;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .sub {
                font-size: 12px;
                color: #a1a1a6;
                margin-top: 6px;
                margin-bottom: 24px;
              }
              .qr-frame {
                background: #ffffff;
                padding: 16px;
                border-radius: 20px;
                display: inline-block;
                margin-bottom: 20px;
              }
              img {
                width: 220px;
                height: 220px;
                display: block;
              }
              h2 {
                margin: 0 0 4px 0;
                font-size: 26px;
                font-weight: 800;
                color: #ffffff;
              }
              .seats {
                font-size: 13px;
                font-weight: 600;
                color: #FA2D48;
                margin-bottom: 12px;
              }
              .instructions {
                font-size: 12px;
                color: #8e8e93;
                line-height: 1.5;
                margin: 0;
              }
            </style>
          </head>
          <body>
            <div class="standee">
              <div class="brand">Serve_Sync</div>
              <div class="sub">Contactless Dining & Instant Ordering</div>
              <div class="qr-frame">
                <img src="${selectedQR.imgUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(selectedQR.url)}" alt="QR Code" />
              </div>
              <h2>${selectedQR.title}</h2>
              ${selectedQR.capacity ? `<div class="seats">Seats ${selectedQR.capacity} Guests</div>` : ''}
              <p class="instructions">Scan with smartphone camera to view menu & order directly.</p>
            </div>
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleBatchPrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const cardsHtml = tables
        .map(
          (t) => `
          <div class="standee">
            <div class="brand">Serve_Sync</div>
            <div class="qr-frame">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('http://localhost:5173/menu?table=' + t.tableNumber)}" />
            </div>
            <h3>TABLE ${t.tableNumber}</h3>
            <p>Seats ${t.capacity} Guests • Scan to Order</p>
          </div>
        `
        )
        .join("");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Floor Standees - Batch Print</title>
            <style>
              body { font-family: sans-serif; padding: 24px; background: #fff; }
              .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
              .standee { border: 2px solid #0f172a; border-radius: 14px; padding: 20px; text-align: center; break-inside: avoid; }
              .brand { font-size: 16px; font-weight: bold; margin-bottom: 12px; }
              .qr-frame { display: inline-block; margin-bottom: 12px; }
              img { width: 150px; height: 150px; }
              h3 { margin: 0 0 4px 0; font-size: 18px; }
              p { font-size: 11px; color: #64748b; margin: 0; }
            </style>
          </head>
          <body>
            <div class="grid">${cardsHtml}</div>
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Calculations
  const totalCapacity = tables.reduce((acc, t) => acc + t.capacity, 0);
  const availableCount = tables.filter((t) => t.status === "AVAILABLE").length;
  const occupiedCount = tables.filter((t) => t.status === "OCCUPIED").length;
  const billingCount = tables.filter((t) => t.status === "BILLING").length;
  const cleaningCount = tables.filter((t) => t.status === "CLEANING").length;
  const occupancyRate = tables.length > 0 ? Math.round((occupiedCount / tables.length) * 100) : 0;

  const filteredTables = tables.filter((t) => {
    if (statusFilter === "ALL") return true;
    return t.status === statusFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed top-18 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#1c1c1e]/90 border border-white/[0.12] backdrop-blur-2xl px-5 py-3 text-xs font-medium text-white shadow-2xl shadow-[#FA2D48]/10 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-4 w-4 text-[#FA2D48]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Bar - Apple Music Style Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#FA2D48] tracking-widest uppercase mb-1">
            <Layers className="h-3.5 w-3.5" />
            <span>Floor Plan & QR Endpoints</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Acoustic Floor Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400">
            Real-time dine-in floor map, seating capacity, table occupancy tracking, and contactless QR standees.
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleShowTakeawayQR}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border border-white/[0.1] backdrop-blur-md transition-all active:scale-95"
            title="Generate Takeaway Standee"
          >
            <ShoppingBag className="h-4 w-4 text-[#FA2D48]" />
            <span>Takeaway QR</span>
          </button>

          <button
            onClick={handleBatchPrint}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border border-white/[0.1] backdrop-blur-md transition-all active:scale-95"
          >
            <Printer className="h-4 w-4 text-neutral-400" />
            <span>Batch Print</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold bg-gradient-to-r from-[#FA2D48] via-[#FF4565] to-[#FB5C74] hover:from-[#E0263F] hover:to-[#FA2D48] text-white shadow-lg shadow-[#FA2D48]/30 transition-all active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Live Floor KPIs (Apple Music Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Capacity */}
        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Floor Capacity
            </span>
            <Users className="h-4 w-4 text-[#FA2D48]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-white">
              {totalCapacity}
            </span>
            <span className="text-xs text-neutral-400">Total Seats</span>
          </div>
          <div className="mt-1 text-[10px] text-neutral-400 font-medium">
            Across {tables.length} floor tables
          </div>
        </div>

        {/* Metric 2: Available */}
        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Available
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
              {availableCount}
            </span>
            <span className="text-xs text-neutral-400">Vacant Pods</span>
          </div>
          <div className="mt-1 text-[10px] text-emerald-400 font-semibold">
            Ready for instant guests
          </div>
        </div>

        {/* Metric 3: Occupied & Rate */}
        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Occupancy Rate
            </span>
            <Timer className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-white">
              {occupancyRate}%
            </span>
            <span className="text-xs text-neutral-400 font-mono">({occupiedCount} Active)</span>
          </div>
          <div className="mt-2 w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-sky-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Turnover Queue */}
        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Turnover Queue
            </span>
            <RefreshCw className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-base font-semibold text-amber-400 font-mono">
              {billingCount} Billing
            </span>
            <span className="text-base font-semibold text-purple-400 font-mono">
              {cleaningCount} Clean
            </span>
          </div>
          <div className="mt-1 text-[10px] text-neutral-400">Fast reset monitoring</div>
        </div>
      </div>

      {/* Controls Bar: Status Filter Tabs (Apple Music Pill Row) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            statusFilter === "ALL"
              ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
              : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.08]"
          }`}
        >
          <span>All Tables</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
            {tables.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("AVAILABLE")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            statusFilter === "AVAILABLE"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.08]"
          }`}
        >
          <span>Available</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
            {availableCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("OCCUPIED")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            statusFilter === "OCCUPIED"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.08]"
          }`}
        >
          <span>Occupied</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
            {occupiedCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("BILLING")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            statusFilter === "BILLING"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
              : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.08]"
          }`}
        >
          <span>Billing</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
            {billingCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("CLEANING")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            statusFilter === "CLEANING"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.08]"
          }`}
        >
          <span>Cleaning</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
            {cleaningCount}
          </span>
        </button>
      </div>

      {/* ================= VISUAL FLOOR GRID ================= */}
      {loading ? (
        <div className="py-24 text-center text-xs text-neutral-500 font-mono">
          Loading floor map and acoustic table pods...
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1f]/60 p-12 text-center text-neutral-400 text-xs backdrop-blur-xl">
          No dining tables found matching the selected status filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredTables.map((table) => {
            const isAvail = table.status === "AVAILABLE";
            const isOccupied = table.status === "OCCUPIED";
            const isBilling = table.status === "BILLING";
            const isCleaning = table.status === "CLEANING";

            return (
              <div
                key={table.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#1c1c1f]/80 hover:bg-[#232328] border transition-all duration-300 backdrop-blur-xl hover:shadow-2xl hover:shadow-[#FA2D48]/5 ${
                  isAvail
                    ? "border-emerald-500/20 hover:border-emerald-500/50"
                    : isOccupied
                    ? "border-sky-500/20 hover:border-sky-500/50"
                    : isBilling
                    ? "border-amber-500/20 hover:border-amber-500/50"
                    : "border-purple-500/20 hover:border-purple-500/50"
                }`}
              >
                {/* Status Rim Light */}
                <div
                  className={`h-1 w-full ${
                    isAvail
                      ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500"
                      : isOccupied
                      ? "bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500"
                      : isBilling
                      ? "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500"
                      : "bg-gradient-to-r from-purple-500 via-pink-500 to-violet-500"
                  }`}
                />

                <div className="p-4 flex flex-col justify-between flex-1">
                  {/* Top Bar: Table Identifier & Live Status Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-white/[0.08] text-white font-mono font-black text-xs tracking-tight border border-white/10 shadow-xs">
                        T-{table.tableNumber}
                      </span>
                      <div className="flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-neutral-400 border border-white/[0.06]">
                        <Users className="h-3 w-3 text-neutral-500" />
                        <span>{table.capacity} Seats</span>
                      </div>
                    </div>

                    {/* Live Status Badge */}
                    <div>
                      {isAvail && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                          </span>
                          Ready
                        </span>
                      )}
                      {isOccupied && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold text-sky-400 border border-sky-500/30">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
                          </span>
                          Occupied
                        </span>
                      )}
                      {isBilling && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/30">
                          <Sparkles className="h-3 w-3 text-amber-400" />
                          Bill Due
                        </span>
                      )}
                      {isCleaning && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-bold text-purple-400 border border-purple-500/30">
                          <RefreshCw className="h-3 w-3 text-purple-400 animate-spin" />
                          Cleaning
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acoustic Floor Table Pod */}
                  <TableVisualPod table={table} onShowQR={() => handleShowTableQR(table)} />

                  {/* 1-Tap Status Selector Pill */}
                  <div className="mt-1 mb-3">
                    <div className="text-[10px] uppercase font-bold text-neutral-400 mb-1.5 px-0.5 tracking-wider flex items-center justify-between">
                      <span>Quick Status</span>
                      <span className="text-neutral-500 font-normal">1-tap update</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(table.id, "AVAILABLE")}
                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                          isAvail
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        Avail
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(table.id, "OCCUPIED")}
                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                          isOccupied
                            ? "bg-sky-600 text-white shadow-xs"
                            : "text-neutral-400 hover:text-sky-400 hover:bg-sky-500/10"
                        }`}
                      >
                        Occ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(table.id, "BILLING")}
                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                          isBilling
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-neutral-400 hover:text-amber-400 hover:bg-amber-500/10"
                        }`}
                      >
                        Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(table.id, "CLEANING")}
                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                          isCleaning
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-neutral-400 hover:text-purple-400 hover:bg-purple-500/10"
                        }`}
                      >
                        Clean
                      </button>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3">
                    <button
                      onClick={() => handleShowTableQR(table)}
                      className="flex-1 h-8 rounded-full bg-white/[0.06] hover:bg-[#FA2D48]/20 text-neutral-300 hover:text-[#FA2D48] text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/[0.08] transition-all"
                    >
                      <QrCode className="h-3.5 w-3.5 text-[#FA2D48]" />
                      <span>Standee QR</span>
                    </button>

                    <a
                      href={`/menu?table=${table.tableNumber}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                      title="Open Customer Menu in New Tab"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    <button
                      onClick={() => setDeleteConfirmTable(table)}
                      className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-red-500/20 flex items-center justify-center text-neutral-400 hover:text-red-400 transition-colors"
                      title="Delete Table"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: ADD TABLE ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/[0.12] bg-[#1a1a1d]/95 p-6 shadow-2xl text-white backdrop-blur-3xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Add Dining Table</h3>
                <p className="text-xs text-neutral-400">Configure floor seating capacity</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              {/* Auto-Assigned Notice */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-400">Next Table:</span>
                  <span className="rounded-full bg-[#FA2D48]/20 px-2.5 py-0.5 text-xs font-mono font-bold text-[#FA2D48] border border-[#FA2D48]/30">
                    TABLE {nextTableNumber}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">AUTO-NUMBER</span>
              </div>

              {/* Seating Presets */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Guest Seating Capacity *
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[2, 4, 6, 8].map((seats) => (
                    <button
                      key={seats}
                      type="button"
                      onClick={() => setCapacity(seats.toString())}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        capacity === seats.toString()
                          ? "bg-[#FA2D48] text-white border-[#FA2D48] shadow-md shadow-[#FA2D48]/30"
                          : "bg-white/[0.05] text-neutral-300 border-white/[0.08] hover:bg-white/[0.1]"
                      }`}
                    >
                      {seats} Seats
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  placeholder="Custom capacity (e.g. 4)"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full h-10 px-3.5 text-sm font-mono rounded-xl bg-white/[0.06] text-white border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full px-5 py-2 text-xs font-semibold bg-gradient-to-r from-[#FA2D48] to-[#FF4565] text-white shadow-lg shadow-[#FA2D48]/30 hover:opacity-95 transition-all"
                >
                  Create Table {nextTableNumber}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: QR STAND DISPLAY & PRINT ================= */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/[0.12] bg-[#1a1a1d]/95 p-6 shadow-2xl text-white backdrop-blur-3xl text-center animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
              <span className="text-sm font-bold text-white tracking-tight">
                {selectedQR.title} Standee
              </span>
              <button
                onClick={() => setSelectedQR(null)}
                className="rounded-full p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Apple Music Acrylic QR Frame */}
            <div className="bg-white p-4 rounded-3xl inline-block mx-auto mb-3 shadow-2xl">
              {selectedQR.imgUrl ? (
                <img
                  src={selectedQR.imgUrl}
                  alt={`QR for ${selectedQR.title}`}
                  className="w-48 h-48 mx-auto rounded-xl"
                />
              ) : (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    selectedQR.url
                  )}`}
                  alt="QR"
                  className="w-48 h-48 mx-auto rounded-xl"
                />
              )}
            </div>

            <div className="text-xs font-semibold text-white mb-1">
              {selectedQR.title} {selectedQR.capacity ? `• Seats ${selectedQR.capacity}` : ""}
            </div>

            <p className="font-mono text-[10px] text-neutral-400 mb-5 break-all px-2">
              {selectedQR.url}
            </p>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSelectedQR(null)}
                className="flex-1 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-neutral-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handlePrintQR}
                className="flex-1 h-9 rounded-full bg-gradient-to-r from-[#FA2D48] to-[#FF4565] text-xs font-semibold text-white shadow-lg shadow-[#FA2D48]/30 flex items-center justify-center gap-1.5 hover:opacity-95 transition-all"
              >
                <Printer className="h-4 w-4" />
                <span>Print Standee</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deleteConfirmTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/[0.12] bg-[#1a1a1d]/95 p-6 shadow-2xl text-white backdrop-blur-3xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[#FA2D48] border border-red-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Delete Table {deleteConfirmTable.tableNumber}
                </h3>
                <p className="text-xs text-neutral-400">Are you sure you want to remove this table?</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-neutral-300 leading-relaxed">
              Deleting Table {deleteConfirmTable.tableNumber} will remove its QR endpoint from the active floor.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmTable(null)}
                className="rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTable}
                className="rounded-full px-5 py-2 text-xs font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/30 hover:opacity-95 transition-all"
              >
                Delete Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
