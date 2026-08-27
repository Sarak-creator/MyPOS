"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ScanBarcode,
  Smartphone,
  Cpu,
  Wrench,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD, formatKHR } from "@/lib/utils";

export interface ProductItem {
  id: string;
  productId: string;
  sku: string;
  barcode?: string;
  nameKh: string;
  nameEn: string;
  priceUsd: number;
  costPriceUsd: number;
  categorySlug: string;
  stockQty: number;
  type: "STANDARD_ITEM" | "SERIAL_IMEI_ITEM" | "VARIANT_ITEM" | "SERVICE_LABOR" | "SPARE_PART";
  imageUrl?: string;
  imeiList?: string[];
}

export default function ProductGrid() {
  const { language, addItem, items, exchangeRateKhr } = usePOSStore();
  const t = translations[language];

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchLiveProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        const mapped = data.products.map((p: any) => ({
          id: p.id,
          productId: p.id,
          sku: p.sku,
          barcode: p.barcode || "",
          nameKh: p.nameKh,
          nameEn: p.nameEn || p.nameKh,
          priceUsd: Number(p.salePriceUsd),
          costPriceUsd: Number(p.costPriceUsd),
          categorySlug: p.categorySlug || "smartphones",
          stockQty: Number(p.stockQty || 0),
          type: p.type || "STANDARD_ITEM",
          imeiList: p.imeiList || [],
        }));
        setProducts(mapped);
      }
    } catch (err) {
      console.error("Failed to load POS products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveProducts();
  }, []);

  // Hotkey listener for F2 Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const categories = [
    { slug: "ALL", label: t.allCategories, icon: Layers },
    { slug: "smartphones", label: t.catSmartphones, icon: Smartphone },
    { slug: "spare-parts", label: t.catSpareParts, icon: Cpu },
    { slug: "repair-services", label: t.catRepairServices, icon: Wrench },
    { slug: "accessories", label: t.catAccessories, icon: Sparkles },
  ];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "ALL" || p.categorySlug === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === "" ||
      p.nameKh.toLowerCase().includes(query) ||
      p.nameEn.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.includes(query));

    return matchesCategory && matchesSearch;
  });

  const showWarning = (msg: string) => {
    setStockWarning(msg);
    setTimeout(() => setStockWarning(null), 3500);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredProducts.length === 1) {
      handleSelectProduct(filteredProducts[0]);
      setSearchQuery("");
    }
  };

  const handleSelectProduct = (p: ProductItem) => {
    // Check if product is out of stock (for non-service items)
    if (p.type !== "SERVICE_LABOR" && p.stockQty <= 0) {
      showWarning(`⚠️ ${t.outOfStock}: "${language === "km" ? p.nameKh : p.nameEn}" (0)!`);
      return;
    }

    // Check if current cart quantity already reaches available stock
    const cartItem = items.find((i) => i.id === p.id);
    if (p.type !== "SERVICE_LABOR" && cartItem && cartItem.quantity >= p.stockQty) {
      showWarning(`⚠️ "${language === "km" ? p.nameKh : p.nameEn}" (${p.stockQty}) ${t.maxStockReached}!`);
      return;
    }

    const selectedImei =
      p.type === "SERIAL_IMEI_ITEM" && p.imeiList && p.imeiList.length > 0
        ? p.imeiList[0]
        : undefined;

    addItem({
      id: p.id,
      productId: p.id,
      nameKh: p.nameKh,
      nameEn: p.nameEn,
      sku: p.sku,
      barcode: p.barcode,
      priceUsd: p.priceUsd,
      costPriceUsd: p.costPriceUsd,
      type: p.type,
      selectedImei,
      stockQty: p.stockQty,
    });
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Stock Warning Toast Alert */}
      {stockWarning && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500 text-white px-3.5 py-2 text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{stockWarning}</span>
        </div>
      )}

      {/* Search & Barcode Bar */}
      <form onSubmit={handleBarcodeSubmit} className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.barcodeOrSearch}
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-24 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-slate-400 hover:text-slate-600 px-1"
            >
              ✕
            </button>
          )}
          <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500">
            <ScanBarcode className="h-3 w-3" /> F2
          </span>
        </div>
      </form>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-2xs ${
                isSelected
                  ? "bg-teal-700 text-white shadow-teal-900/20"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-slate-500"}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
            <span className="text-xs font-semibold">{t.fetchingProducts}</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <p className="text-xs font-bold text-slate-600">{t.noProductsFound}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((p) => {
              const isOutOfStock = p.type !== "SERVICE_LABOR" && p.stockQty <= 0;
              const cartItem = items.find((i) => i.id === p.id);
              const isMaxInCart =
                p.type !== "SERVICE_LABOR" &&
                !isOutOfStock &&
                cartItem &&
                cartItem.quantity >= p.stockQty;

              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  disabled={isOutOfStock}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left shadow-xs transition ${
                    isOutOfStock
                      ? "border-rose-200 bg-rose-50/30 opacity-70 cursor-not-allowed"
                      : isMaxInCart
                      ? "border-amber-300 bg-amber-50/20 hover:border-amber-400"
                      : "border-slate-200 bg-white hover:border-teal-500 hover:shadow-md active:scale-[0.98]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-bold font-mono text-slate-400 truncate">
                        {p.sku}
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          p.type === "SERVICE_LABOR"
                            ? "bg-purple-50 text-purple-700"
                            : isOutOfStock
                            ? "bg-rose-100 text-rose-700 font-extrabold"
                            : p.stockQty > 5
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {p.type === "SERVICE_LABOR"
                          ? t.service
                          : isOutOfStock
                          ? `${t.outOfStock} (0)`
                          : `${t.stock}: ${p.stockQty}`}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-bold line-clamp-2 leading-snug transition ${
                        isOutOfStock
                          ? "text-slate-400 line-through"
                          : "text-slate-800 group-hover:text-teal-700"
                      }`}
                    >
                      {language === "km" ? p.nameKh : p.nameEn}
                    </h4>

                    {cartItem && cartItem.quantity > 0 && (
                      <span className="mt-1 inline-block rounded bg-teal-100 px-1.5 py-0.2 text-[9px] font-extrabold text-teal-800">
                        {t.inCart}: {cartItem.quantity}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-2">
                    <div>
                      <p className={`text-sm font-black font-mono ${isOutOfStock ? "text-slate-400" : "text-teal-800"}`}>
                        {formatUSD(p.priceUsd)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-sans">
                        {formatKHR(p.priceUsd, exchangeRateKhr)}
                      </p>
                    </div>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${
                        isOutOfStock
                          ? "bg-slate-100 text-slate-400"
                          : "bg-teal-50 text-teal-700 group-hover:bg-teal-700 group-hover:text-white"
                      }`}
                    >
                      {isOutOfStock ? "✕" : "+"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
