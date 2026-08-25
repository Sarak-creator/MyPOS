"use client";

import React, { useState, useEffect } from "react";
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
  Sparkles,
  QrCode,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD, formatKHR } from "@/lib/utils";

export default function DashboardPage() {
  const { language, currentBranchName, exchangeRateKhr } = usePOSStore();
  const t = translations[language];

  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    todaySalesUsd: 0,
    todaySalesKhr: 0,
    totalTransactions: 0,
    activeRepairsCount: 0,
    totalProductsCount: 0,
    lowStockCount: 0,
    totalDebtUsd: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      if (data.success) {
        setStatsData(data.stats);
        setRecentOrders(data.recentOrders || []);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const stats = [
    {
      title: language === "km" ? "ចំណូលលក់ថ្ងៃនេះ" : "Today's Gross Sales",
      valueUsd: statsData.todaySalesUsd,
      change: `ថ្ងៃនេះ (${statsData.totalTransactions} ប្រតិបត្តិការ)`,
      isPositive: true,
      icon: DollarSign,
      color: "from-teal-600 to-emerald-700",
    },
    {
      title: language === "km" ? "ទំនិញក្នុងស្តុកសរុប" : "Total Products",
      value: statsData.totalProductsCount.toString(),
      change: `${statsData.lowStockCount} ជិតអស់ស្តុក`,
      isPositive: statsData.lowStockCount === 0,
      icon: Package,
      color: "from-blue-600 to-indigo-700",
    },
    {
      title: language === "km" ? "សេវាជួសជុលសកម្ម" : "Active Repair Tickets",
      value: statsData.activeRepairsCount.toString(),
      change: "កំពុងដំណើរការ",
      isPositive: true,
      icon: Wrench,
      color: "from-amber-500 to-orange-600",
    },
    {
      title: language === "km" ? "បំណុលអតិថិជនសរុប (AR)" : "Total Accounts Receivable",
      valueUsd: statsData.totalDebtUsd,
      change: "បំណុលមិនទាន់ទូទាត់",
      isPositive: false,
      icon: CreditCard,
      color: "from-rose-500 to-red-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Branch Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="h-4 w-4" />
            <span>{currentBranchName}</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {language === "km" ? "ផ្ទាំងគ្រប់គ្រងប្រតិបត្តិការទូទៅ" : "Central Enterprise Dashboard"}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            ទិដ្ឋភាពរួមនៃការលក់ សេវាកម្មជួសជុល ស្ថានភាពឃ្លាំងស្តុក និងទិន្នន័យផ្ទាល់ពី Supabase
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardStats}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-teal-400 ${loading ? "animate-spin" : ""}`} />
            ធ្វើបច្ចុប្បន្នភាព
          </button>
          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-xs border border-white/10">
            <div className="h-10 w-10 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-300 font-semibold">Supabase & ABA KHQR</p>
              <p className="text-xs font-bold text-teal-300">Connected</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((st, idx) => {
          const Icon = st.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">{st.title}</span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${st.color} text-white shadow-xs`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div>
                <p className="text-2xl font-black font-mono text-slate-900">
                  {st.valueUsd !== undefined ? formatUSD(st.valueUsd) : st.value}
                </p>
                {st.valueUsd !== undefined && (
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    {formatKHR(st.valueUsd, exchangeRateKhr)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span
                  className={`flex items-center font-bold ${
                    st.isPositive ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {st.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid: Recent Transactions & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent POS Sales Invoices */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-teal-700" />
              {language === "km" ? "ប្រតិបត្តិការលក់ចុងក្រោយ" : "Recent Sales Transactions"}
            </h3>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              មិនទាន់មានវិក្កយបត្រលក់នៅឡើយទេ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">លេខវិក្កយបត្រ</th>
                    <th className="py-2.5 px-3">អតិថិជន</th>
                    <th className="py-2.5 px-3 text-right">ទឹកប្រាក់ ($)</th>
                    <th className="py-2.5 px-3 text-center">ស្ថានភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {recentOrders.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{tx.invoiceNumber}</td>
                      <td className="py-3 px-3">{tx.customerName}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ${Number(tx.totalUsd || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Reorder Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {language === "km" ? "ទំនិញជិតអស់ពីស្តុក" : "Low Stock Alerts"}
            </h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              {statsData.lowStockCount} មុខ
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-xs text-slate-600">
            {statsData.lowStockCount > 0 ? (
              <p className="text-amber-700 font-medium">
                ⚠️ មានទំនិញចំនួន {statsData.lowStockCount} មុខ ដែលមានបរិមាណស្តុកទាបជាងកម្រិតដាស់តឿន។ សូមពិនិត្យមើលក្នុងផ្នែកស្តុកទំនិញ។
              </p>
            ) : (
              <p className="text-emerald-700 font-medium">
                ✅ ស្តុកទំនិញទាំងអស់ស្ថិតក្នុងកម្រិតសុវត្ថិភាពល្អ។
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
