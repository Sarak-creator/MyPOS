"use client";

import React, { useState, useEffect } from "react";
import {
  Contact2,
  Plus,
  Search,
  AlertCircle,
  Clock,
  Phone,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  UserCheck,
  Send,
  Loader2,
  RefreshCw,
  X,
  CreditCard,
  Trash2,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD, formatKHR } from "@/lib/utils";

interface CustomerDebtItem {
  id: string;
  name: string;
  phone: string;
  tier: string;
  loyaltyPoints: number;
  creditLimitUsd: number;
  totalDebtUsd: number;
  agingCategory: "0_30" | "31_60" | "61_90" | "OVER_90";
  dueDate: string;
  lastPaymentDate?: string;
}

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  tier: string;
  loyaltyPoints: number;
  creditLimitUsd: number;
  currentDebtUsd: number;
}

export default function CRMPage() {
  const { language, exchangeRateKhr } = usePOSStore();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<"DEBT" | "CUSTOMERS">("DEBT");
  const [searchQuery, setSearchQuery] = useState("");
  const [debts, setDebts] = useState<CustomerDebtItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [selectedDebtCustomer, setSelectedDebtCustomer] = useState<CustomerDebtItem | null>(null);

  // Add Customer Form
  const [customerFormData, setCustomerFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    tier: "RETAIL",
    creditLimitUsd: 0,
  });

  // Repayment Form
  const [repayAmount, setRepayAmount] = useState<string>("");
  const [repayMethod, setRepayMethod] = useState<string>("CASH_USD");
  const [repayNotes, setRepayNotes] = useState<string>("");

  const fetchCRMData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setDebts(data.debts || []);
      }
    } catch (err) {
      console.error("Failed to load CRM data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCRMData();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.name || !customerFormData.phone) {
      alert("សូមបញ្ចូលឈ្មោះ និងលេខទូរស័ព្ទ!");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerFormData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setIsCustomerModalOpen(false);
      setCustomerFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        tier: "RETAIL",
        creditLimitUsd: 0,
      });
      await fetchCRMData();
    } catch (err: any) {
      alert("បរាជ័យ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtCustomer || !repayAmount) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/customers/${selectedDebtCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repaymentAmountUsd: parseFloat(repayAmount) || 0,
          repaymentMethod: repayMethod,
          repaymentNotes: repayNotes,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setIsRepayModalOpen(false);
      setSelectedDebtCustomer(null);
      setRepayAmount("");
      setRepayNotes("");
      await fetchCRMData();
    } catch (err: any) {
      alert("បរាជ័យ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបអតិថិជន "${name}" មែនទេ?`)) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchCRMData();
      } else {
        alert("បរាជ័យ: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSendReminder = (customer: CustomerDebtItem) => {
    alert(
      `📲 Telegram / SMS Debt Reminder Sent to ${customer.name} (${customer.phone}):\n` +
      `"សូមជម្រាបសួរលោក/លោកស្រី! សូមរំលឹកពីទឹកប្រាក់ជំពាក់ចំនួន $${customer.totalDebtUsd.toFixed(2)} ដែលត្រូវទូទាត់ត្រឹមកាលបរិច្ឆេទ ${customer.dueDate}។ អរគុណ!"`
    );
  };

  const totalOutstanding = debts.reduce((a, b) => a + b.totalDebtUsd, 0);

  const filteredDebts = debts.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery)
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Contact2 className="h-6 w-6 text-teal-700" />
            {t.crm} & {t.customerDebt}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            គ្រប់គ្រងបំណុលអតិថិជន របាយការណ៍អាយុកាលបំណុល (Debt Aging) និងការរំលឹកស្វ័យប្រវត្តិតាម Telegram
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCRMData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-teal-700 ${loading ? "animate-spin" : ""}`} />
            ផ្ទុកឡើងវិញ
          </button>
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
          >
            <Plus className="h-4 w-4" />
            បន្ថែមអតិថិជនថ្មី
          </button>
        </div>
      </div>

      {/* Debt Aging Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-bold text-slate-500">បំណុលសរុបទាំងអស់ (Total AR)</p>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">
            {formatUSD(totalOutstanding)}
          </p>
          <p className="text-[10px] text-slate-400 font-sans mt-0.5">
            {formatKHR(totalOutstanding, exchangeRateKhr)}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <p className="text-xs font-bold text-emerald-800">ក្នុងរង្វង់ 0-30 ថ្ងៃ (Current)</p>
          <p className="text-2xl font-black font-mono text-emerald-700 mt-1">
            ${debts.filter((d) => d.agingCategory === "0_30").reduce((s, d) => s + Number(d.totalDebtUsd || 0), 0).toFixed(2)}
          </p>
          <p className="text-[10px] text-emerald-600 font-sans mt-0.5">
            {debts.filter((d) => d.agingCategory === "0_30").length} អតិថិជន
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <p className="text-xs font-bold text-amber-800">31-60 ថ្ងៃ (Past Due)</p>
          <p className="text-2xl font-black font-mono text-amber-700 mt-1">
            ${debts.filter((d) => d.agingCategory === "31_60").reduce((s, d) => s + Number(d.totalDebtUsd || 0), 0).toFixed(2)}
          </p>
          <p className="text-[10px] text-amber-600 font-sans mt-0.5">
            {debts.filter((d) => d.agingCategory === "31_60").length} អតិថិជន
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
          <p className="text-xs font-bold text-rose-800">លើសពី 90 ថ្ងៃ (Critical Overdue)</p>
          <p className="text-2xl font-black font-mono text-rose-700 mt-1">
            ${debts.filter((d) => d.agingCategory === "OVER_90").reduce((s, d) => s + Number(d.totalDebtUsd || 0), 0).toFixed(2)}
          </p>
          <p className="text-[10px] text-rose-600 font-sans mt-0.5">
            {debts.filter((d) => d.agingCategory === "OVER_90").length} អតិថិជន
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab("DEBT")}
          className={`pb-3 transition ${
            activeTab === "DEBT"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          តារាងបំណុលអតិថិជន ({debts.length})
        </button>
        <button
          onClick={() => setActiveTab("CUSTOMERS")}
          className={`pb-3 transition ${
            activeTab === "CUSTOMERS"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          បញ្ជីអតិថិជនទាំងអស់ ({customers.length})
        </button>
      </div>

      {/* Tab 1: Debt Table */}
      {activeTab === "DEBT" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 w-72">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខទូរស័ព្ទ..."
                className="w-full text-xs focus:outline-hidden"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
              <span className="text-xs font-semibold">កំពុងទាញទិន្នន័យ...</span>
            </div>
          ) : filteredDebts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-bold text-slate-700">មិនមានអតិថិជនជំពាក់ប្រាក់ទេ!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">អតិថិជន & លេខទូរស័ព្ទ</th>
                    <th className="py-3 px-4">កម្រិត (Tier)</th>
                    <th className="py-3 px-4">កម្រិតអនុញ្ញាតជំពាក់</th>
                    <th className="py-3 px-4 text-right">ទឹកប្រាក់ជំពាក់ ($)</th>
                    <th className="py-3 px-4">កាលបរិច្ឆេទសង</th>
                    <th className="py-3 px-4">ស្ថានភាពអាយុកាល</th>
                    <th className="py-3 px-4 text-center">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredDebts.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{d.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />
                          {d.phone}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-teal-50 text-teal-800 font-bold px-2 py-0.5 text-[10px]">
                          {d.tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                        ${Number(d.creditLimitUsd || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-600 text-sm">
                        ${Number(d.totalDebtUsd || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{d.dueDate}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            d.agingCategory === "0_30"
                              ? "bg-emerald-50 text-emerald-700"
                              : d.agingCategory === "31_60"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {d.agingCategory === "0_30"
                            ? "0-30 ថ្ងៃ"
                            : d.agingCategory === "31_60"
                            ? "31-60 ថ្ងៃ"
                            : "លើសពី 90 ថ្ងៃ"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedDebtCustomer(d);
                              setRepayAmount(d.totalDebtUsd.toString());
                              setIsRepayModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 text-[11px] font-bold transition"
                          >
                            <DollarSign className="h-3 w-3" />
                            កត់ត្រាសង
                          </button>
                          <button
                            onClick={() => handleSendReminder(d)}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 px-2.5 py-1 text-[11px] font-bold transition"
                          >
                            <Send className="h-3 w-3" />
                            រំលឹក
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All Customers Table */}
      {activeTab === "CUSTOMERS" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 w-72">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខទូរស័ព្ទ..."
                className="w-full text-xs focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">ឈ្មោះអតិថិជន</th>
                  <th className="py-3 px-4">លេខទូរស័ព្ទ</th>
                  <th className="py-3 px-4">កម្រិត (Tier)</th>
                  <th className="py-3 px-4">ពិន្ទុសន្សំ (Points)</th>
                  <th className="py-3 px-4 text-right">បំណុលបច្ចុប្បន្ន ($)</th>
                  <th className="py-3 px-4 text-center">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{c.phone}</td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-100 text-slate-700 font-bold px-2 py-0.5 text-[10px]">
                        {c.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-teal-700 font-bold">{c.loyaltyPoints} pts</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ${Number(c.currentDebtUsd || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteCustomer(c.id, c.name)}
                        className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-red-700 hover:bg-red-50"
                        title="លុប"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Contact2 className="h-5 w-5 text-teal-700" />
                បន្ថែមអតិថិជនថ្មី
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះអតិថិជន *</label>
                <input
                  type="text"
                  required
                  value={customerFormData.name}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                  placeholder="ឧ. សុខ វិបុល"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">លេខទូរស័ព្ទ *</label>
                  <input
                    type="text"
                    required
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                    placeholder="012 888 999"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-teal-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">កម្រិត (Tier)</label>
                  <select
                    value={customerFormData.tier}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, tier: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                  >
                    <option value="RETAIL">លក់រាយ (Retail)</option>
                    <option value="WHOLESALE">ដុំ (Wholesale)</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">កម្រិតអនុញ្ញាតជំពាក់ ($ Credit Limit)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={customerFormData.creditLimitUsd}
                  onChange={(e) =>
                    setCustomerFormData({ ...customerFormData, creditLimitUsd: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-teal-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">អាសយដ្ឋាន</label>
                <input
                  type="text"
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  placeholder="ភ្នំពេញ"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
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
                  រក្សាទុកអតិថិជន
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD DEBT REPAYMENT MODAL */}
      {isRepayModalOpen && selectedDebtCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                កត់ត្រាការសងប្រាក់បំណុល
              </h3>
              <button onClick={() => setIsRepayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRepayment} className="p-6 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 text-slate-700 space-y-1">
                <p>
                  អតិថិជន: <strong className="text-slate-900">{selectedDebtCustomer.name}</strong> ({selectedDebtCustomer.phone})
                </p>
                <p>
                  បំណុលសរុបបច្ចុប្បន្ន: <strong className="text-red-600 font-mono">${Number(selectedDebtCustomer.totalDebtUsd || 0).toFixed(2)}</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ទឹកប្រាក់សង ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedDebtCustomer.totalDebtUsd}
                  required
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-base font-bold font-mono text-emerald-700 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">វិធីសាស្ត្រទូទាត់</label>
                <select
                  value={repayMethod}
                  onChange={(e) => setRepayMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                >
                  <option value="CASH_USD">សាច់ប្រាក់ USD (Cash USD)</option>
                  <option value="CASH_KHR">សាច់ប្រាក់រៀល (Cash KHR)</option>
                  <option value="KHQR_ABA">KHQR / ABA Bank</option>
                  <option value="CREDIT_CARD">កាតឥណទាន (Credit Card)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">កំណត់ចំណាំ</label>
                <input
                  type="text"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  placeholder="សងផ្តាច់ ឬសងមួយផ្នែក..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRepayModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  បញ្ជាក់ការសងប្រាក់
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
