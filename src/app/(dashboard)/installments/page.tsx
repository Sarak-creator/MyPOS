"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BadgePercent,
  Coins,
  AlertTriangle,
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  Printer,
  Calendar,
  DollarSign,
  User,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  Send,
  Sparkles,
  CreditCard,
  Building,
  SlidersHorizontal,
  X,
  Wrench,
  Package,
  Trash2,
  Loader2,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { formatUSD, formatKHR } from "@/lib/utils";
import InstallmentContractPrint from "@/components/print/InstallmentContractPrint";
import InstallmentSchedulePrint from "@/components/print/InstallmentSchedulePrint";
import PawnContractPrint from "@/components/print/PawnContractPrint";
import ContractSettingsModal from "@/components/loans/ContractSettingsModal";
import { LoanContractSettings } from "@/lib/config-manager";

export default function InstallmentsAndPawnPage() {
  const { exchangeRateKhr } = usePOSStore();

  // Contract & Loan Admin Settings
  const [showContractSettingsModal, setShowContractSettingsModal] = useState(false);
  const [loanSettings, setLoanSettings] = useState<LoanContractSettings | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"INSTALLMENT" | "PAWN" | "OVERDUE" | "WARRANTY">("INSTALLMENT");

  // Installment State
  const [contracts, setContracts] = useState<any[]>([]);
  const [installmentStats, setInstallmentStats] = useState<any>({});
  const [installmentLoading, setInstallmentLoading] = useState(false);
  const [installmentSearch, setInstallmentSearch] = useState("");
  const [installmentStatusFilter, setInstallmentStatusFilter] = useState("");

  // Pawn State
  const [pawnTickets, setPawnTickets] = useState<any[]>([]);
  const [pawnStats, setPawnStats] = useState<any>({});
  const [pawnLoading, setPawnLoading] = useState(false);
  const [pawnSearch, setPawnSearch] = useState("");
  const [pawnStatusFilter, setPawnStatusFilter] = useState("");

  // Warranty / Customer History State
  const [warrantySearch, setWarrantySearch] = useState("");
  const [warrantyResults, setWarrantyResults] = useState<any[]>([]);
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<any | null>(null);

  // Customers & Products list for forms
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [productList, setProductList] = useState<any[]>([]);

  // Modals
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [showNewPawnModal, setShowNewPawnModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [selectedPawnTicket, setSelectedPawnTicket] = useState<any | null>(null);

  // Print Modals
  const [printContractData, setPrintContractData] = useState<any | null>(null);
  const [printScheduleData, setPrintScheduleData] = useState<any | null>(null);
  const [printPawnData, setPrintPawnData] = useState<any | null>(null);

  // Payment Form Modal
  const [payModalSchedule, setPayModalSchedule] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payPenalty, setPayPenalty] = useState<string>("0");
  const [payMethod, setPayMethod] = useState<string>("CASH_USD");
  const [payNotes, setPayNotes] = useState<string>("");

  // Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "INSTALLMENT" | "PAWN";
    id: string;
    title: string;
    customerName?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const endpoint =
        deleteConfirm.type === "INSTALLMENT"
          ? `/api/installments/${deleteConfirm.id}`
          : `/api/pawn/${deleteConfirm.id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (deleteConfirm.type === "INSTALLMENT") {
          setContracts((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
          if (selectedContract?.id === deleteConfirm.id) {
            setSelectedContract(null);
          }
          fetchInstallments();
        } else {
          setPawnTickets((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
          fetchPawnTickets();
        }
        setDeleteConfirm(null);
      } else {
        alert(data.error || "បរាជ័យក្នុងការលុប!");
      }
    } catch (err: any) {
      alert("កំហុសក្នុងការលុប: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Pawn Payment / Extension Modal
  const [showPawnPayModal, setShowPawnPayModal] = useState(false);
  const [pawnPayType, setPawnPayType] = useState<"INTEREST_PAYMENT" | "FULL_REDEMPTION">("INTEREST_PAYMENT");
  const [pawnPayAmount, setPawnPayAmount] = useState<string>("");
  const [pawnMonthsExt, setPawnMonthsExt] = useState<number>(1);
  const [pawnExtType, setPawnExtType] = useState<"DAYS" | "MONTHS">("DAYS");
  const [pawnDaysExt, setPawnDaysExt] = useState<number>(30);
  const [pawnPayMethod, setPawnPayMethod] = useState<string>("CASH_USD");

  // New Installment Form Data
  const [newContractForm, setNewContractForm] = useState({
    customerId: "",
    productId: "",
    productName: "",
    productImeiOrSerial: "",
    totalPriceUsd: "",
    downPaymentUsd: "0",
    interestRatePercent: "1.5",
    durationMonths: "6",
    startDate: new Date().toISOString().split("T")[0],
    guarantorName: "",
    guarantorPhone: "",
    guarantorNationalId: "",
    guarantorAddress: "",
    customerNationalId: "",
    notes: "",
  });

  // New Pawn Form Data
  const [newPawnForm, setNewPawnForm] = useState({
    customerId: "",
    customerNationalId: "",
    itemName: "",
    itemCategory: "Phone",
    itemBrand: "",
    itemModel: "",
    imeiOrSerial: "",
    itemCondition: "ល្អ ដំណើរការធម្មតា (Good 98%)",
    storageLocation: "Safe Box A-01",
    estimatedValueUsd: "",
    loanAmountUsd: "",
    monthlyInterestRate: "2.5",
    durationType: "DAYS" as "DAYS" | "MONTHS",
    durationDays: "30",
    durationMonths: "1",
    interestAmountUsd: "",
    startDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // 1. Fetch Installments
  const fetchInstallments = async () => {
    setInstallmentLoading(true);
    try {
      const params = new URLSearchParams();
      if (installmentSearch) params.set("search", installmentSearch);
      if (installmentStatusFilter) params.set("status", installmentStatusFilter);

      const res = await fetch(`/api/installments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setContracts(data.contracts || []);
        setInstallmentStats(data.stats || {});
      }
    } catch (err) {
      console.error("Failed to fetch installments:", err);
    } finally {
      setInstallmentLoading(false);
    }
  };

  // 2. Fetch Pawn Tickets
  const fetchPawnTickets = async () => {
    setPawnLoading(true);
    try {
      const params = new URLSearchParams();
      if (pawnSearch) params.set("search", pawnSearch);
      if (pawnStatusFilter) params.set("status", pawnStatusFilter);

      const res = await fetch(`/api/pawn?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPawnTickets(data.tickets || []);
        setPawnStats(data.stats || {});
      }
    } catch (err) {
      console.error("Failed to fetch pawn tickets:", err);
    } finally {
      setPawnLoading(false);
    }
  };

  // 3. Search Warranty / Purchase Records
  const handleWarrantySearch = async (q: string) => {
    setWarrantySearch(q);
    if (!q || q.trim().length < 2) {
      setWarrantyResults([]);
      return;
    }
    setWarrantyLoading(true);
    try {
      const res = await fetch(`/api/warranty/search?query=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (data.success) {
        setWarrantyResults(data.results || []);
      }
    } catch (err) {
      console.error("Warranty search error:", err);
    } finally {
      setWarrantyLoading(false);
    }
  };

  // Fetch Customers & Products for dropdowns
  const fetchDropdownData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/products?limit=100"),
      ]);
      const custData = await custRes.json();
      const prodData = await prodRes.json();
      if (custData.success) setCustomerList(custData.customers || []);
      if (prodData.success) setProductList(prodData.products || []);
    } catch (err) {
      console.error("Error loading dropdown data:", err);
    }
  };

  // Fetch loan & contract custom settings (Admin)
  const fetchLoanSettings = async () => {
    try {
      const res = await fetch("/api/settings/loans");
      const data = await res.json();
      if (data.success && data.settings) {
        setLoanSettings(data.settings);
        setNewContractForm((prev) => ({
          ...prev,
          interestRatePercent: String(data.settings.installmentInterestRate ?? 1.5),
        }));
        setNewPawnForm((prev) => ({
          ...prev,
          monthlyInterestRate: String(data.settings.pawnMonthlyInterestRate ?? 2.5),
          durationDays: String(data.settings.defaultPawnDurationDays ?? 30),
          durationType: data.settings.defaultPawnDurationType || "DAYS",
        }));
      }
    } catch (err) {
      console.error("Error loading loan settings:", err);
    }
  };

  useEffect(() => {
    fetchInstallments();
    fetchPawnTickets();
    fetchDropdownData();
    fetchLoanSettings();
  }, []);

  useEffect(() => {
    if (activeTab === "INSTALLMENT") fetchInstallments();
    if (activeTab === "PAWN") fetchPawnTickets();
  }, [installmentSearch, installmentStatusFilter, pawnSearch, pawnStatusFilter, activeTab]);

  // Handle Product Select in New Installment Modal
  const handleSelectProduct = (prodId: string) => {
    const p = productList.find((item) => item.id === prodId);
    if (p) {
      setNewContractForm((prev) => ({
        ...prev,
        productId: p.id,
        productName: p.nameKh || p.nameEn,
        totalPriceUsd: p.salePriceUsd ? String(p.salePriceUsd) : "",
        productImeiOrSerial: p.imeiList && p.imeiList.length > 0 ? p.imeiList[0] : "",
      }));
    } else {
      setNewContractForm((prev) => ({
        ...prev,
        productId: "",
        productImeiOrSerial: "",
      }));
    }
  };

  // Submit New Installment Contract
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractForm.customerId || !newContractForm.productName || !newContractForm.totalPriceUsd) {
      alert("សូមបំពេញព័ត៌មានចាំបាច់ (អតិថិជន, ឈ្មោះទំនិញ, តម្លៃ)");
      return;
    }

    try {
      const res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContractForm),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowNewContractModal(false);
        fetchInstallments();
        fetchDropdownData();
        if (data.contract) {
          setPrintContractData(data.contract);
        }
      } else {
        alert("កំហុស៖ " + data.error);
      }
    } catch (err: any) {
      alert("បរាជ័យ៖ " + err.message);
    }
  };

  // Submit New Pawn Ticket
  const handleCreatePawn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPawnForm.customerId || !newPawnForm.itemName || !newPawnForm.loanAmountUsd) {
      alert("សូមបំពេញព័ត៌មានចាំបាច់ (អតិថិជន, ឈ្មោះទ្រព្យ, ទឹកប្រាក់កម្ចី)");
      return;
    }

    try {
      const payload: any = {
        ...newPawnForm,
        durationDays: newPawnForm.durationType === "DAYS" ? parseInt(newPawnForm.durationDays) || 30 : null,
        durationMonths:
          newPawnForm.durationType === "MONTHS"
            ? parseInt(newPawnForm.durationMonths) || 1
            : Math.max(1, Math.round((parseInt(newPawnForm.durationDays) || 30) / 30)),
      };
      const res = await fetch("/api/pawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowNewPawnModal(false);
        fetchPawnTickets();
        if (data.ticket) {
          setPrintPawnData(data.ticket);
        }
      } else {
        alert("កំហុស៖ " + data.error);
      }
    } catch (err: any) {
      alert("បរាជ័យ៖ " + err.message);
    }
  };

  // Open Pay Modal for an installment schedule item
  const openPayScheduleModal = (schedule: any) => {
    setPayModalSchedule(schedule);
    const remaining = Math.max(0, schedule.totalDueUsd - schedule.paidAmountUsd);
    setPayAmount(String(remaining));
    setPayPenalty(String(schedule.penaltyAmountUsd || 0));
    setPayMethod("CASH_USD");
    setPayNotes("");
  };

  // Submit Installment Payment
  const handleProcessInstallmentPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalSchedule || !payAmount) return;

    try {
      setIsSubmittingPayment(true);
      const res = await fetch("/api/installments/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: payModalSchedule.id,
          amountPaidUsd: parseFloat(payAmount),
          penaltyPaidUsd: parseFloat(payPenalty) || 0,
          paymentMethod: payMethod,
          notes: payNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setPayModalSchedule(null);
        fetchInstallments();
        if (selectedContract) {
          // Refresh detail modal
          const updated = await fetch(`/api/installments/${selectedContract.id}`).then((r) => r.json());
          if (updated.success) setSelectedContract(updated.contract);
        }
      } else {
        alert("កំហុស៖ " + data.error);
      }
    } catch (err: any) {
      alert("បរាជ័យ៖ " + err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Pawn Payment Modal
  const openPawnPayment = (ticket: any, type: "INTEREST_PAYMENT" | "FULL_REDEMPTION") => {
    setSelectedPawnTicket(ticket);
    setPawnPayType(type);
    if (type === "INTEREST_PAYMENT") {
      setPawnPayAmount(String(ticket.monthlyInterestUsd));
      setPawnMonthsExt(1);
      setPawnDaysExt(ticket.durationDays || 30);
      setPawnExtType(ticket.durationDays ? "DAYS" : "MONTHS");
    } else {
      setPawnPayAmount(String(ticket.loanAmountUsd));
    }
    setShowPawnPayModal(true);
  };

  // Submit Pawn Payment / Redemption
  const handleProcessPawnPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPawnTicket || !pawnPayAmount) return;

    try {
      const payload: any = {
        pawnTicketId: selectedPawnTicket.id,
        paymentType: pawnPayType,
        amountPaidUsd: parseFloat(pawnPayAmount),
        penaltyPaidUsd: 0,
        paymentMethod: pawnPayMethod,
      };

      if (pawnPayType === "INTEREST_PAYMENT") {
        if (pawnExtType === "DAYS") {
          payload.daysExtended = pawnDaysExt;
        } else {
          payload.monthsExtended = pawnMonthsExt;
        }
      }

      const res = await fetch("/api/pawn/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowPawnPayModal(false);
        fetchPawnTickets();
      } else {
        alert("កំហុស៖ " + data.error);
      }
    } catch (err: any) {
      alert("បរាជ័យ៖ " + err.message);
    }
  };

  // Quick Send Telegram / SMS Reminder
  const handleSendReminder = (item: any, type: "INSTALLMENT" | "PAWN") => {
    const text =
      type === "INSTALLMENT"
        ? `📲 សាររំលឹកបង់ប្រាក់រំលស់ (Installment Payment Reminder)\n` +
          `សូមជម្រាបសួរលោក/លោកស្រី ${item.customerName || item.customer?.name}!\n` +
          `សូមរំលឹកពីការបង់ប្រាក់រំលស់ទំនិញ "${item.productName}" កិច្ចសន្យា #${item.contractNumber}។\n` +
          `ទឹកប្រាក់ត្រូវបង់៖ $${item.monthlyAmountUsd?.toFixed(2)} (បង់យឺត ${item.daysOverdue || 0} ថ្ងៃ, ប្រាក់ពិន័យ $${item.penaltyAmountUsd || 0})។\n` +
          `សូមអរគុណ!`
        : `📲 សាររំលឹកបង់ការប្រាក់បញ្ចាំ (Pawn Loan Reminder)\n` +
          `សូមជម្រាបសួរលោក/លោកស្រី ${item.customerName}!\n` +
          `សូមរំលឹកពីកាលបរិច្ឆេទបង់ការប្រាក់លើទ្រព្យបញ្ចាំ "${item.itemName}" ប័ណ្ណលេខ #${item.ticketNumber}។\n` +
          `ការប្រាក់ប្រចាំខែ៖ $${item.monthlyInterestUsd?.toFixed(2)} (ផុតកំណត់ថ្ងៃ ${item.maturityDate})។\n` +
          `សូមអរគុណ!`;

    navigator.clipboard?.writeText(text);
    alert(text + "\n\n(អត្ថបទត្រូវបានចម្លងទៅ Clipboard រួចរាល់សម្រាប់ផ្ញើតាម Telegram ឬ SMS)");
  };

  // Filter Overdue Items (both installments and pawns)
  const overdueInstallments = contracts.filter((c) => c.hasOverdue || c.status === "OVERDUE");
  const overduePawns = pawnTickets.filter((p) => p.isOverdue || p.status === "OVERDUE");

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700">
              <BadgePercent className="h-6 w-6 text-teal-700" />
            </div>
            គ្រប់គ្រងការបង់រំលោះ & បញ្ចាំ (Installments & Pawn)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            បង្កើតកិច្ចសន្យាបង់រំលស់, ប័ណ្ណបញ្ចាំទ្រព្យ, ព្រីនកិច្ចសន្យា & តារាងបង់រំលស់, តាមដានអតិថិជនយឺត និងពិនិត្យការធានា
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === "INSTALLMENT" && (
            <button
              onClick={() => setShowNewContractModal(true)}
              className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              បង្កើតកិច្ចសន្យាបង់រំលោះ
            </button>
          )}

          {activeTab === "PAWN" && (
            <button
              onClick={() => setShowNewPawnModal(true)}
              className="flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-800 transition cursor-pointer"
            >
              <Coins className="h-4 w-4" />
              បង្កើតប័ណ្ណបញ្ចាំថ្មី
            </button>
          )}

          <button
            onClick={() => setShowContractSettingsModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
            title="កំណត់កិច្ចសន្យា និងអត្រាការប្រាក់ (Admin)"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-teal-700" />
            <span className="hidden sm:inline">កំណត់កិច្ចសន្យា & ការប្រាក់</span>
          </button>

          <button
            onClick={() => {
              fetchInstallments();
              fetchPawnTickets();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-teal-700" />
            ផ្ទុកឡើងវិញ
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("INSTALLMENT")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === "INSTALLMENT"
              ? "bg-teal-700 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <BadgePercent className="h-4 w-4" />
          កិច្ចសន្យាបង់រំលោះ ({contracts.length})
        </button>

        <button
          onClick={() => setActiveTab("PAWN")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === "PAWN"
              ? "bg-amber-700 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Coins className="h-4 w-4" />
          ប័ណ្ណបញ្ចាំទ្រព្យ ({pawnTickets.length})
        </button>

        <button
          onClick={() => setActiveTab("OVERDUE")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === "OVERDUE"
              ? "bg-rose-700 text-white shadow-sm"
              : "bg-white border border-slate-200 text-rose-700 hover:bg-rose-50"
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          តាមដានបង់យឺត & ប្រាក់ពិន័យ ({overdueInstallments.length + overduePawns.length})
        </button>

        <button
          onClick={() => setActiveTab("WARRANTY")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === "WARRANTY"
              ? "bg-indigo-700 text-white shadow-sm"
              : "bg-white border border-slate-200 text-indigo-700 hover:bg-indigo-50"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          ឆែកប្រវត្តិទិញ & រយៈពេលធានា
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INSTALLMENT CONTRACTS                                              */}
      {/* ========================================================================= */}
      {activeTab === "INSTALLMENT" && (
        <div className="space-y-4">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-bold text-slate-500">កិច្ចសន្យាសរុបទាំងអស់</p>
              <p className="text-2xl font-black font-mono text-slate-900 mt-1">
                {installmentStats.totalContracts || 0}
              </p>
              <p className="text-[11px] text-teal-700 font-bold mt-0.5">
                កំពុងបង់: {installmentStats.totalActiveContracts || 0} កិច្ចសន្យា
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-bold text-slate-500">ប្រាក់ដើមត្រូវប្រមូល (Receivable)</p>
              <p className="text-2xl font-black font-mono text-teal-800 mt-1">
                {formatUSD(installmentStats.totalPrincipalReceivable || 0)}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {formatKHR(installmentStats.totalPrincipalReceivable || 0, exchangeRateKhr)}
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
              <p className="text-xs font-bold text-rose-800">ចំនួនកាលវិភាគយឺត (Overdue)</p>
              <p className="text-2xl font-black font-mono text-rose-700 mt-1">
                {installmentStats.totalOverdueCount || 0} លើក
              </p>
              <p className="text-[11px] text-rose-600 font-bold mt-0.5">
                ត្រូវតាមដាន & គិតប្រាក់ពិន័យ
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
              <p className="text-xs font-bold text-amber-800">ប្រាក់ពិន័យត្រូវប្រមូល (Late Fees)</p>
              <p className="text-2xl font-black font-mono text-amber-700 mt-1">
                {formatUSD(installmentStats.totalPenaltyAmount || 0)}
              </p>
              <p className="text-[11px] text-amber-600 font-bold mt-0.5">
                គិតតាមចំនួនថ្ងៃយឺតជាក់ស្តែង
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={installmentSearch}
                onChange={(e) => setInstallmentSearch(e.target.value)}
                placeholder="ស្វែងរកតាមលេខកិច្ចសន្យា, ឈ្មោះអតិថិជន, លេខទូរស័ព្ទ, ឈ្មោះទំនិញ..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <select
              value={installmentStatusFilter}
              onChange={(e) => setInstallmentStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="">គ្រប់ស្ថានភាពទាំងអស់</option>
              <option value="ACTIVE">កំពុងបង់ (ACTIVE)</option>
              <option value="OVERDUE">យឺតកាលកំណត់ (OVERDUE)</option>
              <option value="COMPLETED">បានបង់ចប់ (COMPLETED)</option>
              <option value="DEFAULTED">ខកខាន/រឹបអូស (DEFAULTED)</option>
            </select>
          </div>

          {/* Contracts Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="p-3">លេខកិច្ចសន្យា</th>
                    <th className="p-3">អតិថិជន</th>
                    <th className="p-3">ទំនិញ & IMEI</th>
                    <th className="p-3 text-right">តម្លៃសរុប</th>
                    <th className="p-3 text-right">ប្រាក់កក់</th>
                    <th className="p-3 text-right">បង់ប្រចាំខែ</th>
                    <th className="p-3 text-center">វឌ្ឍនភាពបង់</th>
                    <th className="p-3 text-center">ស្ថានភាព</th>
                    <th className="p-3 text-center">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contracts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        {installmentLoading ? "កំពុងទាញទិន្នន័យ..." : "មិនមានទិន្នន័យកិច្ចសន្យាបង់រំលោះទេ"}
                      </td>
                    </tr>
                  ) : (
                    contracts.map((c) => {
                      const paidPercent = Math.min(100, Math.round((c.totalPaidUsd / c.totalRepaymentUsd) * 100));

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3 font-mono font-bold text-teal-900">
                            {c.contractNumber}
                          </td>
                          <td className="p-3">
                            <p className="font-extrabold text-slate-900">{c.customerName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{c.customerPhone}</p>
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-800">{c.productName}</p>
                            {c.productImeiOrSerial && (
                              <p className="text-[10px] font-mono text-slate-400">
                                IMEI: {c.productImeiOrSerial}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {formatUSD(c.totalPriceUsd)}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-700 font-bold">
                            {formatUSD(c.downPaymentUsd)}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-rose-700">
                            {formatUSD(c.monthlyAmountUsd)}
                            <span className="text-[10px] font-normal text-slate-400 block">
                              {c.durationMonths} ខែ
                            </span>
                          </td>
                          <td className="p-3 text-center w-36">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                              <div
                                className={`h-full rounded-full ${
                                  paidPercent >= 100 ? "bg-emerald-500" : "bg-teal-600"
                                }`}
                                style={{ width: `${paidPercent}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">
                              {formatUSD(c.totalPaidUsd)} / {formatUSD(c.totalRepaymentUsd)} ({paidPercent}%)
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {c.status === "COMPLETED" ? (
                              <span className="inline-flex rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
                                បានបង់ចប់
                              </span>
                            ) : c.status === "OVERDUE" || c.hasOverdue ? (
                              <span className="inline-flex rounded-lg bg-rose-100 px-2.5 py-1 text-[11px] font-extrabold text-rose-800">
                                យឺតកាលកំណត់
                              </span>
                            ) : (
                              <span className="inline-flex rounded-lg bg-teal-100 px-2.5 py-1 text-[11px] font-extrabold text-teal-800">
                                កំពុងបង់
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedContract(c)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                title="មើលតារាងបង់ប្រាក់ & ទទួលប្រាក់"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setPrintContractData(c)}
                                className="p-1.5 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 transition cursor-pointer"
                                title="ព្រីនកិច្ចសន្យាជាភាសាខ្មែរ"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setPrintScheduleData(c)}
                                className="p-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                                title="ព្រីនតារាងបង់រំលស់ប្រចាំខែ"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: "INSTALLMENT",
                                    id: c.id,
                                    title: `កិច្ចសន្យាបង់រំលស់ #${c.contractNumber}`,
                                    customerName: c.customer?.name || "អតិថិជន",
                                  })
                                }
                                className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="លុបកិច្ចសន្យានេះ"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PAWN / COLLATERAL LOANS                                            */}
      {/* ========================================================================= */}
      {activeTab === "PAWN" && (
        <div className="space-y-4">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-bold text-slate-500">ប័ណ្ណបញ្ចាំសរុប (Total Tickets)</p>
              <p className="text-2xl font-black font-mono text-slate-900 mt-1">
                {pawnStats.totalTickets || 0}
              </p>
              <p className="text-[11px] text-amber-700 font-bold mt-0.5">
                ទ្រព្យកំពុងរក្សាទុកក្នុងទូសុវត្ថិភាព
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
              <p className="text-xs font-bold text-amber-900">ប្រាក់ដើមកម្ចីបញ្ចាំ (Active Loans)</p>
              <p className="text-2xl font-black font-mono text-amber-800 mt-1">
                {formatUSD(pawnStats.totalActiveLoans || 0)}
              </p>
              <p className="text-[10px] text-amber-700 font-mono mt-0.5">
                {formatKHR(pawnStats.totalActiveLoans || 0, exchangeRateKhr)}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
              <p className="text-xs font-bold text-emerald-900">ការប្រាក់ប្រមូលបាន (Interest Income)</p>
              <p className="text-2xl font-black font-mono text-emerald-700 mt-1">
                {formatUSD(pawnStats.totalInterestCollected || 0)}
              </p>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                ចំណូលការប្រាក់ពីការបញ្ចាំ
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
              <p className="text-xs font-bold text-rose-800">ហួសកាលកំណត់បង់ការប្រាក់</p>
              <p className="text-2xl font-black font-mono text-rose-700 mt-1">
                {pawnStats.overdueCount || 0} ប័ណ្ណ
              </p>
              <p className="text-[11px] text-rose-600 font-bold mt-0.5">
                ប្រឈមនឹងការដាច់បញ្ចាំ
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={pawnSearch}
                onChange={(e) => setPawnSearch(e.target.value)}
                placeholder="ស្វែងរកតាមលេខប័ណ្ណបញ្ចាំ, ឈ្មោះអតិថិជន, ទ្រព្យបញ្ចាំ, IMEI..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <select
              value={pawnStatusFilter}
              onChange={(e) => setPawnStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="">គ្រប់ស្ថានភាព</option>
              <option value="ACTIVE">កំពុងបញ្ចាំ (ACTIVE)</option>
              <option value="OVERDUE">ហួសកាលកំណត់ (OVERDUE)</option>
              <option value="REDEEMED">បានលោះវិញ (REDEEMED)</option>
              <option value="DEFAULTED_FORFEITED">ដាច់បញ្ចាំ (FORFEITED)</option>
            </select>
          </div>

          {/* Pawn Tickets Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="p-3">លេខប័ណ្ណ</th>
                    <th className="p-3">អតិថិជន</th>
                    <th className="p-3">ទ្រព្យបញ្ចាំ & លេខកូដ</th>
                    <th className="p-3">កន្លែងទុក</th>
                    <th className="p-3 text-right">ទឹកប្រាក់កម្ចី</th>
                    <th className="p-3 text-right">ការប្រាក់/ខែ</th>
                    <th className="p-3 text-center">ផុតកំណត់</th>
                    <th className="p-3 text-center">ស្ថានភាព</th>
                    <th className="p-3 text-center">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pawnTickets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        {pawnLoading ? "កំពុងទាញទិន្នន័យ..." : "មិនមានទិន្នន័យបញ្ចាំទេ"}
                      </td>
                    </tr>
                  ) : (
                    pawnTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-mono font-bold text-amber-900">
                          {t.ticketNumber}
                        </td>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-900">{t.customerName}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{t.customerPhone}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{t.itemName}</p>
                          <p className="text-[10px] text-slate-400">
                            {t.itemCategory} {t.imeiOrSerial ? `| IMEI: ${t.imeiOrSerial}` : ""}
                          </p>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {t.storageLocation || "Safe 01"}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-rose-700 text-sm">
                          {formatUSD(t.loanAmountUsd)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-blue-700">
                          {formatUSD(t.monthlyInterestUsd)}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            ({t.monthlyInterestRate}%/ខែ)
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <p className={`font-bold ${t.isOverdue ? "text-rose-700" : "text-slate-800"}`}>
                            {t.maturityDate}
                          </p>
                          <span className="inline-block rounded-md bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold font-mono mt-0.5">
                            {t.durationDays ? `${t.durationDays} ថ្ងៃ` : `${t.durationMonths} ខែ`}
                          </span>
                          {t.isOverdue && (
                            <span className="text-[10px] font-bold text-rose-600 block">
                              ហួស {t.daysOverdue} ថ្ងៃ!
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {t.status === "REDEEMED" ? (
                            <span className="inline-flex rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                              បានលោះវិញ
                            </span>
                          ) : t.status === "DEFAULTED_FORFEITED" ? (
                            <span className="inline-flex rounded-lg bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-800">
                              ដាច់បញ្ចាំ
                            </span>
                          ) : t.isOverdue ? (
                            <span className="inline-flex rounded-lg bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                              ហួសកំណត់
                            </span>
                          ) : (
                            <span className="inline-flex rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                              កំពុងបញ្ចាំ
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {t.status === "ACTIVE" || t.status === "OVERDUE" ? (
                              <>
                                <button
                                  onClick={() => openPawnPayment(t, "INTEREST_PAYMENT")}
                                  className="rounded-lg bg-blue-50 border border-blue-200 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                                  title="បង់ការប្រាក់ និងពន្យារពេល"
                                >
                                  បង់ការប្រាក់
                                </button>
                                <button
                                  onClick={() => openPawnPayment(t, "FULL_REDEMPTION")}
                                  className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                                  title="លោះយកទ្រព្យវិញ"
                                >
                                  លោះវិញ
                                </button>
                              </>
                            ) : null}

                            <button
                              onClick={() => setPrintPawnData(t)}
                              className="p-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                              title="ព្រីនប័ណ្ណបញ្ចាំ & កិច្ចសន្យា"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "PAWN",
                                  id: t.id,
                                  title: `ប័ណ្ណបញ្ចាំ #${t.ticketNumber}`,
                                  customerName: t.customerName || "អតិថិជន",
                                })
                              }
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="លុបប័ណ្ណបញ្ចាំនេះ"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OVERDUE TRACKING & LATE PENALTIES                                  */}
      {/* ========================================================================= */}
      {activeTab === "OVERDUE" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
            <h3 className="font-extrabold text-rose-900 text-sm flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-700" />
              ផ្ទាំងតាមដានអតិថិជនបង់ប្រាក់យឺត & គិតប្រាក់ពិន័យ (Overdue & Late Fees Monitoring)
            </h3>
            <p className="text-xs text-rose-700 mt-1">
              បញ្ជីរាយនាមអតិថិជនដែលខកខានមិនបានបង់ប្រាក់រំលស់ ឬការប្រាក់បញ្ចាំតាមកាលបរិច្ឆេទកំណត់
              រួមទាំងការគណនាប្រាក់ពិន័យស្វ័យប្រវត្តិតាមថ្ងៃយឺត។
            </p>
          </div>

          {/* Overdue Installments */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-teal-700" />
              ១. កិច្ចសន្យាបង់រំលស់ដែលយឺតកាលកំណត់ ({overdueInstallments.length})
            </h4>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="p-3">កិច្ចសន្យា</th>
                    <th className="p-3">អតិថិជន</th>
                    <th className="p-3">ទំនិញ</th>
                    <th className="p-3 text-right">ទឹកប្រាក់ត្រូវបង់</th>
                    <th className="p-3 text-center">ថ្ងៃយឺត</th>
                    <th className="p-3 text-right">ប្រាក់ពិន័យ</th>
                    <th className="p-3 text-center">សកម្មភាពរំលឹក & ទូទាត់</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueInstallments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        គ្មានកិច្ចសន្យាបង់រំលស់ដែលយឺតកាលកំណត់ទេ (អបអរសាទរ!)
                      </td>
                    </tr>
                  ) : (
                    overdueInstallments.map((c) => (
                      <tr key={c.id} className="hover:bg-rose-50/40">
                        <td className="p-3 font-mono font-bold text-teal-900">{c.contractNumber}</td>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-900">{c.customerName}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{c.customerPhone}</p>
                        </td>
                        <td className="p-3 font-medium text-slate-800">{c.productName}</td>
                        <td className="p-3 text-right font-mono font-black text-rose-700">
                          {formatUSD(c.monthlyAmountUsd)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                            យឺត {c.schedules?.find((s: any) => s.daysOverdue > 0)?.daysOverdue || 1} ថ្ងៃ
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-amber-700">
                          ${c.schedules?.find((s: any) => s.daysOverdue > 0)?.penaltyAmountUsd || 0}.00
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleSendReminder(c, "INSTALLMENT")}
                              className="flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-200 px-2.5 py-1 text-xs font-bold text-teal-700 hover:bg-teal-100 transition cursor-pointer"
                            >
                              <Send className="h-3 w-3" />
                              ផ្ញើសាររំលឹក
                            </button>
                            <button
                              onClick={() => setSelectedContract(c)}
                              className="rounded-lg bg-rose-700 px-3 py-1 text-xs font-bold text-white hover:bg-rose-800 transition cursor-pointer"
                            >
                              ទូទាត់ភ្លាមៗ
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "INSTALLMENT",
                                  id: c.id,
                                  title: `កិច្ចសន្យាបង់រំលស់ #${c.contractNumber}`,
                                  customerName: c.customerName || "អតិថិជន",
                                })
                              }
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="លុបកិច្ចសន្យា"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overdue Pawns */}
          <div className="space-y-3 pt-4">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-700" />
              ២. ប័ណ្ណបញ្ចាំដែលហួសកាលកំណត់បង់ការប្រាក់ ({overduePawns.length})
            </h4>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="p-3">ប័ណ្ណបញ្ចាំ</th>
                    <th className="p-3">អតិថិជន</th>
                    <th className="p-3">ទ្រព្យបញ្ចាំ</th>
                    <th className="p-3 text-right">ទឹកប្រាក់កម្ចី</th>
                    <th className="p-3 text-right">ការប្រាក់ត្រូវបង់</th>
                    <th className="p-3 text-center">ថ្ងៃផុតកំណត់</th>
                    <th className="p-3 text-center">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overduePawns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        គ្មានប័ណ្ណបញ្ចាំដែលហួសកាលកំណត់ទេ
                      </td>
                    </tr>
                  ) : (
                    overduePawns.map((p) => (
                      <tr key={p.id} className="hover:bg-amber-50/40">
                        <td className="p-3 font-mono font-bold text-amber-900">{p.ticketNumber}</td>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-900">{p.customerName}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{p.customerPhone}</p>
                        </td>
                        <td className="p-3 font-medium text-slate-800">{p.itemName}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatUSD(p.loanAmountUsd)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-rose-700">
                          {formatUSD(p.monthlyInterestUsd)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                            ហួស {p.daysOverdue} ថ្ងៃ ({p.maturityDate})
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleSendReminder(p, "PAWN")}
                              className="flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-200 px-2.5 py-1 text-xs font-bold text-teal-700 hover:bg-teal-100 transition cursor-pointer"
                            >
                              <Send className="h-3 w-3" />
                              ផ្ញើសាររំលឹក
                            </button>
                            <button
                              onClick={() => openPawnPayment(p, "INTEREST_PAYMENT")}
                              className="rounded-lg bg-amber-700 px-3 py-1 text-xs font-bold text-white hover:bg-amber-800 transition cursor-pointer"
                            >
                              បង់ការប្រាក់
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "PAWN",
                                  id: p.id,
                                  title: `ប័ណ្ណបញ្ចាំ #${p.ticketNumber}`,
                                  customerName: p.customerName || "អតិថិជន",
                                })
                              }
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="លុបប័ណ្ណបញ្ចាំ"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CUSTOMER PURCHASE HISTORY & WARRANTY LOOKUP                        */}
      {/* ========================================================================= */}
      {activeTab === "WARRANTY" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-5">
            <h3 className="font-extrabold text-indigo-950 text-base flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-indigo-700" />
              ឆែកប្រវត្តិទិញទំនិញ & ពិនិត្យសុពលភាពរយៈពេលធានា (Warranty Lookup)
            </h3>
            <p className="text-xs text-indigo-700 mt-1">
              វាយបញ្ចូលលេខទូរស័ព្ទអតិថិជន, ឈ្មោះ, លេខវិក្កយបត្រ (Invoice #), ឬលេខកូដសម្គាល់ IMEI/Serial
              ដើម្បីឆែកមើលប្រវត្តិទិញ និងសុពលភាពនៃការធានាផលិតផលជាក់ស្តែង។
            </p>

            {/* Global Search Input */}
            <div className="mt-4 relative max-w-2xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
              <input
                type="text"
                value={warrantySearch}
                onChange={(e) => handleWarrantySearch(e.target.value)}
                placeholder="ស្វែងរកតាម៖ លេខទូរស័ព្ទ, ឈ្មោះអតិថិជន, លេខ IMEI/Serial, ឬ INV-..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-indigo-200 bg-white text-sm text-slate-800 shadow-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Search Results Display */}
          {warrantyLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
              កំពុងស្វែងរកប្រវត្តិទិញ និងពិនិត្យការធានា...
            </div>
          ) : warrantyResults.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500">
                លទ្ធផលស្វែងរក៖ រកឃើញទំនិញចំនួន {warrantyResults.length}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warrantyResults.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition"
                  >
                    <div>
                      {/* Status Banner */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {item.invoiceNumber}
                        </span>
                        {item.isWarrantyActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                            <ShieldCheck className="h-3 w-3 text-emerald-700" />
                            នៅមានធានា ({item.remainingDays} ថ្ងៃទៀត)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-800">
                            <AlertCircle className="h-3 w-3 text-rose-700" />
                            ផុតកំណត់ ({item.expiredDays} ថ្ងៃហើយ)
                          </span>
                        )}
                      </div>

                      {/* Product Info */}
                      <h4 className="font-black text-slate-900 text-sm">
                        {item.productNameKh || item.productNameEn}
                      </h4>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        SKU: {item.sku}
                      </p>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="flex justify-between">
                          <span className="text-slate-400">លេខ IMEI / Serial:</span>
                          <span className="font-mono font-bold text-slate-900">{item.serialOrImei}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-400">អតិថិជន:</span>
                          <span className="font-bold text-slate-800">{item.customerName} ({item.customerPhone})</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-400">ថ្ងៃទិញទំនិញ:</span>
                          <span className="font-mono text-slate-700">{item.purchaseDate}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-400">រយៈពេលធានា:</span>
                          <span className="font-bold text-indigo-700">{item.warrantyDays} ថ្ងៃ</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-400">កាលបរិច្ឆេទផុតធានា:</span>
                          <span className="font-mono font-bold text-slate-900">{item.warrantyEndDate}</span>
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 mt-2 border-t border-slate-100 flex items-center gap-2">
                      <Link
                        href={`/repairs`}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Wrench className="h-3.5 w-3.5 text-teal-400" />
                        បង្កើតសំបុត្រជួសជុល (Repair)
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : warrantySearch ? (
            <div className="p-8 text-center text-slate-400 rounded-2xl bg-white border border-slate-200">
              រកមិនឃើញព័ត៌មានទិញទំនិញ ឬការធានាសម្រាប់ពាក្យគន្លឹះ "{warrantySearch}" នេះទេ
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 rounded-2xl bg-white border border-slate-200 text-xs">
              សូមវាយបញ្ចូលឈ្មោះ, លេខទូរស័ព្ទ, លេខ IMEI ឬលេខវិក្កយបត្រក្នុងប្រអប់ខាងលើដើម្បីស្វែងរក
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL OF INSTALLMENT CONTRACT & REPAYMENT SCHEDULE                */}
      {/* ========================================================================= */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl text-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <BadgePercent className="h-5 w-5 text-teal-700" />
                  តារាងបង់រំលស់ #{selectedContract.contractNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedContract.customerName} ({selectedContract.customerPhone}) - {selectedContract.productName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintContractData(selectedContract)}
                  className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  ព្រីនកិច្ចសន្យា
                </button>
                <button
                  onClick={() => setPrintScheduleData(selectedContract)}
                  className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  ព្រីនតារាងបង់
                </button>
                <button
                  onClick={() =>
                    setDeleteConfirm({
                      type: "INSTALLMENT",
                      id: selectedContract.id,
                      title: `កិច្ចសន្យាបង់រំលស់ #${selectedContract.contractNumber}`,
                      customerName: selectedContract.customerName || "អតិថិជន",
                    })
                  }
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                  title="លុបកិច្ចសន្យានេះ"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">លុប</span>
                </button>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Summary details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 my-4 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">តម្លៃទំនិញសរុប</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{formatUSD(selectedContract.totalPriceUsd)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">ប្រាក់កក់បង់មុន</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">{formatUSD(selectedContract.downPaymentUsd)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">បង់ប្រចាំខែ</span>
                <span className="font-black text-rose-700 font-mono text-sm">{formatUSD(selectedContract.monthlyAmountUsd)} / ខែ</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">បានបង់រួចសរុប</span>
                <span className="font-black text-teal-700 font-mono text-sm">{formatUSD(selectedContract.totalPaidUsd)} / {formatUSD(selectedContract.totalRepaymentUsd)}</span>
              </div>
            </div>

            {/* Schedules list */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 sticky top-0">
                  <tr>
                    <th className="p-2.5 text-center">ខែទី</th>
                    <th className="p-2.5">ថ្ងៃត្រូវបង់</th>
                    <th className="p-2.5 text-right">ទឹកប្រាក់ត្រូវបង់</th>
                    <th className="p-2.5 text-right">បានបង់</th>
                    <th className="p-2.5 text-center">ថ្ងៃបានបង់</th>
                    <th className="p-2.5 text-center">ស្ថានភាព</th>
                    <th className="p-2.5 text-center">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedContract.schedules?.map((s: any) => {
                    const isPaid = s.status === "PAID";
                    const isOverdue = s.daysOverdue > 0 && !isPaid;

                    return (
                      <tr key={s.id} className={isOverdue ? "bg-rose-50/50" : "hover:bg-slate-50"}>
                        <td className="p-2.5 text-center font-bold">{s.installmentNumber}</td>
                        <td className="p-2.5 font-mono">{s.dueDate}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatUSD(s.totalDueUsd)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                          {s.paidAmountUsd > 0 ? formatUSD(s.paidAmountUsd) : "-"}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-500">{s.paidDate || "-"}</td>
                        <td className="p-2.5 text-center">
                          {isPaid ? (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              បានបង់រួច
                            </span>
                          ) : isOverdue ? (
                            <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              យឺត {s.daysOverdue} ថ្ងៃ (+${s.penaltyAmountUsd} ពិន័យ)
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              រង់ចាំបង់
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {!isPaid && (
                            <button
                              onClick={() => openPayScheduleModal(s)}
                              className="rounded-lg bg-teal-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-800 transition cursor-pointer"
                            >
                              ទទួលប្រាក់
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW INSTALLMENT CONTRACT FORM                                      */}
      {/* ========================================================================= */}
      {showNewContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <BadgePercent className="h-5 w-5 text-teal-700" />
                បង្កើតកិច្ចសន្យាទិញ-លក់បង់រំលោះថ្មី (New Installment)
              </h3>
              <button
                onClick={() => setShowNewContractModal(false)}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="mt-4 space-y-4 text-xs">
              {/* Customer Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ជ្រើសរើសអតិថិជន (Customer) *
                </label>
                <select
                  value={newContractForm.customerId}
                  onChange={(e) => setNewContractForm({ ...newContractForm, customerId: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-white text-xs font-medium focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- សូមជ្រើសរើសអតិថិជន --</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Selector / Custom Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    ជ្រើសរើសពីស្តុកទំនិញ (Product from Stock)
                  </label>
                  <select
                    value={newContractForm.productId}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-white text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- ជ្រើសរើសទំនិញក្នុងស្តុក ឬវាយបញ្ចូលដោយដៃ --</option>
                    {productList.map((p) => {
                      const isOut = p.type !== "SERVICE_LABOR" && p.stockQty <= 0;
                      return (
                        <option key={p.id} value={p.id} disabled={isOut}>
                          {p.nameKh || p.nameEn} (${p.salePriceUsd}) — {isOut ? "[អស់ស្តុក / 0]" : `[ស្តុក: ${p.stockQty}]`}
                        </option>
                      );
                    })}
                  </select>
                  {(() => {
                    const sel = productList.find((p) => p.id === newContractForm.productId);
                    if (!sel) return null;
                    const isOut = sel.type !== "SERVICE_LABOR" && sel.stockQty <= 0;
                    return (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-md font-bold ${isOut ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"}`}>
                          {isOut ? "✕ ទំនិញនេះអស់ពីស្តុកហើយ" : `✓ ស្តុកនៅសល់ ${sel.stockQty} គ្រឿង (នឹងត្រូវកាត់ 1 គ្រឿងពេលបង្កើត)`}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    ឈ្មោះទំនិញជាក់ស្តែង (Product Name) *
                  </label>
                  <input
                    type="text"
                    value={newContractForm.productName}
                    onChange={(e) => setNewContractForm({ ...newContractForm, productName: e.target.value })}
                    required
                    placeholder="e.g. iPhone 15 Pro Max 256GB"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Serial / IMEI & National ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    លេខសម្គាល់ Serial / IMEI (បើមាន)
                  </label>
                  {(() => {
                    const sel = productList.find((p) => p.id === newContractForm.productId);
                    if (sel && sel.imeiList && sel.imeiList.length > 0) {
                      return (
                        <div className="space-y-1.5">
                          <select
                            value={newContractForm.productImeiOrSerial}
                            onChange={(e) => setNewContractForm({ ...newContractForm, productImeiOrSerial: e.target.value })}
                            className="w-full rounded-xl border border-teal-300 bg-teal-50/30 p-2.5 font-mono text-xs font-semibold focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">-- ជ្រើសរើស IMEI ក្នុងស្តុក ({sel.imeiList.length} គ្រឿង) --</option>
                            {sel.imeiList.map((imei: string) => (
                              <option key={imei} value={imei}>
                                {imei}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={newContractForm.productImeiOrSerial}
                            onChange={(e) => setNewContractForm({ ...newContractForm, productImeiOrSerial: e.target.value })}
                            placeholder="ឬវាយបញ្ចូលលេខ IMEI ដោយដៃ..."
                            className="w-full rounded-xl border border-slate-200 p-2 font-mono text-[11px] focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      );
                    }
                    return (
                      <input
                        type="text"
                        value={newContractForm.productImeiOrSerial}
                        onChange={(e) => setNewContractForm({ ...newContractForm, productImeiOrSerial: e.target.value })}
                        placeholder="352817291827182"
                        className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    );
                  })()}
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    អត្តសញ្ញាណប័ណ្ណអតិថិជន (National ID)
                  </label>
                  <input
                    type="text"
                    value={newContractForm.customerNationalId}
                    onChange={(e) => setNewContractForm({ ...newContractForm, customerNationalId: e.target.value })}
                    placeholder="010928172"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Financial Calculation Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">តម្លៃទំនិញ ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newContractForm.totalPriceUsd}
                    onChange={(e) => setNewContractForm({ ...newContractForm, totalPriceUsd: e.target.value })}
                    required
                    placeholder="1200.00"
                    className="w-full rounded-xl border border-slate-300 p-2 font-mono font-bold text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ប្រាក់កក់ ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newContractForm.downPaymentUsd}
                    onChange={(e) => setNewContractForm({ ...newContractForm, downPaymentUsd: e.target.value })}
                    placeholder="200.00"
                    className="w-full rounded-xl border border-slate-300 p-2 font-mono font-bold text-xs bg-white text-emerald-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ការប្រាក់ (%/ខែ)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newContractForm.interestRatePercent}
                    onChange={(e) => setNewContractForm({ ...newContractForm, interestRatePercent: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 font-mono font-bold text-xs bg-white text-blue-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">រយៈពេល (ខែ)</label>
                  <select
                    value={newContractForm.durationMonths}
                    onChange={(e) => setNewContractForm({ ...newContractForm, durationMonths: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 font-bold text-xs bg-white"
                  >
                    <option value="3">3 ខែ</option>
                    <option value="6">6 ខែ</option>
                    <option value="12">12 ខែ (1 ឆ្នាំ)</option>
                    <option value="18">18 ខែ</option>
                    <option value="24">24 ខែ (2 ឆ្នាំ)</option>
                  </select>
                </div>
              </div>

              {/* Guarantor Details */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
                <span className="font-bold text-slate-900 block">ព័ត៌មានអ្នកធានា (Guarantor Info - Optional)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newContractForm.guarantorName}
                    onChange={(e) => setNewContractForm({ ...newContractForm, guarantorName: e.target.value })}
                    placeholder="ឈ្មោះអ្នកធានា"
                    className="rounded-lg border border-slate-200 p-2 text-xs bg-white"
                  />
                  <input
                    type="text"
                    value={newContractForm.guarantorPhone}
                    onChange={(e) => setNewContractForm({ ...newContractForm, guarantorPhone: e.target.value })}
                    placeholder="លេខទូរស័ព្ទអ្នកធានា"
                    className="rounded-lg border border-slate-200 p-2 text-xs bg-white"
                  />
                  <input
                    type="text"
                    value={newContractForm.guarantorNationalId}
                    onChange={(e) => setNewContractForm({ ...newContractForm, guarantorNationalId: e.target.value })}
                    placeholder="អត្តសញ្ញាណប័ណ្ណអ្នកធានា"
                    className="rounded-lg border border-slate-200 p-2 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewContractModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-700 px-5 py-2 font-bold text-white hover:bg-teal-800 transition cursor-pointer shadow-md"
                >
                  រក្សាទុក & បង្កើតតារាងបង់រំលស់
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW PAWN TICKET FORM                                               */}
      {/* ========================================================================= */}
      {showNewPawnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-700" />
                បង្កើតប័ណ្ណបញ្ចាំទ្រព្យថ្មី (New Pawn Ticket)
              </h3>
              <button
                onClick={() => setShowNewPawnModal(false)}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePawn} className="mt-4 space-y-4 text-xs">
              {/* Customer Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ជ្រើសរើសអតិថិជនអ្នកបញ្ចាំ (Customer) *
                </label>
                <select
                  value={newPawnForm.customerId}
                  onChange={(e) => setNewPawnForm({ ...newPawnForm, customerId: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-white text-xs font-medium focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- សូមជ្រើសរើសអតិថិជន --</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ប្រភេទទ្រព្យ (Category) *</label>
                  <select
                    value={newPawnForm.itemCategory}
                    onChange={(e) => setNewPawnForm({ ...newPawnForm, itemCategory: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-white text-xs font-medium"
                  >
                    <option value="Phone">ទូរស័ព្ទ / ថេប្លេត (Smartphone/iPad)</option>
                    <option value="Laptop">កុំព្យូទ័រ / Laptop / Mac</option>
                    <option value="Vehicle">ម៉ូតូ / រថយន្ត (Vehicle)</option>
                    <option value="Jewelry">មាស / គ្រឿងអលង្ការ (Jewelry)</option>
                    <option value="Electronics">ឧបករណ៍អេឡិចត្រូនិច (Electronics)</option>
                    <option value="Real Estate">ប្លង់ដី / អចលនទ្រព្យ (Real Estate)</option>
                    <option value="Other">ផ្សេងៗ (Other)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">ឈ្មោះទ្រព្យបញ្ចាំជាក់ស្តែង (Item Name) *</label>
                  <input
                    type="text"
                    value={newPawnForm.itemName}
                    onChange={(e) => setNewPawnForm({ ...newPawnForm, itemName: e.target.value })}
                    required
                    placeholder="e.g. Honda Dream 2024 (ស្លាកលេខ 1KM-9999) ឬ iPhone 14 Pro Max"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* IMEI/Serial & Safe Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">លេខសម្គាល់ Serial / IMEI / ផ្លាកលេខ</label>
                  <input
                    type="text"
                    value={newPawnForm.imeiOrSerial}
                    onChange={(e) => setNewPawnForm({ ...newPawnForm, imeiOrSerial: e.target.value })}
                    placeholder="Serial / IMEI"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ទូ ឬកន្លែងទុកដាក់ (Storage Location)</label>
                  <input
                    type="text"
                    value={newPawnForm.storageLocation}
                    onChange={(e) => setNewPawnForm({ ...newPawnForm, storageLocation: e.target.value })}
                    placeholder="Safe Box A-01"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Duration Type & Loan & Interest Calculation */}
              <div className="space-y-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                  <span className="font-extrabold text-amber-950 text-xs flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-700" />
                    ព័ត៌មានប្រាក់កម្ចី & រយៈពេលបញ្ចាំ (Loan & Duration)
                  </span>
                  {/* Duration Type selector */}
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-amber-300">
                    <button
                      type="button"
                      onClick={() => setNewPawnForm({ ...newPawnForm, durationType: "DAYS" })}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                        newPawnForm.durationType === "DAYS"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      គិតជាថ្ងៃ (Days)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPawnForm({ ...newPawnForm, durationType: "MONTHS" })}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                        newPawnForm.durationType === "MONTHS"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      គិតជាខែ (Months)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ទឹកប្រាក់កម្ចី ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPawnForm.loanAmountUsd}
                      onChange={(e) => setNewPawnForm({ ...newPawnForm, loanAmountUsd: e.target.value })}
                      required
                      placeholder="500.00"
                      className="w-full rounded-xl border border-amber-300 p-2 font-mono font-bold text-xs bg-white text-rose-700"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">តម្លៃវាយតម្លៃ ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPawnForm.estimatedValueUsd}
                      onChange={(e) => setNewPawnForm({ ...newPawnForm, estimatedValueUsd: e.target.value })}
                      placeholder="800.00"
                      className="w-full rounded-xl border border-amber-300 p-2 font-mono font-bold text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ការប្រាក់ (%/ខែ)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newPawnForm.monthlyInterestRate}
                      onChange={(e) => setNewPawnForm({ ...newPawnForm, monthlyInterestRate: e.target.value })}
                      className="w-full rounded-xl border border-amber-300 p-2 font-mono font-bold text-xs bg-white text-blue-700"
                    />
                  </div>

                  {newPawnForm.durationType === "DAYS" ? (
                    <div>
                      <label className="font-bold text-amber-900 block mb-1">
                        ចំនួនថ្ងៃបញ្ចាំ (Days) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newPawnForm.durationDays}
                        onChange={(e) => setNewPawnForm({ ...newPawnForm, durationDays: e.target.value })}
                        className="w-full rounded-xl border-2 border-amber-400 p-2 font-mono font-bold text-xs bg-white text-slate-900"
                        placeholder="30"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">រយៈពេល (ខែ)</label>
                      <select
                        value={newPawnForm.durationMonths}
                        onChange={(e) => setNewPawnForm({ ...newPawnForm, durationMonths: e.target.value })}
                        className="w-full rounded-xl border border-amber-300 p-2 font-bold text-xs bg-white"
                      >
                        <option value="1">1 ខែ</option>
                        <option value="2">2 ខែ</option>
                        <option value="3">3 ខែ</option>
                        <option value="6">6 ខែ</option>
                        <option value="12">12 ខែ</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Quick Chips for Days */}
                {newPawnForm.durationType === "DAYS" && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">ជ្រើសរើសរហ័ស៖</span>
                    {[7, 10, 15, 20, 30, 45, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setNewPawnForm({ ...newPawnForm, durationDays: String(d) })}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                          newPawnForm.durationDays === String(d)
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-white border border-amber-300 text-amber-900 hover:bg-amber-100"
                        }`}
                      >
                        {d} ថ្ងៃ
                      </button>
                    ))}
                  </div>
                )}

                {/* Live Maturity Date & Estimated Interest Display */}
                <div className="rounded-xl bg-white/95 p-3 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">កាលបរិច្ឆេទផុតកំណត់ (Maturity Date)៖</span>
                    <span className="font-bold text-rose-700 font-mono text-sm">
                      {(() => {
                        const s = new Date(newPawnForm.startDate || new Date());
                        if (newPawnForm.durationType === "DAYS") {
                          const days = parseInt(newPawnForm.durationDays) || 30;
                          s.setDate(s.getDate() + days);
                        } else {
                          const months = parseInt(newPawnForm.durationMonths) || 1;
                          s.setMonth(s.getMonth() + months);
                        }
                        return s.toISOString().split("T")[0];
                      })()}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-2">
                      ({newPawnForm.durationType === "DAYS" ? `${newPawnForm.durationDays || 30} ថ្ងៃ` : `${newPawnForm.durationMonths} ខែ`})
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-slate-500 block text-[11px]">ការប្រាក់ប៉ាន់ស្មាន៖</span>
                    <span className="font-mono font-black text-blue-700 text-sm">
                      {(() => {
                        const loan = parseFloat(newPawnForm.loanAmountUsd) || 0;
                        const rate = parseFloat(newPawnForm.monthlyInterestRate) || 2.5;
                        if (newPawnForm.durationType === "DAYS") {
                          const days = parseInt(newPawnForm.durationDays) || 30;
                          return formatUSD((loan * (rate / 100) * (days / 30)));
                        } else {
                          const months = parseInt(newPawnForm.durationMonths) || 1;
                          return formatUSD((loan * (rate / 100) * months));
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPawnModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-700 px-5 py-2 font-bold text-white hover:bg-amber-800 transition cursor-pointer shadow-md"
                >
                  រក្សាទុក & បង្កើតប័ណ្ណបញ្ចាំ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAY INSTALLMENT SCHEDULE ITEM                                      */}
      {/* ========================================================================= */}
      {payModalSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-slate-800">
            <h3 className="font-black text-slate-900 text-base mb-1">
              ទទួលការបង់ប្រាក់រំលស់ (Installment Payment)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ខែទី {payModalSchedule.installmentNumber} - កាលកំណត់ {payModalSchedule.dueDate}
            </p>

            <form onSubmit={handleProcessInstallmentPayment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">ទឹកប្រាក់បង់រំលស់ ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono font-bold text-base text-teal-800"
                />
              </div>

              {payModalSchedule.daysOverdue > 0 && (
                <div>
                  <label className="font-bold text-rose-700 block mb-1">
                    ប្រាក់ពិន័យបង់យឺត ({payModalSchedule.daysOverdue} ថ្ងៃយឺត) ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={payPenalty}
                    onChange={(e) => setPayPenalty(e.target.value)}
                    className="w-full rounded-xl border border-rose-300 p-2 font-mono font-bold text-xs text-rose-700 bg-rose-50/50"
                  />
                  <span className="text-[10px] text-slate-400">អាចកែប្រែ ឬលើកលែងប្រាក់ពិន័យបាន</span>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">វិធីសាស្រ្តបង់ប្រាក់ (Payment Method)</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold"
                >
                  <option value="CASH_USD">សាច់ប្រាក់ដុល្លារ (Cash USD)</option>
                  <option value="CASH_KHR">សាច់ប្រាក់រៀល (Cash KHR)</option>
                  <option value="KHQR_ABA">KHQR / ABA Bank</option>
                  <option value="KHQR_BAKONG">KHQR Bakong</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">កំណត់ចំណាំ (Notes)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. បង់តាម ABA Trans ID 123456"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayModalSchedule(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="rounded-xl bg-teal-700 px-5 py-2 font-bold text-white hover:bg-teal-800 transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingPayment ? "កំពុងកត់ត្រា..." : "បញ្ជាក់ការទទួលប្រាក់"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAWN INTEREST PAYMENT / REDEMPTION                                 */}
      {/* ========================================================================= */}
      {showPawnPayModal && selectedPawnTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-slate-800">
            <h3 className="font-black text-slate-900 text-base mb-1">
              {pawnPayType === "FULL_REDEMPTION" ? "លោះយកទ្រព្យបញ្ចាំវិញ (Redemption)" : "បង់ការប្រាក់ & បន្តកុងត្រា (Pay Interest & Extend)"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {selectedPawnTicket.itemName} (#{selectedPawnTicket.ticketNumber})
            </p>

            <form onSubmit={handleProcessPawnPayment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {pawnPayType === "FULL_REDEMPTION" ? "ទឹកប្រាក់លោះយកវិញ ($)" : "ទឹកប្រាក់ការប្រាក់ ($)"} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pawnPayAmount}
                  onChange={(e) => setPawnPayAmount(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono font-bold text-base text-amber-900"
                />
              </div>

              {pawnPayType === "INTEREST_PAYMENT" && (
                <div className="space-y-2 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-amber-950 block">ពន្យារពេលបញ្ចាំបន្ថែម (Extension)</label>
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-amber-300">
                      <button
                        type="button"
                        onClick={() => setPawnExtType("DAYS")}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          pawnExtType === "DAYS" ? "bg-amber-600 text-white" : "text-slate-600"
                        }`}
                      >
                        គិតជាថ្ងៃ
                      </button>
                      <button
                        type="button"
                        onClick={() => setPawnExtType("MONTHS")}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          pawnExtType === "MONTHS" ? "bg-amber-600 text-white" : "text-slate-600"
                        }`}
                      >
                        គិតជាខែ
                      </button>
                    </div>
                  </div>

                  {pawnExtType === "DAYS" ? (
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={pawnDaysExt}
                          onChange={(e) => setPawnDaysExt(parseInt(e.target.value) || 1)}
                          className="w-full rounded-xl border border-amber-300 p-2 font-mono font-bold text-xs bg-white"
                          placeholder="30"
                        />
                        <span className="flex items-center text-xs font-bold text-slate-500 whitespace-nowrap">ថ្ងៃ</span>
                      </div>
                      <div className="flex gap-1 pt-1.5">
                        {[7, 15, 30, 45, 60].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setPawnDaysExt(d)}
                            className={`rounded px-2 py-0.5 text-[10px] font-bold border transition cursor-pointer ${
                              pawnDaysExt === d
                                ? "bg-amber-600 text-white border-amber-600"
                                : "bg-white text-amber-900 border-amber-200 hover:bg-amber-100"
                            }`}
                          >
                            +{d} ថ្ងៃ
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={pawnMonthsExt}
                        onChange={(e) => setPawnMonthsExt(parseInt(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold bg-white"
                      >
                        <option value={1}>1 ខែ</option>
                        <option value={2}>2 ខែ</option>
                        <option value={3}>3 ខែ</option>
                        <option value={6}>6 ខែ</option>
                      </select>
                    </div>
                  )}

                  {/* New Maturity Date Preview */}
                  <div className="text-[11px] text-slate-500 pt-1">
                    កាលបរិច្ឆេទផុតកំណត់ថ្មី៖{" "}
                    <span className="font-bold text-rose-700 font-mono">
                      {(() => {
                        const cur = new Date(selectedPawnTicket.maturityDate);
                        const base = cur < new Date() ? new Date() : cur;
                        const n = new Date(base);
                        if (pawnExtType === "DAYS") {
                          n.setDate(n.getDate() + (pawnDaysExt || 30));
                        } else {
                          n.setMonth(n.getMonth() + (pawnMonthsExt || 1));
                        }
                        return n.toISOString().split("T")[0];
                      })()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">វិធីសាស្រ្តបង់ប្រាក់</label>
                <select
                  value={pawnPayMethod}
                  onChange={(e) => setPawnPayMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold"
                >
                  <option value="CASH_USD">សាច់ប្រាក់ដុល្លារ (Cash USD)</option>
                  <option value="CASH_KHR">សាច់ប្រាក់រៀល (Cash KHR)</option>
                  <option value="KHQR_ABA">KHQR / ABA Bank</option>
                  <option value="KHQR_BAKONG">KHQR Bakong</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPawnPayModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-700 px-5 py-2 font-bold text-white hover:bg-amber-800 transition cursor-pointer shadow-md"
                >
                  {pawnPayType === "FULL_REDEMPTION" ? "បញ្ជាក់ការលោះទ្រព្យវិញ" : "បញ្ជាក់ការបង់ការប្រាក់"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT PREVIEW OVERLAYS                                                    */}
      {/* ========================================================================= */}
      {printContractData && (
        <InstallmentContractPrint
          contract={printContractData}
          onClose={() => setPrintContractData(null)}
          customSettings={loanSettings}
        />
      )}

      {printScheduleData && (
        <InstallmentSchedulePrint
          contract={printScheduleData}
          onClose={() => setPrintScheduleData(null)}
          customSettings={loanSettings}
        />
      )}

      {printPawnData && (
        <PawnContractPrint
          ticket={printPawnData}
          onClose={() => setPrintPawnData(null)}
          customSettings={loanSettings}
        />
      )}

      {/* Contract & Interest Rate Customization Modal (Admin) */}
      <ContractSettingsModal
        isOpen={showContractSettingsModal}
        onClose={() => setShowContractSettingsModal(false)}
        onSaved={(s) => {
          setLoanSettings(s);
          setNewContractForm((prev) => ({
            ...prev,
            interestRatePercent: String(s.installmentInterestRate),
          }));
          setNewPawnForm((prev) => ({
            ...prev,
            monthlyInterestRate: String(s.pawnMonthlyInterestRate),
            durationDays: String(s.defaultPawnDurationDays),
            durationType: s.defaultPawnDurationType || "DAYS",
          }));
        }}
      />

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {deleteConfirm.type === "INSTALLMENT"
                    ? "បញ្ជាក់ការលុបកិច្ចសន្យា"
                    : "បញ្ជាក់ការលុបប័ណ្ណបញ្ចាំ"}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  សកម្មភាពនេះមិនអាចត្រឡប់វិញបានឡើយ
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1">
              <p className="font-extrabold text-slate-800">{deleteConfirm.title}</p>
              {deleteConfirm.customerName && (
                <p className="text-slate-600">
                  អតិថិជន៖ <span className="font-bold">{deleteConfirm.customerName}</span>
                </p>
              )}
              <p className="text-[11px] text-rose-600 font-semibold pt-1">
                * រាល់ទិន្នន័យតារាងបង់ប្រាក់ និងប្រវត្តិប្រតិបត្តិការទាំងអស់ដែលពាក់ព័ន្ធនឹងត្រូវលុបចេញពីប្រព័ន្ធទាំងស្រុង។
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                បោះបង់
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-900/20 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>កំពុងលុប...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>លុបជាអចិន្ត្រៃយ៍</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
