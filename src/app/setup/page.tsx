"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  Store,
  User,
  Lock,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  FolderTree,
  DollarSign,
  HelpCircle,
} from "lucide-react";

export default function SetupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    storeName: "",
    storeAddress: "",
    legalName: "",
    phone: "",
    address: "",
    branchName: "សាខាកណ្តាល (Head Office Branch)",
    ownerFullNameKh: "",
    ownerFullNameEn: "",
    ownerUsername: "",
    ownerPassword: "",
    ownerConfirmPassword: "",
    ownerPhone: "",
    ownerEmail: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Check if system already has a store
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/system/status");
        const data = await res.json();
        if (data.success && !data.needsSetup) {
          // Store already exists, redirect to login
          router.replace("/login");
        }
      } catch (e) {
        console.error("Status check failed:", e);
      } finally {
        setCheckingStatus(false);
      }
    }
    checkStatus();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.storeName.trim()) {
      setErrorMessage("សូមបញ្ចូលឈ្មោះហាង (Store name is required)");
      return;
    }

    if (!form.ownerUsername.trim()) {
      setErrorMessage("សូមបញ្ចូលឈ្មោះគណនីម្ចាស់ហាង (Owner username is required)");
      return;
    }

    if (form.ownerPassword.length < 6) {
      setErrorMessage("លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ (Password must be at least 6 characters)");
      return;
    }

    if (form.ownerPassword !== form.ownerConfirmPassword) {
      setErrorMessage("លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ (Passwords do not match)");
      return;
    }

    setLoading(true);

    try {
      let finalStoreAddress = form.storeAddress.trim().toLowerCase();
      if (!finalStoreAddress) {
        const slug = form.storeName.toLowerCase().replace(/[^a-z0-9]/g, "");
        finalStoreAddress = `${slug || "store"}@anajak.com`;
      } else if (!finalStoreAddress.includes("@")) {
        finalStoreAddress = `${finalStoreAddress}@anajak.com`;
      }

      const res = await fetch("/api/system/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName.trim(),
          storeAddress: finalStoreAddress,
          legalName: form.legalName.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          branchName: form.branchName.trim() || "សាខាកណ្តាល (Head Office Branch)",
          ownerFullNameKh: form.ownerFullNameKh.trim() || undefined,
          ownerFullNameEn: form.ownerFullNameEn.trim() || undefined,
          ownerUsername: form.ownerUsername.trim().toLowerCase(),
          ownerPassword: form.ownerPassword,
          ownerPhone: form.ownerPhone.trim() || undefined,
          ownerEmail: form.ownerEmail.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create store and owner");
      }

      setSuccessMessage("🎉 ហាង និងគណនីម្ចាស់ហាងត្រូវបានបង្កើតដោយជោគជ័យ! កំពុងបញ្ជូនទៅកាន់ Login...");
      
      setTimeout(() => {
        router.push(`/login?created=true&address=${encodeURIComponent(data.storeAddress || finalStoreAddress)}`);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete setup");
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400 mb-3" />
        <p className="text-sm font-semibold text-slate-400">កំពុងពិនិត្យស្ថានភាព Database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl my-8">
        <div className="rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6 text-white">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 shadow-xl shadow-teal-500/30 text-white">
              <Building2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              ការបង្កើតហាង និងគណនីម្ចាស់ហាង
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              សូមបញ្ចូលព័ត៌មានហាង និងកំណត់គណនីម្ចាស់ហាង (Super Admin) ដំបូងរបស់អ្នក
            </p>
          </div>

          {/* Clean Database Badges / Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-teal-500/30 bg-teal-950/40 p-3.5 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 mt-0.5">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">ប្លង់គណនីស្តង់ដារ (Chart of Accounts)</p>
                <p className="text-[11px] text-slate-400">បានរៀបចំគណនីចំណូល ចំណាយ សាច់ប្រាក់ ថ្លៃដើម (COGS) រួចជាស្រេច</p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                <FolderTree className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">ប្រភេទទំនិញដំបូង (Categories)</p>
                <p className="text-[11px] text-slate-400">បានរៀបចំប្រភេទ ទូរស័ព្ទ គ្រឿងបន្លាស់ និងសេវាកម្មជួសជុល</p>
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-xs text-red-400 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Main Setup Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Store Details */}
            <div className="space-y-4 rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-teal-400 border-b border-white/10 pb-2">
                <Store className="h-4 w-4" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  ផ្នែកទី ១៖ ព័ត៌មានហាង (Store Details)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Store Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">
                    ឈ្មោះហាង (Store Name) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.storeName}
                    onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                    placeholder="ឧ. ហាងទូរស័ព្ទដៃ និងជួសជុល អាណាចក្រ"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition"
                  />
                </div>

                {/* Store Address / Slug */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    អាសយដ្ឋានហាង (Store Address / Domain)
                  </label>
                  <input
                    type="text"
                    value={form.storeAddress}
                    onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
                    placeholder="ឧ. myshop@anajak.com ឬ myshop"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">ប្រើសម្រាប់ Login (បើសិនទុកទទេ នឹងយកតាមឈ្មោះហាង)</p>
                </div>

                {/* Initial Branch Name */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    ឈ្មោះសាខាដំបូង (Initial Main Branch)
                  </label>
                  <input
                    type="text"
                    value={form.branchName}
                    onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                    placeholder="សាខាកណ្តាល (Head Office Branch)"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition"
                  />
                </div>

                {/* Store Phone */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    លេខទូរស័ព្ទហាង (Store Phone)
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="012 888 999"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition font-mono"
                  />
                </div>

                {/* Store Location */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    ទីតាំងហាង (Store Location / Address)
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="រាជធានីភ្នំពេញ, ប្រទេសកម្ពុជា"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Owner User Details */}
            <div className="space-y-4 rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-emerald-400 border-b border-white/10 pb-2">
                <ShieldCheck className="h-4 w-4" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  ផ្នែកទី ២៖ គណនីម្ចាស់ហាង (Owner / Super Admin Account)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Full Name KH */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    ឈ្មោះពេញម្ចាស់ហាង (Full Name KH)
                  </label>
                  <input
                    type="text"
                    value={form.ownerFullNameKh}
                    onChange={(e) => setForm({ ...form, ownerFullNameKh: e.target.value })}
                    placeholder="ឧ. សុខ គឹមហុង"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition"
                  />
                </div>

                {/* Full Name EN */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    ឈ្មោះជាឡាតាំង (Full Name EN)
                  </label>
                  <input
                    type="text"
                    value={form.ownerFullNameEn}
                    onChange={(e) => setForm({ ...form, ownerFullNameEn: e.target.value })}
                    placeholder="Sok Kimhong"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    ឈ្មោះគណនីចូល (Username) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={form.ownerUsername}
                      onChange={(e) => setForm({ ...form, ownerUsername: e.target.value })}
                      placeholder="owner ឬ admin"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition font-mono"
                    />
                  </div>
                </div>

                {/* Owner Phone */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    លេខទូរស័ព្ទម្ចាស់ហាង (Owner Phone)
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.ownerPhone}
                      onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                      placeholder="012 345 678"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition font-mono"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    លេខសម្ងាត់ (Password) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={form.ownerPassword}
                      onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    ផ្ទៀងផ្ទាត់លេខសម្ងាត់ (Confirm Password) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={form.ownerConfirmPassword}
                      onChange={(e) => setForm({ ...form, ownerConfirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 py-3.5 text-sm font-bold text-white shadow-xl shadow-teal-700/30 hover:from-teal-500 hover:to-emerald-400 active:scale-[0.99] transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>កំពុងបង្កើតហាង និងគណនីម្ចាស់ហាង...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>បង្កើតហាង និងគណនីម្ចាស់ហាង (Create Store & Owner)</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
