"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  DollarSign,
  Wifi,
  WifiOff,
  Bell,
  Search,
  User,
  CheckCircle2,
  ArrowRightLeft,
  LogOut,
  ChevronDown,
  Menu,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { OfflineSyncManager } from "@/lib/offline-sync";

interface HeaderProps {
  currentUser?: any;
  onToggleSidebar?: () => void;
}

export default function Header({ currentUser: initialUser, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const {
    language,
    setLanguage,
    currency,
    setCurrency,
    exchangeRateKhr,
    currentBranchName,
    setBranch,
  } = usePOSStore();
  const t = translations[language];

  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(initialUser || {
    fullName: "គណនី",
    role: "STAFF",
    branchName: "សាខាកណ្តាល",
  });
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    // 1. Sync current user if passed
    if (initialUser) {
      setCurrentUser(initialUser);
      if (initialUser.branchName && initialUser.branchId) {
        setBranch(initialUser.branchId, initialUser.branchName);
      }
    } else {
      // Fetch current logged-in user
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            if (data.user.branchName && data.user.branchId) {
              setBranch(data.user.branchId, data.user.branchName);
            }
          }
        })
        .catch(() => {});
    }

    // 2. Fetch live branches directly from database API
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.branches) && data.branches.length > 0) {
          setBranches(data.branches);
          
          // Auto-sync branch name from DB if currentBranchId is found
          const activeBranchId = usePOSStore.getState().currentBranchId;
          const found = data.branches.find((b: any) => b.id === activeBranchId);
          if (found) {
            usePOSStore.getState().setBranch(found.id, found.name);
          } else if (!activeBranchId && data.branches[0]) {
            usePOSStore.getState().setBranch(data.branches[0].id, data.branches[0].name);
          }
        }
      })
      .catch((err) => console.error("Failed to load branches from database:", err));

    // 3. Online/offline listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const updateOfflineCount = () => {
      setOfflineCount(OfflineSyncManager.getQueue().length);
    };

    updateOfflineCount();
    const interval = setInterval(updateOfflineCount, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [initialUser, setBranch]);

  const handleManualSync = async () => {
    const res = await OfflineSyncManager.syncPendingOrders();
    setOfflineCount(OfflineSyncManager.getQueue().length);
    if (res.syncedCount > 0) {
      alert(`✅ បានធ្វើសមកាលកម្ម ${res.syncedCount} វិក្កយបត្រដោយជោគជ័យ!`);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const userInitials = (currentUser.fullName || "AD")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isSuperAdminOrAdmin =
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "ADMIN" ||
    !currentUser.branchId;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-3 sm:px-6 backdrop-blur shadow-2xs">
      {/* Left: Mobile Hamburger & Branch Selector */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Hamburger Menu on Mobile / Tablet */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition shadow-2xs shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative min-w-0">
          {isSuperAdminOrAdmin ? (
            <button
              onClick={() => setShowBranchMenu(!showBranchMenu)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-teal-200 bg-teal-50/70 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition shadow-2xs"
            >
              <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-700 shrink-0" />
              <span className="max-w-[110px] sm:max-w-[200px] md:max-w-[240px] truncate">{currentBranchName}</span>
              <ArrowRightLeft className="h-3 w-3 text-teal-600 ml-0.5 shrink-0" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-teal-200 bg-teal-50 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-teal-900 shadow-2xs">
              <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-700 shrink-0" />
              <span className="max-w-[110px] sm:max-w-[200px] truncate">{currentBranchName}</span>
              <span className="hidden sm:inline-block text-[10px] font-semibold bg-teal-200/70 text-teal-950 px-1.5 py-0.5 rounded">សាខាប្រចាំ</span>
            </div>
          )}

          {isSuperAdminOrAdmin && showBranchMenu && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in slide-from-top-2">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 mb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t.selectBranch} ({branches.length})
                </p>
                <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded">
                  ទាញពី Database
                </span>
              </div>
              {branches.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  កំពុងទាញទិន្នន័យសាខា...
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {branches.map((b) => {
                    const isSelected =
                      usePOSStore.getState().currentBranchId === b.id ||
                      currentBranchName === b.name;
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          setBranch(b.id, b.name);
                          setShowBranchMenu(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs text-left transition ${
                          isSelected
                            ? "bg-teal-50 text-teal-900 font-bold border border-teal-200/60 shadow-2xs"
                            : "text-slate-700 hover:bg-slate-50 border border-transparent"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-100/70 px-1 rounded">
                              {b.code || "BR"}
                            </span>
                            <span className="truncate font-semibold text-slate-800">
                              {b.name}
                            </span>
                            {b.isHeadOffice && (
                              <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 rounded">
                                HQ
                              </span>
                            )}
                          </div>
                          {b.address && (
                            <p className="text-[10px] text-slate-400 truncate">
                              📍 {b.address}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Exchange Rate Indicator */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
          <span>អត្រាប្តូរប្រាក់:</span>
          <span className="font-bold text-slate-800 font-mono">$1 = {exchangeRateKhr.toLocaleString()} ៛</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Offline / Online Sync Status */}
        {isOnline ? (
          <div className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <Wifi className="h-3.5 w-3.5 text-emerald-600" />
            <span>Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] font-bold text-amber-800 border border-amber-300">
            <WifiOff className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {offlineCount > 0 && (
          <button
            onClick={handleManualSync}
            className="flex items-center gap-1 text-[11px] sm:text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 py-1 rounded-lg shadow-xs transition"
          >
            <span>Sync ({offlineCount})</span>
          </button>
        )}

        {/* Currency Switcher */}
        <button
          onClick={() => setCurrency(currency === "USD" ? "KHR" : "USD")}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          title="Switch Display Currency"
        >
          <DollarSign className="h-3.5 w-3.5 text-teal-600" />
          <span>{currency}</span>
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => {
            const next: Record<"km" | "en" | "zh", "km" | "en" | "zh"> = { km: "en", en: "zh", zh: "km" };
            setLanguage(next[language] || "km");
          }}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          title="Switch Language (ភាសាខ្មែរ / English / 中文)"
        >
          <Globe className="h-3.5 w-3.5 text-blue-600" />
          <span className="hidden sm:inline">
            {language === "km" ? "ខ្មែរ" : language === "zh" ? "中文" : "EN"}
          </span>
          <span className="sm:hidden">
            {language === "km" ? "KH" : language === "zh" ? "ZH" : "EN"}
          </span>
        </button>

        {/* User Profile Dropdown */}
        <div className="relative pl-1 sm:pl-2 border-l border-slate-200">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-50 transition"
          >
            <div className="h-8 w-8 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {userInitials}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">{currentUser.fullName}</p>
              <p className="text-[10px] text-teal-700 font-semibold">{currentUser.role}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden lg:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 text-xs">
              <div className="px-3 py-2 border-b border-slate-100 space-y-0.5">
                <p className="font-bold text-slate-900">{currentUser.fullName}</p>
                <p className="text-[10px] text-slate-500 font-mono">@{currentUser.username}</p>
                <p className="text-[10px] text-teal-700 font-mono font-bold bg-teal-50 px-2 py-0.5 rounded-md mt-1 truncate">
                  🏪 {currentUser.storeAddress || "anajak@anajak.com"}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="h-4 w-4" />
                  <span>ចាកចេញ (Sign Out)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
