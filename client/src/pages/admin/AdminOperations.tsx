import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  ChefHat,
  LayoutGrid,
  AlertTriangle,
  Terminal,
  PlayCircle,
  RefreshCw,
  Search,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Radio,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface KDSTicket {
  id: number;
  table: string;
  items: string[];
  status: "PREPARING" | "PENDING" | "READY TO SERVE" | "JUST RECEIVED";
  time: string;
}

export default function AdminOperations() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isRebooting, setIsRebooting] = useState(false);

  const [tickets, setTickets] = useState<KDSTicket[]>([
    {
      id: 104,
      table: "TABLE 04",
      items: ["2x Wagyu Ribeye (Med-Rare)", "1x Truffle Parmesan Fries"],
      status: "PREPARING",
      time: "6m ago",
    },
    {
      id: 105,
      table: "TAKEAWAY",
      items: ["1x Smoked Brisket Burger", "2x Cold Brew Tonic"],
      status: "PENDING",
      time: "1m ago",
    },
    {
      id: 103,
      table: "TABLE 09",
      items: ["1x Citrus Glazed Salmon", "1x Burrata Salad"],
      status: "READY TO SERVE",
      time: "14m ago",
    },
  ]);

  const [logs, setLogs] = useState<string[]>([
    "[SYS_INIT] Real-time Node.js & Socket.io server listening on :5000",
    "[DB_LOCK] Row-level concurrency transaction initialized for menu batches.",
    "[AUTH] Admin session authenticated (JWT token verified).",
    "[KDS_SYNC] Kitchen Display tablet hooked into broadcast room: `kds_main`.",
    "[POS_GRID] Table matrix 1-12 session listeners armed.",
  ]);

  const simulateKOT = () => {
    const randomTicketId = Math.floor(100 + Math.random() * 900);
    const tableNum = Math.floor(1 + Math.random() * 12);
    const tableStr = tableNum < 10 ? `TABLE 0${tableNum}` : `TABLE ${tableNum}`;

    const newTicket: KDSTicket = {
      id: randomTicketId,
      table: tableStr,
      items: ["1x Special Dum Biryani", "1x Virgin Mojito"],
      status: "JUST RECEIVED",
      time: "Just now",
    };

    setTickets((prev) => [newTicket, ...prev.slice(0, 5)]);

    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((prev) => [
      `[${time}] [SOCKET.IO_BROADCAST] Event: 'kds_new_kot' -> Ticket #${randomTicketId} (${tableStr})`,
      ...prev,
    ]);
  };

  const handleReboot = () => {
    setIsRebooting(true);
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((prev) => [
      `[${time}] [SYS_RESTART] Gracefully resetting socket channels & worker pool...`,
      ...prev,
    ]);

    setTimeout(() => {
      setIsRebooting(false);
      const doneTime = new Date().toLocaleTimeString("en-US", { hour12: false });
      setLogs((prev) => [
        `[${doneTime}] [SYS_ONLINE] Sockets re-established on :5000. LOCK_OK.`,
        ...prev,
      ]);
    }, 1500);
  };

  const getStatusBadge = (status: KDSTicket["status"]) => {
    switch (status) {
      case "READY TO SERVE":
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Ready</Badge>;
      case "PREPARING":
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Preparing</Badge>;
      case "JUST RECEIVED":
        return <Badge variant="info" className="gap-1"><Radio className="h-3 w-3 animate-pulse" /> Received</Badge>;
      case "PENDING":
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  const filteredTickets = tickets.filter(
    (t) =>
      t.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.items.some((item) => item.toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(t.id).includes(searchQuery)
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200/80 pb-6 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
              System Operations
            </h1>
            <Badge variant="outline" className="bg-neutral-100 dark:bg-neutral-800 font-mono text-xs font-medium">
              SRS SEC 13.1 / 14.1
            </Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Live WebSocket stream, concurrent session metrics & real-time kitchen dispatch queue
          </p>
        </div>

        {/* Operational Indicators & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono">{isRebooting ? "WS: RECONNECTING..." : "WS: SYNCED (:5000)"}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-mono text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Row Lock: ACTIVE
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={simulateKOT}
            className="gap-1.5 font-semibold text-xs shadow-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <PlayCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Simulate KOT
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReboot}
            disabled={isRebooting}
            className="gap-1.5 font-semibold text-xs shadow-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRebooting ? "animate-spin text-blue-600" : ""}`} />
            {isRebooting ? "Rebooting..." : "Reboot Sockets"}
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Gross Revenue */}
        <Card className="relative overflow-hidden border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider dark:text-neutral-400">
              Today's Gross Rev
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-50">
              $1,284.50
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 font-mono">
              <span>UPI: <strong className="text-neutral-800 dark:text-neutral-200">72%</strong></span>
              <span>Cash: <strong className="text-neutral-800 dark:text-neutral-200">28%</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Active KOTs */}
        <Card className="relative overflow-hidden border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider dark:text-neutral-400">
              Active KOTs
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ChefHat className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-50">
              {tickets.length} Tickets
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3 text-amber-500" /> Avg: 14.2 Mins
              </span>
              <span className="text-emerald-600 font-medium">Kitchen Live</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Table Sessions */}
        <Card className="relative overflow-hidden border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider dark:text-neutral-400">
              Table Sessions
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <LayoutGrid className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-50">
              8 / 12 Active
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 font-mono">
              <span>Takeaway Open: <strong>3</strong></span>
              <span className="text-blue-600 font-medium">66% Cap</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: 86'd Stock Alert */}
        <Card
          onClick={() => navigate("/admin/menu")}
          className="relative overflow-hidden border-red-200/80 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/20 cursor-pointer transition-all hover:shadow-md hover:border-red-300"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-red-600 uppercase tracking-wider dark:text-red-400">
              86'D Stock Alert
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-red-700 dark:text-red-400 flex items-center justify-between">
              <span>1 Item Depleted</span>
              <ArrowUpRight className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-red-100 dark:border-red-900/30 pt-2 text-xs text-red-600 dark:text-red-400 font-mono">
              <span>Row Lock Enforced</span>
              <span className="underline font-semibold">Manage Menu</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live KOT Dispatch Queue Visualizer */}
      <Card className="border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
              </span>
              <CardTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Live KDS Ticket Dispatch Queue
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-neutral-500 mt-1">
              Real-time kitchen display monitor hooked to socket broadcasts
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Filter active tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {filteredTickets.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">
              No active KOT tickets matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredTickets.map((tix) => (
                <div
                  key={tix.id}
                  className="flex flex-col justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4 transition-all hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950/50 shadow-sm"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-neutral-200/70 pb-2.5 mb-3 dark:border-neutral-800">
                      <span className="rounded-md bg-neutral-900 px-2 py-0.5 font-mono text-xs font-bold text-white dark:bg-neutral-100 dark:text-neutral-900">
                        TICKET #{tix.id}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs font-semibold bg-white dark:bg-neutral-900">
                        {tix.table}
                      </Badge>
                    </div>

                    {/* Items List */}
                    <ul className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300 mb-4 font-medium">
                      {tix.items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Status Footer */}
                  <div className="flex items-center justify-between border-t border-neutral-200/70 pt-2.5 dark:border-neutral-800 text-xs">
                    <div>{getStatusBadge(tix.status)}</div>
                    <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                      {tix.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-Time Console & Audit Feed */}
      <Card className="border-neutral-800 bg-neutral-950 text-neutral-100 shadow-md font-mono">
        <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-800/80 py-3.5 px-5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Terminal className="h-4 w-4" />
            <span>CONCURRENT_STATE_FEED & AUDIT_LOG</span>
          </div>
          <span className="text-[11px] text-neutral-400">PostgreSQL Locking: ACTIVE</span>
        </CardHeader>
        <CardContent className="p-4">
          <ul className="space-y-1.5 text-xs text-emerald-400 max-h-52 overflow-y-auto pr-2 font-mono">
            {logs.map((log, idx) => {
              const isWarn = log.includes("LOCK") || log.includes("RECONNECTING") || log.includes("86");
              const isInfo = log.includes("SOCKET.IO") || log.includes("AUTH");
              return (
                <li
                  key={idx}
                  className={`leading-relaxed ${
                    isWarn
                      ? "text-amber-400"
                      : isInfo
                      ? "text-blue-400"
                      : "text-emerald-400"
                  }`}
                >
                  &gt; {log}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
