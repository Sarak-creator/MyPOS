"use client";

import React from "react";
import { Printer, X } from "lucide-react";
import { formatUSD } from "@/lib/utils";

interface InstallmentSchedulePrintProps {
  contract: any;
  onClose: () => void;
}

export default function InstallmentSchedulePrint({
  contract,
  onClose,
}: InstallmentSchedulePrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const storeName = "អាណាចក្រPOS (ANACHAK POS)";
  const storePhone = "012 345 678 / 096 376 0229";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 sm:p-10 shadow-2xl text-slate-800 print:shadow-none print:w-full print:max-w-none print:p-6 print:rounded-none">
        {/* Floating Print Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">
              តារាងបង់ប្រាក់
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              តារាងបង់រំលស់ប្រចាំខែ #{contract.contractNumber}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-800 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              ព្រីនតារាងបង់រំលស់ (Print Schedule)
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-300 p-2 text-slate-500 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Schedule Body */}
        <div className="printable-schedule space-y-5 text-xs">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-300 pb-4">
            <div>
              <h2 className="font-black text-lg text-slate-900">{contract.branchName || storeName}</h2>
              <p className="text-[11px] text-slate-500">ទូរស័ព្ទ៖ {storePhone}</p>
              <p className="text-[11px] text-slate-500">ប្រព័ន្ធគ្រប់គ្រងការបង់រំលស់ទំនិញ</p>
            </div>
            <div className="text-right">
              <h1 className="text-base font-black text-teal-900 uppercase">តារាងបង់រំលស់ប្រចាំខែ</h1>
              <p className="font-mono font-bold text-slate-600 text-xs">Contract: {contract.contractNumber}</p>
              <p className="text-[11px] text-slate-500">កាលបរិច្ឆេទបង្កើត: {contract.startDate}</p>
            </div>
          </div>

          {/* Customer & Contract Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">អតិថិជន (Customer)</p>
              <p className="font-extrabold text-slate-900">{contract.customerName}</p>
              <p className="text-[11px] text-slate-600">{contract.customerPhone}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">ទំនិញ (Product)</p>
              <p className="font-extrabold text-slate-900">{contract.productName}</p>
              <p className="text-[11px] font-mono text-slate-600">{contract.productImeiOrSerial || "N/A"}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">តម្លៃសរុប / ប្រាក់កក់</p>
              <p className="font-bold text-slate-800">{formatUSD(contract.totalPriceUsd)}</p>
              <p className="text-[11px] font-bold text-emerald-700">កក់: {formatUSD(contract.downPaymentUsd)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">បង់ប្រចាំខែ / រយៈពេល</p>
              <p className="font-black text-rose-700">{formatUSD(contract.monthlyAmountUsd)} / ខែ</p>
              <p className="text-[11px] font-bold text-slate-700">{contract.durationMonths} ខែ ({contract.interestRatePercent}%/ខែ)</p>
            </div>
          </div>

          {/* Schedule Table */}
          <table className="w-full text-left border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300 text-center">
                <th className="p-2 border-r border-slate-300 w-12">ខែទី</th>
                <th className="p-2 border-r border-slate-300">ថ្ងៃត្រូវបង់ (Due Date)</th>
                <th className="p-2 border-r border-slate-300">ប្រាក់ដើម (Principal)</th>
                <th className="p-2 border-r border-slate-300">ការប្រាក់ (Interest)</th>
                <th className="p-2 border-r border-slate-300">សរុបត្រូវបង់ (Due)</th>
                <th className="p-2 border-r border-slate-300">បានបង់ (Paid)</th>
                <th className="p-2 border-r border-slate-300">ថ្ងៃបង់ (Paid Date)</th>
                <th className="p-2 border-r border-slate-300">ស្ថានភាព</th>
                <th className="p-2">ហត្ថលេខាអ្នកទទួល</th>
              </tr>
            </thead>
            <tbody>
              {contract.schedules?.map((item: any) => {
                const isPaid = item.status === "PAID";
                const isOverdue = item.status === "OVERDUE" || item.daysOverdue > 0;

                return (
                  <tr key={item.id} className="border-b border-slate-200 text-center hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-300 font-bold">{item.installmentNumber}</td>
                    <td className="p-2 border-r border-slate-300 font-mono font-medium">{item.dueDate}</td>
                    <td className="p-2 border-r border-slate-300 text-right pr-3 font-mono">{formatUSD(item.principalAmountUsd)}</td>
                    <td className="p-2 border-r border-slate-300 text-right pr-3 font-mono">{formatUSD(item.interestAmountUsd)}</td>
                    <td className="p-2 border-r border-slate-300 text-right pr-3 font-mono font-bold text-slate-900">{formatUSD(item.totalDueUsd)}</td>
                    <td className="p-2 border-r border-slate-300 text-right pr-3 font-mono font-bold text-emerald-700">
                      {item.paidAmountUsd > 0 ? formatUSD(item.paidAmountUsd) : "-"}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-mono text-[11px] text-slate-500">
                      {item.paidDate || "-"}
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      {isPaid ? (
                        <span className="font-bold text-emerald-700">✓ បានបង់</span>
                      ) : isOverdue ? (
                        <span className="font-bold text-red-700">! យឺត {item.daysOverdue}ថ្ងៃ</span>
                      ) : (
                        <span className="text-slate-500">រង់ចាំបង់</span>
                      )}
                    </td>
                    <td className="p-2 text-slate-400 text-[10px]">
                      {item.collectedBy || "...................."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-right">
                <td colSpan={2} className="p-2 text-center border-r border-slate-300">សរុបទាំងមូល (TOTALS)</td>
                <td className="p-2 border-r border-slate-300 font-mono pr-3">{formatUSD(contract.principalRemainingUsd)}</td>
                <td className="p-2 border-r border-slate-300 font-mono pr-3">
                  {formatUSD(contract.totalRepaymentUsd - contract.principalRemainingUsd - contract.downPaymentUsd)}
                </td>
                <td className="p-2 border-r border-slate-300 font-mono pr-3 text-slate-900">{formatUSD(contract.monthlyAmountUsd * contract.durationMonths)}</td>
                <td className="p-2 border-r border-slate-300 font-mono pr-3 text-emerald-700">
                  {formatUSD(contract.totalPaidUsd - contract.downPaymentUsd)}
                </td>
                <td colSpan={3} className="p-2 text-center text-slate-500 text-[11px]">
                  ប្រាក់បង់រួចសរុប (រួមទាំងកក់)៖ {formatUSD(contract.totalPaidUsd)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="font-bold text-slate-900">ហត្ថលេខាអតិថិជន (Customer Signature)</p>
              <div className="mt-12 text-[10px] text-slate-400">ហត្ថលេខា & ឈ្មោះ</div>
              <p className="font-bold border-t border-slate-300 pt-1">{contract.customerName}</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">ហត្ថលេខាអ្នកទទួលប្រាក់ (Cashier Signature)</p>
              <div className="mt-12 text-[10px] text-slate-400">ហត្ថលេខា & ត្រា</div>
              <p className="font-bold border-t border-slate-300 pt-1">{storeName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
