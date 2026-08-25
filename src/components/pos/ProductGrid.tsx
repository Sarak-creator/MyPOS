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
  const { language, addItem, exchangeRateKhr } = usePOSStore();
  const t = translations[language];

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
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
          stockQty: p.stockQty || 0,
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
    { slug: "ALL", labelKh: "ទាំងអស់", labelEn: "All Items", icon: Layers },
    { slug: "smartphones", labelKh: "ទូរស័ព្ទដៃ", labelEn: "Smartphones", icon: Smartphone },
    { slug: "spare-parts", labelKh: "គ្រឿងបន្លាស់", labelEn: "Spare Parts", icon: Cpu },
    { slug: "repair-services", labelKh: "សេវាកម្មជាង", labelEn: "Services", icon: Wrench },
    { slug: "accessories", labelKh: "គ្រឿងបន្ថែម", labelEn: "Accessories", icon: Sparkles },
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

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredProducts.length === 1) {
      handleSelectProduct(filteredProducts[0]);
      setSearchQuery("");
    }
  };

  const handleSelectProduct = (p: ProductItem) => {
    const selectedImei =
      p.type === "SERIAL_IMEI_ITEM" && p.imeiList && p.imeiList.length > 0
        ? p.imeiList[0]
        : p.type === "SERIAL_IMEI_ITEM"
        ? `358${Math.floor(100000000000 + Math.random() * 900000000000)}`
        : undefined;

    addItem({
      id: p.id,
      productId: p.productId,
      nameKh: p.nameKh,
      nameEn: p.nameEn,
      sku: p.sku,
      barcode: p.barcode,
      priceUsd: p.priceUsd,
      costPriceUsd: p.costPriceUsd,
      type: p.type,
      selectedImei,
    });
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Search & Barcode Scanner Input */}
      <form onSubmit={handleBarcodeSubmit} className="relative">
        <div className="relative flex items-center">
          <ScanBarcode className="absolute left-3.5 h-5 w-5 text-teal-700" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.barcodeOrSearch}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-20 text-sm font-medium text-slate-800 placeholder-slate-400 shadow-xs focus:border-teal-600 focus:outline-hidden focus:ring-2 focus:ring-teal-600/20"
          />
          <span className="absolute right-3 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
            F2
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
              <span>{language === "km" ? cat.labelKh : cat.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
            <span className="text-xs font-semibold">កំពុងទាញទំនិញ...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <p className="text-xs font-bold text-slate-600">រកមិនឃើញទំនិញទេ</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectProduct(p)}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-xs transition hover:border-teal-500 hover:shadow-md active:scale-[0.98]"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-bold font-mono text-slate-400 truncate">
                      {p.sku}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                        p.stockQty > 5
                          ? "bg-emerald-50 text-emerald-700"
                          : p.stockQty > 0
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {p.type === "SERVICE_LABOR" ? "សេវា" : `ស្តុក: ${p.stockQty}`}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-teal-700 transition">
                    {language === "km" ? p.nameKh : p.nameEn}
                  </h4>
                </div>

                <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-2">
                  <div>
                    <p className="text-sm font-black font-mono text-teal-800">
                      {formatUSD(p.priceUsd)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-sans">
                      {formatKHR(p.priceUsd, exchangeRateKhr)}
                    </p>
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-700 group-hover:text-white transition">
                    +
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
