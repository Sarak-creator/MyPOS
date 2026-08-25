"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  ShoppingBag,
  Wrench,
  Package,
  BookOpenCheck,
  Users2,
  Contact2,
  FileBarChart,
  Settings,
  ShieldAlert,
  LogOut,
  Sparkles,
  Shield,
  X,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { checkPermission } from "@/lib/permissions";

interface SidebarProps {
  permissions?: string[];
  role?: string;
  userFullName?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  permissions: initialPermissions,
  role: initialRole,
  userFullName: initialFullName,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { language } = usePOSStore();
  const t = translations[language];

  const [permissions, setPermissions] = useState<string[]>(initialPermissions || []);
  const [role, setRole] = useState<string>(initialRole || "");
  const [fullName, setFullName] = useState<string>(initialFullName || "");

  useEffect(() => {
    if (initialPermissions && initialPermissions.length > 0) {
      setPermissions(initialPermissions);
      if (initialRole) setRole(initialRole);
      if (initialFullName) setFullName(initialFullName);
      return;
    }

    // Fetch user permissions if not passed via props
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setPermissions(data.user.permissions || []);
          setRole(data.user.role || "");
          setFullName(data.user.fullName || "");
        }
      })
      .catch(() => {});
  }, [initialPermissions, initialRole, initialFullName]);

  // Close sidebar on mobile route change
  useEffect(() => {
    if (onClose) onClose();
  }, [pathname]);

  const navItems = [
    {
      label: t.dashboard,
      href: "/",
      icon: LayoutDashboard,
      badge: null,
      permission: "dashboard:view",
    },
    {
      label: t.pos,
      href: "/pos",
      icon: ShoppingCart,
      badge: "F8",
      highlight: true,
      permission: "pos:access",
    },
    {
      label: (t as any).sales || "ការលក់",
      href: "/sales",
      icon: TrendingUp,
      badge: null,
      permission: "sales:view",
    },
    {
      label: (t as any).purchases || "ការទិញចូល",
      href: "/purchases",
      icon: ShoppingBag,
      badge: null,
      permission: "purchases:view",
    },
    {
      label: t.repairs,
      href: "/repairs",
      icon: Wrench,
      badge: "3 ថ្មី",
      permission: "repairs:view",
    },
    {
      label: t.inventory,
      href: "/inventory",
      icon: Package,
      badge: null,
      permission: "inventory:view",
    },
    {
      label: t.accounting,
      href: "/accounting",
      icon: BookOpenCheck,
      badge: null,
      permission: "accounting:view",
    },
    {
      label: t.crm || "អតិថិជន & បំណុល",
      href: "/crm",
      icon: Users2,
      badge: null,
      permission: "customers:view",
    },
    {
      label: t.hrm || "ធនធានមនុស្ស (HRM)",
      href: "/hrm",
      icon: Contact2,
      badge: null,
      permission: "hrm:view",
    },
    {
      label: (t as any).auditLogs || "កំណត់ត្រាសុវត្ថិភាព",
      href: "/audit-logs",
      icon: ShieldAlert,
      badge: null,
      permission: "audit:view",
    },
    {
      label: t.settings,
      href: "/settings",
      icon: Settings,
      badge: null,
      permission: "settings:view",
    },
  ];

  // Filter items based on user's granted permissions
  const visibleNavItems = navItems.filter((item) => {
    if (!permissions || permissions.length === 0) return true;
    return checkPermission(permissions, item.permission);
  });

  const sidebarContent = (
    <div className="flex h-full w-64 flex-col border-r border-slate-800/80 bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white font-extrabold text-lg shadow-md shadow-teal-900/40">
            អា
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight flex items-center gap-1.5">
              {t.appName}
              <span className="inline-flex items-center rounded-md bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-teal-300">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
              {language === "km" ? "ប្រព័ន្ធ ERP & POS" : "Enterprise ERP POS"}
            </p>
          </div>
        </div>

        {/* Close Button on Mobile / Tablet */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Role Badge if available */}
      {role && (
        <div className="px-6 py-2 bg-slate-950/40 border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate max-w-[140px]">
            <Shield className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            <span className="text-slate-300 font-semibold truncate">{fullName || "គណនី"}</span>
          </div>
          <span className="rounded-md bg-teal-950 text-teal-300 border border-teal-800/60 px-2 py-0.5 text-[9px] font-mono font-bold shrink-0">
            {role}
          </span>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-teal-600 text-white shadow-md shadow-teal-900/30 font-bold"
                  : item.highlight
                  ? "bg-slate-800/90 text-teal-300 hover:bg-slate-800 hover:text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : item.highlight ? "text-teal-400" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-teal-700 text-white"
                      : "bg-teal-950/80 text-teal-300 border border-teal-800/60"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Quick Support & Sign Out */}
      <div className="border-t border-slate-800 p-3.5 bg-slate-950/60 space-y-2">
        <div className="rounded-xl bg-gradient-to-r from-slate-800/90 to-slate-800/40 p-2.5 border border-slate-700/50">
          <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold">
            <Sparkles className="h-4 w-4" />
            <span>Bakong KHQR Active</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400 leading-snug">
            {language === "km" ? "គាំទ្រការទូទាត់ KHQR ស្វ័យប្រវត្តិ" : "Auto Bakong EMVCo Enabled"}
          </p>
        </div>

        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs font-bold text-slate-400 hover:bg-red-950/40 hover:border-red-800/60 hover:text-red-400 transition cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>{language === "km" ? "ចាកចេញ (Sign Out)" : "Sign Out"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 z-40">
        {sidebarContent}
      </aside>

      {/* 2. Mobile / Tablet Off-Canvas Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs animate-in fade-in transition-opacity"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="relative z-50 flex h-full animate-in slide-in-from-left duration-300 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
