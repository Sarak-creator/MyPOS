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
 * - If exchangeRate is provided, converts USD amount to KHR (amount * exchangeRate) and formats.
 * - If exchangeRate is NOT provided (or undefined), treats amount as already in KHR and formats directly.
 */
export function formatKHR(amount: number | string | undefined, exchangeRate?: number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount || 0;
  const khr = Math.round(exchangeRate !== undefined ? num * exchangeRate : num);
  return `${new Intl.NumberFormat("km-KH").format(khr)} ៛`;
}

/**
 * Explicit helper to format a value that is already in Cambodian Riel (KHR)
 */
export function formatRiel(amount: number | string | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount || 0;
  return `${new Intl.NumberFormat("km-KH").format(Math.round(num))} ៛`;
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
