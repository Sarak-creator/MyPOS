"use client";

import React, { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import { printElement } from "@/lib/printUtils";

interface InstallmentContractPrintProps {
  contract: any;
  onClose: () => void;
  customSettings?: any;
}

export default function InstallmentContractPrint({
  contract,
  onClose,
  customSettings,
}: InstallmentContractPrintProps) {
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
    printElement("printable-installment-contract", `កិច្ចសន្យាបង់រំលស់_${contract.contractNumber}`);
  };

  const storeName = settings?.storeName || contract.branchName || "អាណាចក្រPOS (ANACHAK POS)";
  const storePhone = settings?.storePhone || "012 345 678 / 096 376 0229";
  const storeAddress = settings?.storeAddress || "រាជធានីភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា";
  const contractTitle = settings?.installmentContractTitle || "កិច្ចសន្យាទិញ-លក់បង់រំលស់ទំនិញ";
  const rawTerms = settings?.installmentContractTerms;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-3 sm:p-6 backdrop-blur-sm print:p-0 print:bg-white print:static animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full items-start justify-center py-2 sm:py-6 print:p-0 print:block">
        <div
          id="printable-installment-contract"
          className="printable-document relative w-full max-w-4xl rounded-2xl bg-white p-6 sm:p-10 shadow-2xl text-slate-800 print:shadow-none print:w-full print:max-w-none print:p-6 print:rounded-none"
        >
          {/* Floating Sticky Print Controls */}
          <div className="sticky -top-6 sm:-top-10 z-30 flex items-center justify-between pb-3.5 pt-3.5 px-6 -mx-6 sm:-mx-10 -mt-6 sm:-mt-10 mb-6 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm rounded-t-2xl print:hidden">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">
                កិច្ចសន្យាផ្លូវការ
              </span>
              <h3 className="font-extrabold text-slate-900 text-sm hidden sm:block">
                កិច្ចសន្យាបង់រំលស់ #{contract.contractNumber}
              </h3>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 px-4 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer"
                title="ព្រីនកិច្ចសន្យា (Ctrl+P)"
              >
                <Printer className="h-4 w-4" />
                <span>ព្រីនកិច្ចសន្យា (Print A4)</span>
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

          {/* Printable Contract Body */}
          <div className="printable-contract space-y-6 text-[13px] leading-relaxed">
            {/* Official Royal Header */}
            <div className="text-center space-y-1.5 pb-3">
              <h2 className="font-moul font-normal text-base tracking-wide text-slate-900">
                ព្រះរាជាណាចក្រកម្ពុជា
              </h2>
              <h3 className="font-moul font-normal text-xs text-slate-800">
                ជាតិ សាសនា ព្រះមហាក្សត្រ
              </h3>
              {/* Royal Traditional Emblem Flourish */}
              <div className="flex items-center justify-center gap-2.5 py-0.5 select-none">
                <span className="h-[1px] w-10 bg-slate-400/80 inline-block"></span>
                <span className="text-sm font-moul tracking-widest text-slate-800 font-normal">
                  ៚ ៚ ៚
                </span>
                <span className="h-[1px] w-10 bg-slate-400/80 inline-block"></span>
              </div>
              <h1 className="text-lg font-moul font-normal text-slate-900 pt-2 underline underline-offset-8">
                {contractTitle}
              </h1>
              <p className="text-xs font-mono font-bold text-slate-500 pt-1">
                លេខកិច្ចសន្យា (Contract No): {contract.contractNumber}
              </p>
            </div>

            <p className="indent-8 text-justify">
              កិច្ចសន្យានេះត្រូវបានធ្វើឡើងនៅថ្ងៃទី{" "}
              <strong>{new Date(contract.startDate).getDate()}</strong> ខែ{" "}
              <strong>{new Date(contract.startDate).getMonth() + 1}</strong> ឆ្នាំ{" "}
              <strong>{new Date(contract.startDate).getFullYear()}</strong> រវាងភាគីដូចខាងក្រោម៖
            </p>

            {/* Party Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-300 p-3 bg-slate-50/50 print:bg-transparent">
                <p className="font-extrabold text-slate-900 border-b border-slate-200 pb-1 mb-2">
                  ភាគី "ក" (អ្នកលក់ / ម្ចាស់បំណុល)
                </p>
                <p><strong>ឈ្មោះហាង/ក្រុមហ៊ុន៖</strong> {storeName}</p>
                <p><strong>ទូរស័ព្ទ៖</strong> {storePhone}</p>
                <p><strong>អាសយដ្ឋាន៖</strong> {storeAddress}</p>
              </div>

              <div className="rounded-xl border border-slate-300 p-3 bg-slate-50/50 print:bg-transparent">
                <p className="font-extrabold text-slate-900 border-b border-slate-200 pb-1 mb-2">
                  ភាគី "ខ" (អ្នកទិញបង់រំលស់)
                </p>
                <p><strong>ឈ្មោះអតិថិជន៖</strong> {contract.customerName}</p>
                <p><strong>លេខទូរស័ព្ទ៖</strong> {contract.customerPhone}</p>
                <p><strong>អត្តសញ្ញាណប័ណ្ណលេខ៖</strong> {contract.customerNationalId || ".............................."}</p>
                <p><strong>អាសយដ្ឋានបច្ចុប្បន្ន៖</strong> {contract.customerAddress || ".................................................."}</p>
              </div>
            </div>

            {/* Section 1: Item & Installment Terms */}
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 mb-2">
                ១. ព័ត៌មានទំនិញ និងលក្ខខណ្ឌហិរញ្ញវត្ថុ (Item & Financing Terms)
              </h4>
              <table className="w-full text-left border border-slate-300 text-xs">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 font-bold bg-slate-100/70 w-1/4">ឈ្មោះទំនិញទិញបង់រំលស់</td>
                    <td className="p-2 font-extrabold text-slate-900">{contract.productName}</td>
                    <td className="p-2 font-bold bg-slate-100/70 w-1/4">លេខសម្គាល់ IMEI/Serial</td>
                    <td className="p-2 font-mono">{contract.productImeiOrSerial || "N/A"}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 font-bold bg-slate-100/70">តម្លៃទំនិញសរុប (Total Price)</td>
                    <td className="p-2 font-black text-slate-900">{formatUSD(contract.totalPriceUsd)}</td>
                    <td className="p-2 font-bold bg-slate-100/70">ប្រាក់កក់បង់មុន (Down Payment)</td>
                    <td className="p-2 font-bold text-emerald-700">{formatUSD(contract.downPaymentUsd)}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 font-bold bg-slate-100/70">ប្រាក់ដើមនៅសល់ (Principal)</td>
                    <td className="p-2 font-bold">{formatUSD(contract.principalRemainingUsd)}</td>
                    <td className="p-2 font-bold bg-slate-100/70">អត្រាការប្រាក់ (Interest)</td>
                    <td className="p-2 font-bold text-blue-700">{contract.interestRatePercent}% / ខែ</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 font-bold bg-slate-100/70">រយៈពេលបង់រំលស់ (Duration)</td>
                    <td className="p-2 font-bold">{contract.durationMonths} ខែ</td>
                    <td className="p-2 font-bold bg-slate-100/70">ត្រូវបង់ប្រចាំខែ (Monthly Pay)</td>
                    <td className="p-2 font-black text-rose-700 text-sm">{formatUSD(contract.monthlyAmountUsd)} / ខែ</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold bg-slate-100/70">ទឹកប្រាក់សរុបត្រូវសង (Total Repayment)</td>
                    <td colSpan={3} className="p-2 font-black text-slate-900 text-sm">
                      {formatUSD(contract.totalRepaymentUsd)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Legal Terms & Conditions */}
            <div className="space-y-2 text-[12px] text-justify text-slate-700">
              <h4 className="font-extrabold text-xs text-slate-900">
                ២. លក្ខខណ្ឌកិច្ចសន្យា និងការទទួលខុសត្រូវ (Terms & Responsibilities)
              </h4>

              {rawTerms ? (
                <div className="whitespace-pre-line space-y-2">
                  {rawTerms}
                </div>
              ) : (
                <>
                  <p>
                    <strong>មាត្រា ១៖</strong> ភាគី "ក" បានប្រគល់ទំនិញដែលមានគុណភាពត្រឹមត្រូវតាមការបញ្ជាក់ខាងលើជូនភាគី "ខ" ហើយភាគី "ខ" បានពិនិត្យ និងយល់ព្រមទទួលយកទំនិញដោយពេញចិត្ត។
                  </p>
                  <p>
                    <strong>មាត្រា ២៖</strong> ភាគី "ខ" សន្យាបង់ប្រាក់រំលស់ប្រចាំខែតាមកាលបរិច្ឆេទកំណត់ក្នុងតារាងបង់ប្រាក់រំលស់។ ប្រសិនបើភាគី "ខ" បង់ប្រាក់យឺតយ៉ាវ ត្រូវបង់ប្រាក់ពិន័យបន្ថែមចំនួន <strong>${settings?.latePenaltyPerDayUsd?.toFixed(2) || "1.00"}</strong> ក្នុងមួយថ្ងៃនៃថ្ងៃយឺត។
                  </p>
                  <p>
                    <strong>មាត្រា ៣៖</strong> ប្រសិនបើភាគី "ខ" ខកខានមិនបានបង់ប្រាក់រំលស់ជាប់ៗគ្នាចំនួន <strong>២ (ពីរ) ខែ</strong> ភាគី "ក" មានសិទ្ធិស្របច្បាប់ក្នុងការដកហូត និងរឹបអូសទំនិញខាងលើមកវិញភ្លាមៗ ដោយភាគី "ខ" គ្មានសិទ្ធិទាមទារប្រាក់កក់ ឬប្រាក់រំលស់ដែលបានបង់កន្លងមកវិញឡើយ។
                  </p>
                  <p>
                    <strong>មាត្រា ៤៖</strong> ភាគី "គ" (អ្នកធានា) ត្រូវធានា និងទទួលខុសត្រូវជំនួសភាគី "ខ" ទាំងស្រុងចំពោះបំណុលទាំងអស់ក្នុងករណីភាគី "ខ" គេចវេះមិនព្រមទូទាត់។
                  </p>
                  <p>
                    <strong>មាត្រា ៥៖</strong> កិច្ចសន្យានេះត្រូវបានធ្វើឡើងជា ០២ ច្បាប់ដែលមានតម្លៃច្បាប់ស្មើគ្នា ដោយភាគីនីមួយៗរក្សាទុកម្នាក់មួយច្បាប់ជាភស្តុតាង។
                  </p>
                </>
              )}
            </div>

            {/* Signature and Thumbprints Section */}
            <div className="pt-6 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <p className="font-bold text-slate-900">ស្នាមមេដៃ និងហត្ថលេខា<br />អ្នកទិញ (ភាគី ខ)</p>
                <div className="mt-16 h-12 flex items-center justify-center text-[10px] text-slate-400">
                  (ស្នាមមេដៃស្តាំ)
                </div>
                <p className="font-bold border-t border-slate-300 pt-1">{contract.customerName}</p>
              </div>

              <div>
                <p className="font-bold text-slate-900">ស្នាមមេដៃ និងហត្ថលេខា<br />អ្នកធានា (ភាគី គ)</p>
                <div className="mt-16 h-12 flex items-center justify-center text-[10px] text-slate-400">
                  (ស្នាមមេដៃស្តាំ)
                </div>
                <p className="font-bold border-t border-slate-300 pt-1">{contract.guarantorName || ".............................."}</p>
              </div>

              <div>
                <p className="font-bold text-slate-900">ហត្ថលេខា និងត្រា<br />អ្នកលក់ (ភាគី ក)</p>
                <div className="mt-16 h-12 flex items-center justify-center text-[10px] text-slate-400">
                  (ហត្ថលេខា & ត្រាហាង)
                </div>
                <p className="font-bold border-t border-slate-300 pt-1">{storeName}</p>
              </div>

              <div>
                <p className="font-bold text-slate-900">ហត្ថលេខា<br />សាក្សី</p>
                <div className="mt-16 h-12 flex items-center justify-center text-[10px] text-slate-400">
                  (ហត្ថលេខា)
                </div>
                <p className="font-bold border-t border-slate-300 pt-1">{settings?.witnessName || ".............................."}</p>
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
                ព្រីនកិច្ចសន្យា (Print A4)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
