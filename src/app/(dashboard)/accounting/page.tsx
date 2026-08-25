"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpenCheck,
  Plus,
  DollarSign,
  PieChart,
  FileText,
  Building,
  TrendingDown,
  TrendingUp,
  Receipt,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD, formatKHR } from "@/lib/utils";

export default function AccountingPage() {
  const { language, exchangeRateKhr } = usePOSStore();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<"PL" | "COA" | "EXPENSES">("PL");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [pnlData, setPnlData] = useState<any>({
    revenue: [],
    cogs: [],
    expenses: [],
    summary: { totalRevenue: 0, totalCogs: 0, grossProfit: 0, totalExpenses: 0, netProfit: 0 },
  });

  // Add Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Rent & Utilities",
    amountUsd: "",
    paidTo: "",
    notes: "",
  });

  const fetchAccountingData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/accounting");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts || []);
        setExpenses(data.expenses || []);
        if (data.pnl) setPnlData(data.pnl);
      }
    } catch (err) {
      console.error("Failed to load accounting data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amountUsd) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_EXPENSE",
          category: expenseForm.category,
          amountUsd: parseFloat(expenseForm.amountUsd) || 0,
          paidTo: expenseForm.paidTo,
          notes: expenseForm.notes,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setIsExpenseModalOpen(false);
      setExpenseForm({
        category: "Rent & Utilities",
        amountUsd: "",
        paidTo: "",
        notes: "",
      });
      await fetchAccountingData();
    } catch (err: any) {
      alert("បរាជ័យ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpenCheck className="h-6 w-6 text-teal-700" />
            {t.accounting}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            តារាងគណនី (COA) របាយការណ៍ចំណេញ-ខាត (P&L) និងការគ្រប់គ្រងចំណាយផ្ទាល់ពី Supabase
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAccountingData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-teal-700 ${loading ? "animate-spin" : ""}`} />
            ផ្ទុកឡើងវិញ
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
          >
            <Plus className="h-4 w-4" />
            {t.addExpense}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab("PL")}
          className={`pb-3 transition ${
            activeTab === "PL"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.profitAndLoss} (P&L Statement)
        </button>
        <button
          onClick={() => setActiveTab("COA")}
          className={`pb-3 transition ${
            activeTab === "COA"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.chartOfAccounts} ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab("EXPENSES")}
          className={`pb-3 transition ${
            activeTab === "EXPENSES"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          កំណត់ត្រាចំណាយ ({expenses.length})
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
          <span className="text-xs font-semibold">កំពុងគណនាតារាងគណនេយ្យ...</span>
        </div>
      )}

      {/* P&L Statement View */}
      {!loading && activeTab === "PL" && (() => {
        const summary = pnlData?.summary || {
          totalRevenue: pnlData?.totalRevenueUsd || 0,
          grossProfit: pnlData?.grossProfitUsd || 0,
          netProfit: pnlData?.netProfitUsd || 0,
          totalExpenses: pnlData?.operatingExpensesUsd || 0,
          totalCogs: pnlData?.totalCogsUsd || 0,
        };
        const revenueList = Array.isArray(pnlData?.revenue) ? pnlData.revenue : [];
        const cogsList = Array.isArray(pnlData?.cogs) ? pnlData.cogs : [];

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ចំណូលសរុប (Total Revenue)</p>
                <p className="text-2xl font-black font-mono text-teal-800 mt-1">
                  {formatUSD(summary.totalRevenue || 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ចំណេញដុល (Gross Profit)</p>
                <p className="text-2xl font-black font-mono text-emerald-600 mt-1">
                  {formatUSD(summary.grossProfit || 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-bold text-slate-500">ចំណេញសុទ្ធ (Net Profit)</p>
                <p
                  className={`text-2xl font-black font-mono mt-1 ${
                    (summary.netProfit || 0) >= 0 ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {formatUSD(summary.netProfit || 0)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs divide-y divide-slate-100 text-xs">
              {/* Revenue */}
              <div className="pb-4 space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] text-teal-800">
                  ១. ចំណូលពីប្រតិបត្តិការ (Operating Revenue)
                </h4>
                {revenueList.length > 0 ? (
                  revenueList.map((r: any, i: number) => (
                    <div key={i} className="flex justify-between text-slate-700">
                      <span>{r.name}</span>
                      <span className="font-mono font-bold">{formatUSD(r.amountUsd || 0)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-slate-500 italic">
                    <span>ចំណូលពីការលក់ទំនិញ</span>
                    <span className="font-mono font-bold">{formatUSD(summary.totalRevenue || 0)}</span>
                  </div>
                )}
              </div>

              {/* COGS */}
              <div className="py-4 space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] text-amber-700">
                  ២. ថ្លៃដើមទំនិញលក់ចេញ (Cost of Goods Sold - COGS)
                </h4>
                {cogsList.length > 0 ? (
                  cogsList.map((c: any, i: number) => (
                    <div key={i} className="flex justify-between text-slate-700">
                      <span>{c.name}</span>
                      <span className="font-mono font-bold text-rose-600">({formatUSD(c.amountUsd || 0)})</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-slate-500 italic">
                    <span>ថ្លៃដើមទំនិញសរុប</span>
                    <span className="font-mono font-bold text-rose-600">({formatUSD(summary.totalCogs || 0)})</span>
                  </div>
                )}
              </div>

              {/* Expenses */}
              <div className="pt-4 space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] text-rose-700">
                  ៣. ចំណាយប្រតិបត្តិការ (Operating Expenses)
                </h4>
                <div className="flex justify-between text-slate-700">
                  <span>ចំណាយទូទៅ និងការចំណាយផ្សេងៗ</span>
                  <span className="font-mono font-bold text-rose-600">({formatUSD(summary.totalExpenses || 0)})</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* COA View */}
      {!loading && activeTab === "COA" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">កូដគណនី</th>
                <th className="py-3 px-4">ឈ្មោះគណនី (ខ្មែរ / អង់គ្លេស)</th>
                <th className="py-3 px-4">ប្រភេទ (Type)</th>
                <th className="py-3 px-4 text-right">សមតុល្យបច្ចុប្បន្ន ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono font-bold text-teal-800">{acc.code}</td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{acc.nameKh}</p>
                    <p className="text-[10px] text-slate-400">{acc.nameEn}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {acc.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatUSD(Number(acc.balanceUsd || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expenses View */}
      {!loading && activeTab === "EXPENSES" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {expenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">មិនទាន់មានកំណត់ត្រាចំណាយនៅឡើយទេ</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">កាលបរិច្ឆេទ</th>
                  <th className="py-3 px-4">ប្រភេទចំណាយ</th>
                  <th className="py-3 px-4">ចំណាយទៅកាន់</th>
                  <th className="py-3 px-4">កំណត់ចំណាំ</th>
                  <th className="py-3 px-4 text-right">ទឹកប្រាក់ ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">{exp.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{exp.category}</td>
                    <td className="py-3 px-4 text-slate-600">{exp.paidTo}</td>
                    <td className="py-3 px-4 text-slate-400">{exp.notes || "-"}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      {formatUSD(Number(exp.amountUsd || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-teal-700" />
                កត់ត្រាចំណាយថ្មី (Add Expense)
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ប្រភេទចំណាយ *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                >
                  <option value="ថ្លៃជួលទីតាំង & អគ្គិសនី (Rent & Utilities)">ថ្លៃជួលទីតាំង & អគ្គិសនី (Rent & Utilities)</option>
                  <option value="ចំណាយអ៊ីនធឺណិត & ទឹកភ្លើង (Internet & Water)">ចំណាយអ៊ីនធឺណិត & ទឹកភ្លើង (Internet & Water)</option>
                  <option value="សម្ភារៈការិយាល័យ & បោះពុម្ព (Office & Printing)">សម្ភារៈការិយាល័យ & បោះពុម្ព (Office & Printing)</option>
                  <option value="ទីផ្សារ & ការផ្សាយពាណិជ្ជកម្ម (Marketing)">ទីផ្សារ & ការផ្សាយពាណិជ្ជកម្ម (Marketing)</option>
                  <option value="ចំណាយផ្សេងៗ (Miscellaneous)">ចំណាយផ្សេងៗ (Miscellaneous)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ទឹកប្រាក់ចំណាយ ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={expenseForm.amountUsd}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amountUsd: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-base font-bold font-mono text-rose-700 focus:border-rose-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">បង់ជូនទៅកាន់ (Paid To)</label>
                <input
                  type="text"
                  value={expenseForm.paidTo}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
                  placeholder="ឧ. ម្ចាស់ផ្ទះជួល / ក្រុមហ៊ុន EDC"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">កំណត់ចំណាំ</label>
                <input
                  type="text"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  placeholder="វិក្កយបត្រខែសីហា..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 font-bold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  រក្សាទុកចំណាយ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
