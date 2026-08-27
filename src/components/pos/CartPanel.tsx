"use client";

import React, { useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  User,
  Tag,
  PauseCircle,
  PlayCircle,
  XCircle,
  Sparkles,
  ShoppingBag,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import { usePOSStore, CustomerOption } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD, formatKHR } from "@/lib/utils";

interface CartPanelProps {
  onOpenPayment: () => void;
}

export default function CartPanel({ onOpenPayment }: CartPanelProps) {
  const {
    language,
    items,
    updateQuantity,
    removeItem,
    clearCart,
    selectedCustomer,
    setCustomer,
    discountType,
    discountValue,
    setOrderDiscount,
    heldCarts,
    holdCurrentCart,
    resumeCart,
    deleteHeldCart,
    getSubtotal,
    getDiscountTotal,
    getTaxTotal,
    getGrandTotalUsd,
    getGrandTotalKhr,
    exchangeRateKhr,
  } = usePOSStore();
  const t = translations[language];

  const [showHeldMenu, setShowHeldMenu] = useState(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const sampleCustomers: CustomerOption[] = [
    {
      id: "CUST-001",
      name: "សុខ វិបុល (Sok Vibol)",
      phone: "012889977",
      tier: "VIP",
      loyaltyPoints: 120,
      currentDebtUsd: 150.0,
      creditLimitUsd: 500.0,
    },
    {
      id: "CUST-002",
      name: "ចាន់ ធីតា (Chan Thida)",
      phone: "098223344",
      tier: "RETAIL",
      loyaltyPoints: 45,
      currentDebtUsd: 0,
      creditLimitUsd: 0,
    },
    {
      id: "CUST-003",
      name: "អ៊ុច សំបូរ (Uch Sambath)",
      phone: "015443322",
      tier: "WHOLESALE",
      loyaltyPoints: 340,
      currentDebtUsd: 420.0,
      creditLimitUsd: 2000.0,
    },
  ];

  const subtotal = getSubtotal();
  const discountTotal = getDiscountTotal();
  const taxTotal = getTaxTotal();
  const grandTotalUsd = getGrandTotalUsd();
  const grandTotalKhr = getGrandTotalKhr();

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Top Customer & Action Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 p-3">
        {/* Customer Selector */}
        <button
          onClick={() => setShowCustomerModal(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
        >
          <User className="h-4 w-4 text-teal-700" />
          <span className="max-w-[140px] truncate">
            {selectedCustomer ? selectedCustomer.name : t.selectCustomer}
          </span>
          {selectedCustomer && (
            <span className="rounded bg-teal-100 px-1 py-0.2 text-[9px] font-bold text-teal-800">
              {selectedCustomer.tier}
            </span>
          )}
        </button>

        {/* Held Carts & Clear */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              onClick={() => setShowHeldMenu(!showHeldMenu)}
              disabled={heldCarts.length === 0}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              title="Resume Held Cart"
            >
              <PlayCircle className="h-3.5 w-3.5 text-blue-600" />
              <span>({heldCarts.length})</span>
            </button>

            {showHeldMenu && heldCarts.length > 0 && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t.heldCarts}
                </p>
                {heldCarts.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{h.id}</p>
                      <p className="text-[10px] text-slate-400">
                        {h.items.length} មុខទំនិញ • {h.timestamp}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          resumeCart(h.id);
                          setShowHeldMenu(false);
                        }}
                        className="rounded bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700 hover:bg-teal-100"
                      >
                        យកមកវិញ
                      </button>
                      <button
                        onClick={() => deleteHeldCart(h.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={holdCurrentCart}
            disabled={items.length === 0}
            className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-40 transition"
            title="Hold Cart (F4)"
          >
            <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>F4</span>
          </button>

          <button
            onClick={clearCart}
            disabled={items.length === 0}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition"
            title="Clear Cart (ESC)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-400">
            <ShoppingBag className="h-12 w-12 text-slate-300 stroke-1 mb-2" />
            <p className="text-sm font-semibold text-slate-600">{t.emptyCart}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              {language === "km"
                ? "សូមជ្រើសរើសទំនិញពីតារាងខាងឆ្វេង ឬស្កេនបាកូដ (F2)"
                : "Select items from the catalog or scan barcodes (F2)"}
            </p>
          </div>
        ) : (
          items.map((item) => {
            const lineTotal = item.priceUsd * item.quantity - item.discountAmount;
              const isMaxStockReached =
                item.type !== "SERVICE_LABOR" &&
                item.stockQty !== undefined &&
                item.quantity >= item.stockQty;

              return (
                <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate leading-snug">
                      {language === "km" ? item.nameKh : item.nameEn}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      SKU: {item.sku} • ${Number(item.priceUsd || 0).toFixed(2)}/ឯកតា
                      {item.type !== "SERVICE_LABOR" && item.stockQty !== undefined && (
                        <span className={`ml-1 font-sans ${isMaxStockReached ? "text-rose-600 font-bold" : "text-slate-500"}`}>
                          • (ស្តុក: {item.stockQty})
                        </span>
                      )}
                    </p>
                    {item.selectedImei && (
                      <span className="inline-block text-[9px] font-mono bg-teal-50 text-teal-700 px-1.5 rounded">
                        IMEI: {item.selectedImei}
                      </span>
                    )}
                  </div>

                  {/* Qty Stepper */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-200 transition text-xs font-bold"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold font-mono text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      disabled={isMaxStockReached}
                      title={isMaxStockReached ? "បានដល់ចំនួនអតិបរមាក្នុងស្តុកហើយ" : "បន្ថែមចំនួន"}
                      className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold transition ${
                        isMaxStockReached
                          ? "border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Line Price & Remove */}
                  <div className="text-right min-w-[70px]">
                    <p className="text-xs font-extrabold font-mono text-slate-900">${Number(lineTotal || 0).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 font-sans">
                      {formatKHR(lineTotal, exchangeRateKhr)}
                    </p>
                  </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="text-slate-300 hover:text-red-500 transition p-1"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary & Checkout */}
      <div className="border-t border-slate-200 bg-slate-50/90 p-4 space-y-3">
        {/* Discount toggle */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <button
            onClick={() => setShowDiscountInput(!showDiscountInput)}
            className="flex items-center gap-1 text-teal-700 font-semibold hover:underline"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>{t.discount} {discountValue > 0 && `(${discountType === "PERCENT" ? `${discountValue}%` : `$${discountValue}`})`}</span>
          </button>
          <span className="font-mono text-slate-700">${subtotal.toFixed(2)}</span>
        </div>

        {showDiscountInput && (
          <div className="flex items-center gap-2 pt-1 animate-in fade-in">
            <select
              value={discountType}
              onChange={(e) => setOrderDiscount(e.target.value as any, discountValue)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
            >
              <option value="FIXED">USD ($)</option>
              <option value="PERCENT">%</option>
            </select>
            <input
              type="number"
              min="0"
              value={discountValue || ""}
              placeholder="0"
              onChange={(e) => setOrderDiscount(discountType, parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-bold focus:border-teal-600 focus:outline-hidden"
            />
          </div>
        )}

        {discountTotal > 0 && (
          <div className="flex justify-between text-xs text-red-600 font-medium">
            <span>{t.discount}:</span>
            <span className="font-mono">-${discountTotal.toFixed(2)}</span>
          </div>
        )}

        {/* Grand Total Display */}
        <div className="rounded-xl bg-slate-900 p-3.5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              {t.grandTotal}
            </span>
            <span className="text-xs text-teal-400 font-sans">
              $1 = {exchangeRateKhr.toLocaleString()} ៛
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-2xl font-black font-mono text-white tracking-tight">
              {formatUSD(grandTotalUsd)}
            </p>
            <p className="text-sm font-bold text-teal-300 font-sans">
              {formatKHR(grandTotalUsd, exchangeRateKhr)}
            </p>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={onOpenPayment}
          disabled={items.length === 0}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-700 py-3.5 text-base font-extrabold text-white shadow-md shadow-teal-900/30 hover:bg-teal-800 disabled:opacity-50 disabled:pointer-events-none transition active:scale-[0.99]"
        >
          <CreditCard className="h-5 w-5" />
          <span>{t.payNow} (F8)</span>
        </button>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-teal-700" />
                ជ្រើសរើសអតិថិជន / Select Customer
              </h4>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="py-3 space-y-2 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  setCustomer(null);
                  setShowCustomerModal(false);
                }}
                className="w-full rounded-xl border border-dashed border-slate-300 p-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                + អតិថិជនទូទៅ (Walk-in Customer)
              </button>

              {sampleCustomers.map((cust) => (
                <button
                  key={cust.id}
                  onClick={() => {
                    setCustomer(cust);
                    setShowCustomerModal(false);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedCustomer?.id === cust.id
                      ? "border-teal-600 bg-teal-50/70"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800">{cust.name}</p>
                    <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-extrabold text-teal-800">
                      {cust.tier}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">ទូរស័ព្ទ: {cust.phone}</p>
                  {Number(cust.currentDebtUsd || 0) > 0 && (
                    <p className="text-[10px] text-red-600 font-semibold mt-1">
                      បំណុលបច្ចុប្បន្ន: ${Number(cust.currentDebtUsd || 0).toFixed(2)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
