"use client";

import React, { useState, useEffect } from "react";
import ProductGrid from "@/components/pos/ProductGrid";
import CartPanel from "@/components/pos/CartPanel";
import PaymentModal from "@/components/pos/PaymentModal";
import { usePOSStore } from "@/store/posStore";
import { ShoppingCart, ArrowRight, X } from "lucide-react";
import { formatUSD, formatKHR } from "@/lib/utils";

export default function POSPage() {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const { holdCurrentCart, clearCart, items, getGrandTotalUsd, exchangeRateKhr } = usePOSStore();

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotalUsd = getGrandTotalUsd();

  // Global POS Hotkey listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F8") {
        e.preventDefault();
        if (items.length > 0) setIsPaymentOpen(true);
      } else if (e.key === "F4") {
        e.preventDefault();
        holdCurrentCart();
      } else if (e.key === "Escape") {
        e.preventDefault();
        clearCart();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items.length, holdCurrentCart, clearCart]);

  return (
    <div className="relative h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-6.5rem)] flex gap-4 overflow-hidden">
      {/* 1. Left: Product Catalog & Search (Full width on Mobile/Tablet, Flex on Desktop) */}
      <div className="flex-1 h-full min-w-0 pb-12 lg:pb-0">
        <ProductGrid />
      </div>

      {/* 2. Right: Desktop Cart & Checkout Panel */}
      <div className="hidden lg:block w-[380px] xl:w-[420px] h-full shrink-0">
        <CartPanel onOpenPayment={() => setIsPaymentOpen(true)} />
      </div>

      {/* 3. Mobile / Tablet Floating Cart Bar (Visible on < 1024px when cart has items) */}
      {totalItemsCount > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-teal-800 to-emerald-900 p-3 text-white shadow-2xl border border-teal-500/30 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 font-bold border border-teal-400/30">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs">
                  {totalItemsCount}
                </span>
              </div>
              <div>
                <p className="text-xs font-black font-mono text-white">
                  {formatUSD(grandTotalUsd)}
                </p>
                <p className="text-[10px] text-teal-200/80 font-sans">
                  {formatKHR(grandTotalUsd, exchangeRateKhr)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-teal-900 shadow-md hover:bg-teal-50 active:scale-95 transition"
            >
              <span>មើលកន្ត្រក & គិតលុយ</span>
              <ArrowRight className="h-3.5 w-3.5 text-teal-700" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Mobile / Tablet Cart Drawer / Slide-Up Modal */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div
            className="flex-1"
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="relative h-[85vh] max-h-[85vh] w-full rounded-t-3xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Drawer Drag handle & Close */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-teal-700" />
                <span className="font-bold text-slate-800 text-xs">កន្ត្រកទំនិញ ({totalItemsCount})</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-2">
              <CartPanel
                onOpenPayment={() => {
                  setIsMobileCartOpen(false);
                  setIsPaymentOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. Payment Processing Modal (KHQR / Cash / Card / Debt) */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
      />
    </div>
  );
}
