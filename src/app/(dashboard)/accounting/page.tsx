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
  Tags,
  Tag,
  Trash2,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD, formatKHR } from "@/lib/utils";

const DEFAULT_CATEGORIES: string[] = [
  "ថ្លៃជួលទីតាំង & អគ្គិសនី (Rent & Utilities)",
  "ចំណាយអ៊ីនធឺណិត & ទឹកភ្លើង (Internet & Water)",
  "សម្ភារៈការិយាល័យ & បោះពុម្ព (Office & Printing)",
  "ទីផ្សារ & ការផ្សាយពាណិជ្ជកម្ម (Marketing)",
  "ចំណាយដឹកជញ្ជូន (Logistics & Shipping)",
  "ប្រាក់បៀវត្ស & ប្រាក់ឧបត្ថម្ភ (Salary & Allowances)",
  "ចំណាយជួសជុល & ថែទាំ (Repairs & Maintenance)",
  "ថ្លៃសាំង & មធ្យោបាយធ្វើដំណើរ (Gasoline & Travel)",
  "ថ្លៃអាហារ & បដិសណ្ឋារកិច្ច (Food & Beverage)",
  "ចំណាយផ្សេងៗ (Miscellaneous)",
];

export default function AccountingPage() {
  const { language, exchangeRateKhr } = usePOSStore();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<"PL" | "COA" | "EXPENSES">("PL");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  const [pnlData, setPnlData] = useState<any>({
    revenue: [],
    cogs: [],
    expenses: [],
    summary: { totalRevenue: 0, totalCogs: 0, grossProfit: 0, totalExpenses: 0, netProfit: 0 },
  });

  // Expense Category Management State
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategoryInline, setIsAddingCategoryInline] = useState(false);
  const [inlineCategoryInput, setInlineCategoryInput] = useState("");
  const [categoryActionLoading, setCategoryActionLoading] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Add Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [expenseForm, setExpenseForm] = useState({
    accountId: "",
    category: "ថ្លៃជួលទីតាំង & អគ្គិសនី (Rent & Utilities)",
    amountUsd: "",
    paidTo: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });

  const fetchAccountingData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/accounting");
      const data = await res.json();
      if (data.success) {
        const accs = data.accounts || [];
        setAccounts(accs);
        setExpenses(data.expenses || []);
        if (data.pnl) setPnlData(data.pnl);

        // Load dynamic categories from Supabase
        if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }

        // Auto-select first expense account if not yet selected
        const firstExp = accs.find((a: any) => a.type === "EXPENSE") || accs[0];
        if (firstExp) {
          setExpenseForm((prev) => ({
            ...prev,
            accountId: prev.accountId || firstExp.id,
          }));
        }
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

  const handleAddCategory = async (catName: string, selectImmediately = false) => {
    const trimmed = catName.trim();
    if (!trimmed) {
      setCategoryMessage({ text: "សូមបញ្ចូលឈ្មោះប្រភេទចំណាយ!", type: "error" });
      return;
    }
    try {
      setCategoryActionLoading(true);
      setCategoryMessage(null);
      const res = await fetch("/api/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_EXPENSE_CATEGORY", category: trimmed }),
      });
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
        setNewCategoryName("");
        setInlineCategoryInput("");
        setIsAddingCategoryInline(false);
        if (selectImmediately) {
          setExpenseForm((prev) => ({ ...prev, category: trimmed }));
        }
        setCategoryMessage({ text: `✓ បានបន្ថែម «${trimmed}» ដោយជោគជ័យ!`, type: "success" });
        setTimeout(() => setCategoryMessage(null), 3500);
      } else {
        throw new Error(data.error || "បរាជ័យក្នុងការបន្ថែមប្រភេទចំណាយ");
      }
    } catch (err: any) {
      setCategoryMessage({ text: err.message, type: "error" });
    } finally {
      setCategoryActionLoading(false);
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបប្រភេទចំណាយ «${catName}» នេះចេញពីប្រព័ន្ធមែនទេ?`)) return;
    try {
      setCategoryActionLoading(true);
      setCategoryMessage(null);
      const res = await fetch("/api/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_EXPENSE_CATEGORY", category: catName }),
      });
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
        if (expenseForm.category === catName) {
          setExpenseForm((prev) => ({ ...prev, category: data.categories[0] || "ចំណាយផ្សេងៗ (Miscellaneous)" }));
        }
        if (selectedCategoryFilter === catName) {
          setSelectedCategoryFilter("ALL");
        }
        setCategoryMessage({ text: `✓ បានលុបប្រភេទចំណាយដោយជោគជ័យ!`, type: "success" });
        setTimeout(() => setCategoryMessage(null), 3000);
      } else {
        throw new Error(data.error || "បរាជ័យក្នុងការលុប");
      }
    } catch (err: any) {
      setCategoryMessage({ text: err.message, type: "error" });
    } finally {
      setCategoryActionLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError("");
    const parsedAmount = parseFloat(expenseForm.amountUsd);
    if (!parsedAmount || parsedAmount <= 0) {
      setExpenseError("សូមបញ្ចូលទឹកប្រាក់ចំណាយឲ្យបានត្រឹមត្រូវ (> 0)!");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_EXPENSE",
          accountId: expenseForm.accountId || undefined,
          category: expenseForm.category,
          amountUsd: parsedAmount,
          paidTo: expenseForm.paidTo,
          notes: expenseForm.notes,
          date: expenseForm.date,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "បរាជ័យក្នុងការកត់ត្រាចំណាយ");
      }

      setIsExpenseModalOpen(false);
      const firstExp = accounts.find((a: any) => a.type === "EXPENSE") || accounts[0];
      setExpenseForm({
        accountId: firstExp?.id || "",
        category: categories[0] || "ថ្លៃជួលទីតាំង & អគ្គិសនី (Rent & Utilities)",
        amountUsd: "",
        paidTo: "",
        notes: "",
        date: new Date().toISOString().split("T")[0],
      });
      await fetchAccountingData();
    } catch (err: any) {
      setExpenseError(err.message || "មានបញ្ហាក្នុងការរក្សាទុកចំណាយ");
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
            onClick={() => setIsManageCategoriesOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            title="គ្រប់គ្រងប្រភេទចំណាយ (Manage Categories)"
          >
            <Tags className="h-3.5 w-3.5 text-teal-700" />
            ប្រភេទចំណាយ
          </button>
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
      {!loading && activeTab === "EXPENSES" && (() => {
        const filteredExpenses = selectedCategoryFilter === "ALL"
          ? expenses
          : expenses.filter((e) => e.category === selectedCategoryFilter);
        const totalFilteredUsd = filteredExpenses.reduce((sum, e) => sum + Number(e.amountUsd || 0), 0);

        return (
          <div className="space-y-3">
            {/* Category filter toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                  <Filter className="h-3 w-3" /> តម្រង:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("ALL")}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                    selectedCategoryFilter === "ALL"
                      ? "bg-teal-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ទាំងអស់ ({expenses.length})
                </button>
                {categories.map((cat) => {
                  const count = expenses.filter((e) => e.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`rounded-xl px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${
                        selectedCategoryFilter === cat
                          ? "bg-teal-700 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{cat}</span>
                      {count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            selectedCategoryFilter === cat
                              ? "bg-teal-800 text-teal-100"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">
                  សរុប: <span className="font-mono text-rose-600 font-extrabold">{formatUSD(totalFilteredUsd)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsManageCategoriesOpen(true)}
                  className="rounded-xl border border-slate-200 hover:border-teal-300 bg-slate-50 hover:bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800 transition flex items-center gap-1"
                >
                  <Tags className="h-3 w-3 text-teal-700" />
                  គ្រប់គ្រងប្រភេទ
                </button>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {filteredExpenses.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600">
                    {selectedCategoryFilter === "ALL"
                      ? "មិនទាន់មានកំណត់ត្រាចំណាយនៅឡើយទេ"
                      : `មិនមានចំណាយក្នុងប្រភេទ «${selectedCategoryFilter}» នេះទេ`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseError("");
                      if (selectedCategoryFilter !== "ALL") {
                        setExpenseForm((prev) => ({ ...prev, category: selectedCategoryFilter }));
                      }
                      setIsExpenseModalOpen(true);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:underline"
                  >
                    <Plus className="h-4 w-4" /> កត់ត្រាចំណាយថ្មី
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">កាលបរិច្ឆេទ</th>
                        <th className="py-3 px-4">គណនី (Account)</th>
                        <th className="py-3 px-4">ប្រភេទចំណាយ</th>
                        <th className="py-3 px-4">ចំណាយទៅកាន់</th>
                        <th className="py-3 px-4">កំណត់ចំណាំ</th>
                        <th className="py-3 px-4 text-right">ទឹកប្រាក់ ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {exp.date ? new Date(exp.date).toISOString().split("T")[0] : "-"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                              {exp.account?.code || "5010"} - {exp.account?.nameKh || "ចំណាយ"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                              <Tag className="h-3 w-3 text-teal-600" />
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{exp.paidTo || "-"}</td>
                          <td className="py-3 px-4 text-slate-400">{exp.notes || "-"}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                            {formatUSD(Number(exp.amountUsd || 0))}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {formatKHR(Number(exp.amountUsd || 0), exchangeRateKhr)}
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
        );
      })()}

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-teal-700" />
                កត់ត្រាចំណាយថ្មី (Add Expense)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setExpenseError("");
                  setIsExpenseModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {expenseError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                ⚠️ {expenseError}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="p-6 space-y-4 text-xs">
              {accounts.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">គណនីចំណាយ (Account)</label>
                  <select
                    value={expenseForm.accountId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, accountId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                  >
                    {accounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.nameKh} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">កាលបរិច្ឆេទ (Date)</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-teal-700 focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">ប្រភេទចំណាយ (Category) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategoryInline(!isAddingCategoryInline);
                      setInlineCategoryInput("");
                    }}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    {isAddingCategoryInline ? "ជ្រើសពីបញ្ជី" : "+ បន្ថែមប្រភេទថ្មី"}
                  </button>
                </div>

                {isAddingCategoryInline ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        placeholder="បញ្ចូលឈ្មោះប្រភេទចំណាយថ្មី..."
                        value={inlineCategoryInput}
                        onChange={(e) => setInlineCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (inlineCategoryInput.trim()) {
                              handleAddCategory(inlineCategoryInput.trim(), true);
                            }
                          }
                        }}
                        className="flex-1 rounded-xl border border-teal-400 bg-teal-50/40 p-2 text-xs focus:border-teal-700 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        disabled={categoryActionLoading || !inlineCategoryInput.trim()}
                        onClick={() => handleAddCategory(inlineCategoryInput.trim(), true)}
                        className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50 transition shrink-0"
                      >
                        {categoryActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "បន្ថែម"}
                      </button>
                    </div>
                    <p className="text-[10px] text-teal-700">
                      💡 នឹងរក្សាទុកក្នុង Supabase ស្វ័យប្រវត្តិ និងជ្រើសរើសប្រភេទនេះភ្លាមៗ
                    </p>
                  </div>
                ) : (
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">ទឹកប្រាក់ចំណាយ ($) *</label>
                  {parseFloat(expenseForm.amountUsd) > 0 && (
                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                      ~ {formatKHR(parseFloat(expenseForm.amountUsd) || 0, exchangeRateKhr)}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
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
                  placeholder="ឧ. ម្ចាស់ផ្ទះជួល / ក្រុមហ៊ុន EDC / Smart"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">កំណត់ចំណាំ (Notes)</label>
                <input
                  type="text"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  placeholder="វិក្កយបត្រខែ... / ចំណាយលើ..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseError("");
                    setIsExpenseModalOpen(false);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 font-bold text-white hover:bg-teal-800 disabled:opacity-50 transition active:scale-95"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  រក្សាទុកចំណាយ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Expense Categories Modal */}
      {isManageCategoriesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-700">
                  <Tags className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    គ្រប់គ្រងប្រភេទចំណាយ (Expense Categories)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    រក្សាទុកក្នុង Supabase Database និងប្រើប្រាស់រួមគ្នាគ្រប់ឧបករណ៍
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManageCategoriesOpen(false);
                  setCategoryMessage(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notification message */}
            {categoryMessage && (
              <div
                className={`mx-6 mt-4 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  categoryMessage.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-700"
                }`}
              >
                {categoryMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <span>⚠️</span>
                )}
                <span>{categoryMessage.text}</span>
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Add form */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  បន្ថែមប្រភេទចំណាយថ្មី (Add New Category)
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newCategoryName.trim()) {
                      handleAddCategory(newCategoryName.trim());
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="ឧ. ជួសជុលម៉ាស៊ីនត្រជាក់ (AC Repair) / សាំងឡាន..."
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-700 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={categoryActionLoading || !newCategoryName.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50 transition shrink-0"
                  >
                    {categoryActionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    បន្ថែម
                  </button>
                </form>
              </div>

              {/* Categories list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">
                    បញ្ជីប្រភេទចំណាយបច្ចុប្បន្ន ({categories.length})
                  </span>
                  <span className="text-[10px] text-slate-400">ចុចលើរូបធុងសំរាមដើម្បីលុប</span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                  {categories.map((cat, idx) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition group text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 w-5">{idx + 1}.</span>
                        <Tag className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        <span className="font-bold text-slate-800">{cat}</span>
                      </div>
                      <button
                        type="button"
                        disabled={categoryActionLoading}
                        onClick={() => handleDeleteCategory(cat)}
                        className="opacity-60 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="លុបប្រភេទចំណាយនេះ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end bg-slate-50/70 border-t border-slate-100 px-6 py-3">
              <button
                type="button"
                onClick={() => {
                  setIsManageCategoriesOpen(false);
                  setCategoryMessage(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                បិទ (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
