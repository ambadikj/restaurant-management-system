import {
  Download,
  Receipt,
  CreditCard,
  Star,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Reports() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Informational Staging Banner */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-200/70 bg-blue-50/60 p-4 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-200">
              EOD Reporting & Review Pipeline in Staging
            </p>
            <p className="text-blue-700/80 dark:text-blue-300/80 mt-0.5">
              Automated End-of-Day reconciliation and post-payment guest feedback analytics are in preparation. Displaying structural skeleton.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="hidden sm:inline-flex bg-white/80 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800 font-mono text-[11px]"
        >
          SCHEMA v1.0
        </Badge>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
              End-of-Day (EOD) Reports & Feedback
            </h1>
            <Badge variant="outline" className="gap-1.5 text-xs font-mono font-medium">
              <Clock className="h-3 w-3 animate-spin text-neutral-500" />
              SKELETON PREVIEW
            </Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Categorized settlement breakdowns, tax reconciliation and customer feedback ratings
          </p>
        </div>

        <Button
          disabled
          className="gap-1.5 text-xs font-semibold bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none"
        >
          <Download className="h-4 w-4" />
          Export EOD Summary
        </Button>
      </div>

      {/* Financial Breakdown Skeleton Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Settlement by Gateway */}
        <Card className="border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-neutral-400" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Settlement by Gateway
                </CardTitle>
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 font-mono text-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="border-t border-neutral-200 pt-3 flex justify-between items-center dark:border-neutral-800">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Tax & KOT Reconciliation */}
        <Card className="border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-neutral-400" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Tax & KOT Reconciliation
                </CardTitle>
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 font-mono text-sm">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="border-t border-neutral-200 pt-3 flex justify-between items-center dark:border-neutral-800">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Customer Satisfaction Rating */}
        <Card className="border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
          <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-neutral-400" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Customer Satisfaction
                </CardTitle>
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center justify-center space-y-3">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <div className="flex gap-1.5">
              <Skeleton className="h-4 w-4 rounded-sm" />
              <Skeleton className="h-4 w-4 rounded-sm" />
              <Skeleton className="h-4 w-4 rounded-sm" />
              <Skeleton className="h-4 w-4 rounded-sm" />
              <Skeleton className="h-4 w-4 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-48 rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Closed Session Audits & Feedback Table Skeleton */}
      <Card className="overflow-hidden border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
        <CardHeader className="border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Latest Closed Session Audits & Customer Feedback
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Audited transaction settlements and direct guest ratings
              </CardDescription>
            </div>
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-neutral-200/80 bg-neutral-50/80 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-400">
              <tr>
                <th className="py-3 pl-6 pr-3 w-32">Session ID</th>
                <th className="px-3 py-3 w-32">Endpoint</th>
                <th className="px-3 py-3 w-32">Payment Mode</th>
                <th className="px-3 py-3 w-28">Total Paid</th>
                <th className="py-3 pl-3 pr-6">Customer Rating & Feedback Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-neutral-50/30">
                  <td className="py-3.5 pl-6 pr-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-3 py-3.5">
                    <Skeleton className="h-4 w-18" />
                  </td>
                  <td className="px-3 py-3.5">
                    <Skeleton className="h-5 w-14 rounded-md" />
                  </td>
                  <td className="px-3 py-3.5">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="py-3.5 pl-3 pr-6">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className={`h-3.5 ${i % 2 === 0 ? "w-64" : "w-80"}`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
