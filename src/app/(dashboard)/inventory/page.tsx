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

export default function InventoryPage() {
  const { language } = usePOSStore();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<"ITEMS" | "CATEGORIES" | "TRANSFERS">("ITEMS");
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <ArrowRightLeft className="h-10 w-10 mx-auto text-teal-700 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">ការផ្ទេរស្តុកអន្តរសាខា</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            ផ្ទេរផលិតផល និង IMEI រវាងសាខា ភ្នំពេញ សៀមរាប និងបាត់ដំបង ដោយមានលេខកូដ TR ច្បាស់លាស់
          </p>
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
    </div>
  );
}
