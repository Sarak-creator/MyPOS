"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Truck,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Package,
  Trash2,
  Printer,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Sparkles,
  ArrowDownToLine,
  Layers,
  Edit2,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { formatUSD, formatKHR } from "@/lib/utils";

type ActiveTab = "POS" | "SUPPLIERS";

interface PurchaseItemRow {
  productId: string;
  productName: string;
  quantity: number;
  unitCostUsd: number;
  totalCostUsd: number;
}

export default function PurchasesPage() {
  const { language, exchangeRateKhr } = usePOSStore();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<ActiveTab>("POS");
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });

  // Modals
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPODetailModal, setShowPODetailModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);

  // Create PO Form State
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poStatus, setPoStatus] = useState<string>("ORDERED");
  const [poNotes, setPoNotes] = useState("");
  const [poItems, setPoItems] = useState<PurchaseItemRow[]>([]);
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);
  const [poFormError, setPoFormError] = useState("");

  // Supplier Form State
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supCompanyName, setSupCompanyName] = useState("");
  const [supContactPerson, setSupContactPerson] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supAddress, setSupAddress] = useState("");
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [supplierFormError, setSupplierFormError] = useState("");

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (selectedStatus) params.set("status", selectedStatus);
      if (selectedSupplierId) params.set("supplierId", selectedSupplierId);
      params.set("page", page.toString());
      params.set("limit", "20");

      const [resPO, resSuppliers, resProducts] = await Promise.all([
        fetch(`/api/purchases?${params.toString()}`).then((r) => r.json()),
        fetch("/api/suppliers").then((r) => r.json()),
        fetch("/api/inventory").then((r) => r.json()).catch(() => ({ products: [] })),
      ]);

      if (resPO.success) {
        setPurchaseOrders(resPO.purchaseOrders || []);
        setStats(resPO.stats || null);
        setPagination(resPO.pagination || { totalPages: 1, totalCount: 0 });
      }

      if (resSuppliers.success) {
        setSuppliers(resSuppliers.suppliers || []);
      }

      if (resProducts.products) {
        setProducts(resProducts.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch purchases data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, selectedStatus, selectedSupplierId, page]);

  // Add Item Row to Create PO
  const handleAddItemToPO = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const existingIndex = poItems.findIndex((i) => i.productId === productId);
    if (existingIndex >= 0) {
      const updated = [...poItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalCostUsd =
        updated[existingIndex].quantity * updated[existingIndex].unitCostUsd;
      setPoItems(updated);
    } else {
      const unitCost = Number(prod.costPriceUsd || 0);
      setPoItems([
        ...poItems,
        {
          productId: prod.id,
          productName: prod.nameKh || prod.nameEn,
          quantity: 1,
          unitCostUsd: unitCost,
          totalCostUsd: unitCost,
        },
      ]);
    }
  };

  const handleUpdateItemQuantity = (index: number, quantity: number) => {
    const updated = [...poItems];
    const qty = Math.max(1, quantity);
    updated[index].quantity = qty;
    updated[index].totalCostUsd = qty * updated[index].unitCostUsd;
    setPoItems(updated);
  };

  const handleUpdateItemCost = (index: number, unitCost: number) => {
    const updated = [...poItems];
    const cost = Math.max(0, unitCost);
    updated[index].unitCostUsd = cost;
    updated[index].totalCostUsd = updated[index].quantity * cost;
    setPoItems(updated);
  };

  const handleRemoveItemFromPO = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const poGrandTotal = poItems.reduce((acc, curr) => acc + curr.totalCostUsd, 0);

  // Submit Create PO
  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault();
    setPoFormError("");

    if (!poSupplierId) {
      setPoFormError("សូមជ្រើសរើសអ្នកផ្គត់ផ្គង់ (Supplier is required)");
      return;
    }

    if (poItems.length === 0) {
      setPoFormError("សូមជ្រើសរើសមុខទំនិញយ៉ាងហោចណាស់មួយ (Add at least 1 item)");
      return;
    }

    setIsSubmittingPO(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: poSupplierId,
          status: poStatus,
          notes: poNotes,
          items: poItems,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreatePOModal(false);
        setPoItems([]);
        setPoNotes("");
        setPoSupplierId("");
        fetchData();
      } else {
        setPoFormError(data.error || "Failed to create PO");
      }
    } catch (err: any) {
      setPoFormError(err.message || "Error submitting PO");
    } finally {
      setIsSubmittingPO(false);
    }
  };

  // Receive PO Stock in One-Click
  const handleReceivePO = async (poId: string) => {
    try {
      const res = await fetch("/api/purchases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: poId,
          status: "RECEIVED",
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (selectedPO && selectedPO.id === poId) {
          setSelectedPO(data.purchaseOrder);
        }
        fetchData();
      }
    } catch (err) {
      console.error("Failed to receive PO:", err);
    }
  };

  // Save Supplier (Add / Edit)
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupplierFormError("");

    if (!supCompanyName || !supPhone) {
      setSupplierFormError("សូមបំពេញឈ្មោះក្រុមហ៊ុន និងលេខទូរស័ព្ទ");
      return;
    }

    setIsSubmittingSupplier(true);
    try {
      const method = editingSupplierId ? "PUT" : "POST";
      const payload: any = {
        companyName: supCompanyName,
        contactPerson: supContactPerson,
        phone: supPhone,
        email: supEmail,
        address: supAddress,
      };
      if (editingSupplierId) payload.id = editingSupplierId;

      const res = await fetch("/api/suppliers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setShowSupplierModal(false);
        setEditingSupplierId(null);
        setSupCompanyName("");
        setSupContactPerson("");
        setSupPhone("");
        setSupEmail("");
        setSupAddress("");
        fetchData();
      } else {
        setSupplierFormError(data.error || "Failed to save supplier");
      }
    } catch (err: any) {
      setSupplierFormError(err.message || "Error saving supplier");
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  const handleEditSupplier = (sup: any) => {
    setEditingSupplierId(sup.id);
    setSupCompanyName(sup.companyName);
    setSupContactPerson(sup.contactPerson || "");
    setSupPhone(sup.phone);
    setSupEmail(sup.email || "");
    setSupAddress(sup.address || "");
    setShowSupplierModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="h-7 w-7 text-teal-700" />
            <span>{language === "km" ? "ការទិញចូល & គ្រប់គ្រងស្តុក" : "Purchases & Stock Replenishment"}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {language === "km"
              ? "គ្រប់គ្រងការបញ្ជាទិញចូលពីអ្នកផ្គត់ផ្គង់ បញ្ចូលស្តុកទំនិញ និងតាមដានបំណុលត្រូវសង"
              : "Manage supplier purchase orders, restock inventory, and track accounts payable balances"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingSupplierId(null);
              setSupCompanyName("");
              setSupContactPerson("");
              setSupPhone("");
              setSupEmail("");
              setSupAddress("");
              setShowSupplierModal(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Building2 className="h-4 w-4 text-slate-600" />
            <span>+ អ្នកផ្គត់ផ្គង់ (Supplier)</span>
          </button>

          <button
            onClick={() => {
              setPoItems([]);
              setPoNotes("");
              setShowCreatePOModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-teal-900/20 hover:bg-teal-800 transition active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span>{language === "km" ? "បង្កើតបញ្ជាទិញ (New PO)" : "New Purchase Order"}</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-teal-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">សរុបការទិញចូល (Total POs Value)</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black font-mono text-slate-900">
                {formatUSD(stats.totalSpendUsd || 0)}
              </p>
              <p className="text-xs font-bold text-teal-700 mt-0.5">
                {formatKHR(stats.totalSpendUsd || 0, exchangeRateKhr)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">ស្តុកចូលរួចរាល់ (Received Stock)</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black font-mono text-slate-900">
                {formatUSD(stats.receivedValueUsd || 0)}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                បានទទួល: <span className="font-bold text-emerald-700">{stats.receivedCount || 0} POs</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">កំពុងរង់ចាំទំនិញ (Pending Orders)</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Truck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black font-mono text-slate-900">
                {stats.pendingCount || 0} POs
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                សេចក្តីព្រាង (Drafts): <span className="font-bold text-slate-700">{stats.draftCount || 0}</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">អ្នកផ្គត់ផ្គង់សរុប (Suppliers)</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black font-mono text-slate-900">
                {stats.activeSuppliersCount || suppliers.length} ក្រុមហ៊ុន
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                ទំនិញទិញសរុប: <span className="font-bold text-slate-700">{stats.totalItemsPurchased || 0} items</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("POS")}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-bold transition border-b-2 ${
            activeTab === "POS"
              ? "border-teal-700 text-teal-800 bg-teal-50/30"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>បញ្ជាទិញចូល (Purchase Orders)</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-mono">
            {purchaseOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("SUPPLIERS")}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-bold transition border-b-2 ${
            activeTab === "SUPPLIERS"
              ? "border-teal-700 text-teal-800 bg-teal-50/30"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>អ្នកផ្គត់ផ្គង់ (Suppliers Directory)</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-mono">
            {suppliers.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === "POS" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="relative md:col-span-6">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ស្វែងរកលេខ PO, អ្នកផ្គត់ផ្គង់, កំណត់ចំណាំ..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={selectedSupplierId}
                  onChange={(e) => {
                    setSelectedSupplierId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-hidden"
                >
                  <option value="">🏢 គ្រប់អ្នកផ្គត់ផ្គង់ (All Suppliers)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-hidden"
                >
                  <option value="">🏷️ គ្រប់ស្ថានភាព (All Status)</option>
                  <option value="DRAFT">📝 សេចក្តីព្រាង (Draft)</option>
                  <option value="ORDERED">🚚 បានបញ្ជាទិញ (Ordered)</option>
                  <option value="RECEIVED">✅ បានទទួលចូលស្តុក (Received)</option>
                  <option value="CANCELLED">❌ បានបោះបង់ (Cancelled)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                <p className="text-xs font-bold text-slate-500">កំពុងផ្ទុកទិន្នន័យ (Loading POs)...</p>
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="text-sm font-bold text-slate-700">មិនទាន់មានបញ្ជាទិញចូលទេ</h3>
                <p className="text-xs text-slate-400">សូមចុចប៊ូតុង "បង្កើតបញ្ជាទិញ" ដើម្បីទិញទំនិញចូលស្តុក</p>
                <button
                  onClick={() => setShowCreatePOModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>បង្កើតបញ្ជាទិញថ្មី</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">លេខបញ្ជាទិញ (PO #)</th>
                      <th className="px-4 py-3.5">អ្នកផ្គត់ផ្គង់</th>
                      <th className="px-4 py-3.5">កាលបរិច្ឆេទ</th>
                      <th className="px-4 py-3.5">ចំនួនមុខទំនិញ</th>
                      <th className="px-4 py-3.5 text-right">តម្លៃសរុប ($)</th>
                      <th className="px-4 py-3.5 text-center">ស្ថានភាព</th>
                      <th className="px-4 py-3.5 text-center">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseOrders.map((po) => {
                      const isReceived = po.status === "RECEIVED";
                      const isOrdered = po.status === "ORDERED";
                      const isDraft = po.status === "DRAFT";

                      return (
                        <tr key={po.id} className="hover:bg-slate-50/80 transition">
                          {/* PO Number */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedPO(po);
                                setShowPODetailModal(true);
                              }}
                              className="font-mono font-black text-teal-800 hover:text-teal-600 hover:underline flex items-center gap-1.5"
                            >
                              <FileText className="h-3.5 w-3.5 text-teal-600" />
                              <span>{po.poNumber}</span>
                            </button>
                          </td>

                          {/* Supplier */}
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{po.supplier?.companyName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{po.supplier?.phone}</p>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                            {new Date(po.orderedAt).toLocaleDateString("km-KH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>

                          {/* Items */}
                          <td className="px-4 py-3 text-slate-700 font-semibold">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono">
                              {po.items?.length || 0} មុខ
                            </span>
                          </td>

                          {/* Total Cost */}
                          <td className="px-4 py-3 text-right font-mono font-black text-sm text-slate-900">
                            {formatUSD(Number(po.totalCostUsd))}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            {isReceived && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-black">
                                <CheckCircle2 className="h-3 w-3" /> ទទួលចូលស្តុក
                              </span>
                            )}
                            {isOrdered && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-black">
                                <Clock className="h-3 w-3" /> បានបញ្ជាទិញ
                              </span>
                            )}
                            {isDraft && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[10px] font-bold">
                                សេចក្តីព្រាង
                              </span>
                            )}
                            {po.status === "CANCELLED" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-[10px] font-bold">
                                បោះបង់
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedPO(po);
                                  setShowPODetailModal(true);
                                }}
                                title="មើលព័ត៌មានលម្អិត"
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition"
                              >
                                <FileText className="h-4 w-4" />
                              </button>

                              {!isReceived && po.status !== "CANCELLED" && (
                                <button
                                  onClick={() => handleReceivePO(po.id)}
                                  title="ទទួលទំនិញចូលស្តុកភ្លាមៗ (Stock In)"
                                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 transition"
                                >
                                  <ArrowDownToLine className="h-3 w-3" />
                                  <span>ទទួលស្តុក</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIERS DIRECTORY */}
      {activeTab === "SUPPLIERS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 hover:border-teal-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{sup.companyName}</h3>
                    {sup.contactPerson && (
                      <p className="text-xs text-slate-500 font-medium">អ្នកទំនាក់ទំនង: {sup.contactPerson}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditSupplier(sup)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-teal-600" />
                    <span className="font-mono font-bold text-slate-800">{sup.phone}</span>
                  </div>
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{sup.email}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{sup.address}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    បញ្ជាទិញ: <strong className="text-slate-800">{sup._count?.purchaseOrders || 0} POs</strong>
                  </span>
                  <span className="text-slate-500">
                    បំណុលត្រូវសង:{" "}
                    <strong className="font-mono text-red-600 font-bold">
                      {formatUSD(Number(sup.currentBalanceUsd || 0))}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {showCreatePOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-100 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-teal-700" />
                <span>បង្កើតបញ្ជាទិញទំនិញចូលថ្មី (New Purchase Order)</span>
              </h3>
              <button
                onClick={() => setShowCreatePOModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPO} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Select Supplier */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    អ្នកផ្គត់ផ្គង់ (Supplier) *
                  </label>
                  <select
                    required
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:border-teal-600 focus:outline-hidden"
                  >
                    <option value="">-- ជ្រើសរើសអ្នកផ្គត់ផ្គង់ --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ស្ថានភាពដំបូង (Initial Status)
                  </label>
                  <select
                    value={poStatus}
                    onChange={(e) => setPoStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:border-teal-600 focus:outline-hidden"
                  >
                    <option value="ORDERED">🚚 បានបញ្ជាទិញ (Ordered - Waiting for Goods)</option>
                    <option value="RECEIVED">✅ ទទួលចូលស្តុកភ្លាមៗ (Receive Stock Now)</option>
                    <option value="DRAFT">📝 សេចក្តីព្រាង (Save as Draft)</option>
                  </select>
                </div>
              </div>

              {/* Product Selector Bar */}
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3 space-y-2">
                <label className="block text-xs font-bold text-teal-900">
                  ជ្រើសរើសទំនិញដើម្បីបញ្ជាទិញ (Select Products to Order)
                </label>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItemToPO(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-teal-600 focus:outline-hidden"
                  >
                    <option value="">+ ចុចដើម្បីជ្រើសរើសមុខទំនិញ...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nameKh || p.nameEn} (ថ្លៃដើម: ${Number(p.costPriceUsd || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Items Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <tr>
                      <th className="p-3">មុខទំនិញ</th>
                      <th className="p-3 w-28 text-center">ចំនួន (Qty)</th>
                      <th className="p-3 w-36 text-right">ថ្លៃដើមទិញចូល ($)</th>
                      <th className="p-3 w-32 text-right">សរុប ($)</th>
                      <th className="p-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {poItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                          មិនទាន់បានជ្រើសរើសទំនិញណាមួយទេ
                        </td>
                      </tr>
                    ) : (
                      poItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">{item.productName}</td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemQuantity(idx, parseInt(e.target.value) || 1)}
                              className="w-16 rounded-lg border border-slate-200 p-1 text-center font-bold font-mono text-slate-900 focus:border-teal-600 focus:outline-hidden"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitCostUsd}
                              onChange={(e) => handleUpdateItemCost(idx, parseFloat(e.target.value) || 0)}
                              className="w-24 rounded-lg border border-slate-200 p-1 text-right font-bold font-mono text-slate-900 focus:border-teal-600 focus:outline-hidden"
                            />
                          </td>
                          <td className="p-3 text-right font-mono font-black text-slate-900">
                            {formatUSD(item.totalCostUsd)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromPO(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Notes & Summary */}
              <div className="flex flex-col md:flex-row items-start justify-between gap-4 pt-2">
                <div className="w-full md:w-1/2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">កំណត់ចំណាំ (Notes)</label>
                  <textarea
                    rows={2}
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    placeholder="ឧ. បញ្ជាទិញបន្ថែមសម្រាប់សាខាភ្នំពេញ..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-800 focus:border-teal-600 focus:outline-hidden"
                  />
                </div>

                <div className="w-full md:w-1/2 rounded-xl bg-slate-50 p-4 border border-slate-200 text-right space-y-1">
                  <span className="text-xs text-slate-500 font-bold block">ទឹកប្រាក់សរុបត្រូវទូទាត់</span>
                  <p className="text-2xl font-black font-mono text-teal-800">{formatUSD(poGrandTotal)}</p>
                  <p className="text-xs font-semibold text-slate-500">{formatKHR(poGrandTotal, exchangeRateKhr)}</p>
                </div>
              </div>

              {poFormError && <p className="text-xs font-bold text-red-600">{poFormError}</p>}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreatePOModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPO}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-teal-900/20 hover:bg-teal-800"
                >
                  {isSubmittingPO ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>រក្សាទុកបញ្ជាទិញ (Save PO)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO DETAIL & RECEIVE MODAL */}
      {showPODetailModal && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-700" />
                  <span>បញ្ជាទិញ #{selectedPO.poNumber}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  អ្នកផ្គត់ផ្គង់: <strong>{selectedPO.supplier?.companyName}</strong> ({selectedPO.supplier?.phone})
                </p>
              </div>
              <button
                onClick={() => setShowPODetailModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Line Items */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="p-3">មុខទំនិញ</th>
                    <th className="p-3 text-center">ចំនួន</th>
                    <th className="p-3 text-right">តម្លៃឯកតា ($)</th>
                    <th className="p-3 text-right">សរុប ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPO.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-slate-800">
                        {item.product?.nameKh || item.product?.nameEn || "Product"}
                      </td>
                      <td className="p-3 text-center font-bold font-mono">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">{formatUSD(Number(item.unitCostUsd))}</td>
                      <td className="p-3 text-right font-mono font-black">{formatUSD(Number(item.totalCostUsd))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-slate-500">
                ស្ថានភាព: <strong className="text-slate-800">{selectedPO.status}</strong>
              </span>
              <div className="text-right">
                <span className="text-xs text-slate-500">ទឹកប្រាក់សរុប: </span>
                <span className="text-xl font-black font-mono text-teal-800">
                  {formatUSD(Number(selectedPO.totalCostUsd))}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowPODetailModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                បិទ
              </button>

              {selectedPO.status !== "RECEIVED" && selectedPO.status !== "CANCELLED" && (
                <button
                  onClick={() => handleReceivePO(selectedPO.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  <span>បញ្ជាក់ទទួលទំនិញចូលស្តុក (Confirm Stock In)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-700" />
                <span>{editingSupplierId ? "កែប្រែអ្នកផ្គត់ផ្គង់" : "បន្ថែមអ្នកផ្គត់ផ្គង់ថ្មី"}</span>
              </h3>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ឈ្មោះក្រុមហ៊ុន / ហាងផ្គត់ផ្គង់ *
                </label>
                <input
                  type="text"
                  required
                  value={supCompanyName}
                  onChange={(e) => setSupCompanyName(e.target.value)}
                  placeholder="ឧ. ក្រុមហ៊ុន សុវណ្ណ ភូមិ អេឡិចត្រូនិក"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    អ្នកទំនាក់ទំនង
                  </label>
                  <input
                    type="text"
                    value={supContactPerson}
                    onChange={(e) => setSupContactPerson(e.target.value)}
                    placeholder="ឈ្មោះតំណាង"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    លេខទូរស័ព្ទ *
                  </label>
                  <input
                    type="text"
                    required
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="012 345 678"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  placeholder="supplier@example.com"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">អាសយដ្ឋាន</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="រាជធានីភ្នំពេញ..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:outline-hidden"
                />
              </div>

              {supplierFormError && <p className="text-xs font-bold text-red-600">{supplierFormError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSupplier}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-800"
                >
                  {isSubmittingSupplier ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>រក្សាទុក</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
