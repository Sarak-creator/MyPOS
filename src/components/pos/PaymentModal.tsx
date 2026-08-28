"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  UserCheck,
  Printer,
  CheckCircle2,
  Copy,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { generateBakongKHQR } from "@/lib/khqr";
import { formatUSD, formatKHR, generateInvoiceNumber } from "@/lib/utils";
import ThermalReceipt, { ReceiptData } from "@/components/print/ThermalReceipt";
import { OfflineSyncManager } from "@/lib/offline-sync";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MethodTab = "CASH_USD" | "CASH_KHR" | "KHQR_ABA" | "CREDIT_CARD" | "CUSTOMER_CREDIT";

export default function PaymentModal({ isOpen, onClose }: PaymentModalProps) {
  const {
    language,
    items,
    selectedCustomer,
    exchangeRateKhr,
    currentBranchName,
    currentBranchId,
    getGrandTotalUsd,
    getGrandTotalKhr,
    getSubtotal,
    getDiscountTotal,
    getTaxTotal,
    clearCart,
  } = usePOSStore();
  const t = translations[language];

  const grandTotalUsd = getGrandTotalUsd();
  const grandTotalKhr = getGrandTotalKhr();

  const [activeTab, setActiveTab] = useState<MethodTab>("KHQR_ABA");
  const [tenderedUsd, setTenderedUsd] = useState<string>(grandTotalUsd.toString());
  const [tenderedKhr, setTenderedKhr] = useState<string>(grandTotalKhr.toString());
  const [khqrString, setKhqrString] = useState<string>("");
  const [khqrQrUrl, setKhqrQrUrl] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptData | null>(null);

  // Generate KHQR on load or amount change
  useEffect(() => {
    if (isOpen && grandTotalUsd > 0) {
      const state = usePOSStore.getState();
      if (!state.bakongMerchantId) {
        setKhqrString("");
        setKhqrQrUrl("");
        return;
      }
      const payload = generateBakongKHQR({
        bakongAccount: state.bakongMerchantId,
        merchantName: state.bakongMerchantName || "",
        merchantCity: state.bakongMerchantCity || "Phnom Penh",
        merchantID: state.merchantID || "",
        accountInformation: state.merchantID || "",
        acquiringBank: state.acquiringBank || "",
        mobileNumber: state.mobileNumber || "",
        merchantCategoryCode: state.merchantCategoryCode || "5999",
        amount: grandTotalUsd,
        currency: "USD",
        billNumber: generateInvoiceNumber(),
        storeLabel: currentBranchName,
      });
      setKhqrString(payload);

      if (payload) {
        QRCode.toDataURL(payload, { width: 240, margin: 1 }, (err, url) => {
          if (!err && url) setKhqrQrUrl(url);
        });
      } else {
        setKhqrQrUrl("");
      }
    }
  }, [isOpen, grandTotalUsd, currentBranchName]);

  if (!isOpen) return null;

  const tenderedUsdNum = parseFloat(tenderedUsd) || 0;
  const changeUsd = Math.max(0, tenderedUsdNum - grandTotalUsd);

  const tenderedKhrNum = parseFloat(tenderedKhr) || 0;
  const changeKhr = Math.max(0, tenderedKhrNum - grandTotalKhr);

  const handleProcessPayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage("");

    const invoiceNumber = generateInvoiceNumber();

    const receipt: ReceiptData = {
      invoiceNumber,
      branchName: currentBranchName,
      branchAddress: "Norodom Blvd, Phnom Penh",
      branchPhone: "012 888 999",
      cashierName: "ជា សុខា (Admin)",
      customer: selectedCustomer,
      items: [...items],
      subtotalUsd: getSubtotal(),
      discountUsd: getDiscountTotal(),
      taxUsd: getTaxTotal(),
      totalUsd: grandTotalUsd,
      totalKhr: grandTotalKhr,
      exchangeRateKhr,
      paymentMethod: activeTab,
      tenderedUsd: activeTab === "CASH_USD" ? tenderedUsdNum : grandTotalUsd,
      changeUsd: activeTab === "CASH_USD" ? changeUsd : 0,
      khqrPayload: activeTab === "KHQR_ABA" ? khqrString : undefined,
    };

    const posState = usePOSStore.getState();
    const orderData = {
      invoiceNumber,
      branchId: currentBranchId,
      customerId: selectedCustomer?.id || null,
      items: items.map((i) => ({
        productId: i.productId || i.id,
        costPriceUsd: i.costPriceUsd || 0,
        priceUsd: i.priceUsd,
        quantity: i.quantity,
        discountAmount: i.discountAmount || 0,
        selectedImei: i.selectedImei,
      })),
      subtotalUsd: getSubtotal(),
      discountAmount: getDiscountTotal(),
      taxAmountUsd: getTaxTotal(),
      taxRatePercent: posState.taxRatePercent || 0,
      totalUsd: grandTotalUsd,
      totalKhr: grandTotalKhr,
      exchangeRateKhr,
      paymentMethod: activeTab,
      tenderedUsd: activeTab === "CASH_USD" ? tenderedUsdNum : grandTotalUsd,
      changeUsd: activeTab === "CASH_USD" ? changeUsd : 0,
      notes: posState.orderNotes || "",
      khqrQrString: activeTab === "KHQR_ABA" ? khqrString : undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          setErrorMessage(data.error || "ការទូទាត់មិនជោគជ័យ សូមពិនិត្យស្តុក ឬព័ត៌មានម្តងទៀត");
          setIsProcessing(false);
          return;
        }

        // If backend returned final invoiceNumber, update receipt
        if (data.order?.invoiceNumber) {
          receipt.invoiceNumber = data.order.invoiceNumber;
        }
      } else {
        OfflineSyncManager.queueOrder({
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ORD-${Date.now()}`,
          invoiceNumber,
          branchId: currentBranchId,
          customerId: selectedCustomer?.id || null,
          items: items.map((i) => ({
            productId: i.productId || i.id,
            quantity: i.quantity,
            priceUsd: i.priceUsd,
            discountAmount: i.discountAmount || 0,
          })),
          totalUsd: grandTotalUsd,
          totalKhr: grandTotalKhr,
          paymentMethod: activeTab,
          tenderedUsd: activeTab === "CASH_USD" ? tenderedUsdNum : undefined,
          changeUsd: activeTab === "CASH_USD" ? changeUsd : undefined,
          createdAt: new Date().toISOString(),
        });
      }

      // Dispatch automated Telegram Bot Notification
      if (posState.telegramNotifyOnSale !== false) {
        const tgPayload = {
          action: "NOTIFY_SALE",
          config: {
            botToken: posState.telegramBotToken?.trim(),
            chatId: posState.telegramChatId?.trim(),
          },
          payload: {
            invoiceNumber: receipt.invoiceNumber,
            branchName: currentBranchName,
            cashierName: posState.currentUser?.fullName || "បុគ្គលិក POS",
            customerName: selectedCustomer?.name || "អតិថិជនទូទៅ",
            totalUsd: grandTotalUsd,
            totalKhr: grandTotalKhr,
            paymentMethod: activeTab,
            items: items.map((i) => ({
              name: i.nameKh || i.nameEn,
              quantity: i.quantity,
              priceUsd: i.priceUsd,
            })),
          },
        };

        fetch("/api/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tgPayload),
        }).catch((err) => console.warn("Telegram notification network send error:", err));
      }

      setCompletedReceipt(receipt);
      setIsSuccess(true);
      clearCart();
    } catch (err: any) {
      setErrorMessage(err.message || "មានបញ្ហាបច្ចេកទេសក្នុងការទូទាត់");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCloseAll = () => {
    setIsSuccess(false);
    setCompletedReceipt(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Banknote className="h-5 w-5 text-teal-700" />
              {t.payNow}
            </h3>
            <p className="text-xs text-slate-500">
              {t.grandTotal}: <span className="font-bold text-teal-700 text-sm">{formatUSD(grandTotalUsd)}</span> (
              {formatKHR(grandTotalUsd, exchangeRateKhr)})
            </p>
          </div>
          <button
            onClick={handleCloseAll}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success View / Receipt Preview */}
        {isSuccess && completedReceipt ? (
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-800">ការទូទាត់ប្រាក់បានជោគជ័យ!</h4>
              <p className="text-xs text-slate-500">
                វិក្កយបត្រ #{completedReceipt.invoiceNumber} បានរក្សាទុកក្នុងប្រព័ន្ធ
              </p>
            </div>

            {/* Hidden on screen when not printing, visible on @media print */}
            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-inner">
              <ThermalReceipt data={completedReceipt} />
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 font-bold text-white shadow-md shadow-teal-900/20 hover:bg-teal-800 transition"
              >
                <Printer className="h-4 w-4" />
                {t.print} (80mm Thermal)
              </button>
              <button
                onClick={handleCloseAll}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                បញ្ចប់ / ការលក់បន្ទាប់
              </button>
            </div>
          </div>
        ) : (
          /* Payment Processing Tabs */
          <div className="p-6 space-y-5">
            {/* Payment Method Selector */}
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => setActiveTab("KHQR_ABA")}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                  activeTab === "KHQR_ABA"
                    ? "border-red-500 bg-red-50/60 text-red-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <QrCode className="h-5 w-5 text-red-600" />
                <span>ABA KHQR</span>
              </button>

              <button
                onClick={() => setActiveTab("CASH_USD")}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                  activeTab === "CASH_USD"
                    ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Banknote className="h-5 w-5 text-teal-700" />
                <span>Cash ($)</span>
              </button>

              <button
                onClick={() => setActiveTab("CASH_KHR")}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                  activeTab === "CASH_KHR"
                    ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Banknote className="h-5 w-5 text-teal-700" />
                <span>Cash (៛)</span>
              </button>

              <button
                onClick={() => setActiveTab("CREDIT_CARD")}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                  activeTab === "CREDIT_CARD"
                    ? "border-blue-600 bg-blue-50 text-blue-800 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CreditCard className="h-5 w-5 text-blue-600" />
                <span>Card</span>
              </button>

              <button
                onClick={() => setActiveTab("CUSTOMER_CREDIT")}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                  activeTab === "CUSTOMER_CREDIT"
                    ? "border-amber-500 bg-amber-50 text-amber-800 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <UserCheck className="h-5 w-5 text-amber-600" />
                <span>ជំពាក់ (Debt)</span>
              </button>
            </div>

            {/* TAB CONTENT: KHQR */}
            {activeTab === "KHQR_ABA" && (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 border border-slate-800 shadow-xl">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="rounded-lg bg-teal-600 px-2.5 py-0.5 font-black text-white text-[11px] tracking-wider uppercase shadow-xs">
                    Bakong KHQR
                  </span>
                  {usePOSStore.getState().acquiringBank && (
                    <span className="text-[11px] text-teal-300 font-bold bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/60">
                      {usePOSStore.getState().acquiringBank}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 font-sans mb-3 text-center">
                  ស្កេនទូទាត់ជាមួយគ្រប់ App ធនាគារ (ABA, ACLEDA, Wing, Canadia...)
                </p>

                {khqrQrUrl ? (
                  <div className="bg-white p-3.5 rounded-2xl shadow-2xl border-4 border-teal-500/20">
                    <img src={khqrQrUrl} alt="Bakong KHQR" className="h-48 w-48" />
                  </div>
                ) : (
                  <div className="p-4 bg-slate-800/90 border border-amber-500/30 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 max-w-xs">
                    <QrCode className="h-10 w-10 text-amber-400/80" />
                    <p className="text-xs font-bold text-amber-300">មិនទាន់បានកំណត់គណនី KHQR ទេ</p>
                    <p className="text-[11px] text-slate-400">សូមចូលទៅកាន់ Settings &gt; ការទូទាត់ ដើម្បីកំណត់គណនី Bakong / KHQR របស់ហាង។</p>
                  </div>
                )}

                <div className="mt-3 text-center space-y-0.5">
                  {usePOSStore.getState().bakongMerchantName && (
                    <p className="text-xs font-bold text-white tracking-wide">
                      {usePOSStore.getState().bakongMerchantName}
                    </p>
                  )}
                  {usePOSStore.getState().bakongMerchantId && (
                    <p className="text-[10px] font-mono text-slate-400">
                      {usePOSStore.getState().bakongMerchantId} {usePOSStore.getState().merchantID ? `(${usePOSStore.getState().merchantID})` : ""}
                    </p>
                  )}
                  <p className="text-2xl font-black font-mono text-emerald-400 pt-1.5">{formatUSD(grandTotalUsd)}</p>
                  <p className="text-xs text-slate-400 font-sans">{formatKHR(grandTotalUsd, exchangeRateKhr)}</p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CASH USD */}
            {activeTab === "CASH_USD" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.tenderedAmount} (USD $)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tenderedUsd}
                    onChange={(e) => setTenderedUsd(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xl font-bold font-mono text-slate-900 focus:border-teal-600 focus:outline-hidden focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[grandTotalUsd, 10, 20, 50, 100, 200].map((amt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTenderedUsd(amt.toString())}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold font-mono text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-800 transition"
                    >
                      ${amt.toFixed(amt % 1 === 0 ? 0 : 2)}
                    </button>
                  ))}
                </div>

                {/* Change Calculation */}
                <div className="flex items-center justify-between rounded-xl bg-teal-50/80 p-4 border border-teal-200">
                  <span className="text-sm font-bold text-teal-900">{t.changeDue}:</span>
                  <div className="text-right">
                    <p className="text-xl font-extrabold font-mono text-teal-800">{formatUSD(changeUsd)}</p>
                    <p className="text-xs font-semibold text-teal-700">{formatKHR(changeUsd, exchangeRateKhr)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CASH KHR */}
            {activeTab === "CASH_KHR" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.tenderedAmount} (KHR ៛)
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={tenderedKhr}
                    onChange={(e) => setTenderedKhr(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xl font-bold font-mono text-slate-900 focus:border-teal-600 focus:outline-hidden focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>

                {/* Quick KHR Notes */}
                <div className="flex flex-wrap gap-2">
                  {[grandTotalKhr, 50000, 100000, 200000, 500000].map((amt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTenderedKhr(amt.toString())}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold font-sans text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-800 transition"
                    >
                      {amt.toLocaleString()} ៛
                    </button>
                  ))}
                </div>

                {/* Change Calculation KHR */}
                <div className="flex items-center justify-between rounded-xl bg-teal-50/80 p-4 border border-teal-200">
                  <span className="text-sm font-bold text-teal-900">{t.changeDue}:</span>
                  <div className="text-right">
                    <p className="text-xl font-extrabold font-mono text-teal-800">{changeKhr.toLocaleString()} ៛</p>
                    <p className="text-xs font-semibold text-teal-700">${(changeKhr / exchangeRateKhr).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CUSTOMER CREDIT / DEBT */}
            {activeTab === "CUSTOMER_CREDIT" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 text-sm font-bold">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span>កត់ត្រាជំពាក់ / បំណុលអតិថិជន (Accounts Receivable)</span>
                </div>
                {selectedCustomer ? (
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>
                      អតិថិជន: <span className="font-bold">{selectedCustomer.name}</span> ({selectedCustomer.phone})
                    </p>
                    <p>
                      បំណុលបច្ចុប្បន្ន:{" "}
                      <span className="font-bold text-red-600">${Number(selectedCustomer.currentDebtUsd || 0).toFixed(2)}</span>
                    </p>
                    <p>
                      កម្រិតអនុញ្ញាតជំពាក់:{" "}
                      <span className="font-bold text-teal-700">${Number(selectedCustomer.creditLimitUsd || 0).toFixed(2)}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-red-600 font-semibold">
                    * សូមជ្រើសរើសអតិថិជនជាមុនសិន ដើម្បីកត់ត្រាការជំពាក់
                  </p>
                )}
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-rose-800 text-xs font-bold animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage("")}
                  className="text-rose-500 hover:text-rose-700"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Process Button */}
            <div className="pt-2">
              <button
                onClick={handleProcessPayment}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-700 py-3.5 text-base font-extrabold text-white shadow-lg shadow-teal-900/30 hover:bg-teal-800 disabled:opacity-50 transition active:scale-[0.99]"
              >
                {isProcessing ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>កំពុងដំណើរការទូទាត់...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>
                      {activeTab === "KHQR_ABA" ? "បញ្ជាក់ការទូទាត់ QR" : "ទទួលប្រាក់ និងចេញវិក្កយបត្រ"} (Enter)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
