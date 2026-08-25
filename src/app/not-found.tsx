"use client";

import React from "react";
import Link from "next/link";
import {
  FileQuestion,
  Home,
  ShoppingCart,
  Wrench,
  Package,
  Settings,
  ArrowLeft,
} from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-50 text-teal-700 shadow-lg border border-teal-100 mb-6 animate-bounce">
        <FileQuestion className="h-10 w-10" />
      </div>

      <span className="font-mono font-extrabold text-teal-600 bg-teal-50 px-3 py-1 rounded-full text-xs border border-teal-200 mb-2">
        Error 404 • Not Found
      </span>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
        រកមិនឃើញទំព័រដែលលោកអ្នកស្វែងរកទេ
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
        Page Not Found: អាសយដ្ឋាន URL ដែលអ្នកបានបញ្ចូលមិនត្រឹមត្រូវ ឬត្រូវបានផ្លាស់ប្តូរទីតាំង។
      </p>

      {/* Quick Navigation Action Buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-900/20 hover:bg-teal-800 transition active:scale-95"
        >
          <Home className="h-4 w-4" />
          ត្រឡប់ទៅផ្ទាំងដើម (Dashboard)
        </Link>
        <Link
          href="/pos"
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-900 transition active:scale-95"
        >
          <ShoppingCart className="h-4 w-4" />
          ចំណុចលក់ (POS)
        </Link>
      </div>

      {/* Other Quick Links */}
      <div className="mt-8 border-t border-slate-200 pt-6 max-w-lg w-full">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          ទំព័រពេញនិយម (Quick Links)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link
            href="/repairs"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50/50 transition"
          >
            <Wrench className="h-3.5 w-3.5 text-teal-600" />
            ជួសជុល
          </Link>
          <Link
            href="/inventory"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50/50 transition"
          >
            <Package className="h-3.5 w-3.5 text-teal-600" />
            ឃ្លាំងស្តុក
          </Link>
          <Link
            href="/accounting"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50/50 transition"
          >
            គណនេយ្យ
          </Link>
          <Link
            href="/settings"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50/50 transition"
          >
            <Settings className="h-3.5 w-3.5 text-teal-600" />
            ការកំណត់
          </Link>
        </div>
      </div>
    </div>
  );
}
