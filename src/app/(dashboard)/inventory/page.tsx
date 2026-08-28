"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Edit2,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  Tags,
  Tag,
  FolderPlus,
  Check,
  Building2,
  Truck,
  Printer,
  Clock,
  FileText,
  Eye,
  ArrowRight,
  Boxes,
  Store,
  MapPin,
  Calendar,
  Send,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";

interface InventoryItem {
  id: string;
  sku: string;
  barcode: string;
  nameKh: string;
  nameEn: string;
  description?: string;
  category: string;
  categorySlug: string;
  brand: string;
  warehouse?: string;
  branch?: string;
  costPriceUsd: number;
  salePriceUsd: number;
  salePriceKhr: number;
  stockQty: number;
  minStock: number;
  unit: string;
  type: string;
  imeiList?: string[];
}

interface CategoryItem {
  id: string;
  nameKh: string;
  nameEn: string;
  slug: string;
  icon?: string;
  productCount?: number;
  createdAt?: string;
}

interface BranchItem {
  id: string;
  code: string;
  name: string;
  phone?: string;
  address?: string;
  isHeadOffice?: boolean;
}

interface TransferItemProduct {
  id: string;
  productId: string;
  quantity: number;
  serialOrImeis: string[];
  productNameKh: string;
  productNameEn: string;
  sku: string;
  barcode: string;
  unit: string;
  imageUrl?: string | null;
  salePriceUsd: number;
  costPriceUsd: number;
}

interface TransferItem {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  toBranchId: string;
  fromBranch: {
    id: string;
    name: string;
    code: string;
    phone?: string;
    address?: string;
  };
  toBranch: {
    id: string;
    name: string;
    code: string;
    phone?: string;
    address?: string;
  };
  status: "PENDING" | "APPROVED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  notes?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  items: TransferItemProduct[];
  itemCount: number;
  totalQuantity: number;
}

export default function InventoryPage() {
  const { language } = usePOSStore();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<"ITEMS" | "CATEGORIES" | "TRANSFERS">("ITEMS");
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Transfers Tab State
  const [transferSearch, setTransferSearch] = useState("");
  const [transferFilterStatus, setTransferFilterStatus] = useState("ALL");
  const [transferLoading, setTransferLoading] = useState(false);
  const [isCreateTransferModalOpen, setIsCreateTransferModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferItem | null>(null);
  const [isPrintTransferOpen, setIsPrintTransferOpen] = useState(false);
  const [transferActionLoading, setTransferActionLoading] = useState(false);

  // New Transfer Form State
  const [transferForm, setTransferForm] = useState<{
    fromBranchId: string;
    toBranchId: string;
    notes: string;
    status: "PENDING" | "IN_TRANSIT";
    items: Array<{
      productId: string;
      quantity: number;
      serialOrImeis: string[];
    }>;
  }>({
    fromBranchId: "",
    toBranchId: "",
    notes: "",
    status: "IN_TRANSIT",
    items: [{ productId: "", quantity: 1, serialOrImeis: [] }],
  });

  // Category CRUD State
  const [categoryForm, setCategoryForm] = useState({
    nameKh: "",
    nameEn: "",
    slug: "",
    icon: "tag",
  });
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showQuickAddCat, setShowQuickAddCat] = useState(false);
  const [quickCatName, setQuickCatName] = useState("");

  // Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Product Form State
  const [formData, setFormData] = useState({
    sku: "",
    barcode: "",
    nameKh: "",
    nameEn: "",
    description: "",
    categoryId: "",
    brandName: "",
    type: "STANDARD_ITEM",
    costPriceUsd: 0,
    salePriceUsd: 0,
    minStockAlert: 5,
    unit: "Pcs",
    initialStock: 0,
    imeiText: "",
  });

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      if (data.success && Array.isArray(data.branches)) {
        setBranches(data.branches);
        if (data.branches.length >= 2 && !transferForm.fromBranchId) {
          setTransferForm((prev) => ({
            ...prev,
            fromBranchId: data.branches[0].id,
            toBranchId: data.branches[1].id,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const fetchTransfers = async () => {
    try {
      setTransferLoading(true);
      const res = await fetch("/api/transfers");
      const data = await res.json();
      if (data.success && Array.isArray(data.transfers)) {
        setTransfers(data.transfers);
      }
    } catch (err) {
      console.error("Failed to load transfers:", err);
    } finally {
      setTransferLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBranches();
    fetchTransfers();
  }, []);

  // Category Handlers: Add / Update
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.nameKh.trim() && !categoryForm.nameEn.trim()) {
      alert("សូមបញ្ចូលឈ្មោះប្រភេទទំនិញ (Category name is required)!");
      return;
    }

    try {
      setCategoryLoading(true);
      const url = "/api/categories";
      const method = editingCategory ? "PUT" : "POST";
      const body = editingCategory
        ? { id: editingCategory.id, ...categoryForm }
        : categoryForm;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setCategoryForm({ nameKh: "", nameEn: "", slug: "", icon: "tag" });
      setEditingCategory(null);
      await fetchCategories();
      await fetchProducts();
    } catch (err: any) {
      alert("បរាជ័យក្នុងការរក្សាទុកប្រភេទទំនិញ: " + err.message);
    } finally {
      setCategoryLoading(false);
    }
  };

  // Quick Add Category from Product Modal
  const handleQuickAddCategory = async () => {
    if (!quickCatName.trim()) return;
    try {
      setCategoryLoading(true);
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameKh: quickCatName.trim(),
          nameEn: quickCatName.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await fetchCategories();
      await fetchProducts();

      if (data.category?.id) {
        setFormData((prev) => ({ ...prev, categoryId: data.category.id }));
      }
      setQuickCatName("");
      setShowQuickAddCat(false);
    } catch (err: any) {
      alert("Error creating category: " + err.message);
    } finally {
      setCategoryLoading(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string, name: string) => {
    if (
      !confirm(
        `តើអ្នកពិតជាចង់លុបប្រភេទទំនិញ "${name}" មែនទេ? ទំនិញក្នុងប្រភេទនេះនឹងត្រូវបានដោះលែងទៅជាប្រភេទ "ទូទៅ"`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (editingCategory?.id === id) {
        setEditingCategory(null);
        setCategoryForm({ nameKh: "", nameEn: "", slug: "", icon: "tag" });
      }

      await fetchCategories();
      await fetchProducts();
    } catch (err: any) {
      alert("បរាជ័យក្នុងការលុបប្រភេទ: " + err.message);
    }
  };

  // Transfer Handlers
  const handleOpenCreateTransferModal = () => {
    const fromId = branches[0]?.id || "";
    const toId = branches.length > 1 ? branches[1].id : "";
    setTransferForm({
      fromBranchId: fromId,
      toBranchId: toId,
      notes: "",
      status: "IN_TRANSIT",
      items: [{ productId: products[0]?.id || "", quantity: 1, serialOrImeis: [] }],
    });
    setIsCreateTransferModalOpen(true);
  };

  const handleAddTransferItemRow = () => {
    setTransferForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: products[0]?.id || "", quantity: 1, serialOrImeis: [] }],
    }));
  };

  const handleRemoveTransferItemRow = (index: number) => {
    setTransferForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleTransferItemChange = (
    index: number,
    field: "productId" | "quantity" | "serialOrImeis",
    value: any
  ) => {
    setTransferForm((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === "productId") {
        newItems[index].serialOrImeis = [];
      }
      return { ...prev, items: newItems };
    });
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.fromBranchId || !transferForm.toBranchId) {
      alert("សូមជ្រើសរើសសាខាដើម និងសាខាគោលដៅ!");
      return;
    }
    if (transferForm.fromBranchId === transferForm.toBranchId) {
      alert("សាខាដើម និងសាខាគោលដៅមិនអាចដូចគ្នាបានទេ!");
      return;
    }
    if (transferForm.items.length === 0 || transferForm.items.some((i) => !i.productId || i.quantity <= 0)) {
      alert("សូមជ្រើសរើសទំនិញ និងចំនួនផ្ទេរឲ្យបានត្រឹមត្រូវ!");
      return;
    }

    try {
      setTransferActionLoading(true);
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferForm),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert("🎉 បានបង្កើតសំណើផ្ទេរស្តុកដោយជោគជ័យ!");
      setIsCreateTransferModalOpen(false);
      await fetchTransfers();
      await fetchProducts();
    } catch (err: any) {
      alert("បរាជ័យក្នុងការផ្ទេរស្តុក: " + err.message);
    } finally {
      setTransferActionLoading(false);
    }
  };

  const handleUpdateTransferStatus = async (transferId: string, newStatus: string) => {
    const statusLabels: Record<string, string> = {
      APPROVED: "អនុម័ត",
      IN_TRANSIT: "បញ្ជូនចេញ (In Transit)",
      COMPLETED: "ទទួលទំនិញចូលស្តុក (Complete)",
      CANCELLED: "បោះបង់ (Cancel)",
    };

    if (!confirm(`តើអ្នកពិតជាចង់ប្តូរស្ថានភាពផ្ទេរទៅជា "${statusLabels[newStatus] || newStatus}" មែនទេ?`)) {
      return;
    }

    try {
      setTransferActionLoading(true);
      const res = await fetch(`/api/transfers/${transferId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await fetchTransfers();
      await fetchProducts();

      if (selectedTransfer && selectedTransfer.id === transferId) {
        setSelectedTransfer(data.transfer);
      }
    } catch (err: any) {
      alert("បរាជ័យក្នុងការកែប្រែស្ថានភាព: " + err.message);
    } finally {
      setTransferActionLoading(false);
    }
  };

  const handleDeleteTransfer = async (transferId: string, transferNumber: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបប័ណ្ណផ្ទេរ "${transferNumber}" នេះមែនទេ?`)) return;

    try {
      setTransferActionLoading(true);
      const res = await fetch(`/api/transfers/${transferId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (selectedTransfer?.id === transferId) {
        setSelectedTransfer(null);
      }
      await fetchTransfers();
    } catch (err: any) {
      alert("បរាជ័យក្នុងការលុប: " + err.message);
    } finally {
      setTransferActionLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      barcode: "",
      nameKh: "",
      nameEn: "",
      description: "",
      categoryId: categories[0]?.id || "",
      brandName: "Apple",
      type: "STANDARD_ITEM",
      costPriceUsd: 0,
      salePriceUsd: 0,
      minStockAlert: 5,
      unit: "Pcs",
      initialStock: 1,
      imeiText: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      sku: item.sku,
      barcode: item.barcode,
      nameKh: item.nameKh,
      nameEn: item.nameEn,
      description: item.description || "",
      categoryId: categories.find((c) => c.slug === item.categorySlug)?.id || "",
      brandName: item.brand || "",
      type: item.type,
      costPriceUsd: item.costPriceUsd,
      salePriceUsd: item.salePriceUsd,
      minStockAlert: item.minStock,
      unit: item.unit || "Pcs",
      initialStock: item.stockQty,
      imeiText: (item.imeiList || []).join("\n"),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameKh || !formData.sku) {
      alert("សូមបញ្ចូលឈ្មោះ និងកូដ SKU ឲ្យបានត្រឹមត្រូវ!");
      return;
    }

    try {
      setSubmitting(true);
      const imeiList = formData.imeiText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      if (editingItem) {
        // Update product
        const res = await fetch(`/api/products/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: formData.sku,
            barcode: formData.barcode,
            nameKh: formData.nameKh,
            nameEn: formData.nameEn,
            description: formData.description,
            categoryId: formData.categoryId,
            type: formData.type,
            costPriceUsd: formData.costPriceUsd,
            salePriceUsd: formData.salePriceUsd,
            minStockAlert: formData.minStockAlert,
            unit: formData.unit,
          }),
        });
        const resData = await res.json();
        if (!resData.success) throw new Error(resData.error);
      } else {
        // Create new product
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            imeiList,
          }),
        });
        const resData = await res.json();
        if (!resData.success) throw new Error(resData.error);
      }

      setIsModalOpen(false);
      await fetchProducts();
    } catch (err: any) {
      alert("បរាជ័យក្នុងការរក្សាទុក: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់លុបទំនិញ "${name}" មែនទេ?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert("បរាជ័យក្នុងការលុប: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const filteredItems = products.filter((i) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === "" ||
      i.nameKh.toLowerCase().includes(query) ||
      i.nameEn.toLowerCase().includes(query) ||
      i.sku.toLowerCase().includes(query) ||
      i.barcode.includes(query);

    const matchesCategory =
      selectedCategoryFilter === "ALL" ||
      i.categorySlug === selectedCategoryFilter ||
      categories.find((c) => c.id === selectedCategoryFilter)?.slug === i.categorySlug;

    return matchesSearch && matchesCategory;
  });

  const filteredCategories = categories.filter((c) => {
    const query = categorySearch.toLowerCase().trim();
    return (
      query === "" ||
      c.nameKh.toLowerCase().includes(query) ||
      c.nameEn.toLowerCase().includes(query) ||
      c.slug.toLowerCase().includes(query)
    );
  });

  const filteredTransfers = transfers.filter((t) => {
    const query = transferSearch.toLowerCase().trim();
    const matchesSearch =
      query === "" ||
      t.transferNumber.toLowerCase().includes(query) ||
      t.fromBranch.name.toLowerCase().includes(query) ||
      t.toBranch.name.toLowerCase().includes(query) ||
      (t.notes && t.notes.toLowerCase().includes(query)) ||
      t.items.some(
        (i) =>
          i.productNameKh.toLowerCase().includes(query) ||
          i.sku.toLowerCase().includes(query) ||
          i.serialOrImeis.some((imei) => imei.toLowerCase().includes(query))
      );

    const matchesStatus =
      transferFilterStatus === "ALL" || t.status === transferFilterStatus;

    return matchesSearch && matchesStatus;
  });

  const transferStats = {
    total: transfers.length,
    pending: transfers.filter((t) => t.status === "PENDING").length,
    inTransit: transfers.filter((t) => t.status === "IN_TRANSIT" || t.status === "APPROVED").length,
    completed: transfers.filter((t) => t.status === "COMPLETED").length,
  };

  const totalStockCost = products.reduce((acc, p) => acc + p.costPriceUsd * p.stockQty, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Package className="h-6 w-6 text-teal-700" />
            {t.inventory}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            គ្រប់គ្រងស្តុកពហុសាខា ប្រភេទទំនិញ លេខ IMEI ផ្ទេរស្តុកអន្តរសាខា និងការកែតម្រូវទំនិញ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("CATEGORIES")}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition shadow-2xs ${
              activeTab === "CATEGORIES"
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
            }`}
          >
            <Tags className="h-4 w-4" />
            <span>ប្រភេទទំនិញ ({categories.length})</span>
          </button>
          <button
            onClick={() => {
              fetchProducts();
              fetchCategories();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            title="Reload data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-teal-700 ${loading ? "animate-spin" : ""}`} />
            ផ្ទុកឡើងវិញ
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
          >
            <Plus className="h-4 w-4" />
            {t.addProduct}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab("ITEMS")}
          className={`pb-3 transition flex items-center gap-1.5 ${
            activeTab === "ITEMS"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Package className="h-4 w-4" />
          {t.productsList} ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("CATEGORIES")}
          className={`pb-3 transition flex items-center gap-1.5 ${
            activeTab === "CATEGORIES"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Tags className="h-4 w-4" />
          ប្រភេទទំនិញ / Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab("TRANSFERS")}
          className={`pb-3 transition flex items-center gap-1.5 ${
            activeTab === "TRANSFERS"
              ? "border-b-2 border-teal-700 text-teal-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          {t.stockTransfer}
        </button>
      </div>

      {/* 1. STOCK ITEMS TABLE TAB */}
      {activeTab === "ITEMS" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="flex items-center gap-2 w-full sm:w-72 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ស្វែងរកតាមឈ្មោះ SKU ឬបាកូដ..."
                  className="w-full bg-transparent text-xs focus:outline-hidden"
                />
              </div>

              {/* Category Filter Dropdown */}
              <div className="w-full sm:w-56">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-teal-700 focus:outline-hidden"
                >
                  <option value="ALL">🏷️ គ្រប់ប្រភេទទំនិញ (All Categories)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.nameKh} ({c.nameEn})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <span className="text-xs text-slate-500 shrink-0">
              សរុបតម្លៃដើមស្តុក:{" "}
              <strong className="text-slate-800 font-mono text-sm">
                ${totalStockCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
              <span className="text-xs font-semibold">កំពុងទាញទិន្នន័យពី Database...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Package className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">មិនមានទំនិញនៅក្នុងបញ្ជីទេ</p>
              <button
                onClick={openCreateModal}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> បន្ថែមទំនិញដំបូង
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">កូដ SKU & បាកូដ</th>
                    <th className="py-3 px-4">ឈ្មោះទំនិញ / គ្រឿងបន្លាស់</th>
                    <th className="py-3 px-4">ប្រភេទ</th>
                    <th className="py-3 px-4 text-right">តម្លៃដើម ($)</th>
                    <th className="py-3 px-4 text-right">តម្លៃលក់ ($)</th>
                    <th className="py-3 px-4 text-center">ស្តុកក្នុងដៃ</th>
                    <th className="py-3 px-4 text-center">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono">
                        <p className="font-bold text-slate-900">{item.sku}</p>
                        {item.barcode && <p className="text-[10px] text-slate-400">{item.barcode}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{item.nameKh}</p>
                        <p className="text-[10px] text-slate-400">{item.nameEn}</p>
                        {item.imeiList && item.imeiList.length > 0 && (
                          <p className="text-[10px] text-teal-700 font-mono mt-0.5">
                            {item.imeiList.length} IMEI ចុះបញ្ជី ({item.imeiList.slice(0, 2).join(", ")}
                            {item.imeiList.length > 2 ? "..." : ""})
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ${Number(item.costPriceUsd || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-teal-800">
                        ${Number(item.salePriceUsd || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-bold font-mono ${
                            item.stockQty <= item.minStock
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {item.stockQty} {item.unit || "Pcs"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-teal-700 transition"
                            title="កែប្រែ"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.nameKh)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            title="លុប"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. CATEGORIES MANAGEMENT TAB (ADD, UPDATE, DELETE) */}
      {activeTab === "CATEGORIES" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Add / Update Category Form */}
          <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs h-fit space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-teal-700" />
                <h3 className="text-sm font-extrabold text-slate-800">
                  {editingCategory ? "កែប្រែប្រភេទទំនិញ (Edit Category)" : "➕ បង្កើតប្រភេទទំនិញថ្មី (Add Category)"}
                </h3>
              </div>
              {editingCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ nameKh: "", nameEn: "", slug: "", icon: "tag" });
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                >
                  បោះបង់
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ឈ្មោះប្រភេទទំនិញ (ភាសាខ្មែរ) *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.nameKh}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameKh: e.target.value })}
                  placeholder="ឧ. ទូរស័ព្ទដៃ, គ្រឿងបន្សំ, គ្រឿងបន្លាស់..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ឈ្មោះជាភាសាអង់គ្លេស (English Name)
                </label>
                <input
                  type="text"
                  value={categoryForm.nameEn}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
                  placeholder="e.g. Smartphones, Accessories, Spare Parts..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  កូដសម្គាល់ (Slug / Code)
                </label>
                <input
                  type="text"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  placeholder="smartphones (ទុកទទេដើម្បីបង្កើតស្វ័យប្រវត្តិ)"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-teal-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">រូបតំណាង (Icon / Symbol)</label>
                <select
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                >
                  <option value="smartphone">📱 ទូរស័ព្ទដៃ / Smartphone</option>
                  <option value="sparkles">✨ គ្រឿងបន្សំ / Accessories</option>
                  <option value="cpu">⚙️ គ្រឿងបន្លាស់ / Spare Parts</option>
                  <option value="wrench">🔧 សេវាកម្មជួសជុល / Repair Service</option>
                  <option value="laptop">💻 កុំព្យូទ័រ / Laptop</option>
                  <option value="watch">⌚ នាឡិកាឆ្លាតវៃ / Smartwatch</option>
                  <option value="wifi">📶 ឧបករណ៍បណ្តាញ / Network</option>
                  <option value="tag">🏷️ ទូទៅ / General Tag</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm({ nameKh: "", nameEn: "", slug: "", icon: "tag" });
                    }}
                    className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    បោះបង់
                  </button>
                )}
                <button
                  type="submit"
                  disabled={categoryLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 transition shadow-xs disabled:opacity-50"
                >
                  {categoryLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingCategory ? "រក្សាទុកការកែប្រែ" : "➕ បង្កើតប្រភេទថ្មី"}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Categories List Table */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-teal-700" />
                <h3 className="text-sm font-extrabold text-slate-800">
                  បញ្ជីប្រភេទទំនិញទាំងអស់ ({categories.length})
                </h3>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-60 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="ស្វែងរកប្រភេទ..."
                  className="w-full bg-transparent text-xs focus:outline-hidden"
                />
              </div>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Tags className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">មិនមានប្រភេទទំនិញនៅក្នុងបញ្ជីទេ</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">ឈ្មោះប្រភេទ (ខ្មែរ / អង់គ្លេស)</th>
                      <th className="py-3 px-4">Slug / Code</th>
                      <th className="py-3 px-4 text-center">ចំនួនទំនិញ</th>
                      <th className="py-3 px-4 text-center">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredCategories.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-800 font-bold">
                              🏷️
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{c.nameKh}</p>
                              <p className="text-[10px] text-slate-400 font-normal">{c.nameEn || "-"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-teal-800 font-bold">
                          {c.slug}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-700">
                            {c.productCount ?? products.filter((p) => p.categorySlug === c.slug).length}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingCategory(c);
                                setCategoryForm({
                                  nameKh: c.nameKh || "",
                                  nameEn: c.nameEn || "",
                                  slug: c.slug || "",
                                  icon: c.icon || "tag",
                                });
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-teal-700 transition"
                              title="កែប្រែប្រភេទ"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(c.id, c.nameKh)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                              title="លុបប្រភេទ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. STOCK TRANSFER VIEW */}
      {activeTab === "TRANSFERS" && (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 font-bold shrink-0">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">សរុបការផ្ទេរ (Total)</p>
                <h4 className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{transferStats.total}</h4>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4.5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">រង់ចាំអនុម័ត (Pending)</p>
                <h4 className="text-xl font-extrabold text-amber-950 font-mono mt-0.5">{transferStats.pending}</h4>
              </div>
            </div>

            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4.5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-800 font-bold shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">កំពុងដឹកជញ្ជូន (In Transit)</p>
                <h4 className="text-xl font-extrabold text-sky-950 font-mono mt-0.5">{transferStats.inTransit}</h4>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4.5 shadow-xs flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">បានបញ្ចប់ (Completed)</p>
                <h4 className="text-xl font-extrabold text-emerald-950 font-mono mt-0.5">{transferStats.completed}</h4>
              </div>
            </div>
          </div>

          {/* Transfers Table Card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5 flex-wrap flex-1">
                {/* Search */}
                <div className="flex items-center gap-2 w-full sm:w-64 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    placeholder="ស្វែងរកលេខ TR, សាខា, ទំនិញ..."
                    className="w-full bg-transparent text-xs focus:outline-hidden"
                  />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  {[
                    { id: "ALL", label: "ទាំងអស់" },
                    { id: "PENDING", label: "រង់ចាំ", count: transferStats.pending },
                    { id: "IN_TRANSIT", label: "កំពុងដឹក", count: transferStats.inTransit },
                    { id: "COMPLETED", label: "ជោគជ័យ", count: transferStats.completed },
                    { id: "CANCELLED", label: "បោះបង់" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setTransferFilterStatus(s.id)}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        transferFilterStatus === s.id
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
                  onClick={fetchTransfers}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  title="Reload transfers"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-teal-700 ${transferLoading ? "animate-spin" : ""}`} />
                  ផ្ទុកឡើងវិញ
                </button>
                <button
                  onClick={handleOpenCreateTransferModal}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-teal-800 transition shadow-xs active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  បង្កើតសំណើផ្ទេរថ្មី
                </button>
              </div>
            </div>

            {transferLoading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
                <span className="text-xs font-semibold">កំពុងទាញទិន្នន័យផ្ទេរស្តុក...</span>
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ArrowRightLeft className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">មិនមានទិន្នន័យផ្ទេរស្តុកឡើយ</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ចុចប៊ូតុង &quot;បង្កើតសំណើផ្ទេរថ្មី&quot; ដើម្បីចាប់ផ្តើមផ្ទេរទំនិញ និង IMEI រវាងសាខា
                </p>
                <button
                  onClick={handleOpenCreateTransferModal}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> បង្កើតសំណើផ្ទេរដំបូង
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">លេខប័ណ្ណផ្ទេរ (Transfer #)</th>
                      <th className="py-3.5 px-4">ផ្លូវផ្ទេរ (From ➔ To)</th>
                      <th className="py-3.5 px-4">មុខទំនិញ & បរិមាណ</th>
                      <th className="py-3.5 px-4">កាលបរិច្ឆេទ & អ្នកអនុម័ត</th>
                      <th className="py-3.5 px-4 text-center">ស្ថានភាព</th>
                      <th className="py-3.5 px-4 text-right">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredTransfers.map((t) => {
                      const statusStyles: Record<string, { bg: string; text: string; label: string; icon: any }> = {
                        PENDING: {
                          bg: "bg-amber-50 border-amber-200",
                          text: "text-amber-800",
                          label: "រង់ចាំអនុម័ត",
                          icon: Clock,
                        },
                        APPROVED: {
                          bg: "bg-sky-50 border-sky-200",
                          text: "text-sky-800",
                          label: "បានអនុម័ត",
                          icon: CheckCircle2,
                        },
                        IN_TRANSIT: {
                          bg: "bg-indigo-50 border-indigo-200",
                          text: "text-indigo-800",
                          label: "កំពុងដឹកជញ្ជូន",
                          icon: Truck,
                        },
                        COMPLETED: {
                          bg: "bg-emerald-50 border-emerald-200",
                          text: "text-emerald-800",
                          label: "បានបញ្ចប់ជោគជ័យ",
                          icon: CheckCircle2,
                        },
                        CANCELLED: {
                          bg: "bg-rose-50 border-rose-200",
                          text: "text-rose-700",
                          label: "បានបោះបង់",
                          icon: AlertTriangle,
                        },
                      };

                      const currentStatus = statusStyles[t.status] || statusStyles.PENDING;
                      const StatusIcon = currentStatus.icon;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => setSelectedTransfer(t)}
                              className="font-mono font-bold text-teal-700 bg-teal-50/80 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition text-left"
                            >
                              #{t.transferNumber}
                            </button>
                            {t.notes && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                                {t.notes}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                                <Building2 className="h-3 w-3 text-slate-500" />
                                {t.fromBranch.name}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                              <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-900 border border-teal-200">
                                <MapPin className="h-3 w-3 text-teal-600" />
                                {t.toBranch.name}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">
                              {t.itemCount} មុខទំនិញ ({t.totalQuantity} ឯកតា)
                            </p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                              {t.items.map((i) => `${i.productNameKh} (x${i.quantity})`).join(", ")}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            <p className="font-mono text-[11px]">
                              {new Date(t.createdAt).toLocaleDateString("km-KH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              ដោយ: <span className="font-bold text-slate-600">{t.approvedBy || "Admin"}</span>
                            </p>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${currentStatus.bg} ${currentStatus.text}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {currentStatus.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => setSelectedTransfer(t)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                                title="មើលព័ត៌មានលម្អិត"
                              >
                                <Eye className="h-3 w-3 text-teal-700" />
                                លម្អិត
                              </button>

                              {t.status === "PENDING" && (
                                <button
                                  onClick={() => handleUpdateTransferStatus(t.id, "IN_TRANSIT")}
                                  disabled={transferActionLoading}
                                  className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-sky-700 transition shadow-2xs"
                                  title="អនុម័ត & បញ្ជូនចេញ"
                                >
                                  <Truck className="h-3 w-3" />
                                  បញ្ជូន
                                </button>
                              )}

                              {t.status === "IN_TRANSIT" && (
                                <button
                                  onClick={() => handleUpdateTransferStatus(t.id, "COMPLETED")}
                                  disabled={transferActionLoading}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition shadow-2xs"
                                  title="ទទួលទំនិញចូលស្តុក"
                                >
                                  <Check className="h-3 w-3" />
                                  ទទួល
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedTransfer(t);
                                  setIsPrintTransferOpen(true);
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                title="បោះពុម្ពប័ណ្ណផ្ទេរ"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
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

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-extrabold text-slate-800">
                {editingItem ? "កែប្រែទិន្នន័យទំនិញ" : "បង្កើតទំនិញថ្មី (Add Product)"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ឈ្មោះទំនិញ (ភាសាខ្មែរ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nameKh}
                    onChange={(e) => setFormData({ ...formData, nameKh: e.target.value })}
                    placeholder="ឧ. iPhone 15 Pro Max 256GB"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ឈ្មោះជាភាសាអង់គ្លេស
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder="e.g. iPhone 15 Pro Max 256GB Natural"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">កូដ SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-teal-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">លេខបាកូដ (Barcode)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="885909123456"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-teal-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ប្រភេទទំនិញ (Type)</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                  >
                    <option value="STANDARD_ITEM">ទំនិញស្តង់ដារ (Standard Product)</option>
                    <option value="SERIAL_IMEI_ITEM">ទំនិញមានលេខ IMEI / Serial (Phone/Laptop)</option>
                    <option value="SPARE_PART">គ្រឿងបន្លាស់ជួសជុល (Spare Part)</option>
                    <option value="SERVICE_LABOR">សេវាកម្ម / ពលកម្ម (Labor Service)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">ប្រភេទក្រុម (Category)</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddCat(!showQuickAddCat)}
                      className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 text-[11px]"
                    >
                      <Plus className="h-3 w-3" />
                      បន្ថែមប្រភេទថ្មី
                    </button>
                  </div>

                  {showQuickAddCat ? (
                    <div className="flex items-center gap-1.5 p-1.5 bg-teal-50/80 border border-teal-200 rounded-xl mb-1.5">
                      <input
                        type="text"
                        placeholder="ឈ្មោះប្រភេទថ្មី..."
                        value={quickCatName}
                        onChange={(e) => setQuickCatName(e.target.value)}
                        className="flex-1 bg-white border border-teal-300 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddCategory}
                        disabled={categoryLoading}
                        className="bg-teal-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg hover:bg-teal-800 disabled:opacity-50"
                      >
                        {categoryLoading ? "..." : "បង្កើត"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddCat(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}

                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                  >
                    <option value="">ជ្រើសរើសប្រភេទ...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameKh} ({c.nameEn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">តម្លៃដើមទិញចូល ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPriceUsd}
                    onChange={(e) =>
                      setFormData({ ...formData, costPriceUsd: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-teal-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">តម្លៃលក់ចេញ ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.salePriceUsd}
                    onChange={(e) =>
                      setFormData({ ...formData, salePriceUsd: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold text-teal-800 focus:border-teal-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ស្តុកដាស់តឿនទាបបំផុត</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStockAlert}
                    onChange={(e) =>
                      setFormData({ ...formData, minStockAlert: parseInt(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-teal-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ខ្នាតគិត (Unit)</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Pcs, Box, Set"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                  />
                </div>
              </div>

              {!editingItem && formData.type !== "SERIAL_IMEI_ITEM" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">បរិមាណស្តុកដំបូង</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.initialStock}
                    onChange={(e) =>
                      setFormData({ ...formData, initialStock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-teal-700 focus:outline-hidden"
                  />
                </div>
              )}

              {!editingItem && formData.type === "SERIAL_IMEI_ITEM" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    បញ្ជីលេខ IMEI / Serial Number (១ បន្ទាត់ = ១ គ្រឿង)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.imeiText}
                    onChange={(e) => setFormData({ ...formData, imeiText: e.target.value })}
                    placeholder="358921098471923&#10;358921098471924"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-teal-700 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  {editingItem ? "រក្សាទុកការកែប្រែ" : "បង្កើតទំនិញថ្មី"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE STOCK TRANSFER MODAL */}
      {isCreateTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 font-bold">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    បង្កើតសំណើផ្ទេរស្តុកអន្តរសាខា (New Stock Transfer)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ផ្ទេរទំនិញ និងលេខ IMEI ពីសាខាដើម ទៅកាន់សាខាគោលដៅ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateTransferModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              {/* Branch Route Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    🏢 សាខាដើម (From Origin Branch) *
                  </label>
                  <select
                    required
                    value={transferForm.fromBranchId}
                    onChange={(e) => setTransferForm({ ...transferForm, fromBranchId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-teal-700 focus:outline-hidden"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code}){b.isHeadOffice ? " [HQ]" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    📍 សាខាគោលដៅ (To Destination Branch) *
                  </label>
                  <select
                    required
                    value={transferForm.toBranchId}
                    onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-teal-700 focus:outline-hidden"
                  >
                    <option value="">ជ្រើសរើសសាខាគោលដៅ...</option>
                    {branches
                      .filter((b) => b.id !== transferForm.fromBranchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-teal-700" />
                    មុខទំនិញដែលត្រូវផ្ទេរ (Transfer Items)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTransferItemRow}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    បន្ថែមមុខទំនិញ
                  </button>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {transferForm.items.map((row, idx) => {
                    const selectedProd = products.find((p) => p.id === row.productId);
                    const isSerialized = selectedProd?.type === "SERIAL_IMEI_ITEM";
                    const availableImeis = selectedProd?.imeiList || [];

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <select
                              required
                              value={row.productId}
                              onChange={(e) => handleTransferItemChange(idx, "productId", e.target.value)}
                              className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-800 focus:border-teal-700 focus:outline-hidden"
                            >
                              <option value="">ជ្រើសរើសទំនិញ...</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nameKh} ({p.sku}) — ស្តុក: {p.stockQty} {p.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-24">
                            <input
                              type="number"
                              min="1"
                              max={isSerialized ? availableImeis.length || 1 : selectedProd?.stockQty || 999}
                              value={row.quantity}
                              onChange={(e) =>
                                handleTransferItemChange(
                                  idx,
                                  "quantity",
                                  Math.max(1, parseInt(e.target.value) || 1)
                                )
                              }
                              placeholder="ចំនួន"
                              className="w-full rounded-xl border border-slate-200 p-2 text-xs font-mono font-bold text-center focus:border-teal-700 focus:outline-hidden"
                            />
                          </div>

                          {transferForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTransferItemRow(idx)}
                              className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* IMEI Selection Chips for serialized products */}
                        {isSerialized && availableImeis.length > 0 && (
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-1">
                            <p className="text-[10px] font-bold text-slate-500">
                              ជ្រើសរើសលេខ IMEI ដែលត្រូវផ្ទេរ (បានជ្រើស: {row.serialOrImeis.length}/{row.quantity}):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {availableImeis.map((imei) => {
                                const isChecked = row.serialOrImeis.includes(imei);
                                return (
                                  <button
                                    key={imei}
                                    type="button"
                                    onClick={() => {
                                      const newImeis = isChecked
                                        ? row.serialOrImeis.filter((i) => i !== imei)
                                        : [...row.serialOrImeis, imei];
                                      handleTransferItemChange(idx, "serialOrImeis", newImeis);
                                      handleTransferItemChange(idx, "quantity", newImeis.length || 1);
                                    }}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition border ${
                                      isChecked
                                        ? "bg-teal-700 text-white border-teal-800 font-bold shadow-2xs"
                                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    {isChecked ? "✓ " : "+ "}{imei}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status and Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    ដំណើរការផ្ទេរ (Initial Status)
                  </label>
                  <select
                    value={transferForm.status}
                    onChange={(e) => setTransferForm({ ...transferForm, status: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 focus:border-teal-700 focus:outline-hidden"
                  >
                    <option value="IN_TRANSIT">🚚 បញ្ជូនចេញភ្លាមៗ (Instant Dispatch - In Transit)</option>
                    <option value="PENDING">⏳ រក្សាទុកជាសំណើរង់ចាំអនុម័ត (Save as Pending)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    កំណត់សម្គាល់ / ហេតុផលផ្ទេរ
                  </label>
                  <input
                    type="text"
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                    placeholder="ឧ. ផ្ទេរទំនិញបន្ថែមសម្រាប់ចុងសប្តាហ៍..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-700 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTransferModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={transferActionLoading}
                  className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 transition active:scale-95 disabled:opacity-50 shadow-xs"
                >
                  {transferActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  បញ្ជាក់ការផ្ទេរស្តុក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER DETAIL MODAL */}
      {selectedTransfer && !isPrintTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-extrabold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                  #{selectedTransfer.transferNumber}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  ព័ត៌មានលម្អិតនៃការផ្ទេរស្តុក
                </h3>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Route & Status Stepper */}
            <div className="rounded-2xl bg-gradient-to-r from-teal-50/70 via-slate-50 to-indigo-50/70 p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-800 font-bold shadow-2xs border border-slate-200">
                    <Store className="h-4 w-4 text-teal-700" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">សាខាដើម (From)</p>
                    <p className="font-bold text-slate-900">{selectedTransfer.fromBranch.name}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-mono font-bold text-teal-700 bg-white px-2 py-0.5 rounded-full border border-teal-200 shadow-2xs">
                    {selectedTransfer.status}
                  </span>
                  <ArrowRight className="h-4 w-4 text-teal-600 my-0.5" />
                </div>

                <div className="flex items-center gap-2 text-right">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">សាខាគោលដៅ (To)</p>
                    <p className="font-bold text-slate-900">{selectedTransfer.toBranch.name}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-800 font-bold shadow-2xs border border-slate-200">
                    <MapPin className="h-4 w-4 text-indigo-700" />
                  </div>
                </div>
              </div>

              {selectedTransfer.notes && (
                <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                  <span className="font-bold">កំណត់សម្គាល់:</span> {selectedTransfer.notes}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>បញ្ជីទំនិញក្នុងប័ណ្ណផ្ទេរ ({selectedTransfer.itemCount} មុខ)</span>
                <span className="font-mono text-teal-800 font-extrabold">
                  សរុប: {selectedTransfer.totalQuantity} ឯកតា
                </span>
              </h4>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">មុខទំនិញ</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-center">បរិមាណ</th>
                      <th className="py-2.5 px-3">លេខ IMEI / Serials</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {selectedTransfer.items.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {item.productNameKh}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                          {item.sku}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-teal-800">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.serialOrImeis?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {item.serialOrImeis.map((imei, idx) => (
                                <span
                                  key={idx}
                                  className="font-mono text-[9px] bg-slate-100 border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold"
                                >
                                  {imei}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">ទំនិញស្តង់ដារ</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workflow Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
              <button
                type="button"
                onClick={() => setIsPrintTransferOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <Printer className="h-4 w-4 text-slate-500" />
                បោះពុម្ពប័ណ្ណផ្ទេរ (Waybill)
              </button>

              <div className="flex items-center gap-2">
                {selectedTransfer.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateTransferStatus(selectedTransfer.id, "CANCELLED")}
                      disabled={transferActionLoading}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      បោះបង់សំណើ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTransferStatus(selectedTransfer.id, "IN_TRANSIT")}
                      disabled={transferActionLoading}
                      className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 transition active:scale-95 shadow-xs"
                    >
                      <Truck className="h-4 w-4" />
                      អនុម័ត & បញ្ជូនចេញ
                    </button>
                  </>
                )}

                {selectedTransfer.status === "IN_TRANSIT" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateTransferStatus(selectedTransfer.id, "CANCELLED")}
                      disabled={transferActionLoading}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      បោះបង់ & ត្រឡប់ស្តុក
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateTransferStatus(selectedTransfer.id, "COMPLETED")}
                      disabled={transferActionLoading}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition active:scale-95 shadow-xs"
                    >
                      <Check className="h-4 w-4" />
                      ទទួលទំនិញចូលស្តុក
                    </button>
                  </>
                )}

                {(selectedTransfer.status === "CANCELLED" || selectedTransfer.status === "PENDING") && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTransfer(selectedTransfer.id, selectedTransfer.transferNumber)}
                    disabled={transferActionLoading}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                    title="លុបប័ណ្ណផ្ទេរ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE TRANSFER WAYBILL SLIP */}
      {isPrintTransferOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95 my-8 space-y-6 print:m-0 print:p-0 print:shadow-none">
            {/* Action Bar (hidden in print) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Printer className="h-4 w-4 text-teal-700" />
                ទម្រង់ប័ណ្ណផ្ទេរស្តុក (Printable Stock Transfer Slip)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-teal-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-teal-800 transition"
                >
                  បោះពុម្ពឥឡូវនេះ (Print)
                </button>
                <button
                  onClick={() => setIsPrintTransferOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Waybill Sheet */}
            <div className="border border-slate-300 p-6 rounded-2xl font-sans text-slate-900 space-y-4">
              <div className="text-center border-b border-slate-200 pb-3 space-y-1">
                <h2 className="text-lg font-black text-slate-900">អាណាចក្រPOS • ANACHAK POS</h2>
                <h3 className="text-sm font-extrabold text-teal-800 uppercase tracking-wide">
                  ប័ណ្ណផ្ទេរស្តុកអន្តរសាខា (STOCK TRANSFER NOTE)
                </h3>
                <p className="font-mono text-xs font-bold text-slate-700">
                  លេខប័ណ្ណ: #{selectedTransfer.transferNumber}
                </p>
                <p className="text-[10px] text-slate-400">
                  កាលបរិច្ឆេទ: {new Date(selectedTransfer.createdAt).toLocaleString("km-KH")}
                </p>
              </div>

              {/* Branch Routing Box */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <p className="font-bold text-slate-500 uppercase text-[10px]">សាខាដើម (From Origin):</p>
                  <p className="font-black text-slate-900 text-sm">{selectedTransfer.fromBranch.name}</p>
                  <p className="text-[11px] text-slate-500">ទូរស័ព្ទ: {selectedTransfer.fromBranch.phone || "-"}</p>
                  <p className="text-[11px] text-slate-500">{selectedTransfer.fromBranch.address || "ភ្នំពេញ"}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500 uppercase text-[10px]">សាខាគោលដៅ (To Destination):</p>
                  <p className="font-black text-slate-900 text-sm">{selectedTransfer.toBranch.name}</p>
                  <p className="text-[11px] text-slate-500">ទូរស័ព្ទ: {selectedTransfer.toBranch.phone || "-"}</p>
                  <p className="text-[11px] text-slate-500">{selectedTransfer.toBranch.address || "-"}</p>
                </div>
              </div>

              {/* Items List */}
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-bold text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5 border-r border-slate-200">ល.រ</th>
                    <th className="py-2 px-2.5 border-r border-slate-200">មុខទំនិញ / SKU</th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-200">បរិមាណ</th>
                    <th className="py-2 px-2.5">លេខ IMEI / Serial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {selectedTransfer.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <p className="font-bold text-slate-900">{item.productNameKh}</p>
                        <p className="font-mono text-[10px] text-slate-500">{item.sku}</p>
                      </td>
                      <td className="py-2 px-2.5 text-center border-r border-slate-200 font-mono font-bold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[10px]">
                        {item.serialOrImeis?.length ? item.serialOrImeis.join(", ") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedTransfer.notes && (
                <p className="text-xs text-slate-600">
                  <span className="font-bold">កំណត់សម្គាល់:</span> {selectedTransfer.notes}
                </p>
              )}

              {/* Signatures Section */}
              <div className="grid grid-cols-3 gap-3 pt-8 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-800">អ្នកប្រគល់ទំនិញ</p>
                  <p className="text-[10px] text-slate-400">(Sender / Dispatched by)</p>
                  <div className="mt-12 border-t border-slate-300 mx-4"></div>
                </div>
                <div>
                  <p className="font-bold text-slate-800">អ្នកដឹកជញ្ជូន</p>
                  <p className="text-[10px] text-slate-400">(Driver / Transporter)</p>
                  <div className="mt-12 border-t border-slate-300 mx-4"></div>
                </div>
                <div>
                  <p className="font-bold text-slate-800">អ្នកទទួលទំនិញ</p>
                  <p className="text-[10px] text-slate-400">(Receiver / Checked by)</p>
                  <div className="mt-12 border-t border-slate-300 mx-4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
