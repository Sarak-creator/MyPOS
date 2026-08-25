import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amounts into standard USD ($)
 */
export function formatUSD(amount: number | string | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format amounts into standard Cambodian Riel (៛ KHR)
 */
export function formatKHR(amount: number | string | undefined, exchangeRate: number = 4100): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount || 0;
  const khr = Math.round(num * exchangeRate);
  return `${new Intl.NumberFormat("km-KH").format(khr)} ៛`;
}

/**
 * Generate unique Invoice Number e.g. "INV-202608-4982"
 */
export function generateInvoiceNumber(prefix: string = "INV"): string {
  const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomSuffix}`;
}

/**
 * Format timestamp in localized format
 */
export function formatDateTime(date: Date | string | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
