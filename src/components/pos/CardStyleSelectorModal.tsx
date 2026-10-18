"use client";

import React, { useState } from "react";
import {
  X,
  Check,
  LayoutGrid,
  SquareMenu,
  Rows3,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  Volume2,
  Smartphone,
  Eye,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { CardLayoutType, LAYOUT_OPTIONS, POSDisplayConfig, ProductItem } from "@/types/product";
import { usePOSSettings } from "@/context/POSSettingsContext";
import ProductCard from "@/components/pos/ProductCard";

// Mock product for live preview inside modal
const PREVIEW_PRODUCT: ProductItem = {
  id: "preview-1",
  productId: "preview-1",
  sku: "IPHONE-15-PRO",
  barcode: "885909123456",
  nameKh: "iPhone 15 Pro Max 256GB - ពណ៌ទីតាញ៉ូមធម្មជាតិ",
  nameEn: "iPhone 15 Pro Max 256GB Natural Titanium",
  priceUsd: 1199,
  costPriceUsd: 950,
  stockQty: 8,
  alertStock: 3,
  categorySlug: "smartphones",
  type: "STANDARD_ITEM",
  imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&q=80",
};

export default function CardStyleSelectorModal() {
  const { config, updateConfig, resetToDefault, isSelectorOpen, setIsSelectorOpen, isSavingRemote } =
    usePOSSettings();

  // Temporary local state for interactive preview before final confirmation
  const [tempConfig, setTempConfig] = useState<POSDisplayConfig>(config);
  const [savedToast, setSavedToast] = useState(false);

  // Sync tempConfig when modal opens
  React.useEffect(() => {
    if (isSelectorOpen) {
      setTempConfig(config);
    }
  }, [isSelectorOpen, config]);

  if (!isSelectorOpen) return null;

  const handleSelectLayout = (layout: CardLayoutType) => {
    setTempConfig((prev) => ({ ...prev, layout }));
  };

  const handleApply = async () => {
    await updateConfig(tempConfig);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      setIsSelectorOpen(false);
    }, 500);
  };

  const handleReset = async () => {
    if (confirm("តើអ្នកចង់កំណត់រចនាបទកាតទំនិញទៅដូចដើមវិញ (Default) ឬ?")) {
      await resetToDefault();
      setTempConfig(config);
      setIsSelectorOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-slate-50 via-teal-50/30 to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-xs">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">
                រចនាបទកាតទំនិញ (Dynamic Product Card Styles)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                ប្តូរទម្រង់បង្ហាញទំនិញភ្លាមៗ និងធ្វើសមកាលកម្មជាមួយ Supabase Database
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSelectorOpen(false)}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* 1. Layout Mode Selector Cards */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              ជ្រើសរើសទម្រង់កាត (Card Layout Variations)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LAYOUT_OPTIONS.map((opt) => {
                const isSelected = tempConfig.layout === opt.type;
                const IconComponent =
                  opt.iconName === "SquareMenu"
                    ? SquareMenu
                    : opt.iconName === "Rows3"
                    ? Rows3
                    : opt.iconName === "Image"
                    ? ImageIcon
                    : LayoutGrid;

                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleSelectLayout(opt.type)}
                    className={`relative flex items-start gap-3.5 rounded-2xl border p-4 text-left transition select-none ${
                      isSelected
                        ? "border-teal-600 bg-teal-50/40 shadow-sm ring-2 ring-teal-600/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                        isSelected
                          ? "bg-teal-700 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-black text-slate-800">
                          {opt.nameKh}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {opt.descriptionKh}
                      </p>
                      <span className="mt-2 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                        {opt.recommendedFor}
                      </span>
                    </div>

                    {/* Radio Checkmark */}
                    <div
                      className={`absolute top-4 right-4 flex h-5 w-5 items-center justify-center rounded-full border transition ${
                        isSelected
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Live Interactive Preview */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-teal-700" /> ការបង្ហាញជាក់ស្តែង (Live Preview)
              </span>
              <span className="text-[11px] font-mono text-teal-700 font-bold bg-teal-50 border border-teal-200/60 rounded-md px-2 py-0.5">
                Layout: {tempConfig.layout.toUpperCase()}
              </span>
            </div>

            <div className="max-w-md mx-auto">
              <ProductCard
                product={PREVIEW_PRODUCT}
                layout={tempConfig.layout}
                cartQuantity={1}
                exchangeRateKhr={4100}
                config={tempConfig}
                onSelect={() => {}}
                onQuantityChange={() => {}}
              />
            </div>
          </div>

          {/* 3. Fine-tuning Switches */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              ជម្រើសបន្ថែម (Display Options & Ergonomics)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Show Images */}
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 cursor-pointer hover:bg-slate-50 transition">
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      បង្ហាញរូបភាពទំនិញ
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {tempConfig.layout === "compact"
                        ? "អសកម្មក្នុងទម្រង់ Compact Tile"
                        : "Thumbnail preview"}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={tempConfig.layout === "compact"}
                  checked={tempConfig.showImages && tempConfig.layout !== "compact"}
                  onChange={(e) =>
                    setTempConfig((prev) => ({ ...prev, showImages: e.target.checked }))
                  }
                  className="h-4 w-4 rounded text-teal-700 focus:ring-teal-600"
                />
              </label>

              {/* Show Barcode */}
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 cursor-pointer hover:bg-slate-50 transition">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">បង្ហាញបាកូដ / SKU</span>
                    <span className="text-[10px] text-slate-400">កូដសម្គាល់ទំនិញ</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={tempConfig.showBarcode}
                  onChange={(e) =>
                    setTempConfig((prev) => ({ ...prev, showBarcode: e.target.checked }))
                  }
                  className="h-4 w-4 rounded text-teal-700 focus:ring-teal-600"
                />
              </label>

              {/* Dual Currency Price */}
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 cursor-pointer hover:bg-slate-50 transition">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-slate-500 text-xs">$៛</span>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      បង្ហាញតម្លៃជាដុល្លារ ($) និងរៀល (៛)
                    </span>
                    <span className="text-[10px] text-slate-400">Dual-Currency Display</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={tempConfig.showDualPrice}
                  onChange={(e) =>
                    setTempConfig((prev) => ({ ...prev, showDualPrice: e.target.checked }))
                  }
                  className="h-4 w-4 rounded text-teal-700 focus:ring-teal-600"
                />
              </label>

              {/* Audio Click Feedback */}
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 cursor-pointer hover:bg-slate-50 transition">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      សូរសំឡេងចុចលើកាត (Tap Sound)
                    </span>
                    <span className="text-[10px] text-slate-400">Tactile Web Audio Click</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={tempConfig.enableClickSound}
                  onChange={(e) =>
                    setTempConfig((prev) => ({ ...prev, enableClickSound: e.target.checked }))
                  }
                  className="h-4 w-4 rounded text-teal-700 focus:ring-teal-600"
                />
              </label>

              {/* Haptic Vibration */}
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 cursor-pointer hover:bg-slate-50 transition">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      រំញ័រពេលប៉ះ (Haptic Feedback)
                    </span>
                    <span className="text-[10px] text-slate-400">សម្រាប់អេក្រង់ប៉ះ / Touchscreen</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={tempConfig.enableHapticFeedback}
                  onChange={(e) =>
                    setTempConfig((prev) => ({ ...prev, enableHapticFeedback: e.target.checked }))
                  }
                  className="h-4 w-4 rounded text-teal-700 focus:ring-teal-600"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-3.5">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            កំណត់ទៅដូចដើម
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsSelectorOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              បោះបង់
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={isSavingRemote}
              className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition active:scale-95 disabled:opacity-50"
            >
              {isSavingRemote ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : savedToast ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {savedToast ? "បានអនុវត្ត!" : "រក្សាទុក & អនុវត្ត"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
