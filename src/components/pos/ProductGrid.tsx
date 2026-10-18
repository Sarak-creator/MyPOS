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
  Package,
  Image as ImageIcon,
  Camera,
  CheckCircle2,
  LayoutGrid,
  SquareMenu,
  Rows3,
  Sliders,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD, formatKHR } from "@/lib/utils";
import BarcodeScannerModal from "@/components/pos/BarcodeScannerModal";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { playScanErrorBeep } from "@/lib/scannerAudio";
import { subscribeToStockSync, StockSyncEvent } from "@/lib/stockSync";
import ProductCard from "@/components/pos/ProductCard";
import ProductGridContainer from "@/components/pos/ProductGridContainer";
import { usePOSSettings } from "@/context/POSSettingsContext";
import { CardLayoutType, ProductItem } from "@/types/product";

export type { ProductItem };

export interface ProductGridProps {
  onOpenPayment?: () => void;
  onOpenMobileCart?: () => void;
}

export default function ProductGrid({ onOpenPayment, onOpenMobileCart }: ProductGridProps = {}) {
  const {
    language,
    addItem,
    updateQuantity,
    items,
    exchangeRateKhr,
    scannerMode,
    scannerAutoAddToCart,
    scannerSoundFeedback,
  } = usePOSStore();
  const { config, setLayout, setIsSelectorOpen } = usePOSSettings();
  const t = translations[language];

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchLiveProducts = async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
      }
      const res = await fetch(`/api/products?_t=${Date.now()}`, { cache: "no-store" });
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
          imageUrl: p.imageUrl || "",
          imeiList: p.imeiList || [],
        }));
        setProducts(mapped);
      }
    } catch (err) {
      console.error("Failed to load POS products:", err);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchLiveProducts(false);

    // 1. Subscribe to real-time stock sync events (Sales, ReStock, Adjustments, Voids, Transfers)
    const unsubscribe = subscribeToStockSync((event: StockSyncEvent) => {
      // Optimistically decrement local stock immediately on sale
      if (event.type === "SALE" && event.quantities) {
        setProducts((prev) =>
          prev.map((p) => {
            const deducted = event.quantities?.[p.id] || (p.productId ? event.quantities?.[p.productId] : 0);
            if (deducted && deducted > 0) {
              return {
                ...p,
                stockQty: Math.max(0, p.stockQty - deducted),
              };
            }
            return p;
          })
        );
      }

      // Optimistically increment local stock immediately on ReStock or Refund
      if ((event.type === "RESTOCK" || event.type === "REFUND") && event.quantities) {
        setProducts((prev) =>
          prev.map((p) => {
            const added = event.quantities?.[p.id] || (p.productId ? event.quantities?.[p.productId] : 0);
            if (added && added > 0) {
              return {
                ...p,
                stockQty: p.stockQty + added,
              };
            }
            return p;
          })
        );
      }

      // Re-fetch live products from server in silent background mode (zero spinner, zero flicker)
      fetchLiveProducts(true);
    });

    // 2. Re-sync silently whenever the user focuses the POS tab/window
    const handleFocus = () => {
      fetchLiveProducts(true);
    };
    window.addEventListener("focus", handleFocus);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchLiveProducts(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. Background pulse poll every 8 seconds for multi-device/multi-cashier real-time sync (silent mode)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchLiveProducts(true);
      }
    }, 8000);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
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
      (p.nameEn ? p.nameEn.toLowerCase().includes(query) : false) ||
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
    } else if (searchQuery.trim()) {
      handleBarcodeScanned(searchQuery.trim());
    }
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;

    // Search matching product by exact barcode, SKU, or serial/IMEI
    const match = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === code.toLowerCase()) ||
        (p.imeiList && p.imeiList.some((imei) => imei.toLowerCase() === code.toLowerCase()))
    );

    if (match) {
      if (scannerAutoAddToCart) {
        handleSelectProduct(match);
        setSearchQuery("");
        setLastScannedId(match.id);
        const name = language === "km" ? match.nameKh : match.nameEn;
        const msg = `✓ បានស្កេន "${name}" (${formatUSD(match.priceUsd)}) ទម្លាក់ចូលកន្ត្រក!`;
        setSuccessToast(msg);
        setScanFeedback({ type: "success", message: msg });
        setTimeout(() => setSuccessToast(null), 3000);
        setTimeout(() => setScanFeedback(null), 3500);
      } else {
        setSearchQuery(match.barcode || match.sku || code);
      }
    } else {
      if (scannerSoundFeedback) {
        playScanErrorBeep();
      }
      setSearchQuery(code);
      const errMsg = `⚠️ រកមិនឃើញទំនិញដែលមានបាកូដ / QR: "${code}" ទេ!`;
      showWarning(errMsg);
      setScanFeedback({ type: "error", message: errMsg });
      setTimeout(() => setScanFeedback(null), 3500);
    }
  };

  // Hardware Barcode Scanner Gun Listener (USB / Bluetooth HID)
  useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: true,
  });

  // Hotkeys: F2 (Focus Search), F3 (Toggle Camera Scanner)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "F3" && (scannerMode === "CAMERA_DEVICE" || scannerMode === "BOTH")) {
        e.preventDefault();
        setIsCameraOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scannerMode]);

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
      productId: p.productId || p.id,
      nameKh: p.nameKh,
      nameEn: p.nameEn || p.nameKh,
      sku: p.sku,
      barcode: p.barcode,
      priceUsd: p.priceUsd,
      costPriceUsd: p.costPriceUsd || 0,
      type: p.type || "STANDARD_ITEM",
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

      {/* Success Scan Toast Alert */}
      {successToast && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-600 text-white px-3.5 py-2 text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-xs text-white/80 hover:text-white px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Barcode / Camera Bar */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
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

        {/* Camera Scanner Trigger (If CAMERA_DEVICE or BOTH) */}
        {(scannerMode === "CAMERA_DEVICE" || scannerMode === "BOTH") && (
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white px-3 sm:px-3.5 py-2.5 text-xs font-bold shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
            title="បើកកាមេរ៉ាស្កេនបាកូដ / QR Code (F3)"
          >
            <Camera className="h-4 w-4 text-teal-200" />
            <span className="hidden sm:inline">ស្កេនកាមេរ៉ា</span>
            <span className="hidden md:inline text-[9px] bg-teal-800 text-teal-200 px-1 py-0.5 rounded font-mono">
              F3
            </span>
          </button>
        )}
      </div>

      {/* Category Tabs & Layout Mode Switcher Toolbar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex gap-2 shrink-0">
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

        {/* Runtime Layout Quick-Switch Buttons & Style Config Modal Trigger */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => setLayout("classic")}
            title="កាតបុរាណ (Classic Grid)"
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition ${
              config.layout === "classic"
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden xl:inline text-[11px]">Classic</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout("compact")}
            title="ក្រឡាតូចរហ័ស (Compact Touch Tile)"
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition ${
              config.layout === "compact"
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <SquareMenu className="h-3.5 w-3.5" />
            <span className="hidden xl:inline text-[11px]">Compact</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout("list")}
            title="តារាងជួរដេក (Dense Row List)"
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition ${
              config.layout === "list"
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Rows3 className="h-3.5 w-3.5" />
            <span className="hidden xl:inline text-[11px]">List</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout("visual")}
            title="រូបភាពច្បាស់ (Visual 1:1 Showcase)"
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition ${
              config.layout === "visual"
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="hidden xl:inline text-[11px]">Visual</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />

          <button
            type="button"
            onClick={() => setIsSelectorOpen(true)}
            title="ការកំណត់រចនាបទកាត (Card Settings)"
            className="flex items-center gap-1 rounded-lg p-1 text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition"
          >
            <Sliders className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Products Catalog Container */}
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
          <ProductGridContainer layout={config.layout} itemsPerRow={config.itemsPerRow}>
            {filteredProducts.map((p) => {
              const cartItem = items.find((i) => i.id === p.id);
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  layout={config.layout}
                  cartQuantity={cartItem?.quantity || 0}
                  exchangeRateKhr={exchangeRateKhr}
                  language={language}
                  config={config}
                  onSelect={handleSelectProduct}
                  onQuantityChange={(prod, newQty) => {
                    const currentQty = cartItem?.quantity || 0;
                    if (newQty <= 0) {
                      if (currentQty > 0) {
                        updateQuantity(prod.id, -currentQty);
                      }
                    } else if (newQty > currentQty) {
                      if (currentQty === 0) {
                        handleSelectProduct(prod);
                      } else {
                        updateQuantity(prod.id, newQty - currentQty);
                      }
                    } else {
                      updateQuantity(prod.id, newQty - currentQty);
                    }
                  }}
                />
              );
            })}
          </ProductGridContainer>
        )}
      </div>

      {/* Barcode & QR Code Camera Scanner Modal with Popup Cart */}
      <BarcodeScannerModal
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setScanFeedback(null);
        }}
        onScan={handleBarcodeScanned}
        title="ស្កេនបាកូដ & QR Code (POS Camera Scanner)"
        showCart={true}
        onOpenPayment={onOpenPayment}
        lastScannedItemId={lastScannedId}
        scanFeedback={scanFeedback}
      />
    </div>
  );
}
