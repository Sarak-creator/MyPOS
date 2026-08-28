"use client";

import React, { useState, useEffect } from "react";
import {
  Users2,
  Plus,
  Search,
  CalendarCheck,
  DollarSign,
  Printer,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
  Clock,
  Building2,
  Calendar,
  LogIn,
  LogOut,
  Check,
  Edit2,
  Trash2,
  Coffee,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";

interface EmployeePayroll {
  id: string;
  code: string;
  nameKh: string;
  nameEn: string;
  position: string;
  phone: string;
  branchId?: string | null;
  branchName?: string;
  branchCode?: string;
  baseSalaryUsd: number;
  overtimeUsd: number;
  commissionUsd: number;
  bonusUsd: number;
  deductionUsd: number;
  netSalaryUsd: number;
  isDisbursed: boolean;
  hireDate?: string;
}

interface AttendanceItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeNameKh: string;
  employeeNameEn: string;
  position: string;
  phone: string;
  avatarUrl?: string | null;
  branchId: string;
  branchName: string;
  branchCode: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  durationFormatted: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "LEAVE";
  notes: string;
}

interface BranchItem {
  id: string;
  name: string;
  code: string;
  isHeadOffice?: boolean;
}

export default function HRMPage() {
  const { language } = usePOSStore();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<"ATTENDANCE" | "PAYROLL" | "EMPLOYEES">("ATTENDANCE");
  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [attLoading, setAttLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Role & Scoping State
  const [isBranchScoped, setIsBranchScoped] = useState(false);
  const [scopedBranchId, setScopedBranchId] = useState<string | null>(null);
  const [scopedBranchName, setScopedBranchName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("ADMIN");

  // Live Clock
  const [currentLiveTime, setCurrentLiveTime] = useState<string>("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentLiveTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Attendance Filters & Stats State
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [attendanceSearch, setAttendanceSearch] = useState<string>("");
  const [attStats, setAttStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    leave: 0,
    absent: 0,
    rate: 0,
  });

  // Quick Clock In / Out State
  const [quickClockEmpId, setQuickClockEmpId] = useState<string>("");
  const [quickClockBranchId, setQuickClockBranchId] = useState<string>("");
  const [quickClockNotes, setQuickClockNotes] = useState<string>("");
  const [clockActionLoading, setClockActionLoading] = useState(false);

  // Manual Attendance Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState<{
    id?: string;
    employeeId: string;
    branchId: string;
    date: string;
    checkIn: string;
    checkOut: string;
    status: "PRESENT" | "LATE" | "LEAVE" | "ABSENT";
    notes: string;
  }>({
    employeeId: "",
    branchId: "",
    date: new Date().toISOString().split("T")[0],
    checkIn: "08:00",
    checkOut: "17:30",
    status: "PRESENT",
    notes: "",
  });

  // Print Sheet Modal State
  const [isPrintAttendanceOpen, setIsPrintAttendanceOpen] = useState(false);

  // Add Employee Modal
  const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState({
    fullNameKh: "",
    fullNameEn: "",
    position: "Senior Repair Technician",
    baseSalaryUsd: "450",
    phone: "",
    branchId: "",
  });

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      if (data.success && Array.isArray(data.branches)) {
        setBranches(data.branches);
        if (data.branches.length > 0 && !quickClockBranchId) {
          setQuickClockBranchId(data.branches[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const fetchHRMData = async (branchParam?: string) => {
    try {
      setLoading(true);
      const targetBranch = branchParam !== undefined ? branchParam : selectedBranch;
      const url = targetBranch && targetBranch !== "ALL" ? `/api/hrm?branchId=${targetBranch}` : "/api/hrm";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees || []);
        if (data.isBranchScoped && data.scopedBranchId) {
          setIsBranchScoped(true);
          setScopedBranchId(data.scopedBranchId);
          setSelectedBranch(data.scopedBranchId);
          setQuickClockBranchId(data.scopedBranchId);
        }
        if (data.employees?.length > 0 && !quickClockEmpId) {
          setQuickClockEmpId(data.employees[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load HRM data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async (dateParam?: string, branchParam?: string) => {
    try {
      setAttLoading(true);
      const targetDate = dateParam !== undefined ? dateParam : attendanceDate;
      const targetBranch = branchParam !== undefined ? branchParam : selectedBranch;

      const params = new URLSearchParams();
      if (targetDate) params.append("date", targetDate);
      if (targetBranch && targetBranch !== "ALL") params.append("branchId", targetBranch);

      const res = await fetch(`/api/hrm/attendance?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAttendances(data.attendances || []);
        if (data.stats) {
          setAttStats(data.stats);
        }
        if (data.userRole) setUserRole(data.userRole);
        if (data.isBranchScoped) {
          setIsBranchScoped(true);
          setScopedBranchId(data.scopedBranchId);
          setScopedBranchName(data.scopedBranchName);
          if (data.scopedBranchId) {
            setSelectedBranch(data.scopedBranchId);
            setQuickClockBranchId(data.scopedBranchId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load attendances:", err);
    } finally {
      setAttLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchHRMData();
    fetchAttendanceData();
  }, []);

  // Quick Clock In
  const handleQuickClockIn = async () => {
    if (!quickClockEmpId) {
      alert("សូមជ្រើសរើសបុគ្គលិក!");
      return;
    }

    try {
      setClockActionLoading(true);
      const effectiveTargetBranch = isBranchScoped ? scopedBranchId : (quickClockBranchId || branches[0]?.id);
      const res = await fetch("/api/hrm/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLOCK_IN",
          employeeId: quickClockEmpId,
          branchId: effectiveTargetBranch,
          notes: quickClockNotes,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert("🎉 " + data.message);
      setQuickClockNotes("");
      await fetchAttendanceData();
    } catch (err: any) {
      alert("បរាជ័យក្នុងការកត់ត្រាម៉ោងចូល: " + err.message);
    } finally {
      setClockActionLoading(false);
    }
  };

  // Quick Clock Out
  const handleQuickClockOut = async () => {
    if (!quickClockEmpId) {
      alert("សូមជ្រើសរើសបុគ្គលិក!");
      return;
    }

    try {
      setClockActionLoading(true);
      const res = await fetch("/api/hrm/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLOCK_OUT",
          employeeId: quickClockEmpId,
          notes: quickClockNotes,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert("🎉 " + data.message);
      setQuickClockNotes("");
      await fetchAttendanceData();
    } catch (err: any) {
      alert("បរាជ័យក្នុងការកត់ត្រាម៉ោងចេញ: " + err.message);
    } finally {
      setClockActionLoading(false);
    }
  };

  // Manual Attendance Submit
  const handleSaveManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.employeeId) {
      alert("សូមជ្រើសរើសបុគ្គលិក!");
      return;
    }

    try {
      setSubmitting(true);
      const checkInDateTime = manualForm.checkIn
        ? `${manualForm.date}T${manualForm.checkIn}:00.000Z`
        : undefined;
      const checkOutDateTime = manualForm.checkOut
        ? `${manualForm.date}T${manualForm.checkOut}:00.000Z`
        : undefined;

      const targetBranch = isBranchScoped ? scopedBranchId : (manualForm.branchId || branches[0]?.id);

      if (manualForm.id) {
        // Update
        const res = await fetch("/api/hrm/attendance", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: manualForm.id,
            checkIn: checkInDateTime,
            checkOut: checkOutDateTime,
            status: manualForm.status,
            notes: manualForm.notes,
            branchId: targetBranch,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        // Create
        const res = await fetch("/api/hrm/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "MANUAL_ENTRY",
            employeeId: manualForm.employeeId,
            branchId: targetBranch,
            date: manualForm.date,
            checkIn: checkInDateTime,
            checkOut: checkOutDateTime,
            status: manualForm.status,
            notes: manualForm.notes,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }

      setIsManualModalOpen(false);
      await fetchAttendanceData();
    } catch (err: any) {
      alert("បរាជ័យក្នុងការកត់ត្រា: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Attendance
  const handleDeleteAttendance = async (id: string, empName: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបកំណត់ត្រាវត្តមានរបស់ "${empName}" នេះមែនទេ?`)) return;

    try {
      const res = await fetch(`/api/hrm/attendance?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await fetchAttendanceData();
    } catch (err: any) {
      alert("បរាជ័យក្នុងការលុប: " + err.message);
    }
  };

  // Add Employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.fullNameKh || !empForm.phone) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/hrm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_EMPLOYEE",
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
        branchId: "",
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
          action: "PROCESS_PAYROLL",
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

  // Available employees for quick clock and manual record
  const availableEmployees = employees.filter((emp) => {
    if (isBranchScoped && scopedBranchId) {
      return !emp.branchId || emp.branchId === scopedBranchId;
    }
    if (selectedBranch !== "ALL") {
      return !emp.branchId || emp.branchId === selectedBranch;
    }
    return true;
  });

  const filteredAttendances = attendances.filter((att) => {
    const query = attendanceSearch.toLowerCase().trim();
    const matchesSearch =
      query === "" ||
      att.employeeNameKh.toLowerCase().includes(query) ||
      att.employeeNameEn.toLowerCase().includes(query) ||
      att.employeeCode.toLowerCase().includes(query) ||
      att.phone.includes(query) ||
      att.branchName.toLowerCase().includes(query);

    const matchesStatus =
      selectedStatusFilter === "ALL" || att.status === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPayrollUsd = employees.reduce((a, b) => a + b.netSalaryUsd, 0);

  const getAttendanceStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          label: "វត្តមានទាន់ពេល (On Time)",
          icon: CheckCircle2,
        };
      case "LATE":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          label: "មកយឺត (Late)",
          icon: Clock,
        };
      case "LEAVE":
        return {
          bg: "bg-sky-50 text-sky-800 border-sky-200",
          label: "សុំច្បាប់ (On Leave)",
          icon: Coffee,
        };
      case "ABSENT":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          label: "អវត្តមាន (Absent)",
          icon: AlertCircle,
        };
      default:
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          label: status,
          icon: Check,
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users2 className="h-6 w-6 text-teal-700" />
            {t.hrm} & {t.attendance}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            គ្រប់គ្រងវត្តមានបុគ្គលិកតាមសាខា ម៉ោងចូល-ចេញ ប្រាក់បៀវត្ស និងកម្រៃជើងសារពហុសាខា
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              fetchHRMData();
              fetchAttendanceData();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-teal-700 ${loading || attLoading ? "animate-spin" : ""}`} />
            ផ្ទុកឡើងវិញ
          </button>
          <button
            onClick={() => setIsAddEmpModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            បន្ថែមបុគ្គលិកថ្មី
          </button>
        </div>
      </div>

      {/* Branch Scope Banner for Branch Managers */}
      {isBranchScoped && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/70 p-4 text-xs font-bold text-amber-950 shadow-2xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shrink-0 shadow-xs">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-extrabold text-amber-950 flex items-center gap-1.5">
              <span>🔒 វិសាលភាពសាខា៖ កំណត់ត្រាវត្តមានសម្រាប់តែសាខា៖</span>
              <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-amber-950 font-black">
                {scopedBranchName || "សាខារបស់អ្នក"}
              </span>
            </p>
            <p className="text-[11px] text-amber-800 font-normal mt-0.5">
              អ្នកមានសិទ្ធិមើល គ្រប់គ្រង និងកត់ត្រាវត្តមានសម្រាប់តែបុគ្គលិកក្នុងសាខាដែលបានចាត់តាំងនេះប៉ុណ្ណោះ។
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab("ATTENDANCE")}
          className={`pb-3 transition flex items-center gap-1.5 ${
            activeTab === "ATTENDANCE"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          វត្តមានប្រចាំថ្ងៃ (Daily Attendance)
        </button>
        <button
          onClick={() => setActiveTab("PAYROLL")}
          className={`pb-3 transition flex items-center gap-1.5 ${
            activeTab === "PAYROLL"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          តារាងបើកប្រាក់បៀវត្ស ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab("EMPLOYEES")}
          className={`pb-3 transition flex items-center gap-1.5 ${
            activeTab === "EMPLOYEES"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users2 className="h-4 w-4" />
          បញ្ជីបុគ្គលិកទាំងអស់ ({employees.length})
        </button>
      </div>

      {/* 1. ATTENDANCE TAB */}
      {activeTab === "ATTENDANCE" && (
        <div className="space-y-6">
          {/* Real-time Clock In / Clock Out Action Bar */}
          <div className="rounded-3xl border border-teal-200/80 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-5 text-white shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              {/* Digital Clock & Title */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-teal-300">
                  <Clock className="h-7 w-7 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-teal-200">
                      កត់ត្រាវត្តមានរហ័ស (Quick Attendance Terminal)
                    </h3>
                  </div>
                  <p className="font-mono text-2xl font-black text-white tracking-widest mt-0.5">
                    {currentLiveTime || "08:30:00 AM"}
                  </p>
                  <p className="text-[11px] text-teal-200/80">
                    ម៉ោងស្តង់ដារចូល៖ ០៨:០០ ព្រឹក | យឺតបន្ទាប់ពី ០៨:៣០ ព្រឹក
                  </p>
                </div>
              </div>

              {/* Quick Action Form Controls */}
              <div className="flex items-center gap-2.5 flex-wrap flex-1 lg:justify-end">
                <select
                  value={quickClockEmpId}
                  onChange={(e) => setQuickClockEmpId(e.target.value)}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-md focus:outline-hidden focus:bg-teal-950/80"
                >
                  <option value="" className="text-slate-800">ជ្រើសរើសបុគ្គលិក...</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id} className="text-slate-800">
                      {emp.nameKh} ({emp.code}) - {emp.position} {emp.branchName ? `[${emp.branchName}]` : ""}
                    </option>
                  ))}
                </select>

                {!isBranchScoped ? (
                  <select
                    value={quickClockBranchId}
                    onChange={(e) => setQuickClockBranchId(e.target.value)}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-md focus:outline-hidden focus:bg-teal-950/80"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="text-slate-800">
                        🏢 {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-white/15 border border-white/20 px-3 py-2 text-xs font-bold text-teal-100">
                    🏢 {scopedBranchName || "សាខាផ្ទាល់"}
                  </span>
                )}

                <input
                  type="text"
                  value={quickClockNotes}
                  onChange={(e) => setQuickClockNotes(e.target.value)}
                  placeholder="កំណត់សម្គាល់ (Optional)..."
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-teal-200/50 backdrop-blur-md focus:outline-hidden w-40"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleQuickClockIn}
                    disabled={clockActionLoading || !quickClockEmpId}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                  >
                    <LogIn className="h-4 w-4" />
                    ចូលធ្វើការ (Clock In)
                  </button>
                  <button
                    onClick={handleQuickClockOut}
                    disabled={clockActionLoading || !quickClockEmpId}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    ចេញពីធ្វើការ (Clock Out)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 font-bold shrink-0">
                <Users2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">បុគ្គលិកសរុប (Total)</p>
                <h4 className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{attStats.total} នាក់</h4>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4.5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">វត្តមានទាន់ពេល (On Time)</p>
                <h4 className="text-xl font-extrabold text-emerald-950 font-mono mt-0.5">{attStats.present} នាក់</h4>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4.5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">មកយឺត (Late Arrivals)</p>
                <h4 className="text-xl font-extrabold text-amber-950 font-mono mt-0.5">{attStats.late} នាក់</h4>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-4.5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-800 font-bold shrink-0">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">ច្បាប់ / អវត្តមាន (Leave/Absent)</p>
                <h4 className="text-xl font-extrabold text-rose-950 font-mono mt-0.5">
                  {attStats.leave + attStats.absent} នាក់
                </h4>
              </div>
            </div>
          </div>

          {/* Filters & Action Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap flex-1">
                {/* Search */}
                <div className="flex items-center gap-2 w-full sm:w-60 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-2xs">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    placeholder="ស្វែងរកតាមឈ្មោះ, កូដ, ទូរស័ព្ទ..."
                    className="w-full bg-transparent focus:outline-hidden"
                  />
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
                  <Calendar className="h-4 w-4 text-teal-700" />
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => {
                      setAttendanceDate(e.target.value);
                      fetchAttendanceData(e.target.value, selectedBranch);
                    }}
                    className="focus:outline-hidden bg-transparent cursor-pointer font-mono"
                  />
                </div>

                {/* Quick Date Short-cuts */}
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    setAttendanceDate(todayStr);
                    fetchAttendanceData(todayStr, selectedBranch);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    attendanceDate === new Date().toISOString().split("T")[0]
                      ? "bg-teal-50 text-teal-800 border border-teal-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ថ្ងៃនេះ
                </button>

                {/* Branch Filter */}
                {!isBranchScoped ? (
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      fetchAttendanceData(attendanceDate, e.target.value);
                      fetchHRMData(e.target.value);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden shadow-2xs"
                  >
                    <option value="ALL">🏢 គ្រប់សាខាទាំងអស់ (All Branches)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        🏢 {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs">
                    <Building2 className="h-3.5 w-3.5 text-amber-700" />
                    <span>សាខា៖ {scopedBranchName || "សាខាផ្ទាល់"}</span>
                  </div>
                )}

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  {[
                    { id: "ALL", label: "ទាំងអស់" },
                    { id: "PRESENT", label: "វត្តមាន", count: attStats.present },
                    { id: "LATE", label: "មកយឺត", count: attStats.late },
                    { id: "LEAVE", label: "សុំច្បាប់", count: attStats.leave },
                    { id: "ABSENT", label: "អវត្តមាន", count: attStats.absent },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStatusFilter(s.id)}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        selectedStatusFilter === s.id
                          ? "bg-white text-teal-800 shadow-2xs font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {s.label}
                      {s.count !== undefined && s.count > 0 ? (
                        <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-mono">
                          {s.count}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const defaultBranch = isBranchScoped ? (scopedBranchId || "") : (selectedBranch !== "ALL" ? selectedBranch : branches[0]?.id || "");
                    setManualForm({
                      employeeId: availableEmployees[0]?.id || "",
                      branchId: defaultBranch,
                      date: attendanceDate,
                      checkIn: "08:00",
                      checkOut: "17:30",
                      status: "PRESENT",
                      notes: "",
                    });
                    setIsManualModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  <Plus className="h-4 w-4 text-teal-700" />
                  កត់ត្រាដោយដៃ
                </button>
                <button
                  onClick={() => setIsPrintAttendanceOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-800 transition shadow-xs"
                >
                  <Printer className="h-4 w-4" />
                  បោះពុម្ពតារាងវត្តមាន
                </button>
              </div>
            </div>
          </div>

          {/* Attendance Data Table */}
          {attLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
              <span className="text-xs font-semibold">កំពុងទាញទិន្នន័យវត្តមានតាមសាខា...</span>
            </div>
          ) : filteredAttendances.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <CalendarCheck className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">មិនទាន់មានកំណត់ត្រាវត្តមានសម្រាប់សាខា និងកាលបរិច្ឆេទនេះទេ</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ប្រើផ្ទាំងខាងលើដើម្បីកត់ត្រាម៉ោងចូល-ចេញរហ័ស ឬចុច &quot;កត់ត្រាដោយដៃ&quot;
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">បុគ្គលិក / មុខតំណែង</th>
                      <th className="py-3.5 px-4">សាខាប្រតិបត្តិការ</th>
                      <th className="py-3.5 px-4">ម៉ោងចូល (Check In)</th>
                      <th className="py-3.5 px-4">ម៉ោងចេញ (Check Out)</th>
                      <th className="py-3.5 px-4 text-center">ម៉ោងធ្វើការសរុប</th>
                      <th className="py-3.5 px-4 text-center">ស្ថានភាពវត្តមាន</th>
                      <th className="py-3.5 px-4">កំណត់សម្គាល់</th>
                      <th className="py-3.5 px-4 text-right">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredAttendances.map((att) => {
                      const statusInfo = getAttendanceStatusBadge(att.status);
                      const StatusIcon = statusInfo.icon;

                      return (
                        <tr key={att.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200/60">
                                {att.employeeNameKh.slice(0, 1) || "E"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{att.employeeNameKh}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {att.employeeCode} • {att.position}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                              <Building2 className="h-3 w-3 text-slate-500" />
                              {att.branchName}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {att.checkIn ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                                {new Date(att.checkIn).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {att.checkOut ? (
                              <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200/60">
                                {new Date(att.checkOut).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            ) : (
                              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60 text-[10px]">
                                កំពុងបំពេញការងារ
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                            {att.durationFormatted}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${statusInfo.bg}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 text-[11px] truncate max-w-[140px]">
                            {att.notes || "-"}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setManualForm({
                                    id: att.id,
                                    employeeId: att.employeeId,
                                    branchId: att.branchId,
                                    date: att.date,
                                    checkIn: att.checkIn
                                      ? new Date(att.checkIn).toISOString().slice(11, 16)
                                      : "08:00",
                                    checkOut: att.checkOut
                                      ? new Date(att.checkOut).toISOString().slice(11, 16)
                                      : "17:30",
                                    status: att.status,
                                    notes: att.notes || "",
                                  });
                                  setIsManualModalOpen(true);
                                }}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700 transition"
                                title="កែប្រែ"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAttendance(att.id, att.employeeNameKh)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                title="លុប"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. PAYROLL TAB */}
      {activeTab === "PAYROLL" && (
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
                  <th className="py-3 px-4">សាខា</th>
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
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                        {emp.branchName || "មិនទាន់កំណត់"}
                      </span>
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

      {/* 3. EMPLOYEES LIST TAB */}
      {activeTab === "EMPLOYEES" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">
              ចំនួនបុគ្គលិកសរុប: <span className="font-mono text-slate-900">{employees.length} នាក់</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">កូដបុគ្គលិក</th>
                  <th className="py-3 px-4">ឈ្មោះពេញ (ខ្មែរ / អង់គ្លេស)</th>
                  <th className="py-3 px-4">សាខា</th>
                  <th className="py-3 px-4">មុខតំណែង</th>
                  <th className="py-3 px-4">លេខទូរស័ព្ទ</th>
                  <th className="py-3 px-4 text-right">ប្រាក់ខែគោល</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-teal-700">{emp.code}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{emp.nameKh}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{emp.nameEn || "-"}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                        {emp.branchName || "មិនទាន់កំណត់"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {emp.position}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{emp.phone}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ${Number(emp.baseSalaryUsd || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANUAL ATTENDANCE MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-teal-700" />
                {manualForm.id ? "កែប្រែកំណត់ត្រាវត្តមាន" : "កត់ត្រាវត្តមានដោយដៃ"}
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualAttendance} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ជ្រើសរើសបុគ្គលិក *</label>
                <select
                  required
                  value={manualForm.employeeId}
                  onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 focus:outline-hidden"
                >
                  <option value="">ជ្រើសរើសបុគ្គលិក...</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nameKh} ({emp.code}) - {emp.position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">សាខាបំពេញការងារ *</label>
                {!isBranchScoped ? (
                  <select
                    required
                    value={manualForm.branchId}
                    onChange={(e) => setManualForm({ ...manualForm, branchId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 focus:outline-hidden"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        🏢 {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={`🏢 ${scopedBranchName || "សាខាផ្ទាល់"}`}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-xs font-bold text-slate-700 cursor-not-allowed"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">កាលបរិច្ឆេទ *</label>
                  <input
                    type="date"
                    required
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ស្ថានភាពវត្តមាន *</label>
                  <select
                    value={manualForm.status}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, status: e.target.value as any })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="PRESENT">✅ វត្តមានទាន់ពេល (Present)</option>
                    <option value="LATE">⏳ មកយឺត (Late)</option>
                    <option value="LEAVE">🏖️ សុំច្បាប់ (Leave)</option>
                    <option value="ABSENT">❌ អវត្តមាន (Absent)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ម៉ោងចូល (Check In)</label>
                  <input
                    type="time"
                    value={manualForm.checkIn}
                    onChange={(e) => setManualForm({ ...manualForm, checkIn: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ម៉ោងចេញ (Check Out)</label>
                  <input
                    type="time"
                    value={manualForm.checkOut}
                    onChange={(e) => setManualForm({ ...manualForm, checkOut: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">កំណត់សម្គាល់ / មូលហេតុ</label>
                <input
                  type="text"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  placeholder="ឧ. ឈឺក្បាលសុំច្បាប់កន្លះថ្ងៃ, មកយឺតដោយសារភ្លៀង..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  រក្សាទុកវត្តមាន
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE ATTENDANCE SHEET MODAL */}
      {isPrintAttendanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95 my-8 space-y-6 print:m-0 print:p-0 print:shadow-none">
            {/* Header controls (hidden when printing) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Printer className="h-4 w-4 text-teal-700" />
                ទម្រង់បោះពុម្ពតារាងវត្តមានប្រចាំថ្ងៃ (Daily Attendance Sheet)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-teal-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-teal-800 transition shadow-xs"
                >
                  បោះពុម្ពឥឡូវនេះ (Print)
                </button>
                <button
                  onClick={() => setIsPrintAttendanceOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="border border-slate-300 p-6 rounded-2xl font-sans text-slate-900 space-y-4">
              <div className="text-center border-b border-slate-200 pb-3 space-y-1">
                <h2 className="text-lg font-black text-slate-900">អាណាចក្រPOS • ANACHAK POS</h2>
                <h3 className="text-sm font-extrabold text-teal-800 uppercase tracking-wide">
                  តារាងវត្តមានបុគ្គលិកប្រចាំថ្ងៃ (DAILY ATTENDANCE SHEET)
                </h3>
                <p className="text-xs font-mono text-slate-700 font-bold">
                  កាលបរិច្ឆេទ: {attendanceDate} • សាខា:{" "}
                  {isBranchScoped
                    ? scopedBranchName || "សាខាផ្ទាល់"
                    : selectedBranch === "ALL"
                    ? "គ្រប់សាខាទាំងអស់"
                    : branches.find((b) => b.id === selectedBranch)?.name || "-"}
                </p>
              </div>

              {/* Summary Stats in Sheet */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-bold">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">បុគ្គលិក</span>
                  <span className="text-sm font-mono text-slate-900">{attStats.total}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 uppercase block">វត្តមាន</span>
                  <span className="text-sm font-mono text-emerald-700">{attStats.present}</span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-700 uppercase block">មកយឺត</span>
                  <span className="text-sm font-mono text-amber-700">{attStats.late}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-700 uppercase block">ច្បាប់/អវត្តមាន</span>
                  <span className="text-sm font-mono text-rose-700">{attStats.leave + attStats.absent}</span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-bold text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5 border-r border-slate-200">ល.រ</th>
                    <th className="py-2 px-2.5 border-r border-slate-200">កូដ & ឈ្មោះបុគ្គលិក</th>
                    <th className="py-2 px-2.5 border-r border-slate-200">សាខា</th>
                    <th className="py-2 px-2.5 border-r border-slate-200">មុខតំណែង</th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-200">ម៉ោងចូល</th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-200">ម៉ោងចេញ</th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-200">ស្ថានភាព</th>
                    <th className="py-2 px-2.5">ហត្ថលេខា</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {filteredAttendances.map((att, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <p className="font-bold text-slate-900">{att.employeeNameKh}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{att.employeeCode}</p>
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-[10px] font-bold">{att.branchName}</td>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-[11px]">{att.position}</td>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono font-bold">
                        {att.checkIn
                          ? new Date(att.checkIn).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "-"}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono font-bold">
                        {att.checkOut
                          ? new Date(att.checkOut).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "-"}
                      </td>
                      <td className="py-2 px-2.5 text-center border-r border-slate-200 font-bold text-[10px]">
                        {att.status === "PRESENT"
                          ? "វត្តមាន"
                          : att.status === "LATE"
                          ? "មកយឺត"
                          : att.status === "LEAVE"
                          ? "សុំច្បាប់"
                          : "អវត្តមាន"}
                      </td>
                      <td className="py-2 px-2.5 w-24"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-800">អ្នកត្រួតពិនិត្យវត្តមាន (HR Officer)</p>
                  <div className="mt-12 border-t border-slate-300 mx-8"></div>
                </div>
                <div>
                  <p className="font-bold text-slate-800">ប្រធានសាខា / អ្នកគ្រប់គ្រង (Manager)</p>
                  <div className="mt-12 border-t border-slate-300 mx-8"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {isAddEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
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
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះជាភាសាអង់គ្លេស</label>
                <input
                  type="text"
                  value={empForm.fullNameEn}
                  onChange={(e) => setEmpForm({ ...empForm, fullNameEn: e.target.value })}
                  placeholder="e.g. Chea Sokha"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">មុខតំណែង *</label>
                <select
                  value={empForm.position}
                  onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold focus:outline-hidden"
                >
                  <option value="Senior Repair Technician">ជាងជួសជុលជាន់ខ្ពស់ (Senior Technician)</option>
                  <option value="Junior Repair Technician">ជាងជួសជុលកម្រិតដំបូង (Junior Technician)</option>
                  <option value="Cashier">អ្នកគិតលុយ (Cashier)</option>
                  <option value="Sales Associate">បុគ្គលិកលក់ (Sales Associate)</option>
                  <option value="Inventory Clerk">បុគ្គលិកឃ្លាំង (Inventory Clerk)</option>
                  <option value="Branch Manager">មេការសាខា (Branch Manager)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ប្រាក់ខែគោល ($) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={empForm.baseSalaryUsd}
                  onChange={(e) => setEmpForm({ ...empForm, baseSalaryUsd: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">លេខទូរស័ព្ទ *</label>
                <input
                  type="text"
                  required
                  value={empForm.phone}
                  onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                  placeholder="012 345 678"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEmpModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  រក្សាទុកបុគ្គលិក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
