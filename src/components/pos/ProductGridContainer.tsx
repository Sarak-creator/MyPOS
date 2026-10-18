"use client";

import React from "react";
import { CardLayoutType } from "@/types/product";

interface ProductGridContainerProps {
  layout: CardLayoutType;
  itemsPerRow?: "auto" | 2 | 3 | 4 | 5 | 6 | 8;
  className?: string;
  children: React.ReactNode;
}

export default function ProductGridContainer({
  layout,
  itemsPerRow = "auto",
  className = "",
  children,
}: ProductGridContainerProps) {
  // If user selected explicit fixed columns
  if (itemsPerRow !== "auto" && layout !== "list") {
    const fixedGridMap: Record<number, string> = {
      2: "grid grid-cols-2 gap-3",
      3: "grid grid-cols-2 sm:grid-cols-3 gap-3",
      4: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3",
      5: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3",
      6: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5",
      8: "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2",
    };
    return (
      <div className={`${fixedGridMap[itemsPerRow] || "grid grid-cols-3 gap-3"} ${className}`}>
        {children}
      </div>
    );
  }

  // Automatic responsive grid based on active layout mode
  switch (layout) {
    case "compact":
      return (
        <div
          className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 min-[1440px]:grid-cols-6 min-[1680px]:grid-cols-7 min-[1920px]:grid-cols-8 min-[2200px]:grid-cols-9 ${className}`}
        >
          {children}
        </div>
      );

    case "list":
      return (
        <div className={`flex flex-col gap-2 pb-4 ${className}`}>
          {children}
        </div>
      );

    case "visual":
      return (
        <div
          className={`grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 min-[1440px]:grid-cols-5 min-[1680px]:grid-cols-6 ${className}`}
        >
          {children}
        </div>
      );

    case "classic":
    default:
      return (
        <div
          className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 min-[1440px]:grid-cols-5 min-[1680px]:grid-cols-6 min-[1920px]:grid-cols-7 min-[2200px]:grid-cols-8 min-[2560px]:grid-cols-9 min-[2880px]:grid-cols-10 ${className}`}
        >
          {children}
        </div>
      );
  }
}
