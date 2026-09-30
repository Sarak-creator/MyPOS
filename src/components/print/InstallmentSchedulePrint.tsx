"use client";

import React, { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import { printElement } from "@/lib/printUtils";

interface InstallmentSchedulePrintProps {
  contract: any;
  onClose: () => void;
  customSettings?: any;
}

export default function InstallmentSchedulePrint({
  contract,
  onClose,
  customSettings,
}: InstallmentSchedulePrintProps) {
  const [settings, setSettings] = useState<any>(customSettings || null);

  useEffect(() => {
    if (!settings) {
      fetch("/api/settings/loans")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.settings) {
            setSettings(data.settings);
          }
        })
        .catch((err) => console.error("Error loading loan settings:", err));
    }
  }, [settings]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    printElement("printable-installment-schedule", `តារាងបង់រំលស់_${contract.contractNumber}`);
  };

  const storeName = settings?.storeName || contract.branchName || "អាណាចក្រPOS (ANACHAK POS)";
  const storePhone = settings?.storePhone || "012 345 678 / 096 376 0229";

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-3 sm:p-6 backdrop-blur-sm print:p-0 print:bg-white print:static animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full items-start justify-center py-2 sm:py-6 print:p-0 print:block">
        <div
          id="printable-installment-schedule"
          className="printable-document relative w-full max-w-4xl rounded-2xl bg-white p-6 sm:p-10 shadow-2xl text-slate-800 print:shadow-none print:w-full print:max-w-none print:p-6 print:rounded-none"
        >
          {/* Floating Sticky Print Controls */}
          <div className="sticky -top-6 sm:-top-10 z-30 flex items-center justify-between pb-3.5 pt-3.5 px-6 -mx-6 sm:-mx-10 -mt-6 sm:-mt-10 mb-6 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm rounded-t-2xl print:hidden">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">
                តារាងបង់ប្រាក់
              </span>
              <h3 className="font-extrabold text-slate-900 text-sm hidden sm:block">
                តារាងបង់រំលស់ប្រចាំខែ #{contract.contractNumber}
              </h3>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 px-4 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer"
                title="ព្រីនតារាងបង់រំលស់ (Ctrl+P)"
              >
                <Printer className="h-4 w-4" />
                <span>ព្រីនតារាងបង់រំលស់ (Print)</span>
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 active:scale-95 px-3.5 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                title="បិទផ្ទាំង (Esc)"
              >
                <X className="h-4 w-4" />
                <span>បិទ (Close)</span>
              </button>
            </div>
          </div>

          {/* Printable Schedule Body */}
          <div className="printable-schedule space-y-5 text-xs">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-300 pb-4">
              <div>
                <h2 className="font-black text-lg text-slate-900">{storeName}</h2>
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
                <p className="text-slate-400 text-[10px] uppercase font-bold">អតិថិជន (Customer)</p>
                <p className="font-extrabold text-slate-900">{contract.customerName}</p>
                <p className="text-[11px] text-slate-500 font-mono">{contract.customerPhone}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">ទំនិញ (Product)</p>
                <p className="font-extrabold text-slate-900">{contract.productName}</p>
                <p className="text-[11px] text-slate-500 font-mono">IMEI: {contract.productImeiOrSerial || "N/A"}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">តម្លៃសរុប & ប្រាក់កក់ ({contract.currency || "USD"})</p>
                <p className="font-mono font-bold text-slate-900">
                  {contract.currency === "KHR"
                    ? `${(contract.totalPriceKhr || Math.round(contract.totalPriceUsd * (contract.exchangeRate || 4100))).toLocaleString()} ៛ ($${contract.totalPriceUsd})`
                    : `${formatUSD(contract.totalPriceUsd)} (${(contract.totalPriceKhr || Math.round(contract.totalPriceUsd * (contract.exchangeRate || 4100))).toLocaleString()} ៛)`}
                </p>
                <p className="text-[11px] text-emerald-700 font-mono font-bold">
                  កក់: {contract.currency === "KHR"
                    ? `${(contract.downPaymentKhr || Math.round(contract.downPaymentUsd * (contract.exchangeRate || 4100))).toLocaleString()} ៛`
                    : formatUSD(contract.downPaymentUsd)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">គម្រោងបង់ & ការប្រាក់</p>
                <p className="font-mono font-bold text-blue-700">{contract.interestRatePercent}% / ខែ</p>
                <p className="text-[11px] text-slate-700 font-bold">
                  {contract.repaymentPlanType === "INSTALLMENT_COUNT"
                    ? `បង់ ${contract.totalInstallments || contract.schedules?.length} ដង (${contract.intervalDays || 30} ថ្ងៃ/ដង)`
                    : contract.repaymentPlanType === "DAYS"
                    ? `បង់ ${contract.durationDays || 30} ថ្ងៃ (រៀងរាល់ ${contract.intervalDays || 1} ថ្ងៃ)`
                    : contract.repaymentPlanType === "FIXED_AMOUNT"
                    ? `បង់កំណត់ ${contract.currency === "KHR" ? (contract.installmentAmountKhr || Math.round((contract.installmentAmountUsd || 0) * 4100)).toLocaleString() + " ៛" : "$" + (contract.installmentAmountUsd || 0)} /លើក (${contract.totalInstallments || contract.schedules?.length} លើក)`
                    : `${contract.durationMonths} ខែ (${contract.currency === "KHR" ? (contract.monthlyAmountKhr || Math.round(contract.monthlyAmountUsd * 4100)).toLocaleString() + " ៛" : formatUSD(contract.monthlyAmountUsd)}/ខែ)`}
                </p>
              </div>
            </div>

            {/* Repayment Schedule Table */}
            <div>
              <table className="w-full text-left border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                  <tr>
                    <th className="p-2 text-center w-14">លើកទី</th>
                    <th className="p-2">កាលបរិច្ឆេទត្រូវបង់</th>
                    <th className="p-2 text-right">
                      ប្រាក់ដើម {contract.currency === "KHR" ? "(៛ / $)" : "($ / ៛)"}
                    </th>
                    <th className="p-2 text-right">
                      ការប្រាក់ {contract.currency === "KHR" ? "(៛ / $)" : "($ / ៛)"}
                    </th>
                    <th className="p-2 text-right">
                      ទឹកប្រាក់ត្រូវបង់ {contract.currency === "KHR" ? "(៛)" : "($)"}
                    </th>
                    <th className="p-2 text-center">ស្ថានភាព</th>
                    <th className="p-2 text-center">ហត្ថលេខាអ្នកទទួល</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {contract.schedules && contract.schedules.length > 0 ? (
                    contract.schedules.map((s: any) => {
                      const isPaid = s.status === "PAID";
                      const rate = contract.exchangeRate || 4100;
                      const principalKhr = s.principalAmountKhr || Math.round(s.principalAmountUsd * rate);
                      const interestKhr = s.interestAmountKhr || Math.round(s.interestAmountUsd * rate);
                      const totalDueKhr = s.totalDueKhr || Math.round(s.totalDueUsd * rate);

                      return (
                        <tr key={s.id || s.installmentNumber} className={isPaid ? "bg-emerald-50/30" : ""}>
                          <td className="p-2 text-center font-bold text-slate-800">{s.installmentNumber}</td>
                          <td className="p-2 font-bold text-slate-800">{s.dueDate}</td>
                          <td className="p-2 text-right">
                            {contract.currency === "KHR" ? (
                              <>
                                <span className="font-bold text-slate-900">{principalKhr.toLocaleString()} ៛</span>
                                <span className="text-[10px] text-slate-400 block">${s.principalAmountUsd}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-slate-900">{formatUSD(s.principalAmountUsd)}</span>
                                <span className="text-[10px] text-slate-400 block">{principalKhr.toLocaleString()} ៛</span>
                              </>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {contract.currency === "KHR" ? (
                              <>
                                <span className="font-bold text-blue-700">{interestKhr.toLocaleString()} ៛</span>
                                <span className="text-[10px] text-slate-400 block">${s.interestAmountUsd}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-blue-700">{formatUSD(s.interestAmountUsd)}</span>
                                <span className="text-[10px] text-slate-400 block">{interestKhr.toLocaleString()} ៛</span>
                              </>
                            )}
                          </td>
                          <td className="p-2 text-right font-black text-rose-700">
                            {contract.currency === "KHR" ? (
                              <>
                                <span>{totalDueKhr.toLocaleString()} ៛</span>
                                <span className="text-[10px] text-slate-500 font-normal block">(${s.totalDueUsd})</span>
                              </>
                            ) : (
                              <>
                                <span>{formatUSD(s.totalDueUsd)}</span>
                                <span className="text-[10px] text-slate-500 font-normal block">({totalDueKhr.toLocaleString()} ៛)</span>
                              </>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {isPaid ? (
                              <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                បានបង់ ({s.paidDate || "Paid"})
                              </span>
                            ) : (
                              <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                មិនទាន់បង់
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-sans text-slate-400 text-[10px]">
                            {isPaid ? (s.collectedBy || "រួចរាល់") : "......................."}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400 font-sans">
                        មិនមានទិន្នន័យតារាងបង់ប្រាក់
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                  <tr>
                    <td colSpan={4} className="p-2 text-right font-sans text-slate-900">
                      សរុបទឹកប្រាក់ត្រូវសងទាំងអស់ (Total Repayment):
                    </td>
                    <td className="p-2 text-right font-mono font-black text-rose-800 text-sm">
                      {contract.currency === "KHR"
                        ? `${(contract.totalRepaymentKhr || Math.round(contract.totalRepaymentUsd * (contract.exchangeRate || 4100))).toLocaleString()} ៛ ($${contract.totalRepaymentUsd})`
                        : `${formatUSD(contract.totalRepaymentUsd)} (${(contract.totalRepaymentKhr || Math.round(contract.totalRepaymentUsd * (contract.exchangeRate || 4100))).toLocaleString()} ៛)`}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Note & Rules */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">ចំណាំសំខាន់សម្រាប់ការបង់ប្រាក់រំលស់៖</p>
              <p>• សូមអតិថិជនយកតារាងបង់ប្រាក់រំលស់នេះមកជាមួយរាល់ពេលមកទូទាត់ប្រាក់នៅហាង។</p>
              <p>• រាល់ការបង់ប្រាក់យឺតយ៉ាវលើសកាលកំណត់នឹងត្រូវគិតប្រាក់ពិន័យបន្ថែមចំនួន $1.00 ក្នុងមួយថ្ងៃ។</p>
              <p>• ទំនាក់ទំនងផ្នែកបង់រំលស់៖ {storePhone}</p>
            </div>

            {/* Signatures */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <p className="font-bold text-slate-900">ហត្ថលេខាអតិថិជន</p>
                <div className="mt-16 h-10 border-b border-dashed border-slate-300 w-48 mx-auto"></div>
                <p className="font-bold pt-1">{contract.customerName}</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">ហត្ថលេខា & ត្រាហាង</p>
                <div className="mt-16 h-10 border-b border-dashed border-slate-300 w-48 mx-auto"></div>
                <p className="font-bold pt-1">{storeName}</p>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer for Long Scrolling */}
          <div className="mt-10 pt-4 border-t border-slate-200 flex items-center justify-between print:hidden">
            <span className="text-xs text-slate-400">
              ចុច <strong>Esc</strong> ឬប៊ូតុង "បិទ" ដើម្បីត្រឡប់ក្រោយ
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 px-4 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
                បិទផ្ទាំង (Close)
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 px-5 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                ព្រីនតារាងបង់រំលស់ (Print)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
