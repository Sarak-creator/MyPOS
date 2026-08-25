"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  UserCheck,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Eye,
  ArrowRight,
  Clock,
  Laptop,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  Lock,
  DollarSign,
  Package,
  Wrench,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  actionLabelKh: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  entity: string;
  entityId: string;
  branch: string;
  ipAddress: string;
  userAgent: string;
  details: {
    reason?: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    note?: string;
  };
}

export default function AuditLogsPage() {
  const { language } = usePOSStore();
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/audit-logs");
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actionLabelKh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery);

    const matchesAction = selectedAction === "ALL" || log.action === selectedAction;
    const matchesSeverity = selectedSeverity === "ALL" || log.severity === selectedSeverity;

    return matchesSearch && matchesAction && matchesSeverity;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "DRAWER_OPEN":
      case "VOID_ORDER":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "PRICE_OVERRIDE":
      case "SETTINGS_CHANGED":
      case "STOCK_ADJUST":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "REPAIR_UPDATE":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500 text-white";
      case "WARNING":
        return "bg-amber-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-teal-700" />
            {t.auditLogs} (Security & Audit Trails)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            កត់ត្រា និងតាមដានរាល់សកម្មភាពសំខាន់ៗក្នុងប្រព័ន្ធផ្ទាល់ពី Supabase Database
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAuditLogs}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-teal-700 ${loading ? "animate-spin" : ""}`} />
            ផ្ទុកឡើងវិញ
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-800 transition shadow-xs"
          >
            <Printer className="h-4 w-4" />
            បោះពុម្ពកំណត់ត្រា
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] rounded-xl border border-slate-200 px-3 py-2 text-xs">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះបុគ្គលិក សកម្មភាព លេខវិក្កយបត្រ ឬ IP..."
              className="w-full text-slate-800 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden"
            >
              <option value="ALL">គ្រប់សកម្មភាពទាំងអស់ (All Actions)</option>
              <option value="PRICE_OVERRIDE">កែប្រែតម្លៃលក់ (Price Override)</option>
              <option value="DRAWER_OPEN">បើកថតប្រាក់ (Drawer Open)</option>
              <option value="VOID_ORDER">លុបចោលវិក្កយបត្រ (Void Order)</option>
              <option value="STOCK_ADJUST">កែសម្រួលស្តុក (Stock Adjust)</option>
              <option value="REPAIR_UPDATE">បច្ចុប្បន្នភាពជួសជុល (Repair)</option>
              <option value="SETTINGS_CHANGED">កែប្រែការកំណត់ (Settings)</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden"
            >
              <option value="ALL">កម្រិតធ្ងន់ធ្ងរ (All Severity)</option>
              <option value="CRITICAL">🔴 ហានិភ័យខ្ពស់ (Critical)</option>
              <option value="WARNING">🟡 ការព្រមាន (Warning)</option>
              <option value="INFO">🟢 ធម្មតា (Info)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
          <span className="text-xs font-semibold">កំពុងទាញ Audit Logs...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <ShieldAlert className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">មិនមានកំណត់ត្រា Audit Log ទេ</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">កាលបរិច្ឆេទ & ម៉ោង</th>
                <th className="py-3 px-4">បុគ្គលិក / ប្រតិបត្តិករ</th>
                <th className="py-3 px-4">សកម្មភាព & ព្រឹត្តិការណ៍</th>
                <th className="py-3 px-4">គោលដៅ (Entity ID)</th>
                <th className="py-3 px-4">សាខា & IP Address</th>
                <th className="py-3 px-4 text-center">កម្រិត</th>
                <th className="py-3 px-4 text-center">ព័ត៌មានលម្អិត</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-mono text-slate-900 font-semibold block">
                      {formatDateTime(log.timestamp)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.id}</span>
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{log.userName}</p>
                    <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                      {log.userRole}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-block rounded-lg border px-2.5 py-1 text-[11px] font-bold ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.actionLabelKh}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    <span className="text-slate-400 font-normal">{log.entity}: </span>
                    {log.entityId}
                  </td>

                  <td className="py-3 px-4 text-slate-600">
                    <p className="font-medium text-slate-800">{log.branch}</p>
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Laptop className="h-3 w-3" />
                      {log.ipAddress}
                    </p>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${getSeverityBadge(
                        log.severity
                      )}`}
                    >
                      {log.severity}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 px-2.5 py-1 text-[11px] font-bold transition shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      មើល Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Details & Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-teal-700" />
                ព័ត៌មានលម្អិតនៃសកម្មភាព ({selectedLog.id})
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-slate-400 text-[11px]">ប្រតិបត្តិករ (Operator):</p>
                  <p className="font-bold text-slate-900">{selectedLog.userName}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">កាលបរិច្ឆេទ & ម៉ោង:</p>
                  <p className="font-mono font-bold text-slate-900">
                    {formatDateTime(selectedLog.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">សាខា (Branch):</p>
                  <p className="font-bold text-slate-800">{selectedLog.branch}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">IP Address / Device:</p>
                  <p className="font-mono text-slate-800">{selectedLog.ipAddress}</p>
                </div>
              </div>

              {selectedLog.details && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-bold mb-1">ព័ត៌មានលម្អិតបន្ថែម (Payload details):</p>
                  <pre className="text-[11px] font-mono text-slate-800 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition"
                >
                  បិទផ្ទាំង
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
