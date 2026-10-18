"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileBarChart,
  TrendingUp,
  ShoppingBag,
  Wrench,
  Package,
  Users2,
  DollarSign,
  Calendar,
  Printer,
  Download,
  RotateCcw,
  BadgePercent,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  ChevronRight,
  Percent,
  Layers,
  Phone,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD, formatKHR, formatDateTime } from "@/lib/utils";
import { printElement } from "@/lib/printUtils";

export type ReportTab =
  | "summary"
  | "sales"
  | "purchases"
  | "pawn"
  | "installments"
  | "repairs"
  | "hrm"
  | "financial"
  | "inventory";

const COLORS = ["#0d9488", "#0284c7", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#64748b"];

export default function ReportsPage() {
  const { language, exchangeRateKhr, currentBranchName } = usePOSStore();
  const t = translations[language] || translations.km;

  // Active Tab
  const [activeTab, setActiveTab] = useState<ReportTab>("summary");

  // Filter States
  const [dateRange, setDateRange] = useState<string>("this_month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showCustomDateModal, setShowCustomDateModal] = useState<boolean>(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Loading & Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any>(null);

  // Fetch Reports Data
  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "all");
      params.set("dateRange", dateRange);
      if (selectedBranchId && selectedBranchId !== "ALL") {
        params.set("branchId", selectedBranchId);
      }
      if (dateRange === "custom" && customStartDate) {
        params.set("startDate", customStartDate);
        if (customEndDate) params.set("endDate", customEndDate);
      }
      params.set("_t", Date.now().toString());

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange, selectedBranchId]);

  // Export Table to CSV
  const handleExportCSV = () => {
    if (!reportData) return;

    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `anachak_report_${activeTab}_${dateRange}.csv`;

    if (activeTab === "sales") {
      headers = ["លេខវិក្កយបត្រ", "កាលបរិច្ឆេទ", "អតិថិជន", "ទូរស័ព្ទ", "បេឡាករ", "វិធីទូទាត់", "ចំនួនទំនិញ", "សរុប (USD)", "ស្ថានភាព"];
      rows = (reportData.sales?.recentOrders || []).map((o: any) => [
        `"${o.invoiceNumber}"`,
        `"${formatDateTime(o.createdAt)}"`,
        `"${o.customerName}"`,
        `"${o.customerPhone}"`,
        `"${o.cashierName}"`,
        `"${o.paymentMethod}"`,
        `"${o.itemsCount}"`,
        `"${o.totalUsd.toFixed(2)}"`,
        `"${o.status}"`,
      ]);
    } else if (activeTab === "purchases") {
      headers = ["លេខ PO", "កាលបរិច្ឆេទ", "អ្នកផ្គត់ផ្គង់", "ទូរស័ព្ទ", "ចំនួនទំនិញ", "ថ្លៃដើមសរុប (USD)", "ស្ថានភាព"];
      rows = (reportData.purchases?.recentPurchases || []).map((p: any) => [
        `"${p.poNumber}"`,
        `"${formatDateTime(p.orderedAt)}"`,
        `"${p.supplierName}"`,
        `"${p.supplierPhone || "-"}"`,
        `"${p.itemsCount}"`,
        `"${p.totalCostUsd.toFixed(2)}"`,
        `"${p.status}"`,
      ]);
    } else if (activeTab === "pawn") {
      headers = ["លេខសំបុត្រ", "អតិថិជន", "ទូរស័ព្ទ", "ទ្រព្យបញ្ចាំ", "ប្រភេទ", "ប្រាក់កម្ចី (USD)", "ការប្រាក់/ខែ (%)", "ការប្រាក់បង់រួច", "កាលបរិច្ឆេទផុតកំណត់", "ស្ថានភាព"];
      rows = (reportData.pawn?.recentPawnTickets || []).map((tk: any) => [
        `"${tk.ticketNumber}"`,
        `"${tk.customerName}"`,
        `"${tk.customerPhone || "-"}"`,
        `"${tk.itemName}"`,
        `"${tk.itemCategory}"`,
        `"${tk.loanAmountUsd.toFixed(2)}"`,
        `"${tk.monthlyInterestRate}%"`,
        `"${tk.totalInterestPaidUsd.toFixed(2)}"`,
        `"${formatDateTime(tk.maturityDate)}"`,
        `"${tk.status}"`,
      ]);
    } else if (activeTab === "installments") {
      headers = ["លេខកិច្ចសន្យា", "អតិថិជន", "ទូរស័ព្ទ", "ទំនិញ", "តម្លៃសរុប (USD)", "កក់មុន (USD)", "ប្រាក់ដើមនៅសល់", "បង់រួចសរុប", "បង់ប្រចាំខែ", "ស្ថានភាព"];
      rows = (reportData.installments?.recentContracts || []).map((c: any) => [
        `"${c.contractNumber}"`,
        `"${c.customerName}"`,
        `"${c.customerPhone || "-"}"`,
        `"${c.productName}"`,
        `"${c.totalPriceUsd.toFixed(2)}"`,
        `"${c.downPaymentUsd.toFixed(2)}"`,
        `"${c.principalRemainingUsd.toFixed(2)}"`,
        `"${c.totalPaidUsd.toFixed(2)}"`,
        `"${c.monthlyAmountUsd.toFixed(2)}"`,
        `"${c.status}"`,
      ]);
    } else if (activeTab === "repairs") {
      headers = ["លេខសំបុត្រ", "កាលបរិច្ឆេទ", "អតិថិជន", "ទូរស័ព្ទ", "ឧបករណ៍", "ជាងជួសជុល", "តម្លៃជួសជុល (USD)", "កក់មុន", "ស្ថានភាព"];
      rows = (reportData.repairs?.recentRepairs || []).map((r: any) => [
        `"${r.ticketNumber}"`,
        `"${formatDateTime(r.createdAt)}"`,
        `"${r.customerName}"`,
        `"${r.customerPhone || "-"}"`,
        `"${r.device}"`,
        `"${r.technicianName}"`,
        `"${r.finalCostUsd.toFixed(2)}"`,
        `"${r.depositPaidUsd.toFixed(2)}"`,
        `"${r.status}"`,
      ]);
    } else if (activeTab === "hrm") {
      headers = ["កូដបុគ្គលិក", "ឈ្មោះខ្មែរ", "ឈ្មោះអង់គ្លេស", "តួនាទី", "ប្រាក់ខែគោល (USD)", "ទូរស័ព្ទ", "ចំនួនវត្តមាន", "មកទាន់ពេល", "មកយឺត"];
      rows = (reportData.hrm?.employeeList || []).map((e: any) => [
        `"${e.employeeCode}"`,
        `"${e.nameKh}"`,
        `"${e.nameEn}"`,
        `"${e.position}"`,
        `"${e.baseSalaryUsd.toFixed(2)}"`,
        `"${e.phone}"`,
        `"${e.attendanceCount}"`,
        `"${e.presentCount}"`,
        `"${e.lateCount}"`,
      ]);
    } else {
      // General Financial Summary
      headers = ["ប្រភេទសូចនាករ", "ទឹកប្រាក់ (USD)", "ទឹកប្រាក់ប្រមាណ (KHR)"];
      rows = [
        ["ចំណូលលក់ទំនិញ (Sales Revenue)", `${(reportData.sales?.totalRevenueUsd || 0).toFixed(2)}`, `${formatKHR(reportData.sales?.totalRevenueUsd || 0, exchangeRateKhr)}`],
        ["ចំណូលជួសជុល (Repair Revenue)", `${(reportData.repairs?.totalRepairRevenueUsd || 0).toFixed(2)}`, `${formatKHR(reportData.repairs?.totalRepairRevenueUsd || 0, exchangeRateKhr)}`],
        ["ចំណូលបង់រំលោះ (Installment Collected)", `${(reportData.installments?.totalCollectedUsd || 0).toFixed(2)}`, `${formatKHR(reportData.installments?.totalCollectedUsd || 0, exchangeRateKhr)}`],
        ["ការប្រាក់បញ្ចាំដែលប្រមូលបាន (Pawn Interest)", `${(reportData.pawn?.totalInterestCollectedUsd || 0).toFixed(2)}`, `${formatKHR(reportData.pawn?.totalInterestCollectedUsd || 0, exchangeRateKhr)}`],
        ["ចំណាយទិញទំនិញចូល (Purchases Spend)", `${(reportData.purchases?.totalPurchaseCostUsd || 0).toFixed(2)}`, `${formatKHR(reportData.purchases?.totalPurchaseCostUsd || 0, exchangeRateKhr)}`],
        ["ចំណាយប្រតិបត្តិការទូទៅ (Operating Expenses)", `${(reportData.financial?.totalOperatingExpensesUsd || 0).toFixed(2)}`, `${formatKHR(reportData.financial?.totalOperatingExpensesUsd || 0, exchangeRateKhr)}`],
        ["ចំណេញដុលប៉ាន់ស្មាន (Gross Profit)", `${(reportData.sales?.grossProfitUsd || 0).toFixed(2)}`, `${formatKHR(reportData.sales?.grossProfitUsd || 0, exchangeRateKhr)}`],
        ["ចំណេញសុទ្ធអាជីវកម្ម (Net Business Profit)", `${(reportData.financial?.netBusinessProfitUsd || 0).toFixed(2)}`, `${formatKHR(reportData.financial?.netBusinessProfitUsd || 0, exchangeRateKhr)}`],
      ];
    }

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Handler
  const handlePrint = () => {
    printElement("reports-printable-content", `របាយការណ៍_${activeTab.toUpperCase()}`);
  };

  // Filtered Lists by Search Input
  const filteredOrders = useMemo(() => {
    if (!reportData?.sales?.recentOrders) return [];
    if (!searchFilter.trim()) return reportData.sales.recentOrders;
    const q = searchFilter.toLowerCase();
    return reportData.sales.recentOrders.filter(
      (o: any) =>
        o.invoiceNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.includes(q) ||
        o.cashierName?.toLowerCase().includes(q)
    );
  }, [reportData, searchFilter]);

  const filteredPurchases = useMemo(() => {
    if (!reportData?.purchases?.recentPurchases) return [];
    if (!searchFilter.trim()) return reportData.purchases.recentPurchases;
    const q = searchFilter.toLowerCase();
    return reportData.purchases.recentPurchases.filter(
      (p: any) =>
        p.poNumber?.toLowerCase().includes(q) ||
        p.supplierName?.toLowerCase().includes(q) ||
        p.supplierPhone?.includes(q)
    );
  }, [reportData, searchFilter]);

  const filteredPawnTickets = useMemo(() => {
    if (!reportData?.pawn?.recentPawnTickets) return [];
    if (!searchFilter.trim()) return reportData.pawn.recentPawnTickets;
    const q = searchFilter.toLowerCase();
    return reportData.pawn.recentPawnTickets.filter(
      (tk: any) =>
        tk.ticketNumber?.toLowerCase().includes(q) ||
        tk.customerName?.toLowerCase().includes(q) ||
        tk.customerPhone?.includes(q) ||
        tk.itemName?.toLowerCase().includes(q) ||
        tk.itemCategory?.toLowerCase().includes(q)
    );
  }, [reportData, searchFilter]);

  const filteredInstallmentContracts = useMemo(() => {
    if (!reportData?.installments?.recentContracts) return [];
    if (!searchFilter.trim()) return reportData.installments.recentContracts;
    const q = searchFilter.toLowerCase();
    return reportData.installments.recentContracts.filter(
      (c: any) =>
        c.contractNumber?.toLowerCase().includes(q) ||
        c.customerName?.toLowerCase().includes(q) ||
        c.customerPhone?.includes(q) ||
        c.productName?.toLowerCase().includes(q)
    );
  }, [reportData, searchFilter]);

  const filteredRepairs = useMemo(() => {
    if (!reportData?.repairs?.recentRepairs) return [];
    if (!searchFilter.trim()) return reportData.repairs.recentRepairs;
    const q = searchFilter.toLowerCase();
    return reportData.repairs.recentRepairs.filter(
      (r: any) =>
        r.ticketNumber?.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.customerPhone?.includes(q) ||
        r.device?.toLowerCase().includes(q) ||
        r.technicianName?.toLowerCase().includes(q)
    );
  }, [reportData, searchFilter]);

  const filteredEmployees = useMemo(() => {
    if (!reportData?.hrm?.employeeList) return [];
    if (!searchFilter.trim()) return reportData.hrm.employeeList;
    const q = searchFilter.toLowerCase();
    return reportData.hrm.employeeList.filter(
      (e: any) =>
        e.employeeCode?.toLowerCase().includes(q) ||
        e.nameKh?.toLowerCase().includes(q) ||
        e.nameEn?.toLowerCase().includes(q) ||
        e.position?.toLowerCase().includes(q) ||
        e.phone?.includes(q)
    );
  }, [reportData, searchFilter]);

  // Tab definitions
  const tabs = [
    { id: "summary", label: "ទិដ្ឋភាពទូទៅ (Overview)", icon: FileBarChart },
    { id: "sales", label: "ការលក់ (Sales)", icon: TrendingUp },
    { id: "purchases", label: "ការទិញចូល (Purchases)", icon: ShoppingBag },
    { id: "pawn", label: "បញ្ចាំ (Pawn)", icon: DollarSign },
    { id: "installments", label: "បង់រំលោះ (Installments)", icon: BadgePercent },
    { id: "repairs", label: "ជួសជុល (Repairs)", icon: Wrench },
    { id: "hrm", label: "បុគ្គលិក (Staff & HRM)", icon: Users2 },
    { id: "financial", label: "ចំណាយ & ហិរញ្ញវត្ថុ", icon: CreditCard },
    { id: "inventory", label: "ស្តុក (Inventory)", icon: Package },
  ];

  const datePresets = [
    { id: "today", label: "ថ្ងៃនេះ" },
    { id: "yesterday", label: "ម្សិលមិញ" },
    { id: "this_week", label: "សប្តាហ៍នេះ" },
    { id: "this_month", label: "ខែនេះ" },
    { id: "last_month", label: "ខែមុន" },
    { id: "this_year", label: "ឆ្នាំនេះ" },
    { id: "all", label: "ទាំងអស់" },
    { id: "custom", label: "កាលបរិច្ឆេទផ្ទាល់ខ្លួន..." },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-700/20">
              <FileBarChart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                មជ្ឈមណ្ឌលរបាយការណ៍អាជីវកម្ម
                <span className="rounded-md bg-teal-100 dark:bg-teal-950/80 px-2 py-0.5 text-xs font-bold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  ENTERPRISE
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                របាយការណ៍គ្រប់ជ្រុងជ្រោយ៖ ទិញ, លក់, បញ្ចាំ, បង់រំលោះ, ជួសជុល, បុគ្គលិក & ហិរញ្ញវត្ថុ
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Branch, Refresh, Export, Print */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Select */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 shadow-xs">
            <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">គ្រប់សាខាទាំងអស់ (All Branches)</option>
              {reportData?.branches?.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchReports}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
            title="ទាញយកទិន្នន័យឡើងវិញ"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-teal-500" : ""}`} />
            <span>ផ្ទុកឡើងវិញ</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>ទាញយក Excel / CSV</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-700 transition shadow-md shadow-teal-900/20 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>បោះពុម្ព</span>
          </button>
        </div>
      </div>

      {/* 2. Date Filter Quick Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 pl-2">
          <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span>ជ្រើសរើសចន្លោះកាលបរិច្ឆេទ:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {datePresets.map((preset) => {
            const isActive = dateRange === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  if (preset.id === "custom") {
                    setShowCustomDateModal(true);
                  } else {
                    setDateRange(preset.id);
                  }
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white shadow-sm shadow-teal-900/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Range Modal */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
              កំណត់កាលបរិច្ឆេទផ្ទាល់ខ្លួន (Custom Range)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  ចាប់ពីថ្ងៃ (Start Date):
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  រហូតដល់ថ្ងៃ (End Date):
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-teal-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                បោះបង់
              </button>
              <button
                onClick={() => {
                  setDateRange("custom");
                  setShowCustomDateModal(false);
                  fetchReports();
                }}
                disabled={!customStartDate}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                អនុវត្ត
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as ReportTab);
                setSearchFilter("");
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-teal-600 dark:text-white shadow-md shadow-slate-900/10"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-teal-400 dark:text-teal-200" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Main Tab Content Container (Target for Printable Report) */}
      <div id="reports-printable-content" className="space-y-6">
        {/* Printable Header Info (Visible on Print) */}
        <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black">អាណាចក្រPOS - របាយការណ៍ប្រតិបត្តិការ</h2>
              <p className="text-xs text-slate-600">
                សាខា: {reportData?.branches?.find((b: any) => b.id === selectedBranchId)?.name || "គ្រប់សាខាទាំងអស់"} | ចន្លោះពេល: {dateRange}
              </p>
            </div>
            <div className="text-right text-xs">
              <p>កាលបរិច្ឆេទចេញ: {new Date().toLocaleDateString("km-KH")}</p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: EXECUTIVE SUMMARY / OVERVIEW
           ========================================================================= */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            {/* Top Key Metrics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gross Revenue */}
              <div className="rounded-2xl border border-teal-200 dark:border-teal-900 bg-gradient-to-br from-teal-500/10 to-emerald-500/5 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-300">
                    ចំណូលសរុប (Total Revenue)
                  </span>
                  <div className="rounded-xl bg-teal-500/20 p-2 text-teal-600 dark:text-teal-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    {formatUSD(reportData?.financial?.totalIncomeUsd || 0)}
                  </h3>
                  <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                    ≈ {formatKHR(reportData?.financial?.totalIncomeUsd || 0, exchangeRateKhr)}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  (ការលក់ + ជួសជុល + បង់រំលោះ + ការប្រាក់បញ្ចាំ)
                </p>
              </div>

              {/* Total Expenses */}
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-gradient-to-br from-rose-500/10 to-orange-500/5 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    ចំណាយសរុប (Total Outgoing)
                  </span>
                  <div className="rounded-xl bg-rose-500/20 p-2 text-rose-600 dark:text-rose-400">
                    <ArrowDownRight className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    {formatUSD(reportData?.financial?.totalOutgoingUsd || 0)}
                  </h3>
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    ≈ {formatKHR(reportData?.financial?.totalOutgoingUsd || 0, exchangeRateKhr)}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  (ទិញចូល + ប្រតិបត្តិការទូទៅ + គ្រឿងបន្លាស់ + ប្រាក់ខែ)
                </p>
              </div>

              {/* Net Estimated Profit */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    ប្រាក់ចំណេញសុទ្ធ (Net Profit)
                  </span>
                  <div className="rounded-xl bg-emerald-500/20 p-2 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatUSD(reportData?.financial?.netBusinessProfitUsd || 0)}
                  </h3>
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-500 mt-0.5">
                    ≈ {formatKHR(reportData?.financial?.netBusinessProfitUsd || 0, exchangeRateKhr)}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  ប្រាក់ចំណេញសុទ្ធបន្ទាប់ពីកាត់រាល់ការចំណាយ
                </p>
              </div>

              {/* Transactions Count */}
              <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-500/10 to-sky-500/5 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                    ប្រតិបត្តិការសរុប (Operations)
                  </span>
                  <div className="rounded-xl bg-indigo-500/20 p-2 text-indigo-600 dark:text-indigo-400">
                    <Layers className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    {(reportData?.sales?.orderCount || 0) +
                      (reportData?.repairs?.totalTicketsCount || 0) +
                      (reportData?.pawn?.totalTicketsCount || 0) +
                      (reportData?.installments?.totalContractsCount || 0)}
                  </h3>
                  <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    វិក្កយបត្រ, សំបុត្រ & កិច្ចសន្យា
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  ដំណើរការក្នុងចន្លោះពេលជ្រើសរើស
                </p>
              </div>
            </div>

            {/* Middle Section: Module Revenue Stream Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Sources Chart */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>ប្រភពចំណូលតាមម៉ូឌុល (Revenue Stream Distribution)</span>
                  <span className="text-xs font-normal text-slate-400">USD</span>
                </h3>
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "ការលក់ (Sales)",
                          ចំណូល: reportData?.sales?.totalRevenueUsd || 0,
                          ចំណាយ: reportData?.sales?.totalCostUsd || 0,
                        },
                        {
                          name: "ការទិញ (Purchases)",
                          ចំណូល: 0,
                          ចំណាយ: reportData?.purchases?.totalPurchaseCostUsd || 0,
                        },
                        {
                          name: "ជួសជុល (Repairs)",
                          ចំណូល: reportData?.repairs?.totalRepairRevenueUsd || 0,
                          ចំណាយ: reportData?.repairs?.totalSparePartsCostUsd || 0,
                        },
                        {
                          name: "បង់រំលោះ (Installment)",
                          ចំណូល: reportData?.installments?.totalCollectedUsd || 0,
                          ចំណាយ: 0,
                        },
                        {
                          name: "បញ្ចាំ (Pawn)",
                          ចំណូល: reportData?.pawn?.totalInterestCollectedUsd || 0,
                          ចំណាយ: 0,
                        },
                        {
                          name: "ចំណាយទូទៅ (OpEx)",
                          ចំណូល: 0,
                          ចំណាយ: reportData?.financial?.totalOperatingExpensesUsd || 0,
                        },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={(value: any) => formatUSD(Number(value))} />
                      <Legend />
                      <Bar dataKey="ចំណូល" fill="#0d9488" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="ចំណាយ" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment Methods Donut */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  វិធីសាស្រ្តទូទាត់លក់ចេញ (Payment Methods)
                </h3>
                <div className="h-56 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "ABA KHQR", value: reportData?.sales?.paymentBreakdown?.KHQR_ABA || 0 },
                          { name: "Bakong KHQR", value: reportData?.sales?.paymentBreakdown?.KHQR_BAKONG || 0 },
                          { name: "Cash USD", value: reportData?.sales?.paymentBreakdown?.CASH_USD || 0 },
                          { name: "Cash KHR", value: reportData?.sales?.paymentBreakdown?.CASH_KHR || 0 },
                          { name: "Credit Card", value: reportData?.sales?.paymentBreakdown?.CREDIT_CARD || 0 },
                          { name: "ជំពាក់ (Debt)", value: reportData?.sales?.paymentBreakdown?.CUSTOMER_CREDIT || 0 },
                        ].filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => formatUSD(Number(val))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">KHQR (ABA / Bakong):</span>
                    <span className="font-bold text-teal-600">
                      {formatUSD(
                        (reportData?.sales?.paymentBreakdown?.KHQR_ABA || 0) +
                          (reportData?.sales?.paymentBreakdown?.KHQR_BAKONG || 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">សាច់ប្រាក់ (Cash):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatUSD(
                        (reportData?.sales?.paymentBreakdown?.CASH_USD || 0) +
                          (reportData?.sales?.paymentBreakdown?.CASH_KHR || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Cards Grid Across All Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sales Quick */}
              <div
                onClick={() => setActiveTab("sales")}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-teal-500 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-teal-600" />
                    របាយការណ៍លក់
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
                <div className="mt-3 flex justify-between items-end">
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">
                      {formatUSD(reportData?.sales?.totalRevenueUsd || 0)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {reportData?.sales?.orderCount || 0} វិក្កយបត្រ
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">
                    ចំណេញ: {formatUSD(reportData?.sales?.grossProfitUsd || 0)}
                  </span>
                </div>
              </div>

              {/* Purchases Quick */}
              <div
                onClick={() => setActiveTab("purchases")}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-teal-500 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4 text-sky-600" />
                    របាយការណ៍ទិញចូល
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
                <div className="mt-3 flex justify-between items-end">
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">
                      {formatUSD(reportData?.purchases?.totalPurchaseCostUsd || 0)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {reportData?.purchases?.totalOrdersCount || 0} បញ្ជាទិញ (POs)
                    </p>
                  </div>
                  <span className="text-xs font-bold text-sky-600">
                    ទទួលរួច: {reportData?.purchases?.statusCounts?.RECEIVED || 0}
                  </span>
                </div>
              </div>

              {/* Pawn Quick */}
              <div
                onClick={() => setActiveTab("pawn")}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-teal-500 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    របាយការណ៍បញ្ចាំ
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
                <div className="mt-3 flex justify-between items-end">
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">
                      {formatUSD(reportData?.pawn?.totalActiveLoansUsd || 0)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {reportData?.pawn?.activeTicketsCount || 0} សំបុត្រសកម្ម
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-600">
                    ការប្រាក់: {formatUSD(reportData?.pawn?.totalInterestCollectedUsd || 0)}
                  </span>
                </div>
              </div>

              {/* Installments Quick */}
              <div
                onClick={() => setActiveTab("installments")}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-teal-500 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BadgePercent className="h-4 w-4 text-indigo-600" />
                    របាយការណ៍បង់រំលោះ
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
                <div className="mt-3 flex justify-between items-end">
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">
                      {formatUSD(reportData?.installments?.totalFinancedValueUsd || 0)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {reportData?.installments?.activeContractsCount || 0} កិច្ចសន្យាសកម្ម
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600">
                    ប្រមូលបាន {reportData?.installments?.collectionRatePercent || 0}%
                  </span>
                </div>
              </div>

              {/* Repairs Quick */}
              <div
                onClick={() => setActiveTab("repairs")}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-teal-500 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Wrench className="h-4 w-4 text-emerald-600" />
                    របាយការណ៍ជួសជុល
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
                <div className="mt-3 flex justify-between items-end">
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">
                      {formatUSD(reportData?.repairs?.totalRepairRevenueUsd || 0)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {reportData?.repairs?.totalTicketsCount || 0} សំបុត្រសរុប
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">
                    ចំណេញសុទ្ធ: {formatUSD(reportData?.repairs?.netRepairProfitUsd || 0)}
                  </span>
                </div>
              </div>

              {/* Staff / HRM Quick */}
              <div
                onClick={() => setActiveTab("hrm")}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-teal-500 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users2 className="h-4 w-4 text-purple-600" />
                    របាយការណ៍បុគ្គលិក
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
                <div className="mt-3 flex justify-between items-end">
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">
                      {reportData?.hrm?.activeEmployeesCount || 0} នាក់សកម្ម
                    </p>
                    <p className="text-[11px] text-slate-500">
                      វត្តមាន: {reportData?.hrm?.attendanceStats?.PRESENT || 0} ថ្ងៃ
                    </p>
                  </div>
                  <span className="text-xs font-bold text-purple-600">
                    បៀវត្ស: {formatUSD(reportData?.hrm?.payrollStats?.totalNetSalaryUsd || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: SALES REPORT (របាយការណ៍លក់)
           ========================================================================= */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            {/* Sales Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ចំណូលលក់សរុប (Total Sales)</p>
                <h3 className="text-2xl font-black text-teal-600 mt-1">
                  {formatUSD(reportData?.sales?.totalRevenueUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ≈ {formatKHR(reportData?.sales?.totalRevenueUsd || 0, exchangeRateKhr)}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ប្រាក់ចំណេញដុល (Gross Profit)</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  {formatUSD(reportData?.sales?.grossProfitUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ថ្លៃដើមទំនិញ: {formatUSD(reportData?.sales?.totalCostUsd || 0)}
                </p>
              </div>

              <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">តម្លៃជាមធ្យម/វិក្កយបត្រ (Avg Ticket)</p>
                <h3 className="text-2xl font-black text-sky-600 mt-1">
                  {formatUSD(reportData?.sales?.averageTicketUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ពីចំនួន {reportData?.sales?.orderCount || 0} វិក្កយបត្រ
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ទូទាត់តាម KHQR (ABA + Bakong)</p>
                <h3 className="text-2xl font-black text-indigo-600 mt-1">
                  {formatUSD(
                    (reportData?.sales?.paymentBreakdown?.KHQR_ABA || 0) +
                      (reportData?.sales?.paymentBreakdown?.KHQR_BAKONG || 0)
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  សាច់ប្រាក់: {formatUSD(reportData?.sales?.paymentBreakdown?.CASH_USD || 0)}
                </p>
              </div>
            </div>

            {/* Top Products & Top Cashiers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Selling Products */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                  ទំនិញលក់ដាច់បំផុត (Top Selling Products)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                        <th className="pb-2">មុខទំនិញ</th>
                        <th className="pb-2 text-center">ចំនួនលក់</th>
                        <th className="pb-2 text-right">ចំណូលសរុប</th>
                        <th className="pb-2 text-right">ប្រាក់ចំណេញ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportData?.sales?.topProducts?.map((p: any, idx: number) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                            <span className="text-teal-600 mr-2 font-mono">#{idx + 1}</span>
                            {p.name}
                          </td>
                          <td className="py-2.5 text-center font-bold">{p.qty}</td>
                          <td className="py-2.5 text-right font-black text-teal-600">
                            {formatUSD(p.revenue)}
                          </td>
                          <td className="py-2.5 text-right font-bold text-emerald-600">
                            {formatUSD(p.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cashier Performance */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                  ស្នាដៃបេឡាករលក់ (Cashier Sales Performance)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                        <th className="pb-2">បេឡាករ</th>
                        <th className="pb-2 text-center">ចំនួនវិក្កយបត្រ</th>
                        <th className="pb-2 text-right">ចំណូលសរុប ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportData?.sales?.topCashiers?.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                            {c.name}
                          </td>
                          <td className="py-3 text-center font-bold">{c.orderCount}</td>
                          <td className="py-3 text-right font-black text-teal-600">
                            {formatUSD(c.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sales Invoices Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  បញ្ជីវិក្កយបត្រលក់ ({filteredOrders.length})
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមលេខវិក្កយបត្រ, អតិថិជន..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="p-3">លេខវិក្កយបត្រ</th>
                      <th className="p-3">កាលបរិច្ឆេទ</th>
                      <th className="p-3">អតិថិជន</th>
                      <th className="p-3">បេឡាករ</th>
                      <th className="p-3">វិធីទូទាត់</th>
                      <th className="p-3 text-center">មុខទំនិញ</th>
                      <th className="p-3 text-right">ទឹកប្រាក់សរុប</th>
                      <th className="p-3 text-center">ស្ថានភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredOrders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-teal-600">{ord.invoiceNumber}</td>
                        <td className="p-3 text-slate-500">{formatDateTime(ord.createdAt)}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{ord.customerName}</p>
                          <p className="text-[10px] text-slate-400">{ord.customerPhone}</p>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{ord.cashierName}</td>
                        <td className="p-3">
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold">
                            {ord.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold">{ord.itemsCount}</td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                          {formatUSD(ord.totalUsd)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              ord.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: PURCHASES REPORT (របាយការណ៍ទិញចូល)
           ========================================================================= */}
        {activeTab === "purchases" && (
          <div className="space-y-6">
            {/* Purchases Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ថ្លៃទិញទំនិញសរុប (Total Purchase Spend)</p>
                <h3 className="text-2xl font-black text-sky-600 mt-1">
                  {formatUSD(reportData?.purchases?.totalPurchaseCostUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ≈ {formatKHR(reportData?.purchases?.totalPurchaseCostUsd || 0, exchangeRateKhr)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ចំនួនបញ្ជាទិញ (Total POs)</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {reportData?.purchases?.totalOrdersCount || 0}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ទទួលចូលស្តុក: {reportData?.purchases?.statusCounts?.RECEIVED || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">កំពុងបញ្ជាទិញ (Pending / Ordered)</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">
                  {reportData?.purchases?.statusCounts?.ORDERED || 0}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  សេចក្តីព្រាង (Draft): {reportData?.purchases?.statusCounts?.DRAFT || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">បានបោះបង់ (Cancelled POs)</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">
                  {reportData?.purchases?.statusCounts?.CANCELLED || 0}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ការបញ្ជាទិញដែលបានលុបចោល</p>
              </div>
            </div>

            {/* Top Suppliers Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                អ្នកផ្គត់ផ្គង់កំពូល (Top Suppliers by Spend)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                      <th className="pb-2">ឈ្មោះក្រុមហ៊ុន/អ្នកផ្គត់ផ្គង់</th>
                      <th className="pb-2">លេខទូរស័ព្ទ</th>
                      <th className="pb-2 text-center">ចំនួនបញ្ជាទិញ (POs)</th>
                      <th className="pb-2 text-right">ទឹកប្រាក់សរុបទិញចូល ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData?.purchases?.topSuppliers?.map((sup: any, idx: number) => (
                      <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                          <span className="text-sky-600 mr-2 font-mono">#{idx + 1}</span>
                          {sup.name}
                        </td>
                        <td className="py-2.5 text-slate-500">{sup.phone || "-"}</td>
                        <td className="py-2.5 text-center font-bold">{sup.poCount}</td>
                        <td className="py-2.5 text-right font-black text-sky-600">
                          {formatUSD(sup.spend)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Orders Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  បញ្ជីការបញ្ជាទិញចូល ({filteredPurchases.length})
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមលេខ PO, អ្នកផ្គត់ផ្គង់..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="p-3">លេខ PO</th>
                      <th className="p-3">កាលបរិច្ឆេទ</th>
                      <th className="p-3">អ្នកផ្គត់ផ្គង់</th>
                      <th className="p-3">លេខទូរស័ព្ទ</th>
                      <th className="p-3 text-center">ចំនួនទំនិញ</th>
                      <th className="p-3 text-right">ថ្លៃដើមសរុប</th>
                      <th className="p-3 text-center">ស្ថានភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPurchases.map((po: any) => (
                      <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-sky-600">{po.poNumber}</td>
                        <td className="p-3 text-slate-500">{formatDateTime(po.orderedAt)}</td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{po.supplierName}</td>
                        <td className="p-3 text-slate-500">{po.supplierPhone || "-"}</td>
                        <td className="p-3 text-center font-bold">{po.itemsCount}</td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                          {formatUSD(po.totalCostUsd)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              po.status === "RECEIVED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : po.status === "ORDERED"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: PAWN REPORT (របាយការណ៍បញ្ចាំ)
           ========================================================================= */}
        {activeTab === "pawn" && (
          <div className="space-y-6">
            {/* Pawn Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ប្រាក់កម្ចីបញ្ចាំកំពុងសកម្ម (Active Loans)</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">
                  {formatUSD(reportData?.pawn?.totalActiveLoansUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {reportData?.pawn?.activeTicketsCount || 0} សំបុត្រកំពុងបញ្ចាំ
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ការប្រាក់ប្រមូលបាន (Interest Income)</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  {formatUSD(reportData?.pawn?.totalInterestCollectedUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ចំណូលការប្រាក់សុទ្ធពីអតិថិជន</p>
              </div>

              <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">បានលោះត្រឡប់វិញ (Redeemed Loans)</p>
                <h3 className="text-2xl font-black text-sky-600 mt-1">
                  {formatUSD(reportData?.pawn?.totalRedeemedAmountUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {reportData?.pawn?.redeemedTicketsCount || 0} សំបុត្រលោះរួចរាល់
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ហួសកាលកំណត់ (Overdue Loans)</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">
                  {reportData?.pawn?.overdueTicketsCount || 0}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ដេញថ្លៃ/រឹបអូស: {reportData?.pawn?.forfeitedTicketsCount || 0}
                </p>
              </div>
            </div>

            {/* Pawn Tickets Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  បញ្ជីសំបុត្របញ្ចាំ ({filteredPawnTickets.length})
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមលេខសំបុត្រ, អតិថិជន, ទំនិញ..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="p-3">លេខសំបុត្រ</th>
                      <th className="p-3">អតិថិជន</th>
                      <th className="p-3">ទ្រព្យបញ្ចាំ</th>
                      <th className="p-3">ប្រភេទ</th>
                      <th className="p-3 text-right">ប្រាក់កម្ចី ($)</th>
                      <th className="p-3 text-center">ការប្រាក់/ខែ</th>
                      <th className="p-3 text-right">ការប្រាក់បង់រួច</th>
                      <th className="p-3">ថ្ងៃផុតកំណត់</th>
                      <th className="p-3 text-center">ស្ថានភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPawnTickets.map((tk: any) => (
                      <tr key={tk.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-amber-600">{tk.ticketNumber}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{tk.customerName}</p>
                          <p className="text-[10px] text-slate-400">{tk.customerPhone}</p>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{tk.itemName}</td>
                        <td className="p-3">
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold">
                            {tk.itemCategory}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                          {formatUSD(tk.loanAmountUsd)}
                        </td>
                        <td className="p-3 text-center font-bold text-teal-600">
                          {tk.monthlyInterestRate}%
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600">
                          {formatUSD(tk.totalInterestPaidUsd)}
                        </td>
                        <td className="p-3 text-slate-500">{formatDateTime(tk.maturityDate)}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              tk.status === "ACTIVE"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : tk.status === "REDEEMED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {tk.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: INSTALLMENTS REPORT (របាយការណ៍បង់រំលោះ)
           ========================================================================= */}
        {activeTab === "installments" && (
          <div className="space-y-6">
            {/* Installments Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">តម្លៃទំនិញរំលោះសរុប (Total Financed)</p>
                <h3 className="text-2xl font-black text-indigo-600 mt-1">
                  {formatUSD(reportData?.installments?.totalFinancedValueUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {reportData?.installments?.totalContractsCount || 0} កិច្ចសន្យាសរុប
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ប្រាក់បានប្រមូលរួច (Total Collected)</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  {formatUSD(reportData?.installments?.totalCollectedUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ប្រាក់កក់: {formatUSD(reportData?.installments?.totalDownPaymentCollectedUsd || 0)}
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ប្រាក់ដើមនៅសល់ (Principal Remaining)</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">
                  {formatUSD(reportData?.installments?.totalPrincipalRemainingUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">បំណុលដែលត្រូវប្រមូលបន្ត</p>
              </div>

              <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">អត្រាប្រមូលប្រាក់ (Collection Rate)</p>
                <h3 className="text-2xl font-black text-teal-600 mt-1">
                  {reportData?.installments?.collectionRatePercent || 0}%
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  សកម្ម: {reportData?.installments?.activeContractsCount || 0} | បញ្ចប់:{" "}
                  {reportData?.installments?.completedContractsCount || 0}
                </p>
              </div>
            </div>

            {/* Installment Contracts Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  បញ្ជីកិច្ចសន្យាបង់រំលោះ ({filteredInstallmentContracts.length})
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមលេខកិច្ចសន្យា, អតិថិជន, ទំនិញ..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="p-3">លេខកិច្ចសន្យា</th>
                      <th className="p-3">អតិថិជន</th>
                      <th className="p-3">ទំនិញរំលោះ</th>
                      <th className="p-3 text-right">តម្លៃសរុប</th>
                      <th className="p-3 text-right">កក់មុន</th>
                      <th className="p-3 text-right">ប្រាក់ដើមនៅសល់</th>
                      <th className="p-3 text-right">បង់រួច</th>
                      <th className="p-3 text-right">បង់/ខែ</th>
                      <th className="p-3 text-center">ស្ថានភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredInstallmentContracts.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-indigo-600">{c.contractNumber}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{c.customerName}</p>
                          <p className="text-[10px] text-slate-400">{c.customerPhone}</p>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{c.productName}</td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                          {formatUSD(c.totalPriceUsd)}
                        </td>
                        <td className="p-3 text-right text-slate-500">{formatUSD(c.downPaymentUsd)}</td>
                        <td className="p-3 text-right font-bold text-rose-600">
                          {formatUSD(c.principalRemainingUsd)}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600">
                          {formatUSD(c.totalPaidUsd)}
                        </td>
                        <td className="p-3 text-right font-bold text-indigo-600">
                          {formatUSD(c.monthlyAmountUsd)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              c.status === "ACTIVE"
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                                : c.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: REPAIRS REPORT (របាយការណ៍ជួសជុល)
           ========================================================================= */}
        {activeTab === "repairs" && (
          <div className="space-y-6">
            {/* Repairs Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ចំណូលសេវាជួសជុល (Repair Revenue)</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  {formatUSD(reportData?.repairs?.totalRepairRevenueUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ≈ {formatKHR(reportData?.repairs?.totalRepairRevenueUsd || 0, exchangeRateKhr)}
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ថ្លៃគ្រឿងបន្លាស់ប្រើប្រាស់ (Parts Cost)</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">
                  {formatUSD(reportData?.repairs?.totalSparePartsCostUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">កាត់ចេញពីស្តុកសម្រាប់ជួសជុល</p>
              </div>

              <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ប្រាក់ចំណេញសុទ្ធជួសជុល (Net Profit)</p>
                <h3 className="text-2xl font-black text-teal-600 mt-1">
                  {formatUSD(reportData?.repairs?.netRepairProfitUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ចំណូលដកថ្លៃដើមគ្រឿងបន្លាស់
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ចំនួនសំបុត្រជួសជុល (Total Tickets)</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {reportData?.repairs?.totalTicketsCount || 0}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  បានប្រគល់ជូន: {reportData?.repairs?.statusCounts?.DELIVERED || 0}
                </p>
              </div>
            </div>

            {/* Technician Performance Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                ស្នាដៃជាងជួសជុល (Technician Performance & Commissions)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                      <th className="pb-2">ឈ្មោះជាងជួសជុល</th>
                      <th className="pb-2 text-center">ចំនួនសំបុត្រជួសជុល</th>
                      <th className="pb-2 text-right">ចំណូលបង្កើតបាន ($)</th>
                      <th className="pb-2 text-right">កម្រៃជើងសារជាង (Commissions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData?.repairs?.topTechnicians?.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {t.name}
                        </td>
                        <td className="py-2.5 text-center font-bold">{t.ticketCount}</td>
                        <td className="py-2.5 text-right font-black text-teal-600">
                          {formatUSD(t.revenue)}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-600">
                          {formatUSD(t.commissions)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Repair Tickets Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  បញ្ជីសំបុត្រជួសជុល ({filteredRepairs.length})
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមលេខសំបុត្រ, អតិថិជន, ឧបករណ៍..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="p-3">លេខសំបុត្រ</th>
                      <th className="p-3">កាលបរិច្ឆេទ</th>
                      <th className="p-3">អតិថិជន</th>
                      <th className="p-3">ឧបករណ៍</th>
                      <th className="p-3">ជាងទទួលបន្ទុក</th>
                      <th className="p-3 text-right">តម្លៃជួសជុល</th>
                      <th className="p-3 text-right">កក់មុន</th>
                      <th className="p-3 text-center">ស្ថានភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRepairs.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-emerald-600">{r.ticketNumber}</td>
                        <td className="p-3 text-slate-500">{formatDateTime(r.createdAt)}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{r.customerName}</p>
                          <p className="text-[10px] text-slate-400">{r.customerPhone}</p>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{r.device}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{r.technicianName}</td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                          {formatUSD(r.finalCostUsd)}
                        </td>
                        <td className="p-3 text-right text-slate-500">{formatUSD(r.depositPaidUsd)}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              r.status === "DELIVERED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : r.status === "READY_FOR_PICKUP"
                                ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: STAFF / HRM REPORT (របាយការណ៍បុគ្គលិក)
           ========================================================================= */}
        {activeTab === "hrm" && (
          <div className="space-y-6">
            {/* HRM Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">បុគ្គលិកសកម្ម (Active Employees)</p>
                <h3 className="text-2xl font-black text-purple-600 mt-1">
                  {reportData?.hrm?.activeEmployeesCount || 0} នាក់
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  សរុបទាំងអស់: {reportData?.hrm?.totalEmployeesCount || 0} នាក់
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">វត្តមានទាន់ពេល (On-Time Present)</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  {reportData?.hrm?.attendanceStats?.PRESENT || 0} ដង
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  មកយឺត: {reportData?.hrm?.attendanceStats?.LATE || 0} ដង
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">បៀវត្សបើកជូនសរុប (Net Payroll)</p>
                <h3 className="text-2xl font-black text-indigo-600 mt-1">
                  {formatUSD(reportData?.hrm?.payrollStats?.totalNetSalaryUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ប្រាក់ខែគោល: {formatUSD(reportData?.hrm?.payrollStats?.totalBaseSalaryUsd || 0)}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">កម្រៃជើងសារ & ថែមម៉ោង (Bonus & OT)</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">
                  {formatUSD(
                    (reportData?.hrm?.payrollStats?.totalOvertimeUsd || 0) +
                      (reportData?.hrm?.payrollStats?.totalCommissionsUsd || 0)
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  កាត់ប្រាក់: {formatUSD(reportData?.hrm?.payrollStats?.totalDeductionsUsd || 0)}
                </p>
              </div>
            </div>

            {/* Employee List Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  បញ្ជីបុគ្គលិក & វត្តមាន ({filteredEmployees.length})
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមកូដ, ឈ្មោះ, តួនាទី..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="p-3">កូដ</th>
                      <th className="p-3">ឈ្មោះបុគ្គលិក</th>
                      <th className="p-3">តួនាទី</th>
                      <th className="p-3 text-right">ប្រាក់ខែគោល</th>
                      <th className="p-3">លេខទូរស័ព្ទ</th>
                      <th className="p-3 text-center">វត្តមាន</th>
                      <th className="p-3 text-center">មកទាន់ពេល</th>
                      <th className="p-3 text-center">មកយឺត</th>
                      <th className="p-3 text-center">ស្ថានភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredEmployees.map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-purple-600">{e.employeeCode}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{e.nameKh}</p>
                          <p className="text-[10px] text-slate-400">{e.nameEn}</p>
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{e.position}</td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                          {formatUSD(e.baseSalaryUsd)}
                        </td>
                        <td className="p-3 text-slate-500">{e.phone}</td>
                        <td className="p-3 text-center font-bold">{e.attendanceCount}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{e.presentCount}</td>
                        <td className="p-3 text-center font-bold text-amber-600">{e.lateCount}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              e.isActive
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {e.isActive ? "សកម្ម" : "អសកម្ម"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 8: FINANCIAL & EXPENSES REPORT (ចំណាយ & ហិរញ្ញវត្ថុ)
           ========================================================================= */}
        {activeTab === "financial" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Financial P&L Statement Box */}
              <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">
                  តារាងសង្ខេបចំណូល-ចំណាយ & ប្រាក់ចំណេញសុទ្ធ (Profit & Loss Statement)
                </h3>
                <div className="space-y-4">
                  {/* Revenue section */}
                  <div className="rounded-xl bg-teal-50/60 dark:bg-teal-950/20 p-3.5 border border-teal-100 dark:border-teal-900/40">
                    <p className="text-xs font-bold text-teal-800 dark:text-teal-300 mb-2">
                      + ចរន្តចំណូលប្រតិបត្តិការ (Gross Operating Revenues)
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">ចំណូលលក់ទំនិញ (POS Sales):</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatUSD(reportData?.sales?.totalRevenueUsd || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">ចំណូលសេវាជួសជុល (Repair Services):</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatUSD(reportData?.repairs?.totalRepairRevenueUsd || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">ចំណូលប្រមូលបង់រំលោះ (Installment Paid):</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatUSD(reportData?.installments?.totalCollectedUsd || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">ចំណូលការប្រាក់បញ្ចាំ (Pawn Interest):</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatUSD(reportData?.pawn?.totalInterestCollectedUsd || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-teal-200 dark:border-teal-800 font-extrabold">
                        <span className="text-teal-700 dark:text-teal-300">សរុបចំណូលទាំងអស់:</span>
                        <span className="text-teal-700 dark:text-teal-300">
                          {formatUSD(reportData?.financial?.totalIncomeUsd || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expense section */}
                  <div className="rounded-xl bg-rose-50/60 dark:bg-rose-950/20 p-3.5 border border-rose-100 dark:border-rose-900/40">
                    <p className="text-xs font-bold text-rose-800 dark:text-rose-300 mb-2">
                      - ចរន្តចំណាយអាជីវកម្ម (Business Expenses & COGS)
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">ចំណាយទិញទំនិញចូលស្តុក (Purchases):</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatUSD(reportData?.purchases?.totalPurchaseCostUsd || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">ចំណាយគ្រឿងបន្លាស់ជួសជុល (Parts Used):</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatUSD(reportData?.repairs?.totalSparePartsCostUsd || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">ចំណាយប្រតិបត្តិការទូទៅ (Operating Expenses):</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatUSD(reportData?.financial?.totalOperatingExpensesUsd || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">ចំណាយបៀវត្សបុគ្គលិក (Staff Payroll):</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatUSD(reportData?.hrm?.payrollStats?.totalNetSalaryUsd || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-rose-200 dark:border-rose-800 font-extrabold">
                        <span className="text-rose-700 dark:text-rose-300">សរុបចំណាយទាំងអស់:</span>
                        <span className="text-rose-700 dark:text-rose-300">
                          {formatUSD(reportData?.financial?.totalOutgoingUsd || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Net profit highlight */}
                  <div className="rounded-xl bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg">
                    <div>
                      <p className="text-xs text-slate-400">ប្រាក់ចំណេញសុទ្ធអាជីវកម្ម (Net Business Profit)</p>
                      <h2 className="text-2xl font-black text-emerald-400 mt-0.5">
                        {formatUSD(reportData?.financial?.netBusinessProfitUsd || 0)}
                      </h2>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">ប្រមាណជាប្រាក់រៀល</p>
                      <p className="text-sm font-bold text-emerald-300">
                        {formatKHR(reportData?.financial?.netBusinessProfitUsd || 0, exchangeRateKhr)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operating Expenses by Category */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                  ចំណាយប្រតិបត្តិការតាមប្រភេទ
                </h3>
                <div className="space-y-3">
                  {reportData?.financial?.expenseByCategory?.length > 0 ? (
                    reportData.financial.expenseByCategory.map((cat: any) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{cat.category}</span>
                          <span className="font-black text-rose-600">{formatUSD(cat.amountUsd)}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (cat.amountUsd /
                                    (reportData.financial.totalOperatingExpensesUsd || 1)) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-6 text-center">មិនទាន់មានទិន្នន័យចំណាយក្នុងចន្លោះពេលនេះទេ</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 9: INVENTORY REPORT (របាយការណ៍ស្តុក)
           ========================================================================= */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">តម្លៃស្តុកតាមថ្លៃដើម (Stock at Cost)</p>
                <h3 className="text-2xl font-black text-teal-600 mt-1">
                  {formatUSD(reportData?.inventory?.totalStockCostUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ≈ {formatKHR(reportData?.inventory?.totalStockCostUsd || 0, exchangeRateKhr)}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">តម្លៃស្តុកតាមតម្លៃលក់ (Retail Value)</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  {formatUSD(reportData?.inventory?.totalRetailValueUsd || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">តម្លៃសរុបប្រសិនបើលក់អស់</p>
              </div>

              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ទំនិញជិតអស់ស្តុក (Low Stock Alert)</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">
                  {reportData?.inventory?.lowStockCount || 0} មុខ
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ត្រូវការបញ្ជាទិញបន្ថែម</p>
              </div>

              <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ទំនិញអស់ពីស្តុក (Out of Stock)</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">
                  {reportData?.inventory?.outOfStockCount || 0} មុខ
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ចំនួនស្តុកស្មើនឹង ០</p>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                បរិមាណស្តុកតាមប្រភេទផលិតផល (Stock Count by Category)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {reportData?.inventory?.categoryDistribution?.map((cat: any) => (
                  <div
                    key={cat.name}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                  >
                    <p className="text-xs text-slate-500">{cat.name}</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{cat.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
