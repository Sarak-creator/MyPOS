"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Percent,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldAlert,
  Loader2,
  Save,
} from "lucide-react";
import {
  LoanContractSettings,
  DEFAULT_INSTALLMENT_TERMS,
  DEFAULT_PAWN_TERMS,
} from "@/lib/config-manager";

export default function LoanContractSettingsPanel() {
  const [activeSubTab, setActiveSubTab] = useState<"RATES" | "INSTALLMENT_TERMS" | "PAWN_TERMS" | "STORE_INFO">("RATES");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState<LoanContractSettings>({
    installmentInterestRate: 1.5,
    pawnMonthlyInterestRate: 2.5,
    pawnDailyInterestRate: 0.1,
    latePenaltyPerDayUsd: 1.0,
    defaultPawnDurationDays: 30,
    defaultPawnDurationType: "DAYS",
    storeName: "អាណាចក្រPOS (ANACHAK POS)",
    storePhone: "012 345 678 / 096 376 0229",
    storeAddress: "រាជធានីភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា",
    witnessName: "",
    installmentContractTitle: "កិច្ចសន្យាទិញ-លក់បង់រំលស់ទំនិញ",
    installmentContractTerms: DEFAULT_INSTALLMENT_TERMS,
    pawnContractTitle: "កិច្ចសន្យាបញ្ចាំទ្រព្យ និងប័ណ្ណទទួលបញ្ចាំ",
    pawnContractTerms: DEFAULT_PAWN_TERMS,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/settings/loans");
      const data = await res.json();
      if (data.success && data.settings) {
        setForm(data.settings);
      }
    } catch (err: any) {
      console.error("Failed to load loan settings:", err);
      setErrorMsg("មិនអាចទាញយកការកំណត់បានទេ");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/settings/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg("បានរក្សាទុកការកំណត់កិច្ចសន្យា និងអត្រាការប្រាក់ដោយជោគជ័យ!");
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        setErrorMsg(data.error || "បរាជ័យក្នុងការរក្សាទុក");
      }
    } catch (err: any) {
      console.error("Failed to save loan settings:", err);
      setErrorMsg(err.message || "បញ្ហាបណ្តាញពេលរក្សាទុក");
    } finally {
      setSaving(false);
    }
  };

  const handleResetInstallmentTerms = () => {
    if (confirm("តើអ្នកពិតជាចង់កំណត់ខ្លឹមសារកិច្ចសន្យាបង់រំលស់ទៅតាមលំនាំដើមវិញមែនទេ?")) {
      setForm((prev) => ({ ...prev, installmentContractTerms: DEFAULT_INSTALLMENT_TERMS }));
    }
  };

  const handleResetPawnTerms = () => {
    if (confirm("តើអ្នកពិតជាចង់កំណត់ខ្លឹមសារកិច្ចសន្យាបញ្ចាំទៅតាមលំនាំដើមវិញមែនទេ?")) {
      setForm((prev) => ({ ...prev, pawnContractTerms: DEFAULT_PAWN_TERMS }));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-700" />
            ការកំណត់កិច្ចសន្យា & អត្រាការប្រាក់ (Contracts & Interest Rates)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Admin អាចកំណត់អត្រាការប្រាក់បង់រំលស់ ការប្រាក់បញ្ចាំ កែសម្រួលមាត្រាកិច្ចសន្យា និងព័ត៌មានហាងលើឯកសារបោះពុម្ព
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-800 transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          រក្សាទុកការកំណត់
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800 animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 overflow-x-auto gap-2 pt-3">
          <button
            type="button"
            onClick={() => setActiveSubTab("RATES")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "RATES"
                ? "border-teal-700 text-teal-800 bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Percent className="h-4 w-4" />
            អត្រាការប្រាក់ & ប្រាក់ពិន័យ
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("INSTALLMENT_TERMS")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "INSTALLMENT_TERMS"
                ? "border-teal-700 text-teal-800 bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="h-4 w-4" />
            កិច្ចសន្យាបង់រំលស់
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("PAWN_TERMS")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "PAWN_TERMS"
                ? "border-amber-600 text-amber-800 bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            កិច្ចសន្យាបញ្ចាំ & ដាច់បញ្ចាំ
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("STORE_INFO")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === "STORE_INFO"
                ? "border-teal-700 text-teal-800 bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 className="h-4 w-4" />
            ព័ត៌មានហាងលើកិច្ចសន្យា
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-2" />
              <span className="text-xs">កំពុងទាញយកទិន្នន័យ...</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* SUBTAB: RATES */}
              {activeSubTab === "RATES" && (
                <div className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                      <label className="font-bold text-slate-800 block">
                        ការប្រាក់បង់រំលស់ (% / ខែ)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={form.installmentInterestRate}
                          onChange={(e) =>
                            setForm({ ...form, installmentInterestRate: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full rounded-xl border border-slate-300 p-2.5 font-mono font-bold text-sm bg-white pr-8 text-teal-800"
                          required
                        />
                        <span className="absolute right-3 top-3 font-bold text-slate-400">%</span>
                      </div>
                      <span className="text-[10px] text-slate-400">លំនាំដើម: 1.5% ក្នុងមួយខែ</span>
                    </div>

                    <div className="space-y-1.5 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                      <label className="font-bold text-slate-800 block">
                        ការប្រាក់បញ្ចាំប្រចាំខែ (% / ខែ)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={form.pawnMonthlyInterestRate}
                          onChange={(e) =>
                            setForm({ ...form, pawnMonthlyInterestRate: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full rounded-xl border border-slate-300 p-2.5 font-mono font-bold text-sm bg-white pr-8 text-amber-800"
                          required
                        />
                        <span className="absolute right-3 top-3 font-bold text-slate-400">%</span>
                      </div>
                      <span className="text-[10px] text-slate-400">លំនាំដើម: 2.5% ក្នុងមួយខែ</span>
                    </div>

                    <div className="space-y-1.5 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                      <label className="font-bold text-slate-800 block">
                        ការប្រាក់បញ្ចាំគិតជាថ្ងៃ (% / ថ្ងៃ)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          value={form.pawnDailyInterestRate}
                          onChange={(e) =>
                            setForm({ ...form, pawnDailyInterestRate: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full rounded-xl border border-slate-300 p-2.5 font-mono font-bold text-sm bg-white pr-8 text-blue-800"
                          required
                        />
                        <span className="absolute right-3 top-3 font-bold text-slate-400">%</span>
                      </div>
                      <span className="text-[10px] text-slate-400">លំនាំដើម: 0.1% ក្នុងមួយថ្ងៃ</span>
                    </div>

                    <div className="space-y-1.5 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                      <label className="font-bold text-slate-800 block">
                        ប្រាក់ពិន័យបង់យឺត ($ / ថ្ងៃ)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={form.latePenaltyPerDayUsd}
                          onChange={(e) =>
                            setForm({ ...form, latePenaltyPerDayUsd: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full rounded-xl border border-slate-300 p-2.5 font-mono font-bold text-sm bg-white pr-8 text-rose-700"
                          required
                        />
                        <span className="absolute right-3 top-3 font-bold text-slate-400">$</span>
                      </div>
                      <span className="text-[10px] text-slate-400">លំនាំដើម: $1.00 ក្នុងមួយថ្ងៃយឺត</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <h5 className="font-bold text-slate-800 mb-2">
                      រយៈពេលបញ្ចាំលំនាំដើម (Default Pawn Term)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">ប្រភេទរយៈពេល</label>
                        <select
                          value={form.defaultPawnDurationType}
                          onChange={(e) =>
                            setForm({ ...form, defaultPawnDurationType: e.target.value as "DAYS" | "MONTHS" })
                          }
                          className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-xs bg-white"
                        >
                          <option value="DAYS">គិតជាចំនួនថ្ងៃ (Days) - ឧ. ៧, ១៥, ៣០ ថ្ងៃ</option>
                          <option value="MONTHS">គិតជាខែ (Months) - ឧ. ១, ២, ៣ ខែ</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">ចំនួនថ្ងៃលំនាំដើម</label>
                        <input
                          type="number"
                          value={form.defaultPawnDurationDays}
                          onChange={(e) =>
                            setForm({ ...form, defaultPawnDurationDays: parseInt(e.target.value) || 30 })
                          }
                          className="w-full rounded-xl border border-slate-300 p-2.5 font-mono font-bold text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB: INSTALLMENT TERMS */}
              {activeSubTab === "INSTALLMENT_TERMS" && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        កែប្រែខ្លឹមសារកិច្ចសន្យាបង់រំលស់ (Installment Contract Template)
                      </h4>
                      <p className="text-slate-500 text-[11px]">
                        Admin អាចកែសម្រួលមាត្រា ចំណងជើង ឬបន្ថែមខចែងច្បាប់តាមការចង់បាន
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetInstallmentTerms}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      ទាញយកទម្រង់ដើម
                    </button>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ចំណងជើងកិច្ចសន្យា</label>
                    <input
                      type="text"
                      value={form.installmentContractTitle}
                      onChange={(e) => setForm({ ...form, installmentContractTitle: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      ខចែង និងមាត្រាកិច្ចសន្យា (Articles & Legal Clauses)
                    </label>
                    <textarea
                      rows={14}
                      value={form.installmentContractTerms}
                      onChange={(e) => setForm({ ...form, installmentContractTerms: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-3 font-sans text-xs bg-white leading-relaxed focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              {/* SUBTAB: PAWN TERMS */}
              {activeSubTab === "PAWN_TERMS" && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        កែប្រែកិច្ចសន្យាបញ្ចាំ & លក្ខខណ្ឌដាច់បញ្ចាំ (Pawn Agreement Template)
                      </h4>
                      <p className="text-slate-500 text-[11px]">
                        Admin អាចកែប្រែមាត្រាបញ្ចាំ លក្ខខណ្ឌលោះទ្រព្យ ឬថ្ងៃអនុគ្រោះដាច់បញ្ចាំ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetPawnTerms}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      ទាញយកទម្រង់ដើម
                    </button>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ចំណងជើងប័ណ្ណបញ្ចាំ / កិច្ចសន្យា</label>
                    <input
                      type="text"
                      value={form.pawnContractTitle}
                      onChange={(e) => setForm({ ...form, pawnContractTitle: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      ខចែង និងមាត្រាបញ្ចាំ / ដាច់បញ្ចាំ (Pawn Rules & Forfeiture Clauses)
                    </label>
                    <textarea
                      rows={14}
                      value={form.pawnContractTerms}
                      onChange={(e) => setForm({ ...form, pawnContractTerms: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-3 font-sans text-xs bg-white leading-relaxed focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* SUBTAB: STORE INFO */}
              {activeSubTab === "STORE_INFO" && (
                <div className="space-y-4 text-xs">
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <h4 className="font-extrabold text-slate-900 text-sm mb-1">
                      ព័ត៌មានហាង/ភាគី "ក" លើកិច្ចសន្យា (Store & Representative Details)
                    </h4>
                    <p className="text-slate-500 text-[11px]">
                      ព័ត៌មានដែលនឹងបង្ហាញនៅលើក្បាលកិច្ចសន្យា និងផ្នែកហត្ថលេខា
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">ឈ្មោះហាង / ក្រុមហ៊ុន</label>
                      <input
                        type="text"
                        value={form.storeName}
                        onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">លេខទូរស័ព្ទទាក់ទង</label>
                      <input
                        type="text"
                        value={form.storePhone}
                        onChange={(e) => setForm({ ...form, storePhone: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">អាសយដ្ឋានហាង</label>
                      <input
                        type="text"
                        value={form.storeAddress}
                        onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">ឈ្មោះសាក្សីលំនាំដើម (Witness Name)</label>
                      <input
                        type="text"
                        value={form.witnessName}
                        onChange={(e) => setForm({ ...form, witnessName: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white"
                        placeholder="ទុកនៅទទេបើចង់ឱ្យចុះហត្ថលេខាដោយផ្ទាល់ដៃ"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 px-6 py-2.5 font-bold text-white shadow-md transition cursor-pointer text-xs disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      កំពុងរក្សាទុក...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      រក្សាទុកការកំណត់ (Save Settings)
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
