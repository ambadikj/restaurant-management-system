import { useState, useEffect, useMemo } from "react";
import axiosInstance from "../../api/axiosInstance";
import axios from "axios";
import { socket } from "../../lib/socket";
import {
  QrCode,
  Printer,
  ShoppingBag,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  UtensilsCrossed,
} from "lucide-react";

interface RestaurantTable {
  id: number;
  tableNumber: number;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "BILLING" | "CLEANING";
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

  // Filter out system takeaway table (#999) from dining floor tables
  const diningTables = useMemo(() => tables.filter((t) => t.tableNumber !== 999), [tables]);

  const nextTableNumber = diningTables.length > 0 ? Math.max(...diningTables.map((t) => t.tableNumber)) + 1 : 1;

  useEffect(() => {
    fetchTables();

    const handleTableUpdate = (updatedTable: RestaurantTable) => {
      setTables((prev) => {
        const exists = prev.some((t) => t.id === updatedTable.id);
        if (exists) {
          return prev.map((t) => (t.id === updatedTable.id ? { ...t, ...updatedTable } : t));
        }
        return [...prev, updatedTable].sort((a, b) => a.tableNumber - b.tableNumber);
      });
    };

    const handleTableDelete = ({ id }: { id: number }) => {
      setTables((prev) => prev.filter((t) => t.id !== id));
    };

    const handleNewOrder = (data: { tableNumber: number | string }) => {
      const num = typeof data.tableNumber === "string" ? parseInt(data.tableNumber) : data.tableNumber;
      if (!isNaN(num)) {
        setTables((prev) =>
          prev.map((t) => (t.tableNumber === num ? { ...t, status: "OCCUPIED" } : t))
        );
      }
    };

    const handleServiceAlert = (data: { tableNumber: number | string; type: string }) => {
      if (data.type === "REQUEST_BILL") {
        const num = typeof data.tableNumber === "string" ? parseInt(data.tableNumber) : data.tableNumber;
        if (!isNaN(num)) {
          setTables((prev) =>
            prev.map((t) => (t.tableNumber === num ? { ...t, status: "BILLING" } : t))
          );
        }
      }
    };

    socket.on("table:update", handleTableUpdate);
    socket.on("table:deleted", handleTableDelete);
    socket.on("order:new", handleNewOrder);
    socket.on("service:alert", handleServiceAlert);

    return () => {
      socket.off("table:update", handleTableUpdate);
      socket.off("table:deleted", handleTableDelete);
      socket.off("order:new", handleNewOrder);
      socket.off("service:alert", handleServiceAlert);
    };
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
      const res = await axiosInstance.post("/tables", {
        tableNumber: nextTableNumber,
        capacity: Number(capacity || 4),
      });
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

  const handleShowWaiterQR = async () => {
    try {
      const res = await axiosInstance.get("/tables/waiter/qr");
      setSelectedQR({
        title: "Waiter Portal QR Standee",
        url: res.data.url,
        imgUrl: res.data.qrCode,
        tableNumber: "WAITER",
      });
    } catch (err) {
      alert("Error generating waiter QR code");
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
      const cardsHtml = diningTables
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

  // Calculations based strictly on physical dining tables
  const availableCount = diningTables.filter((t) => t.status === "AVAILABLE").length;
  const occupiedCount = diningTables.filter((t) => t.status === "OCCUPIED").length;
  const billingCount = diningTables.filter((t) => t.status === "BILLING").length;
  const cleaningCount = diningTables.filter((t) => t.status === "CLEANING").length;

  const filteredTables = diningTables.filter((t) => {
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

      {/* Header Bar - Apple Music Editorial Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent border border-white/[0.09] p-6 sm:p-7 backdrop-blur-2xl shadow-2xl">
        {/* Ambient Bloom Halos */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#FA2D48]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Floor Plan & Tables
          </h1>

          {/* Action Pills */}
          <div className="relative z-10 flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleShowTakeawayQR}
              className="flex items-center gap-2 rounded-full px-4.5 py-2.5 text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-neutral-200 hover:text-white border border-white/[0.12] backdrop-blur-xl shadow-sm transition-all active:scale-95"
              title="Generate Takeaway Standee"
            >
              <ShoppingBag className="h-4 w-4 text-[#FA2D48]" />
              <span>Takeaway QR</span>
            </button>

            <button
              onClick={handleShowWaiterQR}
              className="flex items-center gap-2 rounded-full px-4.5 py-2.5 text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-neutral-200 hover:text-white border border-white/[0.12] backdrop-blur-xl shadow-sm transition-all active:scale-95"
              title="Generate Waiter Portal Standee"
            >
              <UtensilsCrossed className="h-4 w-4 text-amber-400" />
              <span>Waiter QR</span>
            </button>

            <button
              onClick={handleBatchPrint}
              className="flex items-center gap-2 rounded-full px-4.5 py-2.5 text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-neutral-200 hover:text-white border border-white/[0.12] backdrop-blur-xl shadow-sm transition-all active:scale-95"
            >
              <Printer className="h-4 w-4 text-neutral-400" />
              <span>Batch Print</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold bg-[#FA2D48] hover:bg-[#ff3b56] text-white shadow-lg shadow-[#FA2D48]/30 transition-all active:scale-95 hover:scale-[1.02]"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Table</span>
            </button>
          </div>
        </div>
      </div>



      {/* Controls Bar: Status Filter Tabs (Apple Music Pill Row) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            statusFilter === "ALL"
              ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
              : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
          }`}
        >
          <span>All Tables</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
            {diningTables.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("AVAILABLE")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            statusFilter === "AVAILABLE"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
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
              : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
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
              : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
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
              : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
          }`}
        >
          <span>Cleaning</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
            {cleaningCount}
          </span>
        </button>
      </div>

      {/* ================= APPLE MUSIC STATION / ALBUM CARD GRID ================= */}
      {loading ? (
        <div className="py-24 text-center text-xs text-neutral-500 font-mono">
          Loading floor plan stations...
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1f]/60 p-12 text-center text-neutral-400 text-xs backdrop-blur-xl">
          No dining tables found matching the selected status filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredTables.map((table) => {
            const isAvail = table.status === "AVAILABLE";
            const isOccupied = table.status === "OCCUPIED";
            const isBilling = table.status === "BILLING";
            const isCleaning = table.status === "CLEANING";

            const tableTypeName =
              table.capacity <= 2
                ? "Bistro"
                : table.capacity <= 4
                ? "Booth"
                : "Banquet";

            const tableTitle = `Table ${table.tableNumber}`;
            const tableCapacityLabel = `${table.capacity} Seats`;
            const tableSubtitle = `${tableTypeName} Station • #${table.id}`;

            const liveMenuUrl = `http://localhost:5173/menu?table=${table.tableNumber}`;
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(liveMenuUrl)}`;

            return (
              <div
                key={table.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#1c1c1f]/85 hover:bg-[#222227] border border-white/[0.08] hover:border-white/[0.18] p-5 backdrop-blur-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                {/* Top: Table Title, Capacity Tag & Live Status Pill */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-white tracking-tight font-sans truncate group-hover:text-[#FA2D48] transition-colors">
                        {tableTitle}
                      </h3>
                      <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-neutral-300 shrink-0 font-mono">
                        {tableCapacityLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                      {tableSubtitle}
                    </p>
                  </div>

                  {/* Live Status Pill */}
                  <div className="shrink-0">
                    {isAvail && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        Ready
                      </span>
                    )}
                    {isOccupied && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-400 border border-sky-500/25 shadow-sm shadow-sky-500/10">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                        </span>
                        Occ
                      </span>
                    )}
                    {isBilling && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-400 border border-amber-500/25 shadow-sm shadow-amber-500/10">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                        </span>
                        Bill
                      </span>
                    )}
                    {isCleaning && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-2.5 py-1 text-[11px] font-semibold text-purple-400 border border-purple-500/25 shadow-sm shadow-purple-500/10">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
                        </span>
                        Clean
                      </span>
                    )}
                  </div>
                </div>

                {/* Minimal Center: Refined Centered QR Medallion */}
                <div
                  onClick={() => handleShowTableQR(table)}
                  className="relative my-3.5 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.16] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group/qr overflow-hidden"
                  title="Click to view full QR standee"
                >
                  {/* Subtle status ambient radial glow */}
                  <div
                    className={`pointer-events-none absolute inset-0 opacity-20 group-hover/qr:opacity-35 transition-opacity duration-300 ${
                      isAvail
                        ? "bg-radial from-emerald-500/35 to-transparent"
                        : isOccupied
                        ? "bg-radial from-sky-500/35 to-transparent"
                        : isBilling
                        ? "bg-radial from-amber-500/35 to-transparent"
                        : "bg-radial from-purple-500/35 to-transparent"
                    }`}
                  />

                  {/* Perfectly Centered QR Tile */}
                  <div className="relative z-10 p-2.5 rounded-2xl bg-white shadow-xl group-hover/qr:scale-105 transition-transform duration-200">
                    <img
                      src={qrImageUrl}
                      alt={`${tableTitle} QR`}
                      className="w-20 h-20 sm:w-22 sm:h-22 object-contain block rounded-lg"
                      loading="lazy"
                    />
                  </div>

                  <span className="relative z-10 text-[11px] font-mono text-neutral-400 group-hover/qr:text-white mt-2.5 transition-colors flex items-center gap-1.5">
                    <QrCode className="h-3.5 w-3.5 text-[#FA2D48]" />
                    <span>View Standee QR</span>
                  </span>

                  {/* Solid Hover Backdrop so no text bleeds through */}
                  <div className="absolute inset-0 bg-[#161619]/95 backdrop-blur-sm opacity-0 group-hover/qr:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 z-20">
                    <div className="h-9 w-9 rounded-full bg-[#FA2D48] text-white flex items-center justify-center shadow-lg shadow-[#FA2D48]/40">
                      <Printer className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide">
                      Print Standee QR
                    </span>
                  </div>
                </div>

                {/* Status Switcher & Footer Actions */}
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(table.id, "AVAILABLE");
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
                        handleUpdateStatus(table.id, "OCCUPIED");
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
                        handleUpdateStatus(table.id, "BILLING");
                      }}
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        isBilling
                          ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                          : "text-neutral-400 hover:text-white"
                      }`}
                      title="Set Billing"
                    >
                      Bill
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(table.id, "CLEANING");
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

                  {/* Footer Action Buttons */}
                  <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3">
                    <button
                      type="button"
                      onClick={() => handleShowTableQR(table)}
                      className="flex-1 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/[0.08] transition-all cursor-pointer active:scale-95"
                    >
                      <Printer className="h-3.5 w-3.5 text-neutral-400" />
                      <span>Standee QR</span>
                    </button>

                    <a
                      href={liveMenuUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-neutral-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
                      title="Open Live Menu in New Tab"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmTable(table)}
                      className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-red-500/20 flex items-center justify-center text-neutral-400 hover:text-red-400 border border-white/[0.08] transition-colors cursor-pointer"
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
                          : "bg-white/[0.05] text-neutral-300 border-white/[0.08] hover:bg-white/[0.1] hover:text-white"
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
                  className="rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white transition-colors"
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
                className="flex-1 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
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
                className="rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white transition-colors"
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
