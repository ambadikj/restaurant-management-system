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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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
    ? "bg-gradient-to-b from-sky-400 to-blue-600 border-sky-300 shadow-md shadow-blue-500/30"
    : isBilling
      ? "bg-gradient-to-b from-amber-300 to-amber-500 border-amber-200 shadow-md shadow-amber-500/30"
      : isCleaning
        ? "bg-gradient-to-b from-purple-400 to-violet-600 border-purple-300 shadow-md shadow-purple-500/30"
        : "bg-gradient-to-b from-emerald-300 to-teal-600 border-emerald-200 shadow-md shadow-emerald-500/25";

  return (
    <div className="relative my-3 flex items-center justify-center p-3 select-none">
      {/* 2-Seat Circular Bistro */}
      {seats <= 2 ? (
        <div className="relative flex items-center justify-center">
          {/* Left Cushioned Chair */}
          <div
            className={`absolute -left-4.5 h-8 w-3 rounded-l-xl border transition-all duration-300 ${chairBase}`}
          >
            <div className="h-full w-1 border-r border-white/30" />
          </div>

          {/* Bistro Table Top */}
          <div
            onClick={onShowQR}
            className={`group/pod relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-full border-2 transition-colors duration-200 shadow-sm ${isAvail
                ? "bg-gradient-to-br from-white via-emerald-50/70 to-teal-100/60 border-emerald-300/80 text-emerald-950 shadow-emerald-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-emerald-950/40 dark:border-emerald-800"
                : isOccupied
                  ? "bg-gradient-to-br from-white via-sky-50/70 to-blue-100/60 border-blue-300/80 text-blue-950 shadow-blue-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-blue-950/40 dark:border-blue-800"
                  : isBilling
                    ? "bg-gradient-to-br from-white via-amber-50/70 to-orange-100/60 border-amber-300/80 text-amber-950 shadow-amber-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-amber-950/40 dark:border-amber-800"
                    : "bg-gradient-to-br from-white via-purple-50/70 to-violet-100/60 border-purple-300/80 text-purple-950 shadow-purple-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-purple-950/40 dark:border-purple-800"
              }`}
            title="Click to view QR Standee"
          >
            {/* Center QR Medallion */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-xs dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
              <QrCode className="h-4 w-4 text-neutral-800 dark:text-neutral-200 transition-all" />
            </div>

            <div className="mt-1 flex flex-col items-center leading-tight">
              <span className="font-mono text-xs font-black tracking-tight text-neutral-900 dark:text-neutral-50">
                T • {table.tableNumber < 10 ? `0${table.tableNumber}` : table.tableNumber}
              </span>
              <span className="text-[9px] font-semibold text-neutral-400">Bistro (2P)</span>
            </div>
          </div>

          {/* Right Cushioned Chair */}
          <div
            className={`absolute -right-4.5 h-8 w-3 rounded-r-xl border transition-all duration-300 ${chairBase}`}
          >
            <div className="h-full w-1 border-l border-white/30 ml-auto" />
          </div>
        </div>
      ) : seats <= 4 ? (
        /* 4-Seat Square Booth */
        <div className="relative flex items-center justify-center">
          {/* Top Chairs */}
          <div className="absolute -top-4 flex gap-5">
            <div className={`h-3 w-8 rounded-t-xl border transition-all duration-300 ${chairBase}`}>
              <div className="w-full h-1 border-b border-white/30" />
            </div>
            <div className={`h-3 w-8 rounded-t-xl border transition-all duration-300 ${chairBase}`}>
              <div className="w-full h-1 border-b border-white/30" />
            </div>
          </div>

          {/* Table Top */}
          <div
            onClick={onShowQR}
            className={`group/pod relative flex h-28 w-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 transition-colors duration-200 shadow-sm ${isAvail
                ? "bg-gradient-to-br from-white via-emerald-50/70 to-teal-100/60 border-emerald-300/80 text-emerald-950 shadow-emerald-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-emerald-950/40 dark:border-emerald-800"
                : isOccupied
                  ? "bg-gradient-to-br from-white via-sky-50/70 to-blue-100/60 border-blue-300/80 text-blue-950 shadow-blue-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-blue-950/40 dark:border-blue-800"
                  : isBilling
                    ? "bg-gradient-to-br from-white via-amber-50/70 to-orange-100/60 border-amber-300/80 text-amber-950 shadow-amber-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-amber-950/40 dark:border-amber-800"
                    : "bg-gradient-to-br from-white via-purple-50/70 to-violet-100/60 border-purple-300/80 text-purple-950 shadow-purple-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-purple-950/40 dark:border-purple-800"
              }`}
            title="Click to view QR Standee"
          >
            {/* Center QR Medallion */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-xs dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
              <QrCode className="h-4 w-4 text-neutral-800 dark:text-neutral-200 transition-all" />
            </div>

            <div className="mt-1 flex flex-col items-center leading-tight">
              <span className="font-mono text-xs font-black tracking-tight text-neutral-900 dark:text-neutral-50">
                TABLE {table.tableNumber}
              </span>
              <span className="text-[9px] font-semibold text-neutral-400">Booth (4P)</span>
            </div>
          </div>

          {/* Bottom Chairs */}
          <div className="absolute -bottom-4 flex gap-5">
            <div className={`h-3 w-8 rounded-b-xl border transition-all duration-300 ${chairBase}`}>
              <div className="w-full h-1 border-t border-white/30 mt-auto" />
            </div>
            <div className={`h-3 w-8 rounded-b-xl border transition-all duration-300 ${chairBase}`}>
              <div className="w-full h-1 border-t border-white/30 mt-auto" />
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
                <div className="w-full h-1 border-b border-white/30" />
              </div>
            ))}
          </div>

          {/* Banquet Table Top */}
          <div
            onClick={onShowQR}
            className={`group/pod relative flex h-28 w-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 transition-colors duration-200 shadow-sm ${isAvail
                ? "bg-gradient-to-br from-white via-emerald-50/70 to-teal-100/60 border-emerald-300/80 text-emerald-950 shadow-emerald-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-emerald-950/40 dark:border-emerald-800"
                : isOccupied
                  ? "bg-gradient-to-br from-white via-sky-50/70 to-blue-100/60 border-blue-300/80 text-blue-950 shadow-blue-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-blue-950/40 dark:border-blue-800"
                  : isBilling
                    ? "bg-gradient-to-br from-white via-amber-50/70 to-orange-100/60 border-amber-300/80 text-amber-950 shadow-amber-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-amber-950/40 dark:border-amber-800"
                    : "bg-gradient-to-br from-white via-purple-50/70 to-violet-100/60 border-purple-300/80 text-purple-950 shadow-purple-500/10 dark:from-neutral-900 dark:via-neutral-850 dark:to-purple-950/40 dark:border-purple-800"
              }`}
            title="Click to view QR Standee"
          >
            {/* Center QR Medallion */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-xs dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
              <QrCode className="h-4 w-4 text-neutral-800 dark:text-neutral-200 transition-all" />
            </div>

            <div className="mt-1 flex flex-col items-center leading-tight">
              <span className="font-mono text-xs font-black tracking-tight text-neutral-900 dark:text-neutral-50">
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
                <div className="w-full h-1 border-t border-white/30 mt-auto" />
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
      showNotification(`Table ${res.data.tableNumber} (Seats ${res.data.capacity}) created successfully!`);
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
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f8fafc;
              }
              .standee {
                border: 2px solid #0f172a;
                border-radius: 20px;
                padding: 36px 28px;
                max-width: 360px;
                background: #ffffff;
                text-align: center;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
              }
              .brand {
                font-size: 22px;
                font-weight: 800;
                letter-spacing: -0.5px;
                color: #0f172a;
                text-transform: uppercase;
              }
              .sub {
                font-size: 12px;
                color: #64748b;
                margin-top: 4px;
                margin-bottom: 24px;
              }
              .qr-frame {
                background: #ffffff;
                padding: 14px;
                border-radius: 16px;
                border: 2px solid #e2e8f0;
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
                color: #0f172a;
              }
              .seats {
                font-size: 13px;
                font-weight: 600;
                color: #2563eb;
                margin-bottom: 12px;
              }
              .instructions {
                font-size: 13px;
                color: #475569;
                line-height: 1.4;
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
              <p class="instructions">Scan with your smartphone camera to explore the digital menu and place your order.</p>
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
            <title>Restaurant Tables - Batch Standees</title>
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

  // Filter calculations
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {successMsg && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
              Floor Plan & QR Endpoints
            </h1>
            <Badge variant="outline" className="text-xs font-medium">
              {tables.length} Total Tables
            </Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Real-time dine-in floor map, seating capacity, table status, and contactless QR standees
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowTakeawayQR}
            className="gap-1.5 text-xs font-semibold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-xs"
            title="Generate and print universal Takeaway QR Standee"
          >
            <ShoppingBag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Takeaway QR
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchPrint}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Printer className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
            Batch Print Matrix
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 gap-1.5 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 shadow-xs"
          >
            <PlusCircle className="h-4 w-4" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Live Floor KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1: Capacity */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-4.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Floor Capacity</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-50">
              {totalCapacity}
            </span>
            <span className="text-xs text-neutral-500">Total Seats</span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-500 font-medium">
            Across {tables.length} dining tables
          </div>
        </div>

        {/* Metric 2: Available */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-4.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Available</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600">
              {availableCount}
            </span>
            <span className="text-xs text-neutral-500">Vacant Tables</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-semibold">
            Ready for instant seating
          </div>
        </div>

        {/* Metric 3: Occupied & Rate */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-4.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Occupancy Rate</span>
            <Timer className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-50">
              {occupancyRate}%
            </span>
            <span className="text-xs text-neutral-500 font-mono">({occupiedCount} Active)</span>
          </div>
          <div className="mt-2 w-full bg-neutral-100 rounded-full h-1.5 dark:bg-neutral-800 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 4: Billing & Cleaning */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-4.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Turnover Queue</span>
            <RefreshCw className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-sm font-semibold text-amber-600">
              {billingCount} Billing
            </span>
            <span className="text-sm font-semibold text-purple-600">
              {cleaningCount} Clean
            </span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-500">
            Fast floor reset monitoring
          </div>
        </div>
      </div>



      {/* Controls Bar: Filter Tabs & View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100 rounded-xl dark:bg-neutral-900">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${statusFilter === "ALL"
                ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-neutral-50"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              }`}
          >
            All Tables ({tables.length})
          </button>
          <button
            onClick={() => setStatusFilter("AVAILABLE")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${statusFilter === "AVAILABLE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-neutral-600 hover:text-emerald-600 dark:text-neutral-400"
              }`}
          >
            Available ({availableCount})
          </button>
          <button
            onClick={() => setStatusFilter("OCCUPIED")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${statusFilter === "OCCUPIED"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-neutral-600 hover:text-blue-600 dark:text-neutral-400"
              }`}
          >
            Occupied ({occupiedCount})
          </button>
          <button
            onClick={() => setStatusFilter("BILLING")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${statusFilter === "BILLING"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-neutral-600 hover:text-amber-600 dark:text-neutral-400"
              }`}
          >
            Billing ({billingCount})
          </button>
          <button
            onClick={() => setStatusFilter("CLEANING")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${statusFilter === "CLEANING"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-neutral-600 hover:text-purple-600 dark:text-neutral-400"
              }`}
          >
            Cleaning ({cleaningCount})
          </button>
        </div>
      </div>

      {/* ================= VISUAL FLOOR GRID ================= */}
      {loading ? (
        <div className="py-16 text-center text-sm text-neutral-500">Loading dining floor layout...</div>
      ) : filteredTables.length === 0 ? (
        <Card className="p-12 text-center text-neutral-500 text-sm">
          No tables found matching filter.
        </Card>
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
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-xs dark:bg-neutral-900 ${isAvail
                    ? "border-emerald-200/80 hover:border-emerald-400 dark:border-emerald-950/80"
                    : isOccupied
                      ? "border-sky-200/80 hover:border-sky-400 dark:border-sky-950/80"
                      : isBilling
                        ? "border-amber-200/80 hover:border-amber-400 dark:border-amber-950/80"
                        : "border-purple-200/80 hover:border-purple-400 dark:border-purple-950/80"
                  }`}
              >
                {/* Top Ambient Status Accent Strip */}
                <div
                  className={`h-1.5 w-full ${isAvail
                      ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"
                      : isOccupied
                        ? "bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500"
                        : isBilling
                          ? "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500"
                          : "bg-gradient-to-r from-purple-500 via-pink-500 to-violet-600"
                    }`}
                />

                <div className="p-4 flex flex-col justify-between flex-1">
                  {/* Top Bar: Table Identifier & Live Status Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-neutral-900 text-white font-mono font-black text-xs tracking-tight shadow-xs dark:bg-neutral-100 dark:text-neutral-900">
                        T-{table.tableNumber}
                      </span>
                      <div className="flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        <Users className="h-3 w-3 text-neutral-400" />
                        <span>{table.capacity} Seats</span>
                      </div>
                    </div>

                    {/* Live Status Badge */}
                    <div className="flex items-center">
                      {isAvail && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                          </span>
                          Ready
                        </span>
                      )}
                      {isOccupied && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
                          </span>
                          Occupied
                        </span>
                      )}
                      {isBilling && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          Bill Due
                        </span>
                      )}
                      {isCleaning && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800">
                          <RefreshCw className="h-3 w-3 text-purple-500 animate-spin" />
                          Cleaning
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3D-feeling Visual Table Diagram with Seating Pod */}
                  <TableVisualPod
                    table={table}
                    onShowQR={() => handleShowTableQR(table)}
                  />

                  {/* Quick 1-Click Status Segment Switcher */}
                  <div className="mt-1 mb-3">
                    <div className="text-[10px] uppercase font-bold text-neutral-400 mb-1 px-0.5 tracking-wider flex items-center justify-between">
                      <span>Quick Status</span>
                      <span className="text-neutral-400 font-normal">1-tap update</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-100 rounded-xl dark:bg-neutral-800/80">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(table.id, "AVAILABLE")}
                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${isAvail
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-neutral-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
                          }`}
                      >
                        Avail
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(table.id, "OCCUPIED")}
                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${isOccupied
                            ? "bg-sky-600 text-white shadow-xs"
                            : "text-neutral-600 hover:text-sky-700 hover:bg-sky-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
                          }`}
                      >
                        Occ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(table.id, "BILLING")}
                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${isBilling
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-neutral-600 hover:text-amber-700 hover:bg-amber-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
                          }`}
                      >
                        Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(table.id, "CLEANING")}
                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${isCleaning
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-neutral-600 hover:text-purple-700 hover:bg-purple-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
                          }`}
                      >
                        Clean
                      </button>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="flex items-center gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowTableQR(table)}
                      className="flex-1 h-8 text-xs font-semibold gap-1.5 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300"
                    >
                      <QrCode className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      Standee QR
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                      title="Open Customer Menu in New Tab"
                    >
                      <a
                        href={`/menu?table=${table.tableNumber}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmTable(table)}
                      className="h-8 w-8 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      title="Delete Table"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: ADD TABLE ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Add Table to Floor
                </h3>
                <p className="text-xs text-neutral-500">Configure guest seating capacity</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              {/* Auto-Assigned Notice */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Next Table:</span>
                  <Badge variant="default" className="bg-blue-600 text-white font-mono text-xs font-bold">
                    TABLE {nextTableNumber}
                  </Badge>
                </div>
                <span className="text-[11px] font-mono text-blue-600 font-semibold dark:text-blue-400">AUTO-NUMBERED</span>
              </div>

              {/* Seating Presets */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Guest Seating Capacity *
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2.5">
                  {[2, 4, 6, 8].map((seats) => (
                    <button
                      key={seats}
                      type="button"
                      onClick={() => setCapacity(seats.toString())}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${capacity === seats.toString()
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-xs dark:bg-neutral-100 dark:text-neutral-900"
                          : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
                        }`}
                    >
                      {seats} Seats
                    </button>
                  ))}
                </div>

                <Input
                  type="number"
                  min="1"
                  max="50"
                  required
                  placeholder="Custom capacity (e.g. 4)"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200">
                  Create Table {nextTableNumber}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: QR STAND DISPLAY & PRINT ================= */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 text-center animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4 dark:border-neutral-800">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {selectedQR.title} Standee
              </span>
              <button onClick={() => setSelectedQR(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-white border border-neutral-200 p-4 rounded-2xl inline-block mx-auto mb-3 shadow-xs">
              {selectedQR.imgUrl ? (
                <img src={selectedQR.imgUrl} alt={`QR for ${selectedQR.title}`} className="w-48 h-48 mx-auto" />
              ) : (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    selectedQR.url
                  )}`}
                  alt="QR"
                  className="w-48 h-48 mx-auto"
                />
              )}
            </div>

            <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 mb-1">
              {selectedQR.title} {selectedQR.capacity ? `• Seats ${selectedQR.capacity}` : ''}
            </div>

            <p className="font-mono text-[11px] text-neutral-400 mb-5 break-all">
              {selectedQR.url}
            </p>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedQR(null)} className="flex-1">
                Close
              </Button>
              <Button onClick={handlePrintQR} size="sm" className="flex-1 bg-blue-600 text-white hover:bg-blue-700">
                <Printer className="h-4 w-4 mr-1.5" /> Print Standee
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deleteConfirmTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Delete Table {deleteConfirmTable.tableNumber}
                </h3>
                <p className="text-xs text-neutral-500">Are you sure you want to delete this table?</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmTable(null)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteTable}>
                Yes, Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
