"use client";

import React, { useState, useEffect } from "react";
import {
  Users2,
  Plus,
  Search,
  CalendarCheck,
  DollarSign,
  FileText,
  Printer,
  Sparkles,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
  UserCheck,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD } from "@/lib/utils";

interface EmployeePayroll {
  id: string;
  code: string;
  nameKh: string;
  nameEn: string;
  position: string;
  phone: string;
  baseSalaryUsd: number;
  overtimeUsd: number;
  commissionUsd: number;
  bonusUsd: number;
  deductionUsd: number;
  netSalaryUsd: number;
  isDisbursed: boolean;
  hireDate?: string;
}

export default function HRMPage() {
  const { language } = usePOSStore();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<"PAYROLL" | "EMPLOYEES">("PAYROLL");
  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add Employee Modal
  const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState({
    fullNameKh: "",
    fullNameEn: "",
    position: "Senior Repair Technician",
    baseSalaryUsd: "450",
    phone: "",
  });

  const fetchHRMData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/hrm");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Failed to load HRM data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHRMData();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.fullNameKh || !empForm.phone) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/hrm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_EMPLOYEE",
          fullNameKh: empForm.fullNameKh,
          fullNameEn: empForm.fullNameEn,
          position: empForm.position,
          baseSalaryUsd: parseFloat(empForm.baseSalaryUsd) || 300,
          phone: empForm.phone,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setIsAddEmpModalOpen(false);
      setEmpForm({
        fullNameKh: "",
        fullNameEn: "",
        position: "Senior Repair Technician",
        baseSalaryUsd: "450",
        phone: "",
      });
      await fetchHRMData();
    } catch (err: any) {
      alert("បរាជ័យ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisbursePayroll = async (empId: string) => {
    try {
      const res = await fetch("/api/hrm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISBURSE_PAYROLL",
          employeeId: empId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchHRMData();
      }
    } catch (err) {
      console.error("Failed to disburse payroll:", err);
    }
  };

  const totalPayrollUsd = employees.reduce((a, b) => a + b.netSalaryUsd, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users2 className="h-6 w-6 text-teal-700" />
            {t.hrm} & {t.payroll}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            គ្រប់គ្រងបុគ្គលិក ប្រាក់ខែគោល ថែមម៉ោង និងកម្រៃជើងសារពីការជួសជុលផ្ទាល់ពី Supabase
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHRMData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-teal-700 ${loading ? "animate-spin" : ""}`} />
            ផ្ទុកឡើងវិញ
          </button>
          <button
            onClick={() => setIsAddEmpModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
          >
            <Plus className="h-4 w-4" />
            បន្ថែមបុគ្គលិកថ្មី
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab("PAYROLL")}
          className={`pb-3 transition ${
            activeTab === "PAYROLL"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          តារាងបើកប្រាក់បៀវត្ស ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab("EMPLOYEES")}
          className={`pb-3 transition ${
            activeTab === "EMPLOYEES"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          បញ្ជីបុគ្គលិកទាំងអស់ ({employees.length})
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
          <span className="text-xs font-semibold">កំពុងទាញទិន្នន័យបុគ្គលិក...</span>
        </div>
      ) : employees.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Users2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">មិនទាន់មានទិន្នន័យបុគ្គលិកនៅក្នុងប្រព័ន្ធទេ</p>
          <button
            onClick={() => setIsAddEmpModalOpen(true)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> បន្ថែមបុគ្គលិកដំបូង
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              សរុបប្រាក់បៀវត្សត្រូវបើក:{" "}
              <strong className="text-slate-900 font-mono font-bold text-sm">${totalPayrollUsd.toFixed(2)}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">កូដ & ឈ្មោះបុគ្គលិក</th>
                  <th className="py-3 px-4">មុខតំណែង</th>
                  <th className="py-3 px-4 text-right">ប្រាក់ខែគោល</th>
                  <th className="py-3 px-4 text-right">កម្រៃជើងសារជួសជុល</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">ប្រាក់ខែសុទ្ធ</th>
                  <th className="py-3 px-4 text-center">ស្ថានភាពបើក</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{emp.nameKh}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {emp.code} • {emp.phone}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {emp.position}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">${Number(emp.baseSalaryUsd || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-amber-600 font-bold">
                      +${Number(emp.commissionUsd || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-teal-800 text-sm">
                      ${Number(emp.netSalaryUsd || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {emp.isDisbursed ? (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 text-[10px]">
                          បានបើកជូន
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDisbursePayroll(emp.id)}
                          className="rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-700 hover:text-white px-2.5 py-1 text-[10px] font-bold transition"
                        >
                          បើកប្រាក់ខែ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {isAddEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Users2 className="h-5 w-5 text-teal-700" />
                បន្ថែមបុគ្គលិកថ្មី
              </h3>
              <button onClick={() => setIsAddEmpModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះបុគ្គលិក (ខ្មែរ) *</label>
                <input
                  type="text"
                  required
                  value={empForm.fullNameKh}
                  onChange={(e) => setEmpForm({ ...empForm, fullNameKh: e.target.value })}
                  placeholder="ឧ. ជា សុខា"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">លេខទូរស័ព្ទ *</label>
                <input
                  type="text"
                  required
                  value={empForm.phone}
                  onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                  placeholder="012 888 999"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">មុខតំណែង</label>
                <select
                  value={empForm.position}
                  onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                >
                  <option value="Senior Repair Technician">ជាងជួសជុលជាន់ខ្ពស់ (Senior Technician)</option>
                  <option value="POS Cashier">បុគ្គលិកគិតលុយ (POS Cashier)</option>
                  <option value="Branch Manager">អ្នកគ្រប់គ្រងសាខា (Branch Manager)</option>
                  <option value="Inventory Clerk">បុគ្គលិកឃ្លាំងស្តុក (Inventory Clerk)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ប្រាក់ខែគោល ($) *</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={empForm.baseSalaryUsd}
                  onChange={(e) => setEmpForm({ ...empForm, baseSalaryUsd: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEmpModalOpen(false)}
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
                  រក្សាទុក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
