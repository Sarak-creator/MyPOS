"use client";

import React from "react";
import { Printer, X } from "lucide-react";
import { formatUSD } from "@/lib/utils";

interface InstallmentContractPrintProps {
  contract: any;
  onClose: () => void;
}

export default function InstallmentContractPrint({
  contract,
  onClose,
}: InstallmentContractPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const storeName = "អាណាចក្រPOS (ANACHAK POS)";
  const storePhone = "012 345 678 / 096 376 0229";
  const storeAddress = "រាជធានីភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 sm:p-10 shadow-2xl text-slate-800 print:shadow-none print:w-full print:max-w-none print:p-6 print:rounded-none">
        {/* Floating Print Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">
              កិច្ចសន្យាផ្លូវការ
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              កិច្ចសន្យាទិញ-លក់បង់រំលស់ #{contract.contractNumber}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-800 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              ព្រីនកិច្ចសន្យា (Print A4)
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-300 p-2 text-slate-500 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Contract Body */}
        <div className="printable-contract space-y-6 text-[13px] leading-relaxed">
          {/* Official Royal Header */}
          <div className="text-center space-y-1 pb-3">
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
              កិច្ចសន្យាទិញ-លក់បង់រំលស់ទំនិញ
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
              <p><strong>ឈ្មោះហាង/ក្រុមហ៊ុន៖</strong> {contract.branchName || storeName}</p>
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

          {/* Guarantor Details */}
          {contract.guarantorName && (
            <div className="rounded-xl border border-slate-300 p-3 text-xs bg-slate-50/50 print:bg-transparent">
              <p className="font-extrabold text-slate-900 border-b border-slate-200 pb-1 mb-2">
                ភាគី "គ" (អ្នកធានាអះអាង)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <p><strong>ឈ្មោះអ្នកធានា៖</strong> {contract.guarantorName}</p>
                <p><strong>ទូរស័ព្ទ៖</strong> {contract.guarantorPhone || "N/A"}</p>
                <p><strong>អត្តសញ្ញាណប័ណ្ណ៖</strong> {contract.guarantorNationalId || "N/A"}</p>
                <p><strong>អាសយដ្ឋាន៖</strong> {contract.guarantorAddress || "N/A"}</p>
              </div>
            </div>
          )}

          {/* Item & Financial Terms */}
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 mb-2">
              ១. ព័ត៌មានទំនិញ និងលក្ខខណ្ឌទូទាត់ប្រាក់ (Item & Payment Terms)
            </h4>
            <table className="w-full text-left border border-slate-300 text-xs">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-bold bg-slate-100/70 w-1/4">ឈ្មោះទំនិញទិញបង់រំលស់</td>
                  <td className="p-2 font-extrabold">{contract.productName}</td>
                  <td className="p-2 font-bold bg-slate-100/70 w-1/4">លេខសម្គាល់ IMEI / Serial</td>
                  <td className="p-2 font-mono font-bold text-teal-800">{contract.productImeiOrSerial || "N/A"}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-bold bg-slate-100/70">តម្លៃទំនិញសរុប</td>
                  <td className="p-2 font-bold">{formatUSD(contract.totalPriceUsd)}</td>
                  <td className="p-2 font-bold bg-slate-100/70">ប្រាក់កក់បង់មុន (Down Payment)</td>
                  <td className="p-2 font-bold text-emerald-700">{formatUSD(contract.downPaymentUsd)}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-bold bg-slate-100/70">ប្រាក់ដើមនៅសល់ជំពាក់</td>
                  <td className="p-2 font-bold text-blue-700">{formatUSD(contract.principalRemainingUsd)}</td>
                  <td className="p-2 font-bold bg-slate-100/70">អត្រាការប្រាក់ប្រចាំខែ</td>
                  <td className="p-2 font-bold">{contract.interestRatePercent}% / ខែ</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-bold bg-slate-100/70">រយៈពេលបង់រំលស់</td>
                  <td className="p-2 font-bold">{contract.durationMonths} ខែ ({contract.startDate} ដល់ {contract.endDate})</td>
                  <td className="p-2 font-bold bg-slate-100/70">ទឹកប្រាក់ត្រូវបង់ក្នុង ១ ខែ</td>
                  <td className="p-2 font-black text-rose-700">{formatUSD(contract.monthlyAmountUsd)} / ខែ</td>
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
            <p>
              <strong>មាត្រា ១៖</strong> ភាគី "ក" បានប្រគល់ទំនិញដែលមានគុណភាពត្រឹមត្រូវតាមការបញ្ជាក់ខាងលើជូនភាគី "ខ" ហើយភាគី "ខ" បានពិនិត្យ និងយល់ព្រមទទួលយកទំនិញដោយពេញចិត្ត។
            </p>
            <p>
              <strong>មាត្រា ២៖</strong> ភាគី "ខ" សន្យាបង់ប្រាក់រំលស់ប្រចាំខែតាមកាលបរិច្ឆេទកំណត់ក្នុងតារាងបង់ប្រាក់រំលស់។ ប្រសិនបើភាគី "ខ" បង់ប្រាក់យឺតយ៉ាវ ត្រូវបង់ប្រាក់ពិន័យបន្ថែមចំនួន <strong>$1.00 (មួយដុល្លារ)</strong> ក្នុងមួយថ្ងៃនៃថ្ងៃយឺត។
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
              <p className="font-bold border-t border-slate-300 pt-1">..............................</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
