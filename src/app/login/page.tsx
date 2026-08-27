"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Loader2,
  Building2,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ShoppingCart,
  Store,
  Phone,
  Layers,
  AtSign,
  Database,
  Zap,
  Server,
  CheckCheck,
  RefreshCw,
  X,
  Check,
  Link2,
  KeyRound,
  Globe,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";

type AuthMode = "LOGIN" | "REGISTER";

export default function LoginPage() {
  const router = useRouter();
  const { language, setLanguage } = usePOSStore();
  const t = translations[language];

  const [mode, setMode] = useState<AuthMode>("LOGIN");

  // Login Form State
  const [storeAddress, setStoreAddress] = useState("anajak@anajak.com");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);

  // Database Setup & Switch Modal State
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [checkingDb, setCheckingDb] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dbSetupLoading, setDbSetupLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<"NEW_DATABASE" | "OLD_DATABASE" | null>(null);
  const [dbSetupStep, setDbSetupStep] = useState<number>(0);
  const [dbSetupSuccess, setDbSetupSuccess] = useState<any>(null);
  const [dbSetupError, setDbSetupError] = useState("");

  // 5 Database Configuration Variables
  const [dbConfig, setDbConfig] = useState({
    DATABASE_URL: "",
    DIRECT_URL: "",
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
  });

  // Store & Admin Details for New Database Provisioning
  const [customStoreName, setCustomStoreName] = useState("អាណាចក្រPOS (Anachak POS)");
  const [customStoreAddress, setCustomStoreAddress] = useState("anajak@anajak.com");
  const [customAdminUser, setCustomAdminUser] = useState("admin");
  const [customAdminPass, setCustomAdminPass] = useState("admin123");

  // Register / Create Store Form State
  const [regForm, setRegForm] = useState({
    storeName: "",
    storeAddress: "",
    fullName: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
    branchName: "សាខាកណ្តាល ភ្នំពេញ",
    businessType: "Smartphones & Electronics",
  });
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch Database status and current .env config
  const fetchDbConfig = async () => {
    try {
      setCheckingDb(true);
      const res = await fetch("/api/database/switch");
      const data = await res.json();
      if (data.success && data.config) {
        setDbConfig({
          DATABASE_URL: data.config.DATABASE_URL || "",
          DIRECT_URL: data.config.DIRECT_URL || "",
          NEXT_PUBLIC_SUPABASE_URL: data.config.NEXT_PUBLIC_SUPABASE_URL || "",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: data.config.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          SUPABASE_SERVICE_ROLE_KEY: data.config.SUPABASE_SERVICE_ROLE_KEY || "",
        });
        setDbStatus({
          connected: data.connected,
          databaseUrlMasked: data.config.DATABASE_URL
            ? data.config.DATABASE_URL.replace(/:[^:@]+@/, ":***@")
            : "Not Configured",
        });
      }
    } catch (e) {
      console.error("Failed to check DB config:", e);
    } finally {
      setCheckingDb(false);
    }
  };

  useEffect(() => {
    fetchDbConfig();
  }, []);

  // 1. Test Connection
  const handleTestConnection = async () => {
    if (!dbConfig.DATABASE_URL.trim()) {
      setTestResult({ success: false, message: "សូមបញ្ចូល DATABASE_URL ជាមុនសិន!" });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/database/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseUrl: dbConfig.DATABASE_URL.trim(),
          directUrl: dbConfig.DIRECT_URL.trim() || undefined,
          action: "TEST_ONLY",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message || "ការតភ្ជាប់ទទួលបានជោគជ័យ!" });
      } else {
        setTestResult({ success: false, message: data.error || "មិនអាចតភ្ជាប់ទៅកាន់ Database នេះបានទេ!" });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Connection failed" });
    } finally {
      setTestingConnection(false);
    }
  };

  // 2. Execute Database Action: "NEW_DATABASE" or "OLD_DATABASE"
  const handleExecuteDatabaseAction = async (action: "NEW_DATABASE" | "OLD_DATABASE") => {
    if (!dbConfig.DATABASE_URL.trim()) {
      setDbSetupError("សូមបញ្ចូល DATABASE_URL ឲ្យបានត្រឹមត្រូវ!");
      return;
    }

    setActiveAction(action);
    setDbSetupLoading(true);
    setDbSetupError("");
    setDbSetupSuccess(null);
    setDbSetupStep(1);

    try {
      await new Promise((r) => setTimeout(r, 600));
      setDbSetupStep(2); // Updating .env & syncing tables

      const res = await fetch("/api/database/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseUrl: dbConfig.DATABASE_URL.trim(),
          directUrl: dbConfig.DIRECT_URL.trim() || undefined,
          supabaseUrl: dbConfig.NEXT_PUBLIC_SUPABASE_URL.trim() || undefined,
          supabaseAnonKey: dbConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim() || undefined,
          supabaseServiceKey: dbConfig.SUPABASE_SERVICE_ROLE_KEY.trim() || undefined,
          storeName: customStoreName,
          storeAddress: customStoreAddress,
          adminUsername: customAdminUser,
          adminPassword: customAdminPass,
          action,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to process database action");

      setDbSetupStep(3); // Completing setup
      await new Promise((r) => setTimeout(r, 600));

      setDbSetupStep(4);
      setDbSetupSuccess(data);

      if (data.credentials) {
        setStoreAddress(data.credentials.storeAddress || customStoreAddress);
        setUsername(data.credentials.username || customAdminUser);
        setPassword(data.credentials.password || customAdminPass);
      } else if (data.defaultStoreAddress) {
        setStoreAddress(data.defaultStoreAddress);
      }

      await fetchDbConfig();
    } catch (err: any) {
      setDbSetupError(err.message || "Database action failed");
    } finally {
      setDbSetupLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeAddress: storeAddress.trim().toLowerCase(),
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Login failed");

      if (data.token) {
        try {
          localStorage.setItem("anachak_token", data.token);
        } catch (e) {}
      }

      window.location.href = "/";
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (regForm.password !== regForm.confirmPassword) {
      setErrorMessage("លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ (Passwords do not match)");
      return;
    }

    if (regForm.password.length < 6) {
      setErrorMessage("លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ (Password must be at least 6 characters)");
      return;
    }

    let finalAddress = regForm.storeAddress.trim().toLowerCase();
    if (!finalAddress) {
      const slug = regForm.storeName.toLowerCase().replace(/[^a-z0-9]/g, "");
      finalAddress = `${slug || "store"}@anajak.com`;
    } else if (!finalAddress.includes("@")) {
      finalAddress = `${finalAddress}@anajak.com`;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: regForm.storeName,
          storeAddress: finalAddress,
          fullName: regForm.fullName,
          phone: regForm.phone,
          username: regForm.username,
          password: regForm.password,
          branchName: regForm.branchName || "សាខាកណ្តាល ភ្នំពេញ",
          businessType: regForm.businessType,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to register store");

      setSuccessMessage("🎉 ហាង និងគណនី Admin ត្រូវបានបង្កើតដោយជោគជ័យ! កំពុងបញ្ជូន...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create store");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: "admin" | "cashier" | "tech") => {
    setStoreAddress(customStoreAddress || "anajak@anajak.com");
    if (role === "admin") {
      setUsername("admin");
      setPassword("admin123");
    } else if (role === "cashier") {
      setUsername("cashier1");
      setPassword("123456");
    } else if (role === "tech") {
      setUsername("tech_dara");
      setPassword("123456");
    }
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <button
          onClick={() => {
            const next: Record<"km" | "en" | "zh", "km" | "en" | "zh"> = { km: "en", en: "zh", zh: "km" };
            setLanguage(next[language] || "km");
          }}
          className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 transition"
        >
          {language === "km"
            ? "🇰🇭 ភាសាខ្មែរ (KH)"
            : language === "zh"
            ? "🇨🇳 中文 (ZH)"
            : "🇺🇸 English (EN)"}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Main Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-5 text-white">
          {/* Logo & Header */}
          <div className="text-center space-y-1.5">
            <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 shadow-lg shadow-teal-500/30 text-white">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {language === "km" ? "អាណាចក្រPOS" : "Anachak POS"}
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              ប្រព័ន្ធគ្រប់គ្រងការលក់ និងសេវាកម្មជួសជុលកម្រិតសហគ្រាស (Enterprise Multi-Tenant ERP)
            </p>
          </div>

          {/* Database Connection Trigger Banner */}
          <div className="rounded-2xl border border-teal-500/30 bg-teal-950/40 p-3.5 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Database className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-white">ការតភ្ជាប់ Database</p>
                  <span className="rounded-md bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-mono text-teal-300 font-bold border border-teal-500/30">
                    {dbStatus?.connected ? "🟢 PostgreSQL Connected" : "🟡 Not Connected"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-xs font-mono">
                  {dbStatus?.databaseUrlMasked || "Supabase Pooler"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDbSetupSuccess(null);
                setDbSetupError("");
                setDbSetupStep(0);
                setTestResult(null);
                fetchDbConfig();
                setIsDbModalOpen(true);
              }}
              className="shrink-0 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:from-teal-500 hover:to-emerald-500 transition shadow-md shadow-teal-700/30 flex items-center gap-1.5 active:scale-95"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>ភ្ជាប់ DB</span>
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-white/5 rounded-2xl border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode("LOGIN");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                mode === "LOGIN"
                  ? "bg-teal-700 text-white shadow-md shadow-teal-950/40 font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>{language === "km" ? "ចូលប្រព័ន្ធ (Sign In)" : "Sign In"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("REGISTER");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                mode === "REGISTER"
                  ? "bg-teal-700 text-white shadow-md shadow-teal-950/40 font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              <span>{language === "km" ? "ចុះឈ្មោះបង្កើតហាង (Register Store)" : "Register Store"}</span>
            </button>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {mode === "LOGIN" && (
            <>
              <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
                {/* Store Address */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {language === "km" ? "អាសយដ្ឋានហាង (Store Address)" : "Store Address"} *
                  </label>
                  <div className="relative flex items-center">
                    <AtSign className="absolute left-3.5 h-4 w-4 text-teal-400" />
                    <input
                      type="text"
                      required
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      placeholder="e.g. anajak@anajak.com or yourstore@anajak.com"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs font-mono text-teal-300 placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 pl-1">
                    ហាងគំរូទូទៅ: <span className="font-mono text-slate-400">anajak@anajak.com</span>
                  </p>
                </div>

                {/* Username */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {language === "km" ? "ឈ្មោះគណនី ឬ អ៊ីមែល" : "Username or Email"} *
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin, cashier1, or email..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {language === "km" ? "ពាក្យសម្ងាត់" : "Password"} *
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition font-mono"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-teal-700/30 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.99] transition disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <span>{language === "km" ? "ចូលប្រើប្រព័ន្ធ (Sign In)" : "Sign In to Store"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Switcher */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-400">
                    គណនីគំរូហាងមេ ({storeAddress || "anajak@anajak.com"}):
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDbModalOpen(true);
                    }}
                    className="text-[10px] text-teal-400 hover:text-teal-300 font-bold underline"
                  >
                    កំណត់ Database
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("admin")}
                    className={`rounded-xl border p-2 text-center transition flex flex-col items-center gap-1 ${
                      username === "admin"
                        ? "border-teal-500 bg-teal-500/20 text-teal-300"
                        : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-[10px] font-bold">Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("cashier")}
                    className={`rounded-xl border p-2 text-center transition flex flex-col items-center gap-1 ${
                      username === "cashier1"
                        ? "border-teal-500 bg-teal-500/20 text-teal-300"
                        : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span className="text-[10px] font-bold">Cashier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("tech")}
                    className={`rounded-xl border p-2 text-center transition flex flex-col items-center gap-1 ${
                      username === "tech_dara"
                        ? "border-teal-500 bg-teal-500/20 text-teal-300"
                        : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Wrench className="h-4 w-4" />
                    <span className="text-[10px] font-bold">Technician</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 2. REGISTER / CREATE STORE FORM */}
          {mode === "REGISTER" && (
            <form onSubmit={handleRegisterStore} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Store Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">
                    ឈ្មោះហាង / អាជីវកម្ម (Store Name) *
                  </label>
                  <div className="relative flex items-center">
                    <Store className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={regForm.storeName}
                      onChange={(e) => {
                        const name = e.target.value;
                        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
                        setRegForm({
                          ...regForm,
                          storeName: name,
                          storeAddress: regForm.storeAddress || (slug ? `${slug}@anajak.com` : ""),
                        });
                      }}
                      placeholder="ឧ. ហាង ពិភពទូរស័ព្ទដៃ (World Phone Tech)"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                {/* Store Address */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-teal-300 mb-1">
                    អាសយដ្ឋានហាង (Store Address - Unique) *
                  </label>
                  <div className="relative flex items-center">
                    <AtSign className="absolute left-3.5 h-4 w-4 text-teal-400" />
                    <input
                      type="text"
                      required
                      value={regForm.storeAddress}
                      onChange={(e) =>
                        setRegForm({
                          ...regForm,
                          storeAddress: e.target.value.toLowerCase().replace(/\s+/g, ""),
                        })
                      }
                      placeholder="e.g. worldphone@anajak.com (ប្រើសំរាប់ Login)"
                      className="w-full rounded-xl border border-teal-500/40 bg-teal-950/20 py-2.5 pl-10 pr-4 text-xs font-mono text-teal-200 placeholder-slate-500 focus:border-teal-400 focus:bg-white/10 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                {/* Owner Full Name */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    ឈ្មោះម្ចាស់ហាង (Owner Name) *
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={regForm.fullName}
                      onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                      placeholder="ឧ. សុខ វិបុល"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    លេខទូរស័ព្ទ (Phone Number) *
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      placeholder="012 888 999"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    ឈ្មោះគណនី Admin (Username) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400 font-mono font-bold">@</span>
                    <input
                      type="text"
                      required
                      value={regForm.username}
                      onChange={(e) =>
                        setRegForm({
                          ...regForm,
                          username: e.target.value.toLowerCase().replace(/\s+/g, ""),
                        })
                      }
                      placeholder="admin or vibol"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition font-mono"
                    />
                  </div>
                </div>

                {/* Business Type */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    ប្រភេទអាជីវកម្ម (Business Type)
                  </label>
                  <div className="relative flex items-center">
                    <Layers className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <select
                      value={regForm.businessType}
                      onChange={(e) => setRegForm({ ...regForm, businessType: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 py-2.5 pl-10 pr-4 text-xs text-white focus:border-teal-500 focus:outline-hidden transition"
                    >
                      <option value="Smartphones & Electronics">ទូរស័ព្ទ & គ្រឿងអេឡិចត្រូនិច</option>
                      <option value="Repairs & Spare Parts">សេវាជួសជុល & គ្រឿងបន្លាស់</option>
                      <option value="Retail & Mart">លក់រាយ & ម៉ាតទូទៅ</option>
                      <option value="Pharmacy & Healthcare">ឱសថស្ថាន & សុខភាព</option>
                      <option value="General Trading">ពាណិជ្ជកម្មទូទៅ</option>
                    </select>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    លេខសម្ងាត់ (Password) *
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="យ៉ាងតិច ៦ តួ"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 text-slate-400 hover:text-white"
                    >
                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    បញ្ជាក់លេខសម្ងាត់ (Confirm) *
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      value={regForm.confirmPassword}
                      onChange={(e) =>
                        setRegForm({ ...regForm, confirmPassword: e.target.value })
                      }
                      placeholder="វាយលេខសម្ងាត់ម្តងទៀត"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:bg-white/10 focus:outline-hidden transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-teal-700/30 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.99] transition disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Store className="h-4 w-4" />
                    <span>បង្កើតហាង & ចូលប្រើប្រព័ន្ធ (Create Store & Launch)</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Note */}
          <div className="text-center pt-1">
            <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1 font-mono">
              <Building2 className="h-3 w-3" /> Multi-Tenant Architecture & PostgreSQL Database
            </p>
          </div>
        </div>
      </div>

      {/* 5-TEXTBOX DATABASE CONNECTION MODAL WITH "NEW DATABASE" & "OLD DATABASE" BUTTONS */}
      {isDbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/15 bg-slate-900 p-5 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 text-white space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 text-white shadow-md shadow-teal-500/20">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    ការតភ្ជាប់ Database (Database Connection Setup)
                  </h3>
                  <p className="text-xs text-slate-400">
                    បញ្ចូលព័ត៌មាន Connection String ទាំង ៥ និងជ្រើសរើសជម្រើសតភ្ជាប់
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDbModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Connection Status Indicator */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-teal-400" />
                <span className="font-bold text-slate-300">ស្ថានភាព Database:</span>
                {checkingDb ? (
                  <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <Loader2 className="h-3 w-3 animate-spin text-teal-400" /> កំពុងពិនិត្យ...
                  </span>
                ) : dbStatus?.connected ? (
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/30 text-[11px] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    បានភ្ជាប់ជោគជ័យ (Connected)
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-500/20 px-2 py-0.5 font-bold text-amber-400 border border-amber-500/30 text-[11px]">
                    មិនទាន់ភ្ជាប់
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || !dbConfig.DATABASE_URL.trim()}
                className="rounded-xl border border-teal-400/40 bg-teal-500/10 px-3 py-1 text-[11px] font-bold text-teal-300 hover:bg-teal-500/20 transition flex items-center gap-1 disabled:opacity-50"
              >
                {testingConnection ? <Loader2 className="h-3 w-3 animate-spin" /> : <Server className="h-3 w-3" />}
                <span>សាកល្បងភ្ជាប់</span>
              </button>
            </div>

            {/* Test Connection Alert Message */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                {testResult.success ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* SUCCESS STATE SCREEN */}
            {dbSetupSuccess ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5 space-y-4 text-center animate-in fade-in">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <CheckCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">
                    {dbSetupSuccess.message || "ការតភ្ជាប់ និងរៀបចំទិន្នន័យបានជោគជ័យ!"}
                  </h4>
                  <p className="text-xs text-emerald-300/80 mt-1">
                    {dbSetupSuccess.action === "NEW_DATABASE"
                      ? "Database ថ្មីត្រូវបានបង្កើត និងបញ្ចូល Master Initial Data រួចរាល់ 100%"
                      : "បានភ្ជាប់ទៅកាន់ Database ចាស់ដោយមិនបាត់បង់ទិន្នន័យឡើយ"}
                  </p>
                </div>

                {/* Credentials Display for New DB */}
                {dbSetupSuccess.credentials && (
                  <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3.5 text-left space-y-2 text-xs font-mono">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      ព័ត៌មានគណនីចូលប្រព័ន្ធ (Login Credentials):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-200">
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-sans">អាសយដ្ឋានហាង:</span>
                        <span className="text-teal-300 font-bold">{dbSetupSuccess.credentials.storeAddress}</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-sans">Admin Username:</span>
                        <span className="text-white font-bold">{dbSetupSuccess.credentials.username}</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-sans">Password:</span>
                        <span className="text-emerald-400 font-bold">{dbSetupSuccess.credentials.password}</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsDbModalOpen(false);
                    if (dbSetupSuccess.credentials) {
                      setStoreAddress(dbSetupSuccess.credentials.storeAddress);
                      setUsername(dbSetupSuccess.credentials.username);
                      setPassword(dbSetupSuccess.credentials.password);
                    }
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-2.5 text-xs font-bold text-white hover:from-teal-500 hover:to-emerald-500 transition shadow-lg shadow-teal-700/30 flex items-center justify-center gap-1.5"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>ចូលប្រើប្រាស់ឥឡូវនេះ (Sign In Now)</span>
                </button>
              </div>
            ) : (
              <>
                {/* Error Banner */}
                {dbSetupError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{dbSetupError}</span>
                  </div>
                )}

                {/* Progress Animation during Provisioning */}
                {dbSetupLoading ? (
                  <div className="rounded-2xl border border-teal-500/30 bg-teal-950/20 p-5 space-y-4 text-xs">
                    <p className="font-extrabold text-teal-300 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                      {activeAction === "NEW_DATABASE"
                        ? "កំពុងដំណើរការបង្កើត Database ថ្មី និងរៀបចំ Master Data..."
                        : "កំពុងដំណើរការតភ្ជាប់ទៅកាន់ Database ចាស់..."}
                    </p>

                    <div className="space-y-2.5 font-medium">
                      <div className="flex items-center gap-2.5">
                        {dbSetupStep >= 1 ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-slate-600 shrink-0"></div>
                        )}
                        <span className={dbSetupStep >= 1 ? "text-slate-200 font-bold" : "text-slate-500"}>
                          1. ត្រួតពិនិត្យការតភ្ជាប់ទៅកាន់ PostgreSQL Server
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {dbSetupStep >= 2 ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-slate-600 shrink-0"></div>
                        )}
                        <span className={dbSetupStep >= 2 ? "text-slate-200 font-bold" : "text-slate-500"}>
                          2. កែប្រែ .env & ធ្វើសមកាលកម្ម Tables ក្នុង Database
                        </span>
                      </div>

                      {activeAction === "NEW_DATABASE" && (
                        <>
                          <div className="flex items-center gap-2.5">
                            {dbSetupStep >= 3 ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-slate-600 shrink-0"></div>
                            )}
                            <span className={dbSetupStep >= 3 ? "text-slate-200 font-bold" : "text-slate-500"}>
                              3. បញ្ចូល Master Tenant, សាខា, ឃ្លាំង, Chart of Accounts, និងប្រភេទទំនិញ
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {dbSetupStep >= 4 ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-slate-600 shrink-0"></div>
                            )}
                            <span className={dbSetupStep >= 4 ? "text-slate-200 font-bold" : "text-slate-500"}>
                              4. បង្កើតគណនី Super Admin, Cashier, Technician និងទំនិញគំរូ
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 5 TEXTBOXES FORM */}
                    <div className="space-y-3 text-xs">
                      {/* 1. DATABASE_URL */}
                      <div>
                        <label className="block font-bold text-teal-300 mb-1 flex items-center justify-between">
                          <span>1. DATABASE_URL (Transaction Pooler - Port 6543 / Main DB) *</span>
                          <span className="text-[10px] text-slate-400 font-normal">ចាំបាច់ (Required)</span>
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={dbConfig.DATABASE_URL}
                          onChange={(e) => {
                            setDbConfig({ ...dbConfig, DATABASE_URL: e.target.value });
                            setTestResult(null);
                          }}
                          placeholder="postgresql://postgres.xxx:password@aws-0-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true"
                          className="w-full rounded-xl border border-teal-500/40 bg-teal-950/20 p-2.5 text-xs font-mono text-teal-200 focus:border-teal-400 focus:outline-hidden"
                        />
                      </div>

                      {/* 2. DIRECT_URL */}
                      <div>
                        <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                          <span>2. DIRECT_URL (Direct Connection - Port 5432 / Migrations)</span>
                          <span className="text-[10px] text-slate-400 font-normal">សម្រាប់ Prisma Migrations</span>
                        </label>
                        <input
                          type="text"
                          value={dbConfig.DIRECT_URL}
                          onChange={(e) => setDbConfig({ ...dbConfig, DIRECT_URL: e.target.value })}
                          placeholder="postgresql://postgres.xxx:password@aws-0-xxx.pooler.supabase.com:5432/postgres"
                          className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-mono text-slate-200 focus:border-teal-500 focus:outline-hidden"
                        />
                      </div>

                      {/* 3. NEXT_PUBLIC_SUPABASE_URL */}
                      <div>
                        <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                          <span>3. NEXT_PUBLIC_SUPABASE_URL (Supabase API Endpoint)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Supabase Project URL</span>
                        </label>
                        <input
                          type="text"
                          value={dbConfig.NEXT_PUBLIC_SUPABASE_URL}
                          onChange={(e) => setDbConfig({ ...dbConfig, NEXT_PUBLIC_SUPABASE_URL: e.target.value })}
                          placeholder="https://xxxxxxxxxxxx.supabase.co"
                          className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-mono text-slate-200 focus:border-teal-500 focus:outline-hidden"
                        />
                      </div>

                      {/* 4. NEXT_PUBLIC_SUPABASE_ANON_KEY */}
                      <div>
                        <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                          <span>4. NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase Public Anon Key)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Public Key</span>
                        </label>
                        <input
                          type="text"
                          value={dbConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY}
                          onChange={(e) => setDbConfig({ ...dbConfig, NEXT_PUBLIC_SUPABASE_ANON_KEY: e.target.value })}
                          placeholder="sb_publishable_xxxxxxxxx or eyJhbGciOi..."
                          className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-mono text-slate-200 focus:border-teal-500 focus:outline-hidden"
                        />
                      </div>

                      {/* 5. SUPABASE_SERVICE_ROLE_KEY */}
                      <div>
                        <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                          <span>5. SUPABASE_SERVICE_ROLE_KEY (Supabase Secret Key)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Admin Service Key</span>
                        </label>
                        <input
                          type="text"
                          value={dbConfig.SUPABASE_SERVICE_ROLE_KEY}
                          onChange={(e) => setDbConfig({ ...dbConfig, SUPABASE_SERVICE_ROLE_KEY: e.target.value })}
                          placeholder="sb_secret_xxxxxxxxx or eyJhbGciOi..."
                          className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-mono text-slate-200 focus:border-teal-500 focus:outline-hidden"
                        />
                      </div>

                      {/* 2 MAIN ACTION BUTTONS: "NEW DATABASE" & "OLD DATABASE" */}
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <p className="text-[11px] font-bold text-slate-300">ជ្រើសរើសប្រភេទនៃការតភ្ជាប់ (Select Action):</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* BUTTON 1: NEW DATABASE */}
                          <button
                            type="button"
                            onClick={() => handleExecuteDatabaseAction("NEW_DATABASE")}
                            disabled={dbSetupLoading || !dbConfig.DATABASE_URL.trim()}
                            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-3.5 text-white shadow-lg shadow-teal-900/30 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.98] transition disabled:opacity-50"
                          >
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <Zap className="h-4 w-4" />
                              <span>🚀 New Database</span>
                            </div>
                            <span className="text-[10px] text-teal-100/90 text-center font-normal">
                              បង្កើត Database ថ្មី & Tables/Data ដោយស្វ័យប្រវត្តិ
                            </span>
                          </button>

                          {/* BUTTON 2: OLD DATABASE */}
                          <button
                            type="button"
                            onClick={() => handleExecuteDatabaseAction("OLD_DATABASE")}
                            disabled={dbSetupLoading || !dbConfig.DATABASE_URL.trim()}
                            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/10 p-3.5 text-white hover:bg-white/15 active:scale-[0.98] transition disabled:opacity-50"
                          >
                            <div className="flex items-center gap-1.5 font-bold text-xs text-sky-300">
                              <Link2 className="h-4 w-4" />
                              <span>🔗 Old Database</span>
                            </div>
                            <span className="text-[10px] text-slate-300 text-center font-normal">
                              គ្រាន់តែភ្ជាប់ទៅកាន់ Database ចាស់ (រក្សាទិន្នន័យ)
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
