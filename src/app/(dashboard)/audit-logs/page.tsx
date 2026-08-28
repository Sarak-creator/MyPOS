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
  Building2,
  Store,
  MapPin,
  ShieldCheck,
  ArrowRightLeft,
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
  branchId?: string | null;
  branch: string;
  branchCode?: string;
  ipAddress: string;
  userAgent: string;
  details: {
    reason?: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    note?: string;
    [key: string]: any;
  };
}

interface BranchItem {
  id: string;
  name: string;
  code: string;
  isHeadOffice?: boolean;
}

export default function AuditLogsPage() {
  const { language } = usePOSStore();
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [userRole, setUserRole] = useState<string>("ADMIN");
  const [isBranchScoped, setIsBranchScoped] = useState<boolean>(false);
  const [scopedBranchName, setScopedBranchName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      if (data.success && Array.isArray(data.branches)) {
        setBranches(data.branches);
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const fetchAuditLogs = async (branchIdOverride?: string) => {
    try {
      setLoading(true);
      const bId = branchIdOverride !== undefined ? branchIdOverride : selectedBranch;
      const url = bId && bId !== "ALL" ? `/api/audit-logs?branchId=${bId}` : "/api/audit-logs";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
        if (data.userRole) setUserRole(data.userRole);
        setIsBranchScoped(Boolean(data.isBranchScoped));
        setScopedBranchName(data.scopedBranchName || null);
        if (data.isBranchScoped && data.scopedBranchId) {
          setSelectedBranch(data.scopedBranchId);
        }
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchAuditLogs();
  }, []);

  const filteredLogs = auditLogs.filter((log) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === "" ||
      log.userName.toLowerCase().includes(query) ||
      log.actionLabelKh.toLowerCase().includes(query) ||
      log.entityId.toLowerCase().includes(query) ||
      log.branch.toLowerCase().includes(query) ||
      log.ipAddress.includes(query);

    const matchesAction = selectedAction === "ALL" || log.action === selectedAction;
    const matchesSeverity = selectedSeverity === "ALL" || log.severity === selectedSeverity;
    const matchesBranch =
      isBranchScoped || selectedBranch === "ALL" || log.branchId === selectedBranch;

    return matchesSearch && matchesAction && matchesSeverity && matchesBranch;
  });

  const stats = {
    total: auditLogs.length,
    critical: auditLogs.filter((l) => l.severity === "CRITICAL").length,
    warning: auditLogs.filter((l) => l.severity === "WARNING").length,
    info: auditLogs.filter((l) => l.severity === "INFO").length,
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "DRAWER_OPEN":
      case "VOID_ORDER":
      case "ORDER_VOID":
      case "ORDER_REFUND":
      case "LOGIN_FAILED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "PRICE_OVERRIDE":
      case "SETTINGS_CHANGED":
      case "STOCK_ADJUST":
      case "STOCK_TRANSFER_IN_TRANSIT":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "REPAIR_UPDATE":
      case "STOCK_TRANSFER_CREATE":
      case "STOCK_TRANSFER_COMPLETED":
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
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-teal-700" />
              {t.auditLogs} (Security & Audit Trails)
            </h2>
            {isBranchScoped ? (
              <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                <Lock className="h-3 w-3" />
                សាខា: {scopedBranchName || "Branch-Only"}
              </span>
            ) : (
              <span className="rounded-full bg-teal-100 text-teal-900 border border-teal-200 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                គ្រប់សាខា (Store-wide View)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            កត់ត្រា និងតាមដានរាល់សកម្មភាពសុវត្ថិភាព ផ្ទេរស្តុក ការកែតម្លៃ និងការបញ្ចុះតម្លៃក្នុងប្រព័ន្ធ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAuditLogs()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
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

      {/* Branch Manager Scoped Notice */}
      {isBranchScoped && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 text-xs text-amber-900 shadow-2xs">
          <Lock className="h-4 w-4 text-amber-700 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">
              កំណត់ត្រាសុវត្ថិភាពសម្រាប់តែសាខា៖ {scopedBranchName || "សាខារបស់លោកអ្នក"} (Branch-Scoped View)
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              គណនីមេការសាខា (Branch Manager) មានសិទ្ធិមើលឃើញត្រឹមតែសកម្មភាពបុគ្គលិក និងប្រតិបត្តិការក្នុងសាខារបស់ខ្លួនប៉ុណ្ណោះ។
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 font-bold shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">សរុបកំណត់ត្រា (Total)</p>
            <h4 className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{stats.total}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700 font-bold shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">ហានិភ័យខ្ពស់ (Critical)</p>
            <h4 className="text-xl font-extrabold text-rose-950 font-mono mt-0.5">{stats.critical}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">ការព្រមាន (Warnings)</p>
            <h4 className="text-xl font-extrabold text-amber-950 font-mono mt-0.5">{stats.warning}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-800 font-bold shrink-0">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">វិសាលភាពសាខា (Scope)</p>
            <h4 className="text-xs font-extrabold text-sky-950 mt-1 truncate max-w-[130px]">
              {isBranchScoped ? scopedBranchName || "សាខាផ្ទាល់ខ្លួន" : `គ្រប់សាខា (${branches.length})`}
            </h4>
          </div>
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
              placeholder="ស្វែងរកតាមឈ្មោះបុគ្គលិក សកម្មភាព សាខា លេខវិក្កយបត្រ ឬ IP..."
              className="w-full text-slate-800 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Branch Selector Filter for Super Admin & Admin */}
            {!isBranchScoped ? (
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  fetchAuditLogs(e.target.value);
                }}
                className="rounded-xl border border-teal-300 bg-teal-50/50 px-3 py-2 text-xs font-bold text-teal-900 focus:outline-hidden"
              >
                <option value="ALL">🏢 គ្រប់សាខាទាំងអស់ (All Branches)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏢 {b.name} ({b.code}){b.isHeadOffice ? " [HQ]" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                <Store className="h-3.5 w-3.5 text-amber-700" />
                <span>{scopedBranchName || "សាខាបច្ចុប្បន្ន"}</span>
              </div>
            )}

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden"
            >
              <option value="ALL">គ្រប់សកម្មភាពទាំងអស់ (All Actions)</option>
              <option value="PRICE_OVERRIDE">កែប្រែតម្លៃលក់ (Price Override)</option>
              <option value="DRAWER_OPEN">បើកថតប្រាក់ (Drawer Open)</option>
              <option value="VOID_ORDER">លុបចោលវិក្កយបត្រ (Void Order)</option>
              <option value="ORDER_REFUND">សងប្រាក់ត្រឡប់ (Refund)</option>
              <option value="STOCK_ADJUST">កែសម្រួលស្តុក (Stock Adjust)</option>
              <option value="STOCK_TRANSFER_CREATE">បង្កើតសំណើផ្ទេរស្តុក (Transfer)</option>
              <option value="STOCK_TRANSFER_IN_TRANSIT">បញ្ជូនទំនិញផ្ទេរស្តុក (In Transit)</option>
              <option value="STOCK_TRANSFER_COMPLETED">ទទួលទំនិញផ្ទេរស្តុក (Completed)</option>
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
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isBranchScoped
              ? `មិនទាន់មានសកម្មភាពក្នុងសាខា ${scopedBranchName || ""} ទេ`
              : "មិនទាន់មានសកម្មភាពសុវត្ថិភាពដែលត្រូវបង្ហាញទេ"}
          </p>
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
                    <span className="text-[10px] text-slate-400 font-mono">{log.id.slice(0, 8)}...</span>
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
                    {log.entityId ? log.entityId.slice(0, 12) : "-"}
                  </td>

                  <td className="py-3 px-4 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                        <Building2 className="h-3 w-3 text-slate-500" />
                        {log.branch}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-teal-700" />
                ព័ត៌មានលម្អិតនៃសកម្មភាព ({selectedLog.id.slice(0, 8)})
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <p className="text-slate-400 text-[11px] font-bold uppercase">ប្រតិបត្តិករ (Operator):</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedLog.userName}</p>
                  <span className="text-[10px] font-mono text-teal-700 font-bold">{selectedLog.userRole}</span>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px] font-bold uppercase">កាលបរិច្ឆេទ & ម៉ោង:</p>
                  <p className="font-mono font-bold text-slate-900">
                    {formatDateTime(selectedLog.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px] font-bold uppercase">សាខា (Branch):</p>
                  <p className="font-bold text-slate-800">{selectedLog.branch}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px] font-bold uppercase">IP Address / Device:</p>
                  <p className="font-mono text-slate-800">{selectedLog.ipAddress}</p>
                </div>
              </div>

              {selectedLog.details && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <p className="font-bold text-slate-800 text-xs">ព័ត៌មានលម្អិតបន្ថែម (Payload & Metadata):</p>
                  <pre className="text-[11px] font-mono text-slate-800 whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-200 overflow-x-auto max-h-60">
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

