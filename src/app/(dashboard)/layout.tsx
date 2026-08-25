"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/common/Sidebar";
import Header from "@/components/common/Header";
import {
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Home,
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Wrench,
  Package,
  Menu,
} from "lucide-react";
import { canAccessRoute } from "@/lib/permissions";
import { usePOSStore } from "@/store/posStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Instant Optimistic Initialization from persistent store
  const storedUser = typeof window !== "undefined" ? usePOSStore.getState().currentUser : null;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(storedUser ? true : null);
  const [currentUser, setCurrentUser] = useState<any>(storedUser || null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Validate / Refresh session in background
    const localToken = typeof window !== "undefined" ? localStorage.getItem("anachak_token") : null;
    const reqHeaders: Record<string, string> = {};
    if (localToken) reqHeaders["Authorization"] = `Bearer ${localToken}`;

    fetch("/api/auth/me", { headers: reqHeaders })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
          usePOSStore.getState().setCurrentUser(data.user);
          if (data.user.branchId) {
            usePOSStore.getState().setBranch(data.user.branchId, data.user.branchName || "សាខា");
          }
        } else {
          // If no stored user, redirect to login
          if (!usePOSStore.getState().currentUser) {
            setIsAuthenticated(false);
            window.location.replace("/login");
          }
        }
      })
      .catch(() => {
        if (!usePOSStore.getState().currentUser) {
          setIsAuthenticated(false);
          window.location.replace("/login");
        }
      });
  }, [router]);

  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3 p-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
        <p className="text-xs font-bold text-slate-300">
          {isAuthenticated === null
            ? "កំពុងផ្ទៀងផ្ទាត់គណនី (Verifying Session)..."
            : "កំពុងបញ្ជូនទៅទំព័រចូលប្រព័ន្ធ (Redirecting to Login)..."}
        </p>
      </div>
    );
  }

  // Check if current user has permission for the active route
  const isAllowed = currentUser ? canAccessRoute(pathname, currentUser.permissions, currentUser.role) : true;

  const mobileNavItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "POS", href: "/pos", icon: ShoppingCart, highlight: true },
    { label: "ការលក់", href: "/sales", icon: TrendingUp },
    { label: "ជួសជុល", href: "/repairs", icon: Wrench },
    { label: "ស្តុក", href: "/inventory", icon: Package },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 antialiased">
      {/* 1. Responsive Sidebar (Fixed on Desktop, Drawer on Mobile/Tablet) */}
      <Sidebar
        permissions={currentUser?.permissions}
        role={currentUser?.role}
        userFullName={currentUser?.fullName}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col lg:pl-64 pl-0 min-w-0 transition-all duration-300 pb-16 lg:pb-0">
        <Header
          currentUser={currentUser}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto min-w-0">
          {isAllowed ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
              <div className="h-16 w-16 rounded-3xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shadow-lg shadow-rose-900/10">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  គ្មានសិទ្ធិចូលដំណើរការ (Access Denied)
                </h3>
                <p className="text-xs text-slate-500 max-w-md">
                  គណនីរបស់អ្នក (<span className="font-bold text-slate-700 font-mono">@{currentUser?.username}</span> - <span className="font-bold text-teal-700">{currentUser?.role}</span>) មិនមានសិទ្ធិចូលប្រើប្រាស់ទំព័រនេះទេ។ សូមទាក់ទង Admin ប្រសិនបើត្រូវការសិទ្ធិបន្ថែម។
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                >
                  <ArrowLeft className="h-4 w-4" />
                  ត្រឡប់ក្រោយ
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 transition shadow-xs"
                >
                  <Home className="h-4 w-4" />
                  ទៅកាន់ផ្ទាំងដើម (Dashboard)
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. Mobile Bottom Navigation Bar (Visible on Mobile & Tablets < 1024px) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-slate-800 bg-slate-900/95 px-2 backdrop-blur-md shadow-2xl">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-all ${
                isActive
                  ? "text-teal-400 font-bold scale-105"
                  : item.highlight
                  ? "text-teal-300 hover:text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-teal-400" : ""}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* More / Menu Drawer Trigger */}
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium text-slate-400 hover:text-white transition"
        >
          <Menu className="h-4 w-4" />
          <span>ម៉ឺនុយ</span>
        </button>
      </nav>
    </div>
  );
}
