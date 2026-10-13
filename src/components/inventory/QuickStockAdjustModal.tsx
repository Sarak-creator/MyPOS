"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Minus,
  Package,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Hash,
} from "lucide-react";
import { broadcastStockChange } from "@/lib/stockSync";

export interface InventoryItemForAdjust {
  id: string;
  sku: string;
  nameKh: string;
  nameEn: string;
  stockQty: number;
  unit: string;
  type: string;
  costPriceUsd?: number;
  salePriceUsd?: number;
}

interface QuickStockAdjustModalProps {
  isOpen: boolean;
  item: InventoryItemForAdjust | null;
  initialMode?: "RESTOCK" | "DEDUCT";
  onClose: () => void;
  onSuccess?: (result: {
    productId: string;
    productName: string;
    previousStock: number;
    newStockQty: number;
    delta: number;
    type: "RESTOCK" | "DEDUCT";
  }) => void;
}

export default function QuickStockAdjustModal({
  isOpen,
  item,
  initialMode = "RESTOCK",
  onClose,
  onSuccess,
}: QuickStockAdjustModalProps) {
  const [mode, setMode] = useState<"RESTOCK" | "DEDUCT">(initialMode);
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>("COUNT_CORRECTION");
  const [notes, setNotes] = useState<string>("");
  const [imeiText, setImeiText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successToast, setSuccessToast] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setQuantity(1);
      setNotes("");
      setImeiText("");
      setErrorMessage("");
      setSuccessToast("");
      setReason(initialMode === "RESTOCK" ? "COUNT_CORRECTION" : "DAMAGE");
    }
  }, [isOpen, initialMode, item?.id]);

  if (!isOpen || !item) return null;

  const currentStock = Number(item.stockQty || 0);
  const isSerialItem = item.type === "SERIAL_IMEI_ITEM";
  const imeiList = imeiText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const effectiveQty = isSerialItem && mode === "RESTOCK" ? Math.max(quantity, imeiList.length || 1) : quantity;
  const newProjectedStock =
    mode === "RESTOCK" ? currentStock + effectiveQty : Math.max(0, currentStock - effectiveQty);

  const handleQuickAdd = (amount: number) => {
    setQuantity((prev) => Math.max(1, prev + amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessToast("");

    if (effectiveQty <= 0) {
      setErrorMessage("ចំនួនត្រូវតែធំជាង 0!");
      return;
    }

    if (mode === "DEDUCT" && effectiveQty > currentStock) {
      setErrorMessage(
        `មិនអាចកាត់ស្តុក (${effectiveQty}) លើសពីស្តុកដែលមានក្នុងដៃ (${currentStock}) បានឡើយ!`
      );
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/inventory/stock-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.id,
          type: mode,
          quantity: effectiveQty,
          reason,
          notes,
          imeiList: isSerialItem && mode === "RESTOCK" ? imeiList : [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "ការកែប្រែស្តុកមិនជោគជ័យ");
      }

      const delta = mode === "RESTOCK" ? effectiveQty : -effectiveQty;
      const finalNewQty = data.data?.newStockQty ?? newProjectedStock;

      // Broadcast instant optimistic real-time stock sync event across all browser windows, tabs, and POS devices
      broadcastStockChange({
        type: mode === "RESTOCK" ? "RESTOCK" : "ADJUST",
        productIds: [item.id],
        quantities: { [item.id]: effectiveQty },
        timestamp: Date.now(),
      });

      if (onSuccess) {
        onSuccess({
          productId: item.id,
          productName: item.nameKh,
          previousStock: currentStock,
          newStockQty: finalNewQty,
          delta,
          type: mode,
        });
      }

      setSuccessToast(
        mode === "RESTOCK"
          ? `✓ បានបញ្ចូលស្តុក (+${effectiveQty}) ជោគជ័យ!`
          : `✓ បានកាត់ស្តុក (-${effectiveQty}) ជោគជ័យ!`
      );

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || "មានបញ្ហាក្នុងការតភ្ជាប់");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                mode === "RESTOCK"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                  : "bg-rose-50 text-rose-700 border border-rose-200/80"
              }`}
            >
              {mode === "RESTOCK" ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {mode === "RESTOCK" ? "បញ្ចូលស្តុកបន្ថែម (ReStock)" : "កាត់ស្តុកចេញ (Stock Cut)"}
              </h3>
              <p className="text-[11px] font-semibold text-slate-400">
                ធ្វើបច្ចុប្បន្នភាពស្តុកភ្លាមៗ Real-time ដោយមិនបាច់ Reload
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product Card */}
        <div className="p-5 pb-3">
          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] font-bold font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60 mb-1">
                {item.sku}
              </span>
              <h4 className="text-xs font-bold text-slate-900 truncate">{item.nameKh}</h4>
              <p className="text-[11px] text-slate-400 truncate">{item.nameEn}</p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                ស្តុកបច្ចុប្បន្ន
              </span>
              <span className="text-base font-black font-mono text-slate-800">
                {currentStock} {item.unit || "Pcs"}
              </span>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="mt-3.5 grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode("RESTOCK");
                setReason("COUNT_CORRECTION");
                setErrorMessage("");
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                mode === "RESTOCK"
                  ? "bg-emerald-600 text-white shadow-emerald-700/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>បញ្ចូលស្តុក (ReStock)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("DEDUCT");
                setReason("DAMAGE");
                setErrorMessage("");
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                mode === "DEDUCT"
                  ? "bg-rose-600 text-white shadow-rose-700/20"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Minus className="h-4 w-4" />
              <span>កាត់ស្តុកចេញ (Deduct)</span>
            </button>
          </div>
        </div>

        {/* Error / Success Toast alerts */}
        {errorMessage && (
          <div className="mx-5 mb-2 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs font-bold text-rose-700 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successToast && (
          <div className="mx-5 mb-2 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Quantity Stepper & Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ចំនួន{mode === "RESTOCK" ? "បញ្ចូល" : "កាត់ចេញ"} ({item.unit || "Pcs"}) *
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold active:scale-95 transition"
              >
                <Minus className="h-4 w-4" />
              </button>

              <input
                type="number"
                min="1"
                max={mode === "DEDUCT" ? currentStock : 999999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-center text-base font-extrabold font-mono text-slate-800 focus:border-teal-700 focus:outline-hidden"
              />

              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 1)}
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold active:scale-95 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Increment Chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[1, 5, 10, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAdd(amt)}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[11px] font-bold font-mono text-slate-700 transition"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Projected Stock Preview */}
          <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 to-slate-100/50 p-3 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-600">
              ការផ្លាស់ប្តូរស្តុក (Stock Preview):
            </div>
            <div className="flex items-center gap-2 font-mono font-bold text-xs">
              <span className="text-slate-600">{currentStock}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <span
                className={`text-sm font-extrabold ${
                  mode === "RESTOCK" ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {newProjectedStock} {item.unit || "Pcs"}
              </span>
            </div>
          </div>

          {/* Reason Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              មូលហេតុ (Reason)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-700 focus:outline-hidden"
            >
              {mode === "RESTOCK" ? (
                <>
                  <option value="COUNT_CORRECTION">📦 រាប់ស្តុកឃើញលើស / លៃតម្រូវ (Count Correction Over)</option>
                  <option value="PURCHASE_RECEIPT">🚚 ទិញទំនិញចូលស្តុកបន្ថែម (ReStock / Purchase)</option>
                  <option value="CUSTOMER_RETURN">🔄 អតិថិជនប្តូរទំនិញចូល (Customer Exchange)</option>
                  <option value="OTHER">✨ មូលហេតុផ្សេងៗ (Other)</option>
                </>
              ) : (
                <>
                  <option value="DAMAGE">💔 ខូចខាត / បាក់បែក (Damage / Broken)</option>
                  <option value="EXPIRED">⌛ ផុតកំណត់ / អស់សុពលភាព (Expired)</option>
                  <option value="THEFT_LOSS">🔍 បាត់បង់ / លួច (Loss / Theft)</option>
                  <option value="COUNT_CORRECTION">📉 រាប់ស្តុកឃើញខ្វះ (Count Correction Under)</option>
                  <option value="SCRAP">🗑️ ចោល / ខូចលែងដំណើរការ (Scrap)</option>
                </>
              )}
            </select>
          </div>

          {/* Serial / IMEI Input if applicable */}
          {isSerialItem && mode === "RESTOCK" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  បញ្ជី IMEI ថ្មី (IMEI List - 1 លេខក្នុង 1 ជួរ)
                </label>
                <span className="text-[10px] font-mono text-teal-700 font-bold">
                  {imeiList.length} បានស្កេន
                </span>
              </div>
              <textarea
                rows={3}
                value={imeiText}
                onChange={(e) => setImeiText(e.target.value)}
                placeholder="ស្កេន ឬបិទភ្ជាប់លេខ IMEI នៅទីនេះ (ចុច Enter ដើម្បីប្តូរជួរ)..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-mono focus:border-teal-700 focus:outline-hidden"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ចំណាំបន្ថែម (Notes)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ព័ត៌មានលម្អិតបន្ថែម (បើមាន)..."
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              បោះបង់
            </button>

            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold text-white shadow-md active:scale-95 transition disabled:opacity-50 ${
                mode === "RESTOCK"
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-700/20"
                  : "bg-rose-600 hover:bg-rose-700 shadow-rose-700/20"
              }`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "RESTOCK" ? (
                <Plus className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              <span>
                {mode === "RESTOCK"
                  ? `បញ្ជាក់បញ្ចូលស្តុក (+${effectiveQty})`
                  : `បញ្ជាក់កាត់ស្តុក (-${effectiveQty})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
