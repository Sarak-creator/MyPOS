"use client";

import React, { useState } from "react";
import {
  Smartphone,
  Cpu,
  Wrench,
  Sparkles,
  Package,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Tag,
  Barcode as BarcodeIcon,
} from "lucide-react";
import { ProductCardProps, ProductItem } from "@/types/product";
import { formatUSD, formatKHR } from "@/lib/utils";
import { playCardClickSound, triggerHapticFeedback } from "@/lib/scannerAudio";

// Helper to pick category icon fallback
function CategoryFallbackIcon({
  slug,
  className = "h-7 w-7 text-slate-400",
}: {
  slug?: string;
  className?: string;
}) {
  switch (slug) {
    case "smartphones":
      return <Smartphone className={className} />;
    case "spare-parts":
      return <Cpu className={className} />;
    case "repair-services":
      return <Wrench className={className} />;
    case "accessories":
      return <Sparkles className={className} />;
    default:
      return <Package className={className} />;
  }
}

export default function ProductCard({
  product,
  layout = "classic",
  onSelect,
  onQuantityChange,
  cartQuantity = 0,
  exchangeRateKhr = 4100,
  language = "km",
  config = {},
  className = "",
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const isService = product.type === "SERVICE_LABOR";
  const stock = product.stockQty ?? product.stockQuantity ?? 0;
  const isOutOfStock = !isService && stock <= 0;
  const isLowStock = !isService && stock > 0 && stock <= (product.alertStock || 5);
  const isInCart = cartQuantity > 0;
  const isMaxInCart = !isService && !isOutOfStock && cartQuantity >= stock;

  const showImages = config.showImages ?? true;
  const showBarcode = config.showBarcode ?? true;
  const showDualPrice = config.showDualPrice ?? true;
  const enableHaptic = config.enableHapticFeedback ?? true;
  const enableSound = config.enableClickSound ?? true;

  const displayName =
    language === "km" ? product.nameKh || product.name || product.nameEn : product.nameEn || product.name || product.nameKh;
  const subName = language === "km" ? product.nameEn : product.nameKh;

  const triggerFeedback = () => {
    if (enableSound) playCardClickSound();
    if (enableHaptic) triggerHapticFeedback(12);
  };

  const handleCardClick = () => {
    if (isOutOfStock) return;
    triggerFeedback();
    onSelect(product);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock || isMaxInCart) return;
    triggerFeedback();
    if (onQuantityChange) {
      onQuantityChange(product, cartQuantity + 1);
    } else {
      onSelect(product);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cartQuantity <= 0) return;
    triggerFeedback();
    if (onQuantityChange) {
      onQuantityChange(product, cartQuantity - 1);
    }
  };

  // =========================================================================
  // 1. COMPACT TOUCH TILE (No image, ultra-fast click, large touch target)
  // =========================================================================
  if (layout === "compact") {
    return (
      <article
        onClick={handleCardClick}
        aria-label={`${displayName} - ${formatUSD(product.priceUsd)}`}
        className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition select-none cursor-pointer min-h-[96px] active:scale-[0.98] ${
          isOutOfStock
            ? "border-rose-200 bg-rose-50/30 opacity-60 cursor-not-allowed"
            : isMaxInCart
            ? "border-amber-300 bg-amber-50/20 hover:border-amber-400"
            : isInCart
            ? "border-teal-500 bg-teal-50/20 shadow-xs hover:border-teal-600"
            : "border-slate-200 bg-white hover:border-teal-400 hover:shadow-md"
        } ${className}`}
      >
        <div>
          {/* Header Barcode & Stock */}
          <div className="flex items-center justify-between gap-1 mb-1">
            {showBarcode ? (
              <span className="text-[10px] font-bold font-mono text-slate-400 truncate max-w-[65%]">
                {product.barcode || product.sku}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {product.categorySlug || "POS"}
              </span>
            )}
            <span
              className={`rounded px-1.5 py-0.2 text-[9px] font-extrabold shrink-0 ${
                isService
                  ? "bg-purple-100 text-purple-700"
                  : isOutOfStock
                  ? "bg-rose-100 text-rose-700"
                  : isLowStock
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {isService ? "សេវាកម្ម" : isOutOfStock ? "អស់ (0)" : `សល់: ${stock}`}
            </span>
          </div>

          {/* Product Name */}
          <h4
            title={displayName}
            className={`text-xs sm:text-[13px] font-black leading-snug line-clamp-2 transition ${
              isOutOfStock
                ? "text-slate-400 line-through"
                : "text-slate-800 group-hover:text-teal-700"
            }`}
          >
            {displayName}
          </h4>

          {/* In-cart pill */}
          {isInCart && (
            <div className="mt-1 flex items-center gap-1">
              <span className="inline-flex items-center gap-0.5 rounded-md bg-teal-600 px-1.5 py-0.2 text-[9px] font-black text-white">
                <Check className="h-2.5 w-2.5" /> ក្នុងកន្ត្រក: {cartQuantity}
              </span>
            </div>
          )}
        </div>

        {/* Price & Quick Tap Target */}
        <div className="mt-2 flex items-baseline justify-between border-t border-slate-100 pt-1.5">
          <div>
            <p
              className={`text-sm sm:text-base font-black font-mono leading-none ${
                isOutOfStock ? "text-slate-400" : "text-teal-800"
              }`}
            >
              {formatUSD(product.priceUsd)}
            </p>
            {showDualPrice && (
              <p className="text-[10px] text-slate-400 font-sans mt-0.5 leading-none">
                {formatKHR(product.priceUsd, exchangeRateKhr)}
              </p>
            )}
          </div>

          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition shrink-0 ${
              isOutOfStock
                ? "bg-slate-100 text-slate-300"
                : isInCart
                ? "bg-teal-700 text-white"
                : "bg-teal-50 text-teal-700 group-hover:bg-teal-700 group-hover:text-white"
            }`}
          >
            {isOutOfStock ? "✕" : isInCart ? `+${cartQuantity}` : "+"}
          </div>
        </div>
      </article>
    );
  }

  // =========================================================================
  // 2. DENSE HORIZONTAL ROW LIST (Inline +/- counters, small thumbnail)
  // =========================================================================
  if (layout === "list") {
    return (
      <article
        onClick={handleCardClick}
        aria-label={`${displayName} - ${formatUSD(product.priceUsd)}`}
        className={`group relative flex items-center justify-between gap-3 rounded-xl border p-2.5 sm:p-3 text-left transition select-none cursor-pointer active:bg-slate-50 ${
          isOutOfStock
            ? "border-rose-200 bg-rose-50/30 opacity-60 cursor-not-allowed"
            : isInCart
            ? "border-teal-400 bg-teal-50/20"
            : "border-slate-200 bg-white hover:border-teal-400 hover:shadow-xs"
        } ${className}`}
      >
        {/* Left: Thumbnail & Name Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showImages && (
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80 flex items-center justify-center">
              {product.imageUrl && !imageError ? (
                <img
                  src={product.imageUrl}
                  alt={displayName}
                  className="h-full w-full object-cover object-center"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              ) : (
                <CategoryFallbackIcon slug={product.categorySlug} className="h-6 w-6 text-slate-400" />
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              {showBarcode && (
                <span className="text-[10px] font-bold font-mono text-slate-400 truncate max-w-[120px]">
                  {product.barcode || product.sku}
                </span>
              )}
              <span
                className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                  isService
                    ? "bg-purple-100 text-purple-700"
                    : isOutOfStock
                    ? "bg-rose-100 text-rose-700"
                    : isLowStock
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isService ? "សេវាកម្ម" : isOutOfStock ? "អស់ពីស្តុក" : `ស្តុក: ${stock}`}
              </span>
            </div>

            <h4
              title={displayName}
              className={`text-xs sm:text-sm font-bold truncate transition ${
                isOutOfStock ? "text-slate-400 line-through" : "text-slate-800 group-hover:text-teal-700"
              }`}
            >
              {displayName}
            </h4>

            {subName && (
              <p className="text-[10px] text-slate-400 truncate hidden sm:block">{subName}</p>
            )}
          </div>
        </div>

        {/* Right: Price & Inline Quantity Steppers */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p
              className={`text-xs sm:text-sm font-black font-mono leading-tight ${
                isOutOfStock ? "text-slate-400" : "text-teal-800"
              }`}
            >
              {formatUSD(product.priceUsd)}
            </p>
            {showDualPrice && (
              <p className="text-[10px] text-slate-400 font-sans leading-tight">
                {formatKHR(product.priceUsd, exchangeRateKhr)}
              </p>
            )}
          </div>

          {/* Stepper Buttons (Increment / Decrement) */}
          {isInCart ? (
            <div
              className="flex items-center rounded-lg border border-teal-300 bg-white shadow-2xs overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleDecrement}
                className="h-8 w-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition"
                title="បន្ថយ"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-7 text-center font-mono text-xs font-black text-teal-800">
                {cartQuantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={isMaxInCart}
                className="h-8 w-8 flex items-center justify-center text-teal-700 hover:bg-teal-50 active:scale-95 disabled:opacity-40 transition"
                title="បន្ថែម"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCardClick}
              disabled={isOutOfStock}
              className={`flex h-8 px-3 items-center gap-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                isOutOfStock
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-teal-700 text-white hover:bg-teal-800 shadow-2xs"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">បន្ថែម</span>
            </button>
          )}
        </div>
      </article>
    );
  }

  // =========================================================================
  // 3. VISUAL 1:1 SHOWCASE (Aspect-Square image, floating badges, zoom effect)
  // =========================================================================
  if (layout === "visual") {
    return (
      <article
        onClick={handleCardClick}
        aria-label={`${displayName} - ${formatUSD(product.priceUsd)}`}
        className={`group relative flex flex-col justify-between rounded-2xl border overflow-hidden text-left transition select-none cursor-pointer active:scale-[0.98] ${
          isOutOfStock
            ? "border-rose-200 bg-rose-50/20 opacity-70 cursor-not-allowed"
            : isMaxInCart
            ? "border-amber-300 bg-white"
            : isInCart
            ? "border-teal-500 bg-white shadow-md"
            : "border-slate-200 bg-white hover:border-teal-500 hover:shadow-lg"
        } ${className}`}
      >
        {/* 1:1 Aspect Ratio Image Container */}
        <div className="relative w-full aspect-square bg-slate-100 overflow-hidden">
          {product.imageUrl && !imageError ? (
            <img
              src={product.imageUrl}
              alt={displayName}
              className="h-full w-full object-cover object-center group-hover:scale-108 transition-transform duration-500 ease-out"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
              <CategoryFallbackIcon slug={product.categorySlug} className="h-12 w-12 text-slate-400/60" />
            </div>
          )}

          {/* Floating Stock Badge */}
          <div className="absolute top-2 left-2 z-10">
            <span
              className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold backdrop-blur-md shadow-xs ${
                isService
                  ? "bg-purple-900/80 text-purple-100"
                  : isOutOfStock
                  ? "bg-rose-600/90 text-white"
                  : isLowStock
                  ? "bg-amber-500/90 text-white"
                  : "bg-emerald-600/90 text-white"
              }`}
            >
              {isService ? "សេវាកម្ម" : isOutOfStock ? "អស់ពីស្តុក" : `សល់: ${stock}`}
            </span>
          </div>

          {/* Floating In-Cart Badge or Discount Pill */}
          {isInCart && (
            <div className="absolute top-2 right-2 z-10 animate-in zoom-in-75 duration-200">
              <span className="flex h-6 items-center gap-1 rounded-full bg-teal-800 px-2 text-[10px] font-black text-white shadow-md border border-teal-400/30">
                <Check className="h-3 w-3" /> {cartQuantity}
              </span>
            </div>
          )}

          {/* Gradient Overlay for bottom contrast */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900/25 to-transparent pointer-events-none" />
        </div>

        {/* Card Content Details */}
        <div className="p-3 flex flex-col justify-between flex-1">
          <div>
            {showBarcode && (
              <p className="text-[10px] font-bold font-mono text-slate-400 truncate mb-0.5">
                {product.barcode || product.sku}
              </p>
            )}
            <h4
              title={displayName}
              className={`text-xs sm:text-[13px] font-black line-clamp-2 leading-snug transition ${
                isOutOfStock ? "text-slate-400 line-through" : "text-slate-800 group-hover:text-teal-700"
              }`}
            >
              {displayName}
            </h4>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between border-t border-slate-100 pt-2">
            <div>
              <p
                className={`text-sm sm:text-base font-black font-mono ${
                  isOutOfStock ? "text-slate-400" : "text-teal-800"
                }`}
              >
                {formatUSD(product.priceUsd)}
              </p>
              {showDualPrice && (
                <p className="text-[10px] text-slate-400 font-sans">
                  {formatKHR(product.priceUsd, exchangeRateKhr)}
                </p>
              )}
            </div>

            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold transition shadow-2xs ${
                isOutOfStock
                  ? "bg-slate-100 text-slate-300"
                  : isInCart
                  ? "bg-teal-700 text-white"
                  : "bg-teal-50 text-teal-700 group-hover:bg-teal-700 group-hover:text-white"
              }`}
            >
              {isOutOfStock ? "✕" : "+"}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // =========================================================================
  // 4. CLASSIC GRID CARD (Balanced standard POS layout)
  // =========================================================================
  return (
    <article
      onClick={handleCardClick}
      aria-label={`${displayName} - ${formatUSD(product.priceUsd)}`}
      className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left shadow-xs transition select-none cursor-pointer active:scale-[0.98] ${
        isOutOfStock
          ? "border-rose-200 bg-rose-50/30 opacity-70 cursor-not-allowed"
          : isMaxInCart
          ? "border-amber-300 bg-amber-50/20 hover:border-amber-400"
          : isInCart
          ? "border-teal-500 bg-white shadow-xs hover:border-teal-600"
          : "border-slate-200 bg-white hover:border-teal-500 hover:shadow-md"
      } ${className}`}
    >
      <div>
        {/* Product Image Thumbnail */}
        {showImages && (
          <div className="relative mb-2.5 w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
            {product.imageUrl && !imageError ? (
              <img
                src={product.imageUrl}
                alt={displayName}
                className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <CategoryFallbackIcon slug={product.categorySlug} className="h-9 w-9 text-slate-400/50" />
              </div>
            )}
          </div>
        )}

        {/* Barcode & Stock Status Row */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          {showBarcode ? (
            <span className="text-[10px] font-bold font-mono text-slate-400 truncate max-w-[65%]">
              {product.barcode || product.sku}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 uppercase truncate">
              {product.categorySlug || "POS"}
            </span>
          )}
          <span
            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${
              isService
                ? "bg-purple-50 text-purple-700"
                : isOutOfStock
                ? "bg-rose-100 text-rose-700 font-extrabold"
                : isLowStock
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isService ? "សេវាកម្ម" : isOutOfStock ? "អស់ពីស្តុក (0)" : `ស្តុក: ${stock}`}
          </span>
        </div>

        {/* Product Name (line-clamp-2) */}
        <h4
          title={displayName}
          className={`text-xs font-bold line-clamp-2 leading-snug transition ${
            isOutOfStock ? "text-slate-400 line-through" : "text-slate-800 group-hover:text-teal-700"
          }`}
        >
          {displayName}
        </h4>

        {/* In Cart Indicator */}
        {isInCart && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-teal-100 px-1.5 py-0.2 text-[9px] font-extrabold text-teal-800">
            <Check className="h-2.5 w-2.5" /> ក្នុងកន្ត្រក: {cartQuantity}
          </span>
        )}
      </div>

      {/* Card Footer: Price & Quick Action */}
      <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-2">
        <div>
          <p
            className={`text-sm font-black font-mono ${
              isOutOfStock ? "text-slate-400" : "text-teal-800"
            }`}
          >
            {formatUSD(product.priceUsd)}
          </p>
          {showDualPrice && (
            <p className="text-[10px] text-slate-400 font-sans">
              {formatKHR(product.priceUsd, exchangeRateKhr)}
            </p>
          )}
        </div>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${
            isOutOfStock
              ? "bg-slate-100 text-slate-400"
              : isInCart
              ? "bg-teal-700 text-white"
              : "bg-teal-50 text-teal-700 group-hover:bg-teal-700 group-hover:text-white"
          }`}
        >
          {isOutOfStock ? "✕" : "+"}
        </div>
      </div>
    </article>
  );
}
