"use client";

import React, { useEffect, useState } from "react";
import { Printer, X, FileText, CheckCircle2 } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import { printElement } from "@/lib/printUtils";

interface PawnContractPrintProps {
  ticket: any;
  onClose: () => void;
  customSettings?: any;
}

export default function PawnContractPrint({
  ticket,
  onClose,
  customSettings,
}: PawnContractPrintProps) {
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

  // Handle ESC key press to close modal
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
    printElement("printable-pawn-ticket", `ប័ណ្ណបញ្ចាំ_${ticket.ticketNumber}`);
  };

  const storeName = settings?.storeName || ticket.branchName || "អាណាចក្រPOS (ANACHAK POS)";
  const storePhone = settings?.storePhone || "012 345 678 / 096 376 0229";
  const storeAddress = settings?.storeAddress || "រាជធានីភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា";
  const contractTitle = settings?.pawnContractTitle || "កិច្ចសន្យាបញ្ចាំទ្រព្យ និងប័ណ្ណទទួលបញ្ចាំ";
  const rawTerms = settings?.pawnContractTerms;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-3 sm:p-6 backdrop-blur-sm print:p-0 print:bg-white print:static animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full items-start justify-center py-2 sm:py-6 print:p-0 print:block">
        <div
          id="printable-pawn-ticket"
          className="printable-document relative w-full max-w-4xl rounded-2xl bg-white p-6 sm:p-10 shadow-2xl text-slate-800 print:shadow-none print:w-full print:max-w-none print:p-6 print:rounded-none"
        >
          {/* Floating Sticky Print Controls */}
          <div className="sticky -top-6 sm:-top-10 z-30 flex items-center justify-between pb-3.5 pt-3.5 px-6 -mx-6 sm:-mx-10 -mt-6 sm:-mt-10 mb-6 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm rounded-t-2xl print:hidden">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                កិច្ចសន្យាបញ្ចាំ
              </span>
              <h3 className="font-extrabold text-slate-900 text-sm hidden sm:block">
                ប័ណ្ណបញ្ចាំ #{ticket.ticketNumber}
              </h3>
              {ticket.durationDays ? (
                <span className="inline-flex items-center rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold font-mono">
                  {ticket.durationDays} ថ្ងៃ
                </span>
              ) : (
                <span className="inline-flex items-center rounded-lg bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-bold font-mono">
                  {ticket.durationMonths} ខែ
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 px-4 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer"
                title="ព្រីនកិច្ចសន្យាបញ្ចាំ (Ctrl+P)"
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

          {/* Printable Pawn Agreement Body */}
          <div className="printable-pawn space-y-6 text-[13px] leading-relaxed">
            {/* Header */}
            <div className="text-center space-y-1 pb-2">
              <h2 className="font-extrabold text-base tracking-wide text-slate-900">
                ព្រះរាជាណាចក្រកម្ពុជា
              </h2>
              <h3 className="font-bold text-sm text-slate-800">
                ជាតិ សាសនា ព្រះមហាក្សត្រ
              </h3>
              <div className="text-xs tracking-widest text-slate-500 font-serif">
                3 3 3
              </div>
              <h1 className="text-lg font-black text-slate-900 pt-3 underline underline-offset-8">
                {contractTitle}
              </h1>
              <p className="text-xs font-mono font-bold text-slate-600 pt-1">
                លេខប័ណ្ណបញ្ចាំ (Pawn Ticket No): {ticket.ticketNumber}
              </p>
            </div>

            <p className="indent-8 text-justify">
              កិច្ចសន្យានេះត្រូវបានបង្កើតឡើងនៅថ្ងៃទី{" "}
              <strong>{new Date(ticket.startDate).getDate()}</strong> ខែ{" "}
              <strong>{new Date(ticket.startDate).getMonth() + 1}</strong> ឆ្នាំ{" "}
              <strong>{new Date(ticket.startDate).getFullYear()}</strong> រវាងភាគីទាំងពីរដូចខាងក្រោម៖
            </p>

            {/* Party Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-300 p-3 bg-slate-50/50 print:bg-transparent">
                <p className="font-extrabold text-slate-900 border-b border-slate-200 pb-1 mb-2">
                  ភាគី "ក" (អ្នកទទួលបញ្ចាំ / ហាង)
                </p>
                <p><strong>ឈ្មោះហាង៖</strong> {storeName}</p>
                <p><strong>ទូរស័ព្ទ៖</strong> {storePhone}</p>
                <p><strong>អាសយដ្ឋាន៖</strong> {storeAddress}</p>
              </div>

              <div className="rounded-xl border border-slate-300 p-3 bg-slate-50/50 print:bg-transparent">
                <p className="font-extrabold text-slate-900 border-b border-slate-200 pb-1 mb-2">
                  ភាគី "ខ" (អ្នកបញ្ចាំ / ម្ចាស់ទ្រព្យ)
                </p>
                <p><strong>ឈ្មោះអតិថិជន៖</strong> {ticket.customerName}</p>
                <p><strong>ទូរស័ព្ទ៖</strong> {ticket.customerPhone}</p>
                <p><strong>អត្តសញ្ញាណប័ណ្ណ៖</strong> {ticket.customerNationalId || ".............................."}</p>
                <p><strong>អាសយដ្ឋាន៖</strong> {ticket.customerAddress || ".................................................."}</p>
              </div>
            </div>

            {/* Collateral & Loan Terms */}
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 mb-2">
                ១. ព័ត៌មានទ្រព្យបញ្ចាំ និងទឹកប្រាក់កម្ចី (Collateral & Loan Terms)
              </h4>
              <table className="w-full text-left border border-slate-300 text-xs">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 font-bold bg-slate-100/70 w-1/4">ឈ្មោះទ្រព្យបញ្ចាំ</td>
                    <td className="p-2 font-extrabold text-slate-900">{ticket.itemName}</td>
                    <td className="p-2 font-bold bg-slate-100/70 w-1/4">ប្រភេទទ្រព្យ / ម៉ាក</td>
                    <td className="p-2 font-bold">{ticket.itemCategory} {ticket.itemBrand ? `(${ticket.itemBrand})` : ""}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 font-bold bg-slate-100/70">លេខសម្គាល់ IMEI / Serial</td>
                    <td className="p-2 font-mono font-bold text-amber-900">{ticket.imeiOrSerial || "N/A"}</td>
                    <td className="p-2 font-bold bg-slate-100/70">ស្ថានភាពទ្រព្យពេលដាក់បញ្ចាំ</td>
                    <td className="p-2 font-medium">{ticket.itemCondition || "ធម្មតា (Normal)"}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 font-bold bg-slate-100/70">តម្លៃវាយតម្លៃទីផ្សារ (Est. Value)</td>
                    <td className="p-2 font-bold text-slate-800">{formatUSD(ticket.estimatedValueUsd)}</td>
                    <td className="p-2 font-bold bg-slate-100/70">កន្លែងរក្សាទុកទ្រព្យ</td>
                    <td className="p-2 font-mono">{ticket.storageLocation || "Safe Box 01"}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 font-bold bg-slate-100/70">ទឹកប្រាក់កម្ចីបញ្ចាំ (Loan Amount)</td>
                    <td className="p-2 font-black text-rose-700 text-sm">{formatUSD(ticket.loanAmountUsd)}</td>
                    <td className="p-2 font-bold bg-slate-100/70">រយៈពេលបញ្ចាំ</td>
                    <td className="p-2 font-bold text-slate-900 font-mono">
                      {ticket.durationDays ? (
                        <span className="text-emerald-800 font-black">{ticket.durationDays} ថ្ងៃ</span>
                      ) : (
                        <span>{ticket.durationMonths} ខែ</span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 font-bold bg-slate-100/70">អត្រាការប្រាក់</td>
                    <td className="p-2 font-bold text-blue-700">
                      {ticket.monthlyInterestRate}% / ខែ ({formatUSD(ticket.monthlyInterestUsd)})
                    </td>
                    <td className="p-2 font-bold bg-slate-100/70">កាលបរិច្ឆេទបញ្ចាំ</td>
                    <td className="p-2 font-mono">{ticket.startDate}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold bg-slate-100/70">កាលបរិច្ឆេទផុតកំណត់ (Maturity Date)</td>
                    <td colSpan={3} className="p-2 font-mono font-bold text-red-700 text-sm">
                      {ticket.maturityDate}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Forfeiture & Legal Clauses */}
            <div className="space-y-2 text-[12px] text-justify text-slate-700">
              <h4 className="font-extrabold text-xs text-slate-900">
                ២. លក្ខខណ្ឌនៃការបញ្ចាំ និងលក្ខខណ្ឌដាច់បញ្ចាំ (Pawn Rules & Forfeiture)
              </h4>

              {rawTerms ? (
                <div className="whitespace-pre-line space-y-2">
                  {rawTerms}
                </div>
              ) : (
                <>
                  <p>
                    <strong>មាត្រា ១៖</strong> ភាគី "ខ" បានយកទ្រព្យបញ្ចាំស្របច្បាប់ផ្ទាល់ខ្លួនខាងលើមកដាក់បញ្ចាំជាមួយភាគី "ក" ហើយបានទទួលទឹកប្រាក់កម្ចីគ្រប់ចំនួនរួចរាល់ហើយ។ ភាគី "ខ" ធានាថាទ្រព្យនេះមិនមែនជាផលនៃបទល្មើស ឬទ្រព្យខុសច្បាប់ឡើយ។
                  </p>
                  <p>
                    <strong>មាត្រា ២៖</strong> ភាគី "ខ" ត្រូវមកបង់ការប្រាក់ ឬលោះយកទ្រព្យបញ្ចាំវិញឱ្យបានត្រឹមត្រូវតាមកាលបរិច្ឆេទផុតកំណត់ <strong>{ticket.maturityDate}</strong>។
                  </p>
                  <p className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 font-medium">
                    <strong>មាត្រា ៣ (លក្ខខណ្ឌដាច់បញ្ចាំ)៖</strong> ប្រសិនបើហួសកាលបរិច្ឆេទផុតកំណត់លើសពី <strong>០៧ (ប្រាំពីរ) ថ្ងៃ</strong> ដោយភាគី "ខ" មិនបានមកបង់ការប្រាក់ដើម្បីបន្តកិច្ចសន្យា ឬមិនបានមកលោះយកទ្រព្យវិញទេនោះ ទ្រព្យបញ្ចាំខាងលើនេះនឹងត្រូវចាត់ទុកថា <strong>"ដាច់បញ្ចាំជាស្ថាពរ"</strong> ហើយក្លាយជាកម្មសិទ្ធិស្របច្បាប់របស់អ្នកទទួលបញ្ចាំ (ភាគី ក) ដោយស្វ័យប្រវត្តិ។ ភាគី "ក" មានសិទ្ធិលក់ឡៃឡុង ឬចាត់ចែងតាមការគួរ ដោយភាគី "ខ" គ្មានសិទ្ធិតវ៉ា ឬទាមទារសំណងអ្វីទាំងអស់។
                  </p>
                  <p>
                    <strong>មាត្រា ៤៖</strong> កិច្ចសន្យានេះត្រូវបានធ្វើឡើងជា ០២ ច្បាប់ដែលមានតម្លៃច្បាប់ស្មើគ្នា ដោយភាគីនីមួយៗរក្សាទុកម្នាក់មួយច្បាប់ជាភស្តុតាង។
                  </p>
                </>
              )}
            </div>

            {/* Signatures and Thumbprints Section */}
            <div className="pt-8 grid grid-cols-2 gap-12 text-center text-xs">
              <div>
                <p className="font-bold text-slate-900">ស្នាមមេដៃ និងហត្ថលេខា<br />អ្នកបញ្ចាំ / ម្ចាស់ទ្រព្យ (ភាគី ខ)</p>
                <div className="mt-16 h-12 flex items-center justify-center text-[10px] text-slate-400">
                  (ស្នាមមេដៃស្តាំ)
                </div>
                <p className="font-bold border-t border-slate-300 pt-1">{ticket.customerName}</p>
              </div>

              <div>
                <p className="font-bold text-slate-900">ហត្ថលេខា និងត្រា<br />អ្នកទទួលបញ្ចាំ (ភាគី ក)</p>
                <div className="mt-16 h-12 flex items-center justify-center text-[10px] text-slate-400">
                  (ហត្ថលេខា & ត្រាហាង)
                </div>
                <p className="font-bold border-t border-slate-300 pt-1">{storeName}</p>
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
                className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 px-5 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                ព្រីនកិច្ចសន្យាបញ្ចាំ (Print A4)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
