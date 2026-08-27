"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt,
  Search,
  Filter,
  Calendar,
  DollarSign,
  ShoppingCart,
  QrCode,
  Banknote,
  CreditCard,
  UserCheck,
  Printer,
  RotateCcw,
  ArrowUpRight,
  Eye,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD, formatKHR } from "@/lib/utils";
import ThermalReceipt, { ReceiptData } from "@/components/print/ThermalReceipt";

export default function SalesPage() {
  const { language, exchangeRateKhr } = usePOSStore();
  const t = translations[language];

  // State
  const [sales, setSales] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundMessage, setRefundMessage] = useState("");

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (selectedStatus) params.set("status", selectedStatus);
      if (selectedPaymentMethod) params.set("paymentMethod", selectedPaymentMethod);
      if (dateRange) params.set("dateRange", dateRange);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/sales?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setSales(data.orders || data.invoices || data.sales || []);
        setStats(data.stats || null);
        setPagination(
          data.pagination || {
            totalPages: data.totalPages || 1,
            totalCount: data.total || 0,
          }
        );
      }
    } catch (err) {
      console.error("Failed to fetch sales:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [searchQuery, selectedStatus, selectedPaymentMethod, dateRange, page]);

  // Handle Refund / Void
  const handleProcessRefund = async () => {
    if (!selectedOrder) return;
    setIsProcessingRefund(true);
    setRefundMessage("");

    try {
      const res = await fetch("/api/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          action: "REFUND",
          reason: refundReason || "Customer Return",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowRefundModal(false);
        setRefundReason("");
        fetchSales();
      } else {
        setRefundMessage(data.error || "Failed to process refund");
      }
    } catch (err: any) {
      setRefundMessage(err.message || "Failed to refund");
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Convert selected order to ReceiptData
  const receiptData: ReceiptData | null = useMemo(() => {
    if (!selectedOrder) return null;
    const payment = selectedOrder.payments?.[0];
    return {
      invoiceNumber: selectedOrder.invoiceNumber,
      branchName: selectedOrder.branch?.name || "សាខាកណ្តាល ភ្នំពេញ",
      branchAddress: "Norodom Blvd, Phnom Penh",
      branchPhone: "012 888 999",
      cashierName: selectedOrder.cashier?.fullNameKh || selectedOrder.cashier?.fullName || "Staff",
      customer: selectedOrder.customer
        ? {
            id: selectedOrder.customer.id,
            name: selectedOrder.customer.name,
            phone: selectedOrder.customer.phone,
            tier: selectedOrder.customer.tier || "REGULAR",
            loyaltyPoints: Number(selectedOrder.customer.loyaltyPoints || 0),
            currentDebtUsd: Number(selectedOrder.customer.currentDebtUsd || 0),
            creditLimitUsd: Number(selectedOrder.customer.creditLimitUsd || 0),
          }
        : null,
      items: selectedOrder.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productNameKh: item.product?.nameKh || "ទំនិញ",
        productNameEn: item.product?.nameEn || "Item",
        priceUsd: Number(item.unitPriceUsd),
        quantity: item.quantity,
        discountAmount: Number(item.discountAmount || 0),
      })) || [],
      subtotalUsd: Number(selectedOrder.subtotalUsd),
      discountUsd: Number(selectedOrder.discountAmount),
      taxUsd: Number(selectedOrder.taxAmountUsd),
      totalUsd: Number(selectedOrder.totalUsd),
      totalKhr: Number(selectedOrder.totalKhr),
      exchangeRateKhr: Number(selectedOrder.exchangeRateKhr || exchangeRateKhr),
      paymentMethod: payment?.method || "CASH_USD",
      tenderedUsd: payment?.tenderedUsd ? Number(payment.tenderedUsd) : Number(selectedOrder.totalUsd),
      changeUsd: payment?.changeUsd ? Number(payment.changeUsd) : 0,
      khqrPayload: selectedOrder.khqrQrString,
    };
  }, [selectedOrder, exchangeRateKhr]);

  // Export CSV
  const handleExportCSV = () => {
    if (!sales.length) return;
    const headers = "Invoice Number,Date,Customer,Cashier,Total USD,Total KHR,Payment Method,Status\n";
    const rows = sales
      .map((s) =>
        [
          s.invoiceNumber,
          new Date(s.createdAt).toISOString().replace("T", " ").slice(0, 19),
          `"${s.customer?.name || "General Customer"}"`,
          `"${s.cashier?.fullNameKh || s.cashier?.fullName || "Staff"}"`,
          Number(s.totalUsd).toFixed(2),
          Number(s.totalKhr).toFixed(0),
          s.payments?.[0]?.method || "CASH_USD",
          s.status,
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="h-7 w-7 text-teal-700" />
            <span>{language === "km" ? "ការលក់ & ប្រវត្តិវិក្កយបត្រ" : "Sales & Invoices Management"}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {language === "km"
              ? "តាមដានរាល់ប្រតិបត្តិការលក់ វិក្កយបត្រ POS និងរបាយការណ៍ចំណូលទូទាត់ប្រាក់"
              : "Track all point of sale transactions, customer invoices, payment breakdowns & refunds"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/pos"
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-teal-900/20 hover:bg-teal-800 transition active:scale-98"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{language === "km" ? "បើកផ្ទាំង POS (F8)" : "Open POS (F8)"}</span>
          </Link>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Revenue */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-teal-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">ចំណូលសរុប (Total Revenue)</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black font-mono text-slate-900">
                {formatUSD(stats.totalRevenueUsd || 0)}
              </p>
              <p className="text-xs font-bold text-teal-700 mt-0.5">
                {formatKHR(stats.totalRevenueUsd || 0, exchangeRateKhr)}
              </p>
            </div>
          </div>

          {/* Completed Orders */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">វិក្កយបត្រជោគជ័យ (Completed)</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black font-mono text-slate-900">
                {stats.completedOrdersCount?.toLocaleString() || 0}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                ទំនិញលក់បាន: <span className="font-bold text-slate-700">{stats.totalItemsSold || 0} items</span>
              </p>
            </div>
          </div>

          {/* Average Order Value */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">ជាមធ្យមក្នុង១វិក្កយបត្រ (AOV)</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black font-mono text-slate-900">
                {formatUSD(stats.averageOrderValue || 0)}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {stats.refundedOrdersCount > 0 ? (
                  <span className="text-red-600 font-bold">{stats.refundedOrdersCount} refunded</span>
                ) : (
                  "អត្រាបង្វិលសង 0%"
                )}
              </p>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block mb-2">ទម្រង់ទូទាត់ (Payment Ratio)</span>
            <div className="space-y-1.5 text-xs font-medium">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-red-600 font-bold">
                  <QrCode className="h-3.5 w-3.5" /> KHQR ABA:
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {formatUSD(stats.paymentBreakdown?.KHQR_ABA || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <Banknote className="h-3.5 w-3.5" /> Cash ($/៛):
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {formatUSD(
                    (stats.paymentBreakdown?.CASH_USD || 0) +
                      (stats.paymentBreakdown?.CASH_KHR || 0)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-amber-700 font-bold">
                  <UserCheck className="h-3.5 w-3.5" /> ជំពាក់ (Debt):
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {formatUSD(stats.paymentBreakdown?.CUSTOMER_CREDIT || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Search */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={language === "km" ? "ស្វែងរកលេខវិក្កយបត្រ, អតិថិជន, បេឡាករ..." : "Search invoice #, customer, cashier..."}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600/10 transition"
            />
          </div>

          {/* Date Filter */}
          <div className="md:col-span-3">
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-hidden"
            >
              <option value="all">📅 គ្រប់ពេលវេលា (All Time)</option>
              <option value="today">⚡ ថ្ងៃនេះ (Today)</option>
              <option value="yesterday">⏪ ម្សិលមិញ (Yesterday)</option>
              <option value="this_week">📆 សប្តាហ៍នេះ (This Week)</option>
              <option value="this_month">📊 ខែនេះ (This Month)</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedPaymentMethod}
              onChange={(e) => {
                setSelectedPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-hidden"
            >
              <option value="">💳 គ្រប់វិធីសាស្ត្រទូទាត់ (All Payments)</option>
              <option value="KHQR_ABA">🔴 ABA KHQR</option>
              <option value="CASH_USD">💵 Cash ($)</option>
              <option value="CASH_KHR">💴 Cash (៛)</option>
              <option value="CREDIT_CARD">💳 Card</option>
              <option value="CUSTOMER_CREDIT">📝 ជំពាក់ (Debt)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-hidden"
            >
              <option value="">🏷️ គ្រប់ស្ថានភាព (All)</option>
              <option value="COMPLETED">✅ ជោគជ័យ (Completed)</option>
              <option value="REFUNDED">🔄 បង្វិលសង (Refunded)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-xs font-bold text-slate-500">កំពុងផ្ទុកទិន្នន័យវិក្កយបត្រ (Loading Sales)...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Receipt className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">មិនមានទិន្នន័យវិក្កយបត្រលក់ទេ</h3>
            <p className="text-xs text-slate-400">សូមសាកល្បងប្តូរលក្ខខណ្ឌស្វែងរក ឬបើក POS ដើម្បីធ្វើការលក់ថ្មី</p>
            <Link
              href="/pos"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>ទៅកាន់ផ្ទាំង POS</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">លេខវិក្កយបត្រ</th>
                  <th className="px-4 py-3.5">កាលបរិច្ឆេទ & ម៉ោង</th>
                  <th className="px-4 py-3.5">អតិថិជន</th>
                  <th className="px-4 py-3.5">បេឡាករ</th>
                  <th className="px-4 py-3.5">វិធីសាស្ត្រទូទាត់</th>
                  <th className="px-4 py-3.5 text-right">ទឹកប្រាក់ ($)</th>
                  <th className="px-4 py-3.5 text-right">ប្រាក់រៀល (៛)</th>
                  <th className="px-4 py-3.5 text-center">ស្ថានភាព</th>
                  <th className="px-4 py-3.5 text-center">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((order) => {
                  const payment = order.payments?.[0];
                  const isCompleted = order.status === "COMPLETED";

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition">
                      {/* Invoice Number */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowReceiptModal(true);
                          }}
                          className="font-mono font-black text-teal-800 hover:text-teal-600 hover:underline flex items-center gap-1.5"
                        >
                          <Receipt className="h-3.5 w-3.5 text-teal-600" />
                          <span>#{order.invoiceNumber}</span>
                        </button>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {order.items?.length || 0} មុខទំនិញ
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                        <p className="font-bold text-slate-800">
                          {new Date(order.createdAt).toLocaleDateString("km-KH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        {order.customer ? (
                          <div>
                            <p className="font-bold text-slate-800">{order.customer.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{order.customer.phone}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold italic">អតិថិជនទូទៅ</span>
                        )}
                      </td>

                      {/* Cashier */}
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {order.cashier?.fullNameKh || order.cashier?.fullName || "Staff"}
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3">
                        {payment?.method === "KHQR_ABA" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-black text-red-700">
                            <QrCode className="h-3 w-3" /> ABA KHQR
                          </span>
                        )}
                        {payment?.method === "CASH_USD" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <Banknote className="h-3 w-3" /> Cash ($)
                          </span>
                        )}
                        {payment?.method === "CASH_KHR" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <Banknote className="h-3 w-3" /> Cash (៛)
                          </span>
                        )}
                        {payment?.method === "CREDIT_CARD" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            <CreditCard className="h-3 w-3" /> Card
                          </span>
                        )}
                        {payment?.method === "CUSTOMER_CREDIT" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <UserCheck className="h-3 w-3" /> ជំពាក់ (Debt)
                          </span>
                        )}
                      </td>

                      {/* Total USD */}
                      <td className="px-4 py-3 text-right font-black font-mono text-sm text-slate-900">
                        {formatUSD(Number(order.totalUsd))}
                      </td>

                      {/* Total KHR */}
                      <td className="px-4 py-3 text-right font-bold text-teal-800 text-xs whitespace-nowrap">
                        {Number(order.totalKhr || 0).toLocaleString()} ៛
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-extrabold">
                            <CheckCircle2 className="h-3 w-3" /> ជោគជ័យ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-[10px] font-extrabold">
                            <RotateCcw className="h-3 w-3" /> បង្វិលសង
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowReceiptModal(true);
                            }}
                            title="មើល & បោះពុម្ពវិក្កយបត្រ (Print)"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          {isCompleted && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowRefundModal(true);
                              }}
                              title="បង្វិលសងប្រាក់ (Refund)"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              បង្ហាញទំព័រ <span className="font-bold text-slate-800">{page}</span> នៃ{" "}
              <span className="font-bold text-slate-800">{pagination.totalPages}</span> ({pagination.totalCount} វិក្កយបត្រ)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECEIPT / PRINT MODAL */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/70">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-teal-700" />
                វិក្កយបត្រ #{receiptData.invoiceNumber}
              </h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="p-4 max-h-[70vh] overflow-y-auto bg-slate-100/50">
              <ThermalReceipt data={receiptData} />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-white">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                បិទ (Close)
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-800 transition"
              >
                <Printer className="h-4 w-4" />
                បោះពុម្ព (Print 80mm)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <RotateCcw className="h-5 w-5" />
                <span>បង្វិលសងវិក្កយបត្រ (Refund Order)</span>
              </div>
              <button
                onClick={() => setShowRefundModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              តើអ្នកពិតជាចង់បង្វិលសងវិក្កយបត្រ <strong className="text-slate-900 font-mono">#{selectedOrder.invoiceNumber}</strong> ចំនួនទឹកប្រាក់ <strong className="text-red-600 font-mono">{formatUSD(Number(selectedOrder.totalUsd))}</strong> ត្រឡប់ទៅអតិថិជនវិញមែនទេ?
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                មូលហេតុបង្វិលសង (Reason)
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="ឧ. អតិថិជនប្តូរចិត្ត / ផលិតផលមានបញ្ហា..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500/10"
              />
            </div>

            {refundMessage && (
              <p className="text-xs text-red-600 font-bold">{refundMessage}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={isProcessingRefund}
                onClick={() => setShowRefundModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                បោះបង់
              </button>
              <button
                disabled={isProcessingRefund}
                onClick={handleProcessRefund}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition"
              >
                {isProcessingRefund ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                <span>បញ្ជាក់ការបង្វិលសង</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
