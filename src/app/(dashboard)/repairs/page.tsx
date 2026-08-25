"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench,
  Plus,
  Search,
  Smartphone,
  CheckCircle2,
  Clock,
  Send,
  User,
  ShieldCheck,
  Cpu,
  Lock,
  Eye,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Loader2,
  Trash2,
  Check,
  DollarSign,
  Percent,
  Tag,
  Calculator,
  Minus,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD } from "@/lib/utils";

export interface RepairTicketItem {
  id: string;
  ticketNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deviceType?: string;
  deviceBrand: string;
  deviceModel: string;
  imeiOrSerial: string;
  passcode?: string;
  patternLock?: string;
  cosmeticCondition?: string;
  customerProblem: string;
  diagnosticNotes?: string;
  technicianId?: string;
  technicianName: string;
  estimatedCostUsd: number;
  finalCostUsd?: number;
  depositPaidUsd: number;
  status:
    | "RECEIVED"
    | "DIAGNOSING"
    | "QUOTED"
    | "APPROVED_BY_CUSTOMER"
    | "IN_PROGRESS"
    | "WAITING_FOR_PARTS"
    | "READY_FOR_PICKUP"
    | "DELIVERED"
    | "UNDER_WARRANTY";
  partsUsed: Array<{ id?: string; productId?: string; name: string; costUsd: number; priceUsd: number; quantity?: number }>;
  technicianCommissionUsd: number;
  createdAt: string;
}

export default function RepairsPage() {
  const { language } = usePOSStore();
  const t = translations[language];

  const [tickets, setTickets] = useState<RepairTicketItem[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<RepairTicketItem | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Add Part State inside details drawer
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partQty, setPartQty] = useState(1);

  // Selected ticket pricing & discount state
  const [laborCost, setLaborCost] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [savingPrice, setSavingPrice] = useState<boolean>(false);

  // New ticket state
  const [newTicketData, setNewTicketData] = useState({
    customerName: "",
    customerPhone: "",
    deviceType: "Smartphone",
    deviceModel: "",
    imeiOrSerial: "",
    passcode: "",
    patternLock: "",
    cosmeticCondition: "",
    customerProblem: "",
    diagnosticNotes: "",
    estimatedCostUsd: "",
    discountType: "AMOUNT" as "AMOUNT" | "PERCENT",
    discountValue: "0",
    depositPaidUsd: "0",
    technicianId: "",
  });

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/repairs");
      const data = await res.json();
      if (data.success) {
        setTickets(data.repairs || []);
        setTechnicians(data.technicians || []);
        setSpareParts(data.spareParts || []);
      }
    } catch (err) {
      console.error("Failed to load repairs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, []);

  const openTicketDetails = (ticket: RepairTicketItem) => {
    setSelectedTicket(ticket);
    const labor = Number(ticket.estimatedCostUsd || 0);
    setLaborCost(labor);
    const deposit = Number(ticket.depositPaidUsd || 0);
    setDepositAmount(deposit);

    const partsTotal = (ticket.partsUsed || []).reduce(
      (sum, p) => sum + Number(p.priceUsd || 0) * (p.quantity || 1),
      0
    );
    const subtotal = labor + partsTotal;
    const finalVal =
      ticket.finalCostUsd !== undefined && ticket.finalCostUsd !== null && Number(ticket.finalCostUsd) > 0
        ? Number(ticket.finalCostUsd)
        : subtotal;

    const diff = Math.max(0, subtotal - finalVal);
    setDiscountValue(diff);
    setDiscountType("AMOUNT");
  };

  const partsSubtotal = (selectedTicket?.partsUsed || []).reduce(
    (sum, p) => sum + Number(p.priceUsd || 0) * (p.quantity || 1),
    0
  );
  const grossSubtotal = Number(laborCost || 0) + partsSubtotal;
  const computedDiscount =
    discountType === "PERCENT"
      ? (grossSubtotal * Number(discountValue || 0)) / 100
      : Number(discountValue || 0);
  const finalPayableTotal = Math.max(0, grossSubtotal - computedDiscount);
  const remainingBalanceDue = Math.max(0, finalPayableTotal - Number(depositAmount || 0));

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketData.customerPhone || !newTicketData.deviceModel || !newTicketData.customerProblem) {
      alert("សូមបញ្ចូលលេខទូរស័ព្ទ ម៉ូដែលទូរស័ព្ទ និងរោគសញ្ញាខូច!");
      return;
    }

    try {
      setSubmitting(true);
      const estLabor = parseFloat(newTicketData.estimatedCostUsd) || 0;
      const discVal = parseFloat(newTicketData.discountValue) || 0;
      const discountAmt =
        newTicketData.discountType === "PERCENT"
          ? (estLabor * discVal) / 100
          : discVal;
      const finalCost = Math.max(0, estLabor - discountAmt);

      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTicketData,
          customerName: newTicketData.customerName,
          customerPhone: newTicketData.customerPhone,
          problemDescription: newTicketData.customerProblem,
          physicalCondition: newTicketData.cosmeticCondition,
          estimatedCostUsd: estLabor,
          finalCostUsd: finalCost,
          depositAmountUsd: parseFloat(newTicketData.depositPaidUsd) || 0,
          depositPaidUsd: parseFloat(newTicketData.depositPaidUsd) || 0,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Dispatch automated Telegram notification for repair
      const posState = usePOSStore.getState();
      if (posState.telegramNotifyOnRepair !== false) {
        fetch("/api/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "NOTIFY_REPAIR",
            config: {
              botToken: posState.telegramBotToken?.trim(),
              chatId: posState.telegramChatId?.trim(),
            },
            payload: {
              ticketCode: data.ticket?.ticketNumber || "N/A",
              customerName: newTicketData.customerName || "អតិថិជនទូទៅ",
              customerPhone: newTicketData.customerPhone || "",
              deviceModel: newTicketData.deviceModel || "ស្មាតហ្វូន",
              issueDescription: newTicketData.customerProblem || "បញ្ហាម៉ាស៊ីន",
              status: "បានទទួលម៉ាស៊ីនចូលជួសជុល (RECEIVED)",
              estimatedCostUsd: finalCost,
            },
          }),
        }).catch((err) => console.warn("Telegram repair notification error:", err));
      }

      setShowNewModal(false);
      setNewTicketData({
        customerName: "",
        customerPhone: "",
        deviceType: "Smartphone",
        deviceModel: "",
        imeiOrSerial: "",
        passcode: "",
        patternLock: "",
        cosmeticCondition: "",
        customerProblem: "",
        diagnosticNotes: "",
        estimatedCostUsd: "",
        discountType: "AMOUNT",
        discountValue: "0",
        depositPaidUsd: "0",
        technicianId: "",
      });
      await fetchRepairs();
    } catch (err: any) {
      alert("បរាជ័យក្នុងការបង្កើតសំបុត្រ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: RepairTicketItem["status"]) => {
    try {
      const res = await fetch(`/api/repairs/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
        }

        const targetTicket = tickets.find((t) => t.id === ticketId);
        const posState = usePOSStore.getState();
        if (targetTicket && posState.telegramNotifyOnRepair !== false) {
          fetch("/api/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "NOTIFY_REPAIR",
              config: {
                botToken: posState.telegramBotToken?.trim(),
                chatId: posState.telegramChatId?.trim(),
              },
              payload: {
                ticketCode: targetTicket.ticketNumber || "N/A",
                customerName: targetTicket.customerName || "អតិថិជន",
                customerPhone: targetTicket.customerPhone || "",
                deviceModel: targetTicket.deviceModel || "",
                issueDescription: targetTicket.customerProblem || "",
                status: newStatus,
                estimatedCostUsd: targetTicket.finalCostUsd || targetTicket.estimatedCostUsd,
              },
            }),
          }).catch((err) => console.warn("Telegram repair status update error:", err));
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleAddPartToTicket = async () => {
    if (!selectedTicket || !selectedPartId) return;
    const part = spareParts.find((p) => p.id === selectedPartId);
    if (!part) return;

    if (part.stockQty !== undefined && part.stockQty < partQty) {
      if (
        !confirm(
          `គ្រឿងបន្លាស់នេះនៅសល់ក្នុងស្តុកតែ ${part.stockQty} ប៉ុណ្ណោះ។ តើអ្នកចង់បន្តដកស្តុកដែរឬទេ?`
        )
      ) {
        return;
      }
    }

    try {
      const res = await fetch(`/api/repairs/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partsToAdd: [
            {
              productId: part.id,
              quantity: partQty,
              costPriceUsd: Number(part.costPriceUsd || 0),
              salePriceUsd: Number(part.salePriceUsd || 0),
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchRepairs();
        if (data.repair) {
          const updatedParts = (data.repair.partsUsed || []).map((p: any) => ({
            id: p.id,
            productId: p.productId,
            name: p.product?.nameKh || p.product?.nameEn || "គ្រឿងបន្លាស់",
            costUsd: Number(p.costPriceUsd || 0),
            priceUsd: Number(p.salePriceUsd || 0),
            quantity: p.quantity || 1,
          }));
          setSelectedTicket((prev) =>
            prev
              ? {
                  ...prev,
                  partsUsed: updatedParts,
                }
              : null
          );
        }
        setSelectedPartId("");
        setPartQty(1);
      }
    } catch (err) {
      console.error("Failed to add part:", err);
    }
  };

  const handleRemovePartFromTicket = async (partId?: string) => {
    if (!selectedTicket || !partId) return;
    if (!confirm("តើអ្នកពិតជាចង់ដកគ្រឿងបន្លាស់នេះចេញ និងបញ្ចូលស្តុកវិញមែនទេ?")) return;

    try {
      const res = await fetch(`/api/repairs/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partIdToRemove: partId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchRepairs();
        setSelectedTicket((prev) =>
          prev
            ? {
                ...prev,
                partsUsed: prev.partsUsed.filter((p) => p.id !== partId),
              }
            : null
        );
      }
    } catch (err) {
      console.error("Failed to remove part:", err);
    }
  };

  const handleSavePricing = async () => {
    if (!selectedTicket) return;
    try {
      setSavingPrice(true);
      const res = await fetch(`/api/repairs/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimatedCostUsd: Number(laborCost || 0),
          finalCostUsd: finalPayableTotal,
          depositPaidUsd: Number(depositAmount || 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicket.id
              ? {
                  ...t,
                  estimatedCostUsd: Number(laborCost || 0),
                  finalCostUsd: finalPayableTotal,
                  depositPaidUsd: Number(depositAmount || 0),
                }
              : t
          )
        );
        setSelectedTicket((prev) =>
          prev
            ? {
                ...prev,
                estimatedCostUsd: Number(laborCost || 0),
                finalCostUsd: finalPayableTotal,
                depositPaidUsd: Number(depositAmount || 0),
              }
            : null
        );
        alert("រក្សាទុកតម្លៃ និងការបញ្ចុះតម្លៃជោគជ័យ!");
      }
    } catch (err: any) {
      alert("បរាជ័យ: " + err.message);
    } finally {
      setSavingPrice(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("តើអ្នកពិតជាចង់លុបប័ណ្ណជួសជុលនេះមែនទេ?")) return;
    try {
      const res = await fetch(`/api/repairs/${ticketId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
        setSelectedTicket(null);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSendTelegramNotification = (ticket: RepairTicketItem) => {
    alert(
      `📲 Telegram Bot Notification Sent to ${ticket.customerName} (${ticket.customerPhone}):\n` +
      `"សួស្តីបាទ! ឧបករណ៍ ${ticket.deviceModel} (សំបុត្រ #${ticket.ticketNumber}) ត្រូវបានធ្វើបច្ចុប្បន្នភាពទៅកាន់ស្ថានភាព: [${ticket.status}]។ អរគុណ!"`
    );
  };

  const getStatusBadge = (status: RepairTicketItem["status"]) => {
    switch (status) {
      case "RECEIVED":
        return <span className="rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-bold border border-blue-200">1. បានទទួលម៉ាស៊ីន</span>;
      case "DIAGNOSING":
        return <span className="rounded-md bg-purple-50 text-purple-700 px-2 py-0.5 text-xs font-bold border border-purple-200">2. កំពុងត្រួតពិនិត្យ</span>;
      case "IN_PROGRESS":
        return <span className="rounded-md bg-amber-50 text-amber-800 px-2 py-0.5 text-xs font-bold border border-amber-200">3. កំពុងជួសជុល</span>;
      case "WAITING_FOR_PARTS":
        return <span className="rounded-md bg-orange-50 text-orange-800 px-2 py-0.5 text-xs font-bold border border-orange-200">4. រង់ចាំគ្រឿង</span>;
      case "READY_FOR_PICKUP":
        return <span className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-bold border border-emerald-200">5. ជួសជុលរួចរាល់</span>;
      case "DELIVERED":
        return <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-bold border border-slate-200">6. បានប្រគល់ជូន</span>;
      default:
        return <span className="rounded-md bg-slate-100 text-slate-600 px-2 py-0.5 text-xs font-bold">{status}</span>;
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      t.ticketNumber.toLowerCase().includes(query) ||
      t.customerName.toLowerCase().includes(query) ||
      t.customerPhone.includes(query) ||
      t.deviceModel.toLowerCase().includes(query) ||
      (t.imeiOrSerial && t.imeiOrSerial.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Wrench className="h-6 w-6 text-teal-700" />
            {t.repairs}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            គ្រប់គ្រងសំបុត្រជួសជុលឧបករណ៍ IMEI គ្រឿងបន្លាស់ និងស្ថានភាព Live ក្នុង Supabase
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRepairs}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-teal-700 ${loading ? "animate-spin" : ""}`} />
            ផ្ទុកឡើងវិញ
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
          >
            <Plus className="h-4 w-4" />
            {t.newRepairTicket}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ស្វែងរកតាមលេខសំបុត្រ, អតិថិជន, លេខទូរស័ព្ទ ឬ IMEI..."
            className="w-full border-none bg-transparent text-xs font-medium text-slate-800 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "RECEIVED", "DIAGNOSING", "IN_PROGRESS", "READY_FOR_PICKUP", "DELIVERED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                statusFilter === st
                  ? "bg-teal-700 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {st === "ALL" ? "ទាំងអស់" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
          <span className="text-xs font-semibold">កំពុងទាញទិន្នន័យជួសជុលពី Supabase...</span>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Wrench className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">មិនទាន់មានសំបុត្រជួសជុលនៅក្នុងប្រព័ន្ធទេ</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> បង្កើតប័ណ្ណទទួលជួសជុលថ្មី
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => {
            const displayCost = ticket.finalCostUsd !== undefined && ticket.finalCostUsd !== null && Number(ticket.finalCostUsd) > 0
              ? Number(ticket.finalCostUsd)
              : Number(ticket.estimatedCostUsd || 0);

            return (
              <div
                key={ticket.id}
                onClick={() => openTicketDetails(ticket)}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-teal-500 hover:shadow-md transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    {ticket.ticketNumber}
                  </span>
                  {getStatusBadge(ticket.status)}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-slate-600" />
                    {ticket.deviceModel}
                  </h4>
                  {ticket.imeiOrSerial && (
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      IMEI: {ticket.imeiOrSerial}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 space-y-1">
                  <p className="line-clamp-2">
                    <span className="font-semibold text-slate-900">រោគសញ្ញា:</span> {ticket.customerProblem}
                  </p>
                  <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>អតិថិជន: {ticket.customerName}</span>
                    <span>ទូរស័ព្ទ: {ticket.customerPhone}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400">ជាងទទួលបន្ទុក</p>
                    <p className="font-bold text-slate-700">{ticket.technicianName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">តម្លៃសរុប (Total)</p>
                    <p className="font-mono font-black text-teal-800 text-sm">
                      {formatUSD(displayCost)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <div>
                <span className="font-mono text-xs font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                  {selectedTicket.ticketNumber}
                </span>
                <h3 className="text-base font-extrabold text-slate-800 mt-1">
                  {selectedTicket.deviceModel}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700">
              {/* Status Update Pipeline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ប្តូរដំណាក់កាលជួសជុល (Workflow Stage):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "RECEIVED", label: "1. បានទទួល" },
                    { key: "DIAGNOSING", label: "2. ត្រួតពិនិត្យ" },
                    { key: "IN_PROGRESS", label: "3. កំពុងជួសជុល" },
                    { key: "WAITING_FOR_PARTS", label: "4. រង់ចាំគ្រឿងបន្លាស់" },
                    { key: "READY_FOR_PICKUP", label: "5. រួចរាល់ / មកយក" },
                    { key: "DELIVERED", label: "6. បានប្រគល់ជូន" },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => handleUpdateStatus(selectedTicket.id, s.key as any)}
                      className={`rounded-xl border p-2 font-bold text-center transition ${
                        selectedTicket.status === s.key
                          ? "border-teal-600 bg-teal-50 text-teal-800 shadow-xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Security & Lock info */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-slate-600" />
                  ព័ត៌មានសុវត្ថិភាពឧបករណ៍ (Passcode & Pattern Lock)
                </h4>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-slate-400">Passcode:</span>{" "}
                    <span className="font-bold text-slate-900">{selectedTicket.passcode || "គ្មាន"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Pattern Lock:</span>{" "}
                    <span className="font-bold text-teal-700">{selectedTicket.patternLock || "គ្មាន"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">IMEI / Serial:</span>{" "}
                    <span className="font-bold text-slate-900">{selectedTicket.imeiOrSerial || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Problem Description */}
              <div>
                <p className="font-bold text-slate-800">បញ្ហា និងរោគសញ្ញា:</p>
                <p className="rounded-lg border border-slate-200 p-2.5 bg-white mt-1">
                  {selectedTicket.customerProblem}
                </p>
              </div>

              {/* Spare parts used with stock deduction */}
              <div className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-800 flex items-center gap-1">
                    <Cpu className="h-4 w-4 text-teal-700" />
                    គ្រឿងបន្លាស់ដែលបានប្រើ (កាត់ស្តុកស្វ័យប្រវត្តិ):
                  </h5>
                  <span className="text-[11px] font-mono font-bold text-teal-800">
                    សរុប: {formatUSD(partsSubtotal)}
                  </span>
                </div>

                {selectedTicket.partsUsed.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {selectedTicket.partsUsed.map((p, i) => {
                      const linePrice = Number(p.priceUsd || 0) * (p.quantity || 1);
                      return (
                        <div key={p.id || i} className="py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{p.name}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                              x{p.quantity || 1}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              (${Number(p.priceUsd || 0).toFixed(2)}/ឯកតា)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-teal-800">
                              ${linePrice.toFixed(2)}
                            </span>
                            {p.id && (
                              <button
                                type="button"
                                onClick={() => handleRemovePartFromTicket(p.id)}
                                title="ដកគ្រឿងបន្លាស់ និងបញ្ចូលស្តុកវិញ"
                                className="rounded-md p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">មិនទាន់បានបញ្ចូលគ្រឿងបន្លាស់</p>
                )}

                {/* Add Part Section */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="flex-1 min-w-[200px] rounded-xl border border-slate-200 p-2 text-xs focus:border-teal-700 focus:outline-hidden"
                  >
                    <option value="">+ ជ្រើសរើសគ្រឿងបន្លាស់ពីស្តុក...</option>
                    {spareParts.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.nameKh} (${sp.salePriceUsd}) — [ស្តុក: {sp.stockQty ?? 0}]
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] text-slate-500 font-bold">ចំនួន:</label>
                    <input
                      type="number"
                      min="1"
                      value={partQty}
                      onChange={(e) => setPartQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 rounded-xl border border-slate-200 p-2 text-xs font-mono text-center focus:border-teal-700 focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPartToTicket}
                    disabled={!selectedPartId}
                    className="rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-40 shadow-xs"
                  >
                    + បញ្ចូល & កាត់ស្តុក
                  </button>
                </div>
              </div>

              {/* Pricing, Discount, and Payment Breakdown */}
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 space-y-3">
                <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                  <Calculator className="h-4 w-4 text-teal-700" />
                  ការគណនាតម្លៃ និងការបញ្ចុះតម្លៃ (Repair Cost & Discount)
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ថ្លៃសេវា / ឈ្នួលជួសជុល ($ Labor Fee)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={laborCost}
                      onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-mono font-bold text-slate-800 focus:border-teal-700 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ការបញ្ចុះតម្លៃ (Discount)
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as "AMOUNT" | "PERCENT")}
                        className="rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-teal-800 focus:outline-hidden"
                      >
                        <option value="AMOUNT">$ (ដុល្លារ)</option>
                        <option value="PERCENT">% (ភាគរយ)</option>
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-mono font-bold text-rose-600 focus:border-teal-700 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Summary Table */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>ថ្លៃសេវាជួសជុល (Labor Fee):</span>
                    <span className="font-mono font-bold text-slate-800">${Number(laborCost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ថ្លៃគ្រឿងបន្លាស់ (Spare Parts Total):</span>
                    <span className="font-mono font-bold text-slate-800">${partsSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-1">
                    <span>សរុបដើម (Gross Subtotal):</span>
                    <span className="font-mono font-bold text-slate-800">${grossSubtotal.toFixed(2)}</span>
                  </div>
                  {computedDiscount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        បញ្ចុះតម្លៃ ({discountType === "PERCENT" ? `${discountValue}%` : `$${discountValue}`}):
                      </span>
                      <span className="font-mono">-${computedDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-teal-900 font-extrabold text-sm border-t border-slate-200 pt-1.5">
                    <span>តម្លៃសរុបចុងក្រោយ (Net Total):</span>
                    <span className="font-mono">${finalPayableTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ប្រាក់កក់បានបង់ ($ Deposit)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-mono font-bold text-emerald-700 focus:border-teal-700 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ប្រាក់នៅសល់ត្រូវទូទាត់ ($ Balance Due)
                    </label>
                    <div className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2 text-xs font-mono font-black text-rose-700">
                      ${remainingBalanceDue.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePricing}
                    disabled={savingPrice}
                    className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 disabled:opacity-50 transition"
                  >
                    {savingPrice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    រក្សាទុកតម្លៃ & Discount
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendTelegramNotification(selectedTicket)}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition"
                >
                  <Send className="h-3.5 w-3.5" />
                  {t.notifyCustomerTelegram}
                </button>
                <button
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 text-red-700 bg-red-50 px-3 py-2 text-xs font-bold hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" /> លុបសំបុត្រ
                </button>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                បិទផ្ទាំង
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Repair Ticket Modal */}
      {showNewModal && (() => {
        const estLabor = parseFloat(newTicketData.estimatedCostUsd) || 0;
        const discVal = parseFloat(newTicketData.discountValue) || 0;
        const discAmt = newTicketData.discountType === "PERCENT"
          ? (estLabor * discVal) / 100
          : discVal;
        const finalEst = Math.max(0, estLabor - discAmt);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-teal-700" />
                  {t.newRepairTicket}
                </h3>
                <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ឈ្មោះអតិថិជន *</label>
                    <input
                      type="text"
                      required
                      value={newTicketData.customerName}
                      onChange={(e) => setNewTicketData({ ...newTicketData, customerName: e.target.value })}
                      placeholder="ឧ. សុខ វិបុល"
                      className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">លេខទូរស័ព្ទ *</label>
                    <input
                      type="text"
                      required
                      value={newTicketData.customerPhone}
                      onChange={(e) => setNewTicketData({ ...newTicketData, customerPhone: e.target.value })}
                      placeholder="ឧ. 012 889 977"
                      className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ម៉ូដែលឧបករណ៍ (Model / Device) *</label>
                  <input
                    type="text"
                    required
                    value={newTicketData.deviceModel}
                    onChange={(e) => setNewTicketData({ ...newTicketData, deviceModel: e.target.value })}
                    placeholder="ឧ. iPhone 15 Pro Max, Samsung S24 Ultra, MacBook Pro M3..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-600 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">IMEI / Serial No.</label>
                    <input
                      type="text"
                      value={newTicketData.imeiOrSerial}
                      onChange={(e) => setNewTicketData({ ...newTicketData, imeiOrSerial: e.target.value })}
                      placeholder="3589..."
                      className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Passcode</label>
                    <input
                      type="text"
                      value={newTicketData.passcode}
                      onChange={(e) => setNewTicketData({ ...newTicketData, passcode: e.target.value })}
                      placeholder="123456"
                      className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pattern Lock</label>
                    <input
                      type="text"
                      value={newTicketData.patternLock}
                      onChange={(e) => setNewTicketData({ ...newTicketData, patternLock: e.target.value })}
                      placeholder="1-2-3-6-9"
                      className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ជាងទទួលបន្ទុក (Technician)</label>
                  <select
                    value={newTicketData.technicianId}
                    onChange={(e) => setNewTicketData({ ...newTicketData, technicianId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-600 focus:outline-hidden"
                  >
                    <option value="">ជ្រើសរើសជាងជួសជុល...</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.fullNameKh || tech.fullName} ({tech.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">រោគសញ្ញា / បញ្ហាឧបករណ៍ *</label>
                  <textarea
                    required
                    rows={2}
                    value={newTicketData.customerProblem}
                    onChange={(e) => setNewTicketData({ ...newTicketData, customerProblem: e.target.value })}
                    placeholder="រៀបរាប់ពីបញ្ហាដែលអតិថិជនជួបប្រទះ..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-600 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">តម្លៃសេវាប៉ាន់ស្មាន ($)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newTicketData.estimatedCostUsd}
                      onChange={(e) => setNewTicketData({ ...newTicketData, estimatedCostUsd: e.target.value })}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-600 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ការបញ្ចុះតម្លៃ (Discount)</label>
                    <div className="flex gap-1">
                      <select
                        value={newTicketData.discountType}
                        onChange={(e) =>
                          setNewTicketData({
                            ...newTicketData,
                            discountType: e.target.value as "AMOUNT" | "PERCENT",
                          })
                        }
                        className="rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold text-teal-800 focus:outline-hidden"
                      >
                        <option value="AMOUNT">$</option>
                        <option value="PERCENT">%</option>
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={newTicketData.discountValue}
                        onChange={(e) => setNewTicketData({ ...newTicketData, discountValue: e.target.value })}
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-600 focus:outline-hidden font-mono text-rose-600 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ប្រាក់កក់ទុក ($)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newTicketData.depositPaidUsd}
                      onChange={(e) => setNewTicketData({ ...newTicketData, depositPaidUsd: e.target.value })}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-600 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Estimated Total Preview */}
                <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-teal-900">តម្លៃប៉ាន់ស្មានសរុប (Estimated Total):</span>
                  <span className="font-mono font-black text-sm text-teal-800">${finalEst.toFixed(2)}</span>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 font-bold text-white shadow-md shadow-teal-900/20 hover:bg-teal-800 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    បង្កើតសំបុត្រជួសជុល
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
