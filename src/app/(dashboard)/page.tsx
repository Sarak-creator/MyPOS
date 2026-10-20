"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Wrench,
  Package,
  AlertTriangle,
  Users,
  CreditCard,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  QrCode,
  RefreshCw,
  Loader2,
  Plus,
  FileText,
  Wallet,
  ChevronRight,
  Clock,
  BadgePercent,
  CheckCircle2,
  Layers,
  Percent,
  TrendingDown,
  Calendar,
  Banknote,
  Receipt,
  Boxes,
  Truck,
  ExternalLink,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD, formatKHR } from "@/lib/utils";

type PeriodType = "today" | "yesterday" | "7days" | "this_month";

export default function DashboardPage() {
  const { language, currentBranchName, exchangeRateKhr, currentUser } = usePOSStore();
  const t = translations[language];

  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("today");
  const [currentTime, setCurrentTime] = useState<string>("");

  const [statsData, setStatsData] = useState({
    todaySalesUsd: 0,
    todaySalesKhr: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    periodExpensesUsd: 0,
    costOfGoodsUsd: 0,
    estimatedNetProfitUsd: 0,
    activeRepairsCount: 0,
    totalProductsCount: 0,
    lowStockCount: 0,
    totalInventoryValueUsd: 0,
    totalCustomerDebtUsd: 0,
    debtCustomerCount: 0,
    activeInstallmentsCount: 0,
    totalInstallmentPrincipalUsd: 0,
    activePawnCount: 0,
    totalPawnLoanUsd: 0,
    paymentBreakdown: {
      KHQR_ABA: 0,
      CASH_USD: 0,
      CASH_KHR: 0,
      CUSTOMER_CREDIT: 0,
      CREDIT_CARD: 0,
    } as Record<string, number>,
    last7DaysSales: [] as Array<{ date: string; dayName: string; salesUsd: number; count: number }>,
    topSellingProducts: [] as Array<{
      nameKh: string;
      nameEn: string;
      sku: string;
      qty: number;
      revenue: number;
      imageUrl?: string | null;
    }>,
    lowStockItems: [] as Array<{
      id: string;
      nameKh: string;
      nameEn: string;
      sku: string;
      stockQty: number;
      minStock: number;
      unit: string;
      isOutOfStock: boolean;
    }>,
    readyRepairs: [] as Array<{
      id: string;
      ticketNumber: string;
      customerName: string;
      customerPhone?: string;
      deviceModel: string;
      customerProblem: string;
      amountUsd: number;
      status: string;
    }>,
    recentOrders: [] as Array<{
      id: string;
      invoiceNumber: string;
      customerName: string;
      totalUsd: number;
      status: string;
      paymentMethod: string;
      createdAt: string;
    }>,
  });

  // Live Clock Updater
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("km-KH", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }) +
          " • " +
          now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Dashboard Stats
  const fetchDashboardStats = async (period: PeriodType = selectedPeriod) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/stats?period=${period}`);
      const data = await res.json();
      if (data.success && data.stats) {
        setStatsData((prev) => ({
          ...prev,
          ...data.stats,
        }));
      }
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats(selectedPeriod);
  }, [selectedPeriod]);

  // Greeting by hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "អរុណសួស្តី (Good Morning)";
    if (hour < 17) return "ទិវាសួស្តី (Good Afternoon)";
    if (hour < 20) return "សាយណ្ហសួស្តី (Good Evening)";
    return "រាត្រីសួស្តី (Good Night)";
  };

  // Find max sales in 7-day chart for proportional heights
  const max7DaySales = Math.max(1, ...statsData.last7DaysSales.map((d) => d.salesUsd));

  // Payment Breakdown Total
  const totalPaymentUsd = Object.values(statsData.paymentBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & GREETING BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-teal-800/20">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-3 py-1 text-teal-300 border border-teal-500/30">
                <Building2 className="h-3.5 w-3.5" />
                <span>{currentBranchName || "សាខាកណ្តាល"}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ប្រព័ន្ធដំណើរការធម្មតា
              </span>
              {currentTime && (
                <span className="text-slate-400 text-[11px] font-medium hidden sm:inline-block">
                  {currentTime}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{getGreeting()}</span>
              {currentUser?.fullName && (
                <span className="text-teal-400 font-bold hidden sm:inline">, {currentUser.fullName}</span>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              ទិដ្ឋភាពទូទៅនៃប្រតិបត្តិការអាជីវកម្ម ការលក់ POS ស្តុកទំនិញ សេវាជួសជុល និងហិរញ្ញវត្ថុប្រចាំថ្ងៃ
            </p>
          </div>

          {/* Timeframe Filter Pills & Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setSelectedPeriod("today")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedPeriod === "today"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                ថ្ងៃនេះ
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod("yesterday")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedPeriod === "yesterday"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                ម្សិលមិញ
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod("7days")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedPeriod === "7days"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                ៧ ថ្ងៃ
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod("this_month")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedPeriod === "this_month"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                ខែនេះ
              </button>
            </div>

            <button
              onClick={() => fetchDashboardStats(selectedPeriod)}
              disabled={loading}
              title="ទាញយកទិន្នន័យថ្មី"
              className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 transition active:scale-95 shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-teal-300" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. QUICK ACTION SHORTCUTS (ផ្លូវកាត់សំខាន់ៗ) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>ផ្លូវកាត់រហ័ស (Quick Actions)</span>
          </h2>
          <span className="text-[11px] text-slate-400">ចុចដើម្បីបើកមុខងារភ្លាមៗ</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Link
            href="/pos"
            className="group flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-sm hover:shadow-md hover:scale-[1.02] transition active:scale-95 text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mb-2 group-hover:rotate-6 transition">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-black">បើកលក់ POS</span>
            <span className="text-[10px] text-teal-100 font-mono mt-0.5">F8 Shortcut</span>
          </Link>

          <Link
            href="/inventory"
            className="group flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-teal-50 hover:border-teal-200 transition active:scale-95 text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-teal-900">បន្ថែមទំនិញ</span>
            <span className="text-[10px] text-slate-400 font-sans mt-0.5">New Product</span>
          </Link>

          <Link
            href="/repairs"
            className="group flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-amber-50 hover:border-amber-200 transition active:scale-95 text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-amber-900">ទទួលជួសជុល</span>
            <span className="text-[10px] text-slate-400 font-sans mt-0.5">New Ticket</span>
          </Link>

          <Link
            href="/purchases"
            className="group flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 transition active:scale-95 text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-900">បញ្ជាទិញចូល</span>
            <span className="text-[10px] text-slate-400 font-sans mt-0.5">Purchase Order</span>
          </Link>

          <Link
            href="/accounting"
            className="group flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-rose-50 hover:border-rose-200 transition active:scale-95 text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-rose-900">កត់ត្រាចំណាយ</span>
            <span className="text-[10px] text-slate-400 font-sans mt-0.5">Record Expense</span>
          </Link>

          <Link
            href="/installments"
            className="group flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-indigo-50 hover:border-indigo-200 transition active:scale-95 text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <BadgePercent className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-900">បង់រំលោះ & បញ្ចាំ</span>
            <span className="text-[10px] text-slate-400 font-sans mt-0.5">Loan & Pawn</span>
          </Link>

          <Link
            href="/reports"
            className="group flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-purple-50 hover:border-purple-200 transition active:scale-95 text-center"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-purple-900">របាយការណ៍</span>
            <span className="text-[10px] text-slate-400 font-sans mt-0.5">Full Reports</span>
          </Link>
        </div>
      </div>

      {/* 3. PRIMARY BUSINESS KPI CARDS GRID (6 SMART CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ចំណូលលក់ ({selectedPeriod})</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-black font-mono text-slate-900">
              {formatUSD(statsData.todaySalesUsd)}
            </h3>
            <p className="text-xs font-semibold text-teal-800 font-sans mt-0.5">
              {formatKHR(statsData.todaySalesUsd, exchangeRateKhr)}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-100 pt-2 text-slate-500">
            <span>{statsData.totalTransactions} ប្រតិបត្តិការ</span>
            <span>AOV: ${statsData.averageOrderValue.toFixed(2)}</span>
          </div>
        </div>

        {/* Card 2: Operating Expenses */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ចំណាយអាជីវកម្ម</span>
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
              <TrendingDown className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-black font-mono text-rose-600">
              {formatUSD(statsData.periodExpensesUsd)}
            </h3>
            <p className="text-xs font-semibold text-slate-500 font-sans mt-0.5">
              ដើមទុនទំនិញ: ${statsData.costOfGoodsUsd.toFixed(2)}
            </p>
          </div>
          <div className="mt-3 flex items-center text-[11px] border-t border-slate-100 pt-2 text-slate-500">
            <span className="text-rose-600 font-medium">ចំណាយក្នុងកាលបរិច្ឆេទ</span>
          </div>
        </div>

        {/* Card 3: Estimated Net Profit */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ចំណេញប៉ាន់ស្មាន</span>
            <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3
              className={`text-xl font-black font-mono ${
                statsData.estimatedNetProfitUsd >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {formatUSD(statsData.estimatedNetProfitUsd)}
            </h3>
            <p className="text-xs font-semibold text-slate-500 font-sans mt-0.5">
              Net Profit (Sales - COGS - Exp)
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-100 pt-2 text-slate-500">
            <span>អត្រាចំណេញ</span>
            <span className="font-bold text-emerald-700">
              {statsData.todaySalesUsd > 0
                ? `${((statsData.estimatedNetProfitUsd / statsData.todaySalesUsd) * 100).toFixed(1)}%`
                : "0.0%"}
            </span>
          </div>
        </div>

        {/* Card 4: Customer Receivables / AR Debt */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">បំណុលត្រូវប្រមូល (AR)</span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-black font-mono text-amber-700">
              {formatUSD(statsData.totalCustomerDebtUsd)}
            </h3>
            <p className="text-xs font-semibold text-slate-500 font-sans mt-0.5">
              {formatKHR(statsData.totalCustomerDebtUsd, exchangeRateKhr)}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-100 pt-2 text-slate-500">
            <span>{statsData.debtCustomerCount} អតិថិជនជំពាក់</span>
            <Link href="/crm" className="text-amber-700 font-bold hover:underline flex items-center">
              ពិនិត្យ <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 5: Active Repairs */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">សេវាជួសជុលសកម្ម</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <Wrench className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black font-mono text-slate-900">
              {statsData.activeRepairsCount}
            </h3>
            <p className="text-xs font-semibold text-indigo-700 font-sans mt-0.5">
              គ្រឿងកំពុងដំណើរការ
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-100 pt-2 text-slate-500">
            <span>{statsData.readyRepairs.length} រួចរាល់រង់ចាំយក</span>
            <Link href="/repairs" className="text-indigo-700 font-bold hover:underline flex items-center">
              មើល <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 6: Total Inventory Valuation */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">តម្លៃទំនិញក្នុងស្តុក</span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <Boxes className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-black font-mono text-slate-900">
              {formatUSD(statsData.totalInventoryValueUsd)}
            </h3>
            <p className="text-xs font-semibold text-blue-700 font-sans mt-0.5">
              {statsData.totalProductsCount} មុខទំនិញចុះបញ្ជី
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-100 pt-2 text-slate-500">
            <span
              className={
                statsData.lowStockCount > 0 ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"
              }
            >
              {statsData.lowStockCount} មុខជិតអស់
            </span>
            <Link href="/inventory" className="text-blue-700 font-bold hover:underline flex items-center">
              ឃ្លាំង <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE: 2 COLUMNS (2/3 & 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: 2/3 (Sales Trend, Payment Methods, Recent Invoices) */}
        <div className="lg:col-span-2 space-y-6">
          {/* A. 7-DAY SALES TREND VISUALIZER */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-teal-700" />
                  <span>និន្នាការលក់ ៧ ថ្ងៃចុងក្រោយ (7-Day Sales Trend)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ទំហំទឹកប្រាក់លក់ចេញប្រចាំថ្ងៃ</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500">សរុប ៧ ថ្ងៃ: </span>
                <span className="text-sm font-black font-mono text-teal-800">
                  {formatUSD(statsData.last7DaysSales.reduce((acc, d) => acc + d.salesUsd, 0))}
                </span>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="pt-4">
              <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-44 border-b border-slate-200 pb-2">
                {statsData.last7DaysSales.map((day, idx) => {
                  const heightPercent = Math.max(8, Math.round((day.salesUsd / max7DaySales) * 100));
                  const isToday = idx === statsData.last7DaysSales.length - 1;
                  return (
                    <div key={idx} className="group flex flex-col items-center h-full justify-end relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded-lg shadow-lg whitespace-nowrap z-20">
                        ${day.salesUsd.toFixed(2)} ({day.count} វិក្កយបត្រ)
                      </div>

                      {/* Bar */}
                      <div className="w-full max-w-[38px] flex flex-col justify-end items-center h-full">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-xl transition-all duration-300 group-hover:scale-105 ${
                            isToday
                              ? "bg-gradient-to-t from-teal-700 to-emerald-500 shadow-md shadow-emerald-700/20"
                              : "bg-gradient-to-t from-slate-200 to-teal-200/80 group-hover:from-teal-300 group-hover:to-teal-500"
                          }`}
                        />
                      </div>

                      {/* Day Label */}
                      <div className="mt-2 text-center">
                        <p className={`text-[10px] font-bold ${isToday ? "text-teal-800" : "text-slate-600"}`}>
                          {day.dayName}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">{day.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* B. PAYMENT METHOD BREAKDOWN BAR */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-red-600" />
                  <span>ការបែងចែកតាមវិធីទូទាត់ប្រាក់ ({selectedPeriod})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ចំណូលលក់តាមប្រភព KHQR, សាច់ប្រាក់, និងជំពាក់</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600">
                សរុប: {formatUSD(totalPaymentUsd)}
              </span>
            </div>

            {/* Multi-segment progress bar */}
            {totalPaymentUsd > 0 ? (
              <div className="space-y-3">
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
                  {statsData.paymentBreakdown.KHQR_ABA > 0 && (
                    <div
                      style={{
                        width: `${(statsData.paymentBreakdown.KHQR_ABA / totalPaymentUsd) * 100}%`,
                      }}
                      className="bg-red-500 transition-all"
                      title={`ABA KHQR: $${statsData.paymentBreakdown.KHQR_ABA.toFixed(2)}`}
                    />
                  )}
                  {statsData.paymentBreakdown.CASH_USD > 0 && (
                    <div
                      style={{
                        width: `${(statsData.paymentBreakdown.CASH_USD / totalPaymentUsd) * 100}%`,
                      }}
                      className="bg-emerald-500 transition-all"
                      title={`Cash USD: $${statsData.paymentBreakdown.CASH_USD.toFixed(2)}`}
                    />
                  )}
                  {statsData.paymentBreakdown.CASH_KHR > 0 && (
                    <div
                      style={{
                        width: `${(statsData.paymentBreakdown.CASH_KHR / totalPaymentUsd) * 100}%`,
                      }}
                      className="bg-teal-500 transition-all"
                      title={`Cash KHR: $${statsData.paymentBreakdown.CASH_KHR.toFixed(2)}`}
                    />
                  )}
                  {statsData.paymentBreakdown.CUSTOMER_CREDIT > 0 && (
                    <div
                      style={{
                        width: `${(statsData.paymentBreakdown.CUSTOMER_CREDIT / totalPaymentUsd) * 100}%`,
                      }}
                      className="bg-amber-500 transition-all"
                      title={`Customer Credit: $${statsData.paymentBreakdown.CUSTOMER_CREDIT.toFixed(2)}`}
                    />
                  )}
                  {statsData.paymentBreakdown.CREDIT_CARD > 0 && (
                    <div
                      style={{
                        width: `${(statsData.paymentBreakdown.CREDIT_CARD / totalPaymentUsd) * 100}%`,
                      }}
                      className="bg-blue-500 transition-all"
                      title={`Card: $${statsData.paymentBreakdown.CREDIT_CARD.toFixed(2)}`}
                    />
                  )}
                </div>

                {/* Legend badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-red-50/70 border border-red-100">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-red-800">KHQR ABA</p>
                      <p className="font-mono font-bold text-slate-800 text-xs">
                        ${(statsData.paymentBreakdown.KHQR_ABA || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-emerald-800">សាច់ប្រាក់ ($)</p>
                      <p className="font-mono font-bold text-slate-800 text-xs">
                        ${(statsData.paymentBreakdown.CASH_USD || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-amber-800">ជំពាក់ (Credit)</p>
                      <p className="font-mono font-bold text-slate-800 text-xs">
                        ${(statsData.paymentBreakdown.CUSTOMER_CREDIT || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-blue-800">កាតធនាគារ</p>
                      <p className="font-mono font-bold text-slate-800 text-xs">
                        ${(statsData.paymentBreakdown.CREDIT_CARD || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center py-4 text-xs text-slate-400 font-medium">
                មិនទាន់មានប្រតិបត្តិការលក់ក្នុងកាលបរិច្ឆេទនេះទេ
              </p>
            )}
          </div>

          {/* C. RECENT TRANSACTIONS / INVOICES */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-teal-700" />
                <span>វិក្កយបត្រថ្មីៗ (Recent Sales Invoices)</span>
              </h3>
              <Link
                href="/sales"
                className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1"
              >
                <span>មើលទាំងអស់</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {statsData.recentOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                មិនទាន់មានវិក្កយបត្រនៅឡើយទេ
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase text-[10px] font-extrabold">
                    <tr>
                      <th className="py-2.5 px-3">លេខវិក្កយបត្រ</th>
                      <th className="py-2.5 px-3">អតិថិជន</th>
                      <th className="py-2.5 px-3 text-center">វិធីទូទាត់</th>
                      <th className="py-2.5 px-3 text-right">ទឹកប្រាក់ ($)</th>
                      <th className="py-2.5 px-3 text-center">ស្ថានភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {statsData.recentOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3">
                          <Link
                            href="/sales"
                            className="font-mono font-bold text-teal-800 hover:underline flex items-center gap-1"
                          >
                            #{ord.invoiceNumber}
                          </Link>
                          <span className="text-[10px] text-slate-400 block font-sans">
                            {new Date(ord.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">{ord.customerName}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700">
                            {ord.paymentMethod.replace("KHQR_", "").replace("CASH_", "")}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ${Number(ord.totalUsd || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 1/3 (Top Sellers, Low Stock Warnings, Repairs, Loans) */}
        <div className="space-y-6">
          {/* A. TOP 5 BEST-SELLING PRODUCTS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span>ទំនិញលក់ដាច់បំផុត (Top Sellers)</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400">តាមបរិមាណ</span>
            </div>

            {statsData.topSellingProducts.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400 italic">
                មិនទាន់មានទិន្នន័យលក់ក្នុងកាលបរិច្ឆេទនេះទេ
              </p>
            ) : (
              <div className="space-y-3">
                {statsData.topSellingProducts.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          idx === 0
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : idx === 1
                            ? "bg-slate-200 text-slate-700"
                            : idx === 2
                            ? "bg-orange-100 text-orange-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                          {p.nameKh}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{p.sku}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black font-mono text-emerald-800">
                        {p.qty} គ្រឿង
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono">${p.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B. LOW STOCK & OUT OF STOCK ALERTS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>ទំនិញជិតអស់ស្តុក (Low Stock)</span>
              </h3>
              <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-black">
                {statsData.lowStockCount} មុខ
              </span>
            </div>

            {statsData.lowStockItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs text-center font-medium">
                ✅ ស្តុកទំនិញទាំងអស់ស្ថិតក្នុងកម្រិតសុវត្ថិភាពល្អ!
              </div>
            ) : (
              <div className="space-y-2.5">
                {statsData.lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.nameKh}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-mono font-black ${
                          item.stockQty === 0
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {item.stockQty === 0 ? "ដាច់ស្តុក (0)" : `${item.stockQty} ${item.unit}`}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-0.5">Alert: {item.minStock}</p>
                    </div>
                  </div>
                ))}

                <Link
                  href="/inventory"
                  className="block text-center text-xs font-bold text-teal-700 hover:text-teal-800 pt-2 hover:underline"
                >
                  គ្រប់គ្រងឃ្លាំង និងបញ្ចូលស្តុក →
                </Link>
              </div>
            )}
          </div>

          {/* C. REPAIRS WAITING FOR PICKUP */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>ជួសជុលរួចរង់ចាំយក (Ready for Pickup)</span>
              </h3>
              <Link href="/repairs" className="text-[10px] font-bold text-teal-700 hover:underline">
                ទាំងអស់
              </Link>
            </div>

            {statsData.readyRepairs.length === 0 ? (
              <p className="text-center py-4 text-xs text-slate-400 italic">
                គ្មានឧបករណ៍ជួសជុលរួចរង់ចាំអតិថិជនយកទេ
              </p>
            ) : (
              <div className="space-y-2.5">
                {statsData.readyRepairs.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-900">
                        #{rep.ticketNumber}
                      </span>
                      <span className="font-mono font-black text-xs text-slate-900">
                        ${rep.amountUsd.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">{rep.deviceModel}</p>
                    <p className="text-[10px] text-slate-500">
                      អតិថិជន: {rep.customerName} {rep.customerPhone ? `(${rep.customerPhone})` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* D. INSTALLMENT & PAWN SNAPSHOT */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BadgePercent className="h-4 w-4 text-indigo-600" />
                <span>បង់រំលោះ & បញ្ចាំ (Financing)</span>
              </h3>
              <Link href="/installments" className="text-[10px] font-bold text-indigo-600 hover:underline">
                គ្រប់គ្រង
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500">កិច្ចសន្យាបង់រំលោះ</p>
                <p className="text-lg font-black font-mono text-indigo-900 mt-1">
                  {statsData.activeInstallmentsCount}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  ${statsData.totalInstallmentPrincipalUsd.toFixed(0)} នៅសល់
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500">សំបុត្របញ្ចាំសកម្ម</p>
                <p className="text-lg font-black font-mono text-amber-900 mt-1">
                  {statsData.activePawnCount}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  ${statsData.totalPawnLoanUsd.toFixed(0)} ទំហំប្រាក់កម្ចី
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
