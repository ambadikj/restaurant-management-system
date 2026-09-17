import {
  Download,
  Receipt,
  CreditCard,
  Star,
  Clock,
} from "lucide-react";
import { BrandCrest } from "@/components/BrandLogo";

export default function Reports() {
  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in duration-300">
      {/* Informational Staging Banner - Apple Music Frosted Capsule */}
      <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/[0.1] bg-[#1c1c1f]/80 p-5 text-xs text-neutral-300 backdrop-blur-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <BrandCrest className="h-10 w-10 shrink-0 rounded-2xl" />
          <div>
            <p className="font-bold text-white text-sm">
              EOD Reporting & Review Pipeline in Staging
            </p>
            <p className="text-neutral-400 mt-0.5 leading-relaxed">
              Automated End-of-Day financial reconciliation and post-payment guest feedback ratings are synchronizing. Displaying structural analytics preview.
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex rounded-full bg-white/[0.06] border border-white/[0.1] px-3 py-1 font-mono text-[11px] font-semibold text-neutral-300">
          SCHEMA v1.0
        </span>
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
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#FA2D48]/15 border border-[#FA2D48]/30 px-3 py-0.5 text-[11px] font-mono font-bold text-[#FA2D48]">
              <Clock className="h-3 w-3 animate-spin" />
              SKELETON PREVIEW
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400">
            Categorized settlement breakdowns, tax reconciliation, and guest feedback ratings.
          </p>
        </div>

        <button
          disabled
          className="flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold bg-white/[0.06] text-neutral-500 border border-white/[0.06] cursor-not-allowed self-start md:self-auto"
        >
          <Download className="h-4 w-4" />
          <span>Export Summary</span>
        </button>
      </div>

      {/* KPI Overview Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Gross Revenue
          </div>
          <div className="mt-1 text-2xl font-bold text-white font-mono">$3,842.50</div>
          <div className="mt-0.5 text-[10px] text-emerald-400 font-medium">+12.4% vs yesterday</div>
        </div>

        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Orders Fulfilled
          </div>
          <div className="mt-1 text-2xl font-bold text-white font-mono">148</div>
          <div className="mt-0.5 text-[10px] text-neutral-400">Avg ticket $25.96</div>
        </div>

        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="text-[11px] font-semibold text-[#FA2D48] uppercase tracking-wider">
            Tax Collected (GST)
          </div>
          <div className="mt-1 text-2xl font-bold text-[#FA2D48] font-mono">$192.12</div>
          <div className="mt-0.5 text-[10px] text-neutral-400">5.0% flat dining GST</div>
        </div>

        <div className="rounded-2xl bg-[#1c1c1f]/70 border border-white/[0.07] p-4.5 backdrop-blur-xl">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
            Guest Satisfaction
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-400 font-mono">4.9 / 5.0</div>
          <div className="mt-0.5 text-[10px] text-neutral-400">62 verified reviews</div>
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
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                AUDITED
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-white">UPI & QR Pay</span>
                </div>
                <span className="text-white font-bold">$2,180.00</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  <span className="text-white">Credit / Debit Card</span>
                </div>
                <span className="text-white font-bold">$1,240.50</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-white">Cash at Counter</span>
                </div>
                <span className="text-white font-bold">$422.00</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.07] pt-4 mt-5 flex justify-between items-center">
            <span className="text-xs text-neutral-400 font-semibold">Net Gateway Balance</span>
            <span className="rounded-full bg-[#FA2D48]/20 px-3 py-1 font-mono font-bold text-xs text-[#FA2D48] border border-[#FA2D48]/30">
              $3,842.50
            </span>
          </div>
        </div>

        {/* Card 2: Tax & KOT Reconciliation */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#1c1c1f]/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#FA2D48]" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Tax & KOT Reconciliation
                </span>
              </div>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                BALANCED
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/[0.03]">
                <span className="text-neutral-400">CGST (2.5%)</span>
                <span className="text-white font-bold">$96.06</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded-xl bg-white/[0.03]">
                <span className="text-neutral-400">SGST (2.5%)</span>
                <span className="text-white font-bold">$96.06</span>
              </div>

              <div className="flex justify-between items-center p-2 rounded-xl bg-white/[0.03]">
                <span className="text-neutral-400">Voided KOT Value</span>
                <span className="text-neutral-500 font-bold">$0.00</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.07] pt-4 mt-5 flex justify-between items-center">
            <span className="text-xs text-neutral-400 font-semibold">Total Tax Remitted</span>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-mono font-bold text-xs text-emerald-400 border border-emerald-500/30">
              $192.12
            </span>
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
                TOP TIER
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-3">
              <div className="text-4xl font-extrabold text-white font-mono tracking-tight">
                4.9 <span className="text-lg text-neutral-500">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-[11px] text-neutral-400 mt-2 text-center">
                98% of surveyed guests rated 5 stars for order speed and food warmth.
              </p>
            </div>
          </div>

          <div className="border-t border-white/[0.07] pt-4 mt-5 flex justify-between items-center text-xs text-neutral-400">
            <span>Verified Orders Sample</span>
            <span className="font-mono text-white font-bold">148 Sessions</span>
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
          <span className="rounded-full bg-white/[0.06] border border-white/[0.1] px-3 py-1 text-[11px] font-mono text-neutral-300">
            Live Feed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-white/[0.07] bg-white/[0.02] text-neutral-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="py-3.5 pl-6 pr-3 w-36">Session ID</th>
                <th className="px-3 py-3.5 w-32">Table / Origin</th>
                <th className="px-3 py-3.5 w-36">Payment Mode</th>
                <th className="px-3 py-3.5 w-32">Total Paid</th>
                <th className="py-3.5 pl-3 pr-6">Guest Rating & Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {[
                {
                  id: "SES-84920",
                  table: "Table 01",
                  mode: "UPI (QR)",
                  total: "$48.50",
                  stars: 5,
                  note: "Incredible Truffle Pasta, arrived scorching hot!",
                },
                {
                  id: "SES-84919",
                  table: "Table 03",
                  mode: "Apple Pay",
                  total: "$72.00",
                  stars: 5,
                  note: "Contactless order was so fast, seamless experience.",
                },
                {
                  id: "SES-84918",
                  table: "Takeaway",
                  mode: "Credit Card",
                  total: "$24.00",
                  stars: 5,
                  note: "Clean packaging, ready right as promised.",
                },
                {
                  id: "SES-84917",
                  table: "Table 02",
                  mode: "Cash Counter",
                  total: "$36.50",
                  stars: 4,
                  note: "Great mocktails and polite staff.",
                },
                {
                  id: "SES-84916",
                  table: "Table 04",
                  mode: "UPI (QR)",
                  total: "$94.20",
                  stars: 5,
                  note: "Family banquet dinner was delicious!",
                },
              ].map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="py-3.5 pl-6 pr-3 font-semibold text-white">
                    {row.id}
                  </td>
                  <td className="px-3 py-3.5 text-neutral-300">
                    <span className="rounded-md bg-white/[0.05] px-2 py-0.5 border border-white/[0.08]">
                      {row.table}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-neutral-300">
                    {row.mode}
                  </td>
                  <td className="px-3 py-3.5 font-bold text-white">
                    {row.total}
                  </td>
                  <td className="py-3.5 pl-3 pr-6">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: row.stars }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400" />
                        ))}
                      </div>
                      <span className="text-neutral-400 font-sans text-xs">
                        "{row.note}"
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
