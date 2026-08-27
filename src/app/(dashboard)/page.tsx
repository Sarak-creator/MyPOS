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
      title: t.todaySales,
      valueUsd: statsData.todaySalesUsd,
      change: `${statsData.totalTransactions} ${t.todayTransactions}`,
      isPositive: true,
      icon: DollarSign,
      color: "from-teal-600 to-emerald-700",
    },
    {
      title: t.totalProducts,
      value: statsData.totalProductsCount.toString(),
      change: `${statsData.lowStockCount} ${t.lowStockCountText}`,
      isPositive: statsData.lowStockCount === 0,
      icon: Package,
      color: "from-blue-600 to-indigo-700",
    },
    {
      title: t.activeRepairs,
      value: statsData.activeRepairsCount.toString(),
      change: t.inProgress,
      isPositive: true,
      icon: Wrench,
      color: "from-amber-500 to-orange-600",
    },
    {
      title: t.totalArDebt,
      valueUsd: statsData.totalDebtUsd,
      change: t.unpaidDebt,
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
            {t.centralDashboard}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {t.appSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardStats}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 transition shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>{t.loading.replace("...", "")}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">{stat.title}</p>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-xs`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-3">
                {stat.valueUsd !== undefined ? (
                  <div>
                    <h3 className="text-xl font-black font-mono text-slate-900">
                      {formatUSD(stat.valueUsd)}
                    </h3>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">
                      {formatKHR(stat.valueUsd, exchangeRateKhr)}
                    </p>
                  </div>
                ) : (
                  <h3 className="text-2xl font-black font-mono text-slate-900">
                    {stat.value}
                  </h3>
                )}
              </div>

              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span>{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-teal-700" />
              {t.recentSales}
            </h3>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              {t.noProductsFound}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">{t.receiptNumber}</th>
                    <th className="py-2.5 px-3">{t.customer}</th>
                    <th className="py-2.5 px-3 text-right">{t.grandTotal} ($)</th>
                    <th className="py-2.5 px-3 text-center">{t.status}</th>
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
              {t.lowStockAlerts}
            </h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              {statsData.lowStockCount} {t.perUnit}
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
