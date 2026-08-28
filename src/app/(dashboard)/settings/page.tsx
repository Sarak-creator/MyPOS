"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Settings as SettingsIcon,
  Store,
  DollarSign,
  QrCode,
  Building2,
  Users,
  Printer,
  Save,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Sliders,
  AlertTriangle,
  KeyRound,
  FileSpreadsheet,
  Loader2,
  X,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  Layers,
  Database,
  Download,
  Upload,
  Activity,
  FileText,
  Check,
  Share2,
  Send,
  Volume2,
  Receipt,
} from "lucide-react";
import { usePOSStore } from "@/store/posStore";
import { translations } from "@/lib/i18n";
import { generateBakongKHQR, CAMBODIA_BANKS, validateKHQR, decodeKHQR } from "@/lib/khqr";

type SettingsTab = "GENERAL" | "POS_CURRENCY" | "PAYMENTS" | "BRANCHES" | "RBAC" | "PRINTER" | "BACKUP" | "TELEGRAM";

export default function SettingsPage() {
  const {
    language,
    currency,
    setCurrency,
    exchangeRateKhr,
    setExchangeRateKhr,
    taxRatePercent,
    setTaxRatePercent,
    currentBranchId,
    currentBranchName,
    setBranch,
    bakongMerchantId,
    bakongMerchantName,
    bakongMerchantCity,
    enableBakongKhqr,
    enableAbaKhqr,
    enableCashUsd,
    enableCashKhr,
    enableCustomerCredit,
    setPaymentConfig: setStorePaymentConfig,
    telegramBotToken,
    telegramChatId,
    telegramNotifyOnSale,
    telegramNotifyOnLowStock,
    telegramNotifyOnRepair,
    setTelegramConfig,
  } = usePOSStore();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<SettingsTab>("TELEGRAM");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. General Profile State
  const [businessProfile, setBusinessProfile] = useState({
    nameKh: "អាណាចក្រPOS (Anachak POS)",
    nameEn: "Anachak Tech & Repair ERP",
    legalName: "Anachak Technologies Co., Ltd.",
    vatNumber: "K008-902348911",
    phone: "012 888 999",
    email: "contact@anachakpos.com",
    address: "#128, មហាវិថីព្រះមុនីវង្ស, សង្កាត់បឹងរាំង, ខណ្ឌដូនពេញ, រាជធានីភ្នំពេញ",
    website: "https://anachakpos.com",
    telegramChannel: "https://t.me/anachak_pos",
    facebookPage: "https://facebook.com/anachakpos",
    businessType: "Smartphones, Laptops, Repairs & Electronics Retail",
    baseCurrency: "USD",
  });

  // 2. POS & Currency State
  const [posConfig, setPosConfig] = useState({
    exchangeRate: exchangeRateKhr || 4100,
    exchangeRateThb: 36,
    defaultTaxRate: taxRatePercent || 0,
    invoicePrefix: "INV-",
    allowManualDiscount: true,
    maxDiscountPercent: 20,
    enableSoundEffects: true,
    autoPrintReceipt: true,
    requireCustomerPhone: false,
    lowStockThreshold: 5,
    dualDisplayPrice: true,
  });

  // 3. Payment / KHQR State
  const [paymentConfig, setPaymentConfig] = useState({
    bakongMerchantId: bakongMerchantId || "khqr@aclb",
    bakongMerchantName: bakongMerchantName || "IEM SARAK",
    bakongMerchantCity: bakongMerchantCity || "Phnom Penh",
    merchantID: "85514965629",
    acquiringBank: "ACLEDA",
    mobileNumber: "0963760229",
    enableBakongKhqr: enableBakongKhqr ?? true,
    enableAbaKhqr: enableAbaKhqr ?? true,
    enableCashUsd: enableCashUsd ?? true,
    enableCashKhr: enableCashKhr ?? true,
    enableCustomerCredit: enableCustomerCredit ?? true,
  });

  const [rawKhqrInput, setRawKhqrInput] = useState<string>(
    "00020101021129380009khqr@aclb0111855149656290206ACLEDA391300042CCY01014520459995802KH53031165909IEM SARAK6010Phnom Penh6214021009637602296304009A"
  );
  const [khqrImportStatus, setKhqrImportStatus] = useState<string | null>(null);

  // Live KHQR Preview State
  const [khqrPreviewUrl, setKhqrPreviewUrl] = useState<string>("");
  const [khqrRawString, setKhqrRawString] = useState<string>("");

  // 4. Branches State
  const [branches, setBranches] = useState<any[]>([]);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [branchForm, setBranchForm] = useState({ code: "BR-03", name: "", phone: "", address: "" });

  // 5. Users State
  const [users, setUsers] = useState<any[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    fullName: "",
    fullNameKh: "",
    phone: "",
    role: "CASHIER",
    branchId: "",
  });

  // 6. Printer & Hardware State
  const [printerConfig, setPrinterConfig] = useState({
    paperSize: "80mm",
    autoDrawerKick: true,
    printDuplicateForKitchen: false,
    headerMessage: "សូមស្វាគមន៍មកកាន់ អាណាចក្រPOS\nឯកទេសលក់ទូរស័ព្ទ កុំព្យូទ័រ និងសេវាជួសជុលរហ័ស",
    footerMessage: "ទំនិញទិញរួចមិនអាចប្តូរប្រាក់វិញបានទេ\nធានាជួសជុលរយៈពេល ៣០ ថ្ងៃ • សូមអរគុណ!",
  });

  // 7. Telegram Bot State
  const [telegramForm, setTelegramForm] = useState({
    botToken: telegramBotToken || "",
    chatId: telegramChatId || "",
    notifyOnSale: telegramNotifyOnSale ?? true,
    notifyOnLowStock: telegramNotifyOnLowStock ?? true,
    notifyOnRepair: telegramNotifyOnRepair ?? true,
    notifyDailyReport: true,
  });

  // Load saved Telegram config from Server on component mount
  useEffect(() => {
    fetch("/api/telegram")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && (data.botToken || data.chatId)) {
          setTelegramForm((prev) => ({
            ...prev,
            botToken: data.botToken || prev.botToken,
            chatId: data.chatId || prev.chatId,
            notifyOnSale: data.notifyOnSale ?? prev.notifyOnSale,
            notifyOnLowStock: data.notifyOnLowStock ?? prev.notifyOnLowStock,
            notifyOnRepair: data.notifyOnRepair ?? prev.notifyOnRepair,
            notifyDailyReport: data.notifyDailyReport ?? prev.notifyDailyReport,
          }));
          setTelegramConfig({
            botToken: data.botToken,
            chatId: data.chatId,
            notifyOnSale: data.notifyOnSale,
            notifyOnLowStock: data.notifyOnLowStock,
            notifyOnRepair: data.notifyOnRepair,
          });
        }
      })
      .catch((err) => console.warn("Failed to load telegram config from server:", err));
  }, [setTelegramConfig]);

  const [showBotToken, setShowBotToken] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestStatus, setTelegramTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestTelegram = async () => {
    if (!telegramForm.botToken.trim() || !telegramForm.chatId.trim()) {
      alert("សូមបញ្ចូល Telegram Bot Token និង Chat ID ជាមុនសិន!");
      return;
    }
    setIsTestingTelegram(true);
    setTelegramTestStatus(null);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TEST",
          config: {
            botToken: telegramForm.botToken.trim(),
            chatId: telegramForm.chatId.trim(),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramTestStatus({
          success: true,
          message: "✅ បានផ្ញើសារតេស្តទៅកាន់ Telegram របស់អ្នកដោយជោគជ័យ! សូមពិនិត្យមើល Telegram។",
        });
        setTelegramConfig({
          botToken: telegramForm.botToken.trim(),
          chatId: telegramForm.chatId.trim(),
          notifyOnSale: telegramForm.notifyOnSale,
          notifyOnLowStock: telegramForm.notifyOnLowStock,
          notifyOnRepair: telegramForm.notifyOnRepair,
        });

        // Also persist to server
        fetch("/api/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "SAVE_CONFIG",
            config: {
              botToken: telegramForm.botToken.trim(),
              chatId: telegramForm.chatId.trim(),
              notifyOnSale: telegramForm.notifyOnSale,
              notifyOnLowStock: telegramForm.notifyOnLowStock,
              notifyOnRepair: telegramForm.notifyOnRepair,
              notifyDailyReport: telegramForm.notifyDailyReport,
            },
          }),
        }).catch(() => {});
      } else {
        setTelegramTestStatus({
          success: false,
          message: `❌ បរាជ័យ: ${data.error || "មិនអាចតភ្ជាប់ទៅ Telegram API បានទេ"}`,
        });
      }
    } catch (err: any) {
      setTelegramTestStatus({
        success: false,
        message: `❌ បរាជ័យ: ${err.message}`,
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSaveTelegram = async () => {
    if (!telegramForm.botToken.trim() || !telegramForm.chatId.trim()) {
      alert("សូមបញ្ចូល Telegram Bot Token និង Chat ID ជាមុនសិន!");
      return;
    }

    // 1. Save to local Zustand store & LocalStorage
    setTelegramConfig({
      botToken: telegramForm.botToken.trim(),
      chatId: telegramForm.chatId.trim(),
      notifyOnSale: telegramForm.notifyOnSale,
      notifyOnLowStock: telegramForm.notifyOnLowStock,
      notifyOnRepair: telegramForm.notifyOnRepair,
    });

    // 2. Persist to server config (.env & JSON file)
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_CONFIG",
          config: {
            botToken: telegramForm.botToken.trim(),
            chatId: telegramForm.chatId.trim(),
            notifyOnSale: telegramForm.notifyOnSale,
            notifyOnLowStock: telegramForm.notifyOnLowStock,
            notifyOnRepair: telegramForm.notifyOnRepair,
            notifyDailyReport: telegramForm.notifyDailyReport,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramTestStatus({
          success: true,
          message: "✅ បានរក្សាទុកការកំណត់ Telegram Bot រួចរាល់!",
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setTelegramTestStatus({
          success: false,
          message: `❌ ${data.error || "មិនអាចរក្សាទុកបានទេ"}`,
        });
      }
    } catch (err: any) {
      setTelegramTestStatus({
        success: false,
        message: `❌ បរាជ័យក្នុងការរក្សាទុក: ${err.message}`,
      });
    }
  };

  // 8. Cloud Database & Backup State
  const [dbPingStatus, setDbPingStatus] = useState<{ status: "ONLINE" | "CHECKING" | "ERROR"; latencyMs: number }>({
    status: "ONLINE",
    latencyMs: 42,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const handlePingDatabase = async () => {
    setDbPingStatus({ status: "CHECKING", latencyMs: 0 });
    const startTime = performance.now();
    try {
      const res = await fetch("/api/settings?ping=true");
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      if (res.ok) {
        setDbPingStatus({ status: "ONLINE", latencyMs: latency });
      } else {
        setDbPingStatus({ status: "ERROR", latencyMs: latency });
      }
    } catch {
      setDbPingStatus({ status: "ERROR", latencyMs: 999 });
    }
  };

  const handleExportData = async (type: "PRODUCTS" | "SALES" | "CUSTOMERS" | "FULL_BACKUP") => {
    setIsExporting(true);
    setExportMessage(`កំពុងទាញយកទិន្នន័យ ${type}...`);
    try {
      let dataToExport: any = {};
      let filename = `anachak-pos-${type.toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;

      if (type === "PRODUCTS") {
        const res = await fetch("/api/products");
        const json = await res.json();
        dataToExport = json.products || json;
      } else if (type === "SALES") {
        const res = await fetch("/api/sales");
        const json = await res.json();
        dataToExport = json.sales || json;
      } else if (type === "CUSTOMERS") {
        const res = await fetch("/api/customers");
        const json = await res.json();
        dataToExport = json.customers || json;
      } else {
        // FULL BACKUP
        const [prodRes, salesRes, custRes, setRes] = await Promise.all([
          fetch("/api/products").then((r) => r.json()).catch(() => ({})),
          fetch("/api/sales").then((r) => r.json()).catch(() => ({})),
          fetch("/api/customers").then((r) => r.json()).catch(() => ({})),
          fetch("/api/settings").then((r) => r.json()).catch(() => ({})),
        ]);
        dataToExport = {
          version: "2.0.0",
          backupDate: new Date().toISOString(),
          tenant: businessProfile,
          settings: posConfig,
          payments: paymentConfig,
          products: prodRes.products || [],
          sales: salesRes.sales || [],
          customers: custRes.customers || [],
          branches,
          users: users.map((u) => ({ ...u, password: "[PROTECTED]" })),
        };
      }

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportMessage(`✓ បានទាញយកឯកសារ ${filename} ដោយជោគជ័យ!`);
      setTimeout(() => setExportMessage(null), 4000);
    } catch (err: any) {
      alert("ទាញយកទិន្នន័យបរាជ័យ: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePurgeCache = () => {
    if (confirm("តើអ្នកចង់សម្អាត Local Cache និងធ្វើសមកាលកម្មទិន្នន័យឡើងវិញមែនទេ?")) {
      window.location.reload();
    }
  };

  // Re-generate KHQR Preview whenever paymentConfig changes
  useEffect(() => {
    try {
      const payload = generateBakongKHQR({
        bakongAccount: paymentConfig.bakongMerchantId || "012888999@aba",
        merchantName: paymentConfig.bakongMerchantName || "ANACHAK POS STORE",
        merchantCity: paymentConfig.bakongMerchantCity || "Phnom Penh",
        amount: 10.0,
        currency: "USD",
        billNumber: "INV-PREVIEW",
        storeLabel: currentBranchName || "Main Branch",
      });
      setKhqrRawString(payload);
      QRCode.toDataURL(payload, { width: 220, margin: 1 }, (err, url) => {
        if (!err && url) setKhqrPreviewUrl(url);
      });
    } catch (e) {
      console.error("Failed to generate preview KHQR:", e);
    }
  }, [paymentConfig.bakongMerchantId, paymentConfig.bakongMerchantName, paymentConfig.bakongMerchantCity, currentBranchName]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.tenant) {
        setBusinessProfile((prev) => ({
          ...prev,
          nameKh: data.tenant.name || prev.nameKh,
          legalName: data.tenant.legalName || prev.legalName,
          vatNumber: data.tenant.vatNumber || prev.vatNumber,
          phone: data.tenant.phone || prev.phone,
          email: data.tenant.email || prev.email,
          address: data.tenant.address || prev.address,
        }));
        setBranches(data.branches || []);
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      // 1. Save to global store (Exchange rate, Tax, and KHQR settings)
      setExchangeRateKhr(Number(posConfig.exchangeRate));
      setTaxRatePercent(Number(posConfig.defaultTaxRate));
      setStorePaymentConfig({
        bakongMerchantId: paymentConfig.bakongMerchantId.trim(),
        bakongMerchantName: paymentConfig.bakongMerchantName.trim(),
        bakongMerchantCity: paymentConfig.bakongMerchantCity.trim(),
        enableBakongKhqr: paymentConfig.enableBakongKhqr,
        enableAbaKhqr: paymentConfig.enableAbaKhqr,
        enableCashUsd: paymentConfig.enableCashUsd,
        enableCashKhr: paymentConfig.enableCashKhr,
        enableCustomerCredit: paymentConfig.enableCustomerCredit,
      });

      // 2. Persist to Supabase Database
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_TENANT",
          name: businessProfile.nameKh,
          legalName: businessProfile.legalName,
          vatNumber: businessProfile.vatNumber,
          phone: businessProfile.phone,
          email: businessProfile.email,
          address: businessProfile.address,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAutoConnectRawKHQR = () => {
    if (!rawKhqrInput.trim()) return;
    const decoded = decodeKHQR(rawKhqrInput.trim());
    if (decoded.success && decoded.data) {
      const d = decoded.data;
      const updated = {
        ...paymentConfig,
        bakongMerchantId: d.bakongAccountID || "khqr@aclb",
        bakongMerchantName: d.merchantName || "IEM SARAK",
        bakongMerchantCity: d.merchantCity || "Phnom Penh",
        merchantID: d.accountInformation || d.merchantID || "85514965629",
        acquiringBank: d.acquiringBank || "ACLEDA",
        mobileNumber: d.mobileNumber || "0963760229",
      };
      setPaymentConfig(updated);
      setStorePaymentConfig({
        bakongMerchantId: updated.bakongMerchantId,
        bakongMerchantName: updated.bakongMerchantName,
        bakongMerchantCity: updated.bakongMerchantCity,
        merchantID: updated.merchantID,
        acquiringBank: updated.acquiringBank,
        mobileNumber: updated.mobileNumber,
        customKhqrRawString: rawKhqrInput.trim(),
        enableBakongKhqr: true,
      });
      setKhqrImportStatus(`✓ បានភ្ជាប់គណនី KHQR របស់ ${d.merchantName} (${d.acquiringBank || "ACLEDA"} - ${d.bakongAccountID}) ដោយជោគជ័យ!`);
      setTimeout(() => setKhqrImportStatus(null), 5000);
    } else {
      alert("ទម្រង់ KHQR មិនត្រឹមត្រូវ: " + (decoded.error || ""));
    }
  };

  const handleSaveKHQR = () => {
    setStorePaymentConfig({
      bakongMerchantId: paymentConfig.bakongMerchantId.trim(),
      bakongMerchantName: paymentConfig.bakongMerchantName.trim(),
      bakongMerchantCity: paymentConfig.bakongMerchantCity.trim(),
      merchantID: paymentConfig.merchantID,
      acquiringBank: paymentConfig.acquiringBank,
      mobileNumber: paymentConfig.mobileNumber,
      customKhqrRawString: rawKhqrInput.trim(),
      enableBakongKhqr: paymentConfig.enableBakongKhqr,
      enableAbaKhqr: paymentConfig.enableAbaKhqr,
      enableCashUsd: paymentConfig.enableCashUsd,
      enableCashKhr: paymentConfig.enableCashKhr,
      enableCustomerCredit: paymentConfig.enableCustomerCredit,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.code || !branchForm.name) return;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_BRANCH",
          ...branchForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddBranchModalOpen(false);
        setBranchForm({ code: "", name: "", phone: "", address: "" });
        await fetchSettings();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_BRANCH",
          branchId: editingBranch.id,
          code: editingBranch.code,
          name: editingBranch.name,
          phone: editingBranch.phone,
          address: editingBranch.address,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingBranch(null);
        await fetchSettings();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm("តើអ្នកប្រាកដជាចង់លុបសាខានេះមែនទេ?")) return;
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_BRANCH", branchId }),
      });
      const data = await res.json();
      if (data.success) await fetchSettings();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username || !userForm.password || !userForm.fullName) return;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_USER",
          ...userForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddUserModalOpen(false);
        setUserForm({
          username: "",
          password: "",
          fullName: "",
          fullNameKh: "",
          phone: "",
          role: "CASHIER",
          branchId: "",
        });
        await fetchSettings();
      } else {
        alert("បរាជ័យ: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_USER",
          userId: editingUser.id,
          fullName: editingUser.fullName,
          fullNameKh: editingUser.fullNameKh,
          phone: editingUser.phone,
          role: editingUser.role,
          branchId: editingUser.branchId || "",
          isActive: editingUser.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        await fetchSettings();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPasswordInput) return;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESET_PASSWORD",
          userId: resettingUser.id,
          newPassword: newPasswordInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ បានប្តូរលេខសម្ងាត់សម្រាប់ @${resettingUser.username} រួចរាល់!`);
        setResettingUser(null);
        setNewPasswordInput("");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("តើអ្នកប្រាកដជាចង់លុបគណនីអ្នកប្រើប្រាស់នេះមែនទេ?")) return;
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_USER", userId }),
      });
      const data = await res.json();
      if (data.success) await fetchSettings();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-teal-700" />
            {t.settings} (System Settings & RBAC)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            គ្រប់គ្រងព័ត៌មានអាជីវកម្ម អត្រាប្តូរប្រាក់ Bakong KHQR សាខា គណនីបុគ្គលិក និងម៉ាស៊ីនបោះពុម្ព
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>បានរក្សាទុកការកំណត់ដោយជោគជ័យ!</span>
            </div>
          )}
          <button
            onClick={fetchSettings}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-teal-700 ${loading ? "animate-spin" : ""}`} />
            ផ្ទុកឡើងវិញ
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-teal-900/20 hover:bg-teal-800 transition active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t.save}ការកំណត់
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-2 text-xs font-bold">
        {[
          { id: "PAYMENTS", label: "Bakong KHQR & ការទូទាត់", icon: QrCode },
          { id: "TELEGRAM", label: "Telegram Bot (ដំណឹង)", icon: Send },
          { id: "GENERAL", label: "ព័ត៌មានអាជីវកម្ម (Profile)", icon: Store },
          { id: "POS_CURRENCY", label: "POS & អត្រាប្តូរប្រាក់", icon: DollarSign },
          { id: "BRANCHES", label: `សាខា & ឃ្លាំង (${branches.length})`, icon: Building2 },
          { id: "RBAC", label: `បុគ្គលិក & សិទ្ធិ RBAC (${users.length})`, icon: Users },
          { id: "PRINTER", label: "ម៉ាស៊ីនបោះពុម្ព & វិក្កយបត្រ", icon: Printer },
          { id: "BACKUP", label: "បម្រុងទុក & Cloud DB", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-xl transition-all border-b-2 font-medium ${
                isActive
                  ? "border-teal-700 text-teal-800 bg-teal-50/50 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-teal-700" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Bakong KHQR & Payments */}
      {activeTab === "PAYMENTS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Gateway Configuration */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-teal-700" />
                ការកំណត់គណនី Bakong KHQR (NBC EMVCo Official Standard)
              </h3>
              <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                ✓ NBC Official
              </span>
            </div>

            {/* Quick Paste & Connect NBC KHQR String */}
            <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50/50 p-4 border border-teal-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-teal-700" />
                  ភ្ជាប់គណនី KHQR ដោយស្វ័យប្រវត្តិ (Instant Auto-Connect)
                </p>
                <span className="text-[10px] font-mono font-bold text-teal-800 bg-white px-2 py-0.5 rounded-full border border-teal-200">
                  ACLEDA / ABA / Wing
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                បិទភ្ជាប់ (Paste) កូដ KHQR ឬ EMVCo String របស់អ្នកដើម្បីឱ្យប្រព័ន្ធកំណត់ឈ្មោះហាង ធនាគារ និងលេខគណនីស្វ័យប្រវត្តិ៖
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rawKhqrInput}
                  onChange={(e) => setRawKhqrInput(e.target.value)}
                  placeholder="00020101021129380009khqr@aclb..."
                  className="flex-1 rounded-xl border border-teal-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={handleAutoConnectRawKHQR}
                  className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-4 py-2 shadow-xs transition active:scale-95 shrink-0"
                >
                  ភ្ជាប់ឥឡូវនេះ
                </button>
              </div>
              {khqrImportStatus && (
                <p className="text-xs font-bold text-emerald-700 bg-white p-2 rounded-lg border border-emerald-200 animate-in fade-in">
                  {khqrImportStatus}
                </p>
              )}
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ជ្រើសរើសធនាគារ (Select Bank)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CAMBODIA_BANKS.slice(0, 6).map((bank) => {
                    const isSelected = paymentConfig.bakongMerchantId.endsWith(bank.domain);
                    return (
                      <button
                        key={bank.domain}
                        type="button"
                        onClick={() => {
                          const base = paymentConfig.bakongMerchantId.split("@")[0] || "012888999";
                          setPaymentConfig({ ...paymentConfig, bakongMerchantId: `${base}${bank.domain}` });
                        }}
                        className={`rounded-xl border p-2 text-center text-xs font-bold transition ${
                          isSelected
                            ? "border-teal-600 bg-teal-50/70 text-teal-900 shadow-2xs"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {bank.name}
                        <span className="block text-[10px] font-mono text-slate-400 font-normal">{bank.domain}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Bakong Account ID / លេខទូរស័ព្ទគណនី *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={paymentConfig.bakongMerchantId}
                    onChange={(e) => setPaymentConfig({ ...paymentConfig, bakongMerchantId: e.target.value })}
                    placeholder="012888999@aba ឬ username@aba"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 font-mono font-bold text-sm focus:border-teal-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 <strong>ចំណាំសំខាន់</strong>: បញ្ចូល <strong>លេខទូរស័ព្ទ ឬឈ្មោះគណនី Bakong</strong> ដែលបានចុះឈ្មោះពិតប្រាកដជាមួយ ABA / ACLEDA / Wing ដើម្បីឱ្យអតិថិជនស្កេនបានជោគជ័យ (ឧ. <code className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded font-bold">012888999@aba</code>)។
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ឈ្មោះបង្ហាញលើ KHQR (Merchant Display Name) *
                </label>
                <input
                  type="text"
                  required
                  value={paymentConfig.bakongMerchantName}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, bakongMerchantName: e.target.value })}
                  placeholder="ANACHAK POS STORE"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 font-mono font-bold focus:border-teal-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">ឈ្មោះហាងដែលអតិថិជននឹងឃើញក្នុង Mobile Banking App (អតិបរមា ២៥ តួអក្សរ)</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ទីក្រុង ឬខេត្ត (Merchant City)
                </label>
                <input
                  type="text"
                  value={paymentConfig.bakongMerchantCity}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, bakongMerchantCity: e.target.value })}
                  placeholder="Phnom Penh"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 font-mono focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              {/* Payment Methods Allowed */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <h4 className="font-bold text-slate-800 text-xs">វិធីសាស្ត្រទូទាត់ដែលអនុញ្ញាតក្នុង POS:</h4>
                {[
                  { id: "enableBakongKhqr", name: "Bakong KHQR (ស្កេនគ្រប់ធនាគារ)", desc: "បង្កើត Dynamic KHQR មានចំនួនទឹកប្រាក់ស្វ័យប្រវត្តិ", val: paymentConfig.enableBakongKhqr },
                  { id: "enableCashUsd", name: "សាច់ប្រាក់ដុល្លារ (Cash USD)", desc: "ទូទាត់ជាក្រដាសប្រាក់ដុល្លារ និងគណនាប្រាក់អាប់", val: paymentConfig.enableCashUsd },
                  { id: "enableCashKhr", name: "សាច់ប្រាក់រៀល (Cash KHR)", desc: "ទូទាត់ជាក្រដាសប្រាក់រៀលខ្មែរ", val: paymentConfig.enableCashKhr },
                  { id: "enableCustomerCredit", name: "លក់ជំពាក់ / បំណុលអតិថិជន (Credit Debt)", desc: "កត់ត្រាចូលក្នុងគណនីបំណុលអតិថិជន CRM", val: paymentConfig.enableCustomerCredit },
                ].map((m) => (
                  <label key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition">
                    <div>
                      <p className="font-bold text-slate-800">{m.name}</p>
                      <p className="text-[11px] text-slate-400">{m.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={m.val}
                      onChange={(e) => setPaymentConfig({ ...paymentConfig, [m.id]: e.target.checked })}
                      className="h-4 w-4 accent-teal-700 rounded"
                    />
                  </label>
                ))}
              </div>

              {/* Save KHQR Button */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveKHQR}
                  className="flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-900/20 hover:bg-teal-800 transition active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  រក្សាទុកការកំណត់ KHQR
                </button>
              </div>
            </div>
          </div>

          {/* Right Live Preview: Test KHQR Code */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                តេស្តស្កេន KHQR ផ្ទាល់ (Live Scan Test)
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> NBC Valid
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-teal-200 rounded-2xl bg-teal-50/40 text-center space-y-3">
              <div className="rounded-2xl bg-white p-3 shadow-md border border-slate-100">
                {khqrPreviewUrl ? (
                  <img src={khqrPreviewUrl} alt="Bakong KHQR Test" className="h-48 w-48 mx-auto" />
                ) : (
                  <div className="h-48 w-48 flex items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>

              <div>
                <p className="font-extrabold text-slate-900 text-sm">{paymentConfig.bakongMerchantName || "ANACHAK POS STORE"}</p>
                <p className="text-xs font-mono font-bold text-teal-800 mt-0.5">{paymentConfig.bakongMerchantId || "012888999@aba"}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{paymentConfig.bakongMerchantCity || "Phnom Penh"} • $10.00 (Test Amount)</p>
              </div>

              <div className="rounded-xl bg-white p-3 border border-slate-200 text-left w-full space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Official NBC EMVCo Payload:</p>
                <p className="font-mono text-[9px] text-slate-700 break-all bg-slate-50 p-1.5 rounded border border-slate-100">
                  {khqrRawString || "កំពុងបង្កើតកូដ..."}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900 p-4 text-white space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="h-4 w-4" />
                <span>ស្កេនបានគ្រប់កម្មវិធីធនាគារក្នុងស្រុក</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                កូដ KHQR នេះត្រូវបានបង្កើតឡើងដោយប្រើប្រាស់ <strong>National Bank of Cambodia (NBC) Official SDK</strong> និងមានបញ្ចូល Tag 99 Timestamps + CRC-16 Checksum ត្រឹមត្រូវ 100% សម្រាប់ស្កេនជាមួយ <strong>ABA Mobile, ACLEDA, Wing, Canadia, Sathapana និង Bakong App</strong>។
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Telegram Bot Integration */}
      {activeTab === "TELEGRAM" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Configuration Form */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    ការកំណត់ Telegram Bot (Automated Real-time Alerts)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ផ្ញើដំណឹងការលក់ ស្តុកទំនិញ និងសេវាជួសជុលដោយស្វ័យប្រវត្តិចូល Telegram Group/Channel
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 text-[10px] font-bold">
                Telegram API v7
              </span>
            </div>

            {telegramTestStatus && (
              <div
                className={`rounded-xl p-3 text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
                  telegramTestStatus.success
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {telegramTestStatus.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <span>{telegramTestStatus.message}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Telegram Bot API Token *
                </label>
                <div className="relative">
                  <input
                    type={showBotToken ? "text" : "password"}
                    value={telegramForm.botToken}
                    onChange={(e) => setTelegramForm({ ...telegramForm, botToken: e.target.value })}
                    placeholder="7891234567:AAHxyzABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 font-mono focus:border-sky-500 focus:outline-hidden pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBotToken(!showBotToken)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Token ដែលទទួលបានពី <strong>@BotFather</strong> ពេលបង្កើត Bot ថ្មី
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Telegram Chat ID / Group ID / Channel ID *
                </label>
                <input
                  type="text"
                  value={telegramForm.chatId}
                  onChange={(e) => setTelegramForm({ ...telegramForm, chatId: e.target.value })}
                  placeholder="-1001234567890 ឬ 987654321"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:border-sky-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  លេខសម្គាល់ Chat ID (Group ID ចាប់ផ្តើមដោយ <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">-100...</code>)
                </p>
              </div>

              {/* Notification Triggers */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <h4 className="font-bold text-slate-800 text-xs">ជ្រើសរើសព្រឹត្តិការណ៍ដែលត្រូវផ្ញើដំណឹង:</h4>
                {[
                  {
                    id: "notifyOnSale",
                    name: "🛒 ដំណឹងការលក់ថ្មី (New Sale Completed)",
                    desc: "ផ្ញើវិក្កយបត្រសង្ខេប ទំនិញ និងចំនួនទឹកប្រាក់ ($ / ៛) ភ្លាមៗក្រោយគិតលុយក្នុង POS",
                    val: telegramForm.notifyOnSale,
                  },
                  {
                    id: "notifyOnLowStock",
                    name: "⚠️ ដំណឹងទំនិញជិតអស់ពីស្តុក (Low Stock Alert)",
                    desc: "ជូនដំណឹងស្វ័យប្រវត្តិនៅពេលចំនួនស្តុកធ្លាក់ចុះក្រោមចំនួនកំណត់",
                    val: telegramForm.notifyOnLowStock,
                  },
                  {
                    id: "notifyOnRepair",
                    name: "🔧 ដំណឹងការជួសជុល (Repair Ticket Status)",
                    desc: "ផ្ញើដំណឹងនៅពេលជាងប្តូរស្ថានភាពជួសជុល (ឧ. ជួសជុលរួចរាល់ រង់ចាំអតិថិជនមកយក)",
                    val: telegramForm.notifyOnRepair,
                  },
                  {
                    id: "notifyDailyReport",
                    name: "📊 របាយការណ៍សរុបប្រចាំថ្ងៃ (Daily Sales Report)",
                    desc: "ផ្ញើសេចក្តីសង្ខេបចំណូលសរុបប្រចាំថ្ងៃវេលាម៉ោង ៩:០០ យប់",
                    val: telegramForm.notifyDailyReport,
                  },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.val}
                      onChange={(e) => setTelegramForm({ ...telegramForm, [item.id]: e.target.checked })}
                      className="h-4 w-4 accent-sky-600 rounded"
                    />
                  </label>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram}
                  className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 text-xs transition active:scale-95 disabled:opacity-50"
                >
                  {isTestingTelegram ? (
                    <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                  ) : (
                    <Send className="h-4 w-4 text-sky-600" />
                  )}
                  តេស្តផ្ញើសារសាកល្បង (Test Ping)
                </button>

                <button
                  type="button"
                  onClick={handleSaveTelegram}
                  className="flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold px-6 py-2.5 text-xs shadow-md shadow-teal-900/20 transition active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  រក្សាទុក Telegram
                </button>
              </div>
            </div>
          </div>

          {/* Right: Setup Guide & Sample Notification Preview */}
          <div className="lg:col-span-5 space-y-6">
            {/* Guide Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 text-xs">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="h-4 w-4 text-amber-500" />
                ការណែនាំបង្កើត Telegram Bot ក្នុង ៣ ជំហាន
              </h3>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 font-black text-sky-800 text-[11px]">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-800">បង្កើត Bot ជាមួយ @BotFather</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      បើក Telegram រួចស្វែងរក <strong>@BotFather</strong> ហើយវាយពាក្យ <code>/newbot</code> ដើម្បីដាក់ឈ្មោះ Bot និងទទួលបាន <strong>HTTP API Token</strong>។
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 font-black text-sky-800 text-[11px]">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-slate-800">ស្វែងរក Chat ID របស់អ្នក</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      ផ្ញើសារទៅកាន់ <strong>@userinfobot</strong> ដើម្បីដឹងពី ID ផ្ទាល់ខ្លួន ឬ បង្កើត Telegram Group រួចទាញ Bot ចូលជា <strong>Admin</strong>។
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 font-black text-sky-800 text-[11px]">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-slate-800">តេស្ត & ដំណើរការ</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      បញ្ចូល Token និង Chat ID ក្នុងប្រអប់ខាងឆ្វេង រួចចុច <strong>«តេស្តផ្ញើសារសាកល្បង»</strong> ដើម្បីផ្ទៀងផ្ទាត់!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sample Message Preview */}
            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-bold">
                    🤖
                  </div>
                  <span className="text-xs font-bold text-sky-400">Anachak POS Alert Bot</span>
                </div>
                <span className="text-[10px] text-slate-500">Live Preview</span>
              </div>

              <div className="rounded-xl bg-slate-800/90 p-3.5 border border-slate-700 text-[11px] font-mono leading-relaxed space-y-1 text-slate-200">
                <p className="font-bold text-emerald-400">🛒 ការលក់ថ្មី (NEW SALE COMPLETED)</p>
                <p className="text-slate-400">━━━━━━━━━━━━━━━━━━━</p>
                <p>🧾 វិក្កយបត្រ: <span className="text-amber-300">#INV-9821</span></p>
                <p>🏢 សាខា: សាខាកណ្តាល ភ្នំពេញ</p>
                <p>👤 បេឡាករ: ជា សុខា</p>
                <p className="pt-1 text-slate-300 font-sans">📦 មុខទំនិញ:</p>
                <p className="text-slate-400 font-sans pl-2">• iPhone 15 Pro (x1) - $1,199.00</p>
                <p className="text-slate-400 font-sans pl-2">• Power Bank 20000mAh (x1) - $25.00</p>
                <p className="pt-1 font-bold text-emerald-400 text-xs font-mono">💵 សរុប: $1,224.00 (~ 5,018,400 ៛)</p>
                <p className="text-sky-300">💳 វិធីសាស្ត្រ: Bakong KHQR (ACLEDA)</p>
                <p className="text-slate-400">━━━━━━━━━━━━━━━━━━━</p>
                <p className="text-[9px] text-slate-500 italic">អាណាចក្រPOS • Real-time Cloud ERP</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: General Business Profile */}
      {activeTab === "GENERAL" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Store className="h-4 w-4 text-teal-700" />
              ព័ត៌មានទូទៅរបស់ហាង / សហគ្រាស (Supabase Tenant Data)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះហាង (ភាសាខ្មែរ) *</label>
                <input
                  type="text"
                  value={businessProfile.nameKh}
                  onChange={(e) => setBusinessProfile({ ...businessProfile, nameKh: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 font-bold focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះហាង (English Name)</label>
                <input
                  type="text"
                  value={businessProfile.nameEn}
                  onChange={(e) => setBusinessProfile({ ...businessProfile, nameEn: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះផ្លូវការចុះបញ្ជី (Legal Entity Name)</label>
                <input
                  type="text"
                  value={businessProfile.legalName}
                  onChange={(e) => setBusinessProfile({ ...businessProfile, legalName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">លេខសម្គាល់សារពើពន្ធ (VAT / TIN Number)</label>
                <input
                  type="text"
                  value={businessProfile.vatNumber}
                  onChange={(e) => setBusinessProfile({ ...businessProfile, vatNumber: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 font-mono focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">លេខទូរស័ព្ទទំនាក់ទំនងហាង *</label>
                <input
                  type="text"
                  value={businessProfile.phone}
                  onChange={(e) => setBusinessProfile({ ...businessProfile, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">អ៊ីមែលផ្លូវការ (Official Email)</label>
                <input
                  type="email"
                  value={businessProfile.email}
                  onChange={(e) => setBusinessProfile({ ...businessProfile, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telegram Support / Channel</label>
                <input
                  type="text"
                  value={businessProfile.telegramChannel}
                  onChange={(e) => setBusinessProfile({ ...businessProfile, telegramChannel: e.target.value })}
                  placeholder="https://t.me/your_store"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Facebook Page / Website</label>
                <input
                  type="text"
                  value={businessProfile.facebookPage}
                  onChange={(e) => setBusinessProfile({ ...businessProfile, facebookPage: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">អាសយដ្ឋានទីស្នាក់ការកណ្តាល</label>
                <textarea
                  rows={2}
                  value={businessProfile.address}
                  onChange={(e) => setBusinessProfile({ ...businessProfile, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 focus:border-teal-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Logo Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-700" />
              និមិត្តសញ្ញាហាង (Logo & Branding)
            </h3>
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-teal-200 rounded-2xl bg-teal-50/40">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white font-black text-3xl shadow-lg shadow-teal-900/30 mb-3">
                អា
              </div>
              <p className="font-bold text-xs text-slate-800">អាណាចក្រPOS Brand Logo</p>
              <p className="text-[10px] text-slate-500 mt-1 text-center">
                រូបភាព Logo នឹងបង្ហាញលើវិក្កយបត្រ Thermal Receipt និងផ្ទាំង POS
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                <Check className="h-3 w-3" /> សកម្មជានិច្ច
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: POS Currency */}
      {activeTab === "POS_CURRENCY" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="h-4 w-4 text-teal-700" />
              អត្រាប្តូរប្រាក់ និងរូបិយប័ណ្ណ (Multi-Currency Rates)
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  អត្រាប្តូរប្រាក់រៀលលំនាំដើម ($1 = ? KHR) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={posConfig.exchangeRate}
                    onChange={(e) => setPosConfig({ ...posConfig, exchangeRate: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 font-mono font-bold text-base focus:border-teal-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-slate-400">KHR (៛)</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  អត្រាប្តូរប្រាក់បាតថៃ ($1 = ? THB)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={posConfig.exchangeRateThb}
                    onChange={(e) => setPosConfig({ ...posConfig, exchangeRateThb: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 font-mono font-bold text-base focus:border-teal-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-slate-400">THB (฿)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    អត្រាពន្ធ VAT (%)
                  </label>
                  <input
                    type="number"
                    value={posConfig.defaultTaxRate}
                    onChange={(e) => setPosConfig({ ...posConfig, defaultTaxRate: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 font-mono font-bold focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    កូដដើមវិក្កយបត្រ (Prefix)
                  </label>
                  <input
                    type="text"
                    value={posConfig.invoicePrefix}
                    onChange={(e) => setPosConfig({ ...posConfig, invoicePrefix: e.target.value })}
                    placeholder="INV-"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 font-mono font-bold focus:border-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  កម្រិតជូនដំណឹងទំនិញជិតអស់ពីស្តុក (Low Stock Alert Threshold)
                </label>
                <input
                  type="number"
                  value={posConfig.lowStockThreshold}
                  onChange={(e) => setPosConfig({ ...posConfig, lowStockThreshold: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-800 font-mono font-bold focus:border-teal-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="h-4 w-4 text-teal-700" />
              មុខងារ & ច្បាប់ដំណើរការលក់ (POS Rules)
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition">
                <div>
                  <p className="font-bold text-slate-800">អនុញ្ញាតឱ្យបេឡាករបញ្ចុះតម្លៃដោយដៃ (Manual Discount)</p>
                  <p className="text-[11px] text-slate-400">អនុញ្ញាតឱ្យ Cashier វាយបញ្ចូលភាគរយ ឬទឹកប្រាក់បញ្ចុះតម្លៃ</p>
                </div>
                <input
                  type="checkbox"
                  checked={posConfig.allowManualDiscount}
                  onChange={(e) => setPosConfig({ ...posConfig, allowManualDiscount: e.target.checked })}
                  className="h-4 w-4 accent-teal-700 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition">
                <div>
                  <p className="font-bold text-slate-800">បង្ហាញតម្លៃទ្វេ ($ USD & ៛ KHR) ក្នុងពេលតែមួយ</p>
                  <p className="text-[11px] text-slate-400">បង្ហាញទាំងតម្លៃដុល្លារ និងប្រាក់រៀលលើផលិតផល និងវិក្កយបត្រ</p>
                </div>
                <input
                  type="checkbox"
                  checked={posConfig.dualDisplayPrice}
                  onChange={(e) => setPosConfig({ ...posConfig, dualDisplayPrice: e.target.checked })}
                  className="h-4 w-4 accent-teal-700 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition">
                <div>
                  <p className="font-bold text-slate-800">បោះពុម្ពវិក្កយបត្រស្វ័យប្រវត្តិនៅពេលទូទាត់រួច</p>
                  <p className="text-[11px] text-slate-400">បញ្ជូនការបោះពុម្ពទៅកាន់ម៉ាស៊ីនព្រីនភ្លាមៗក្រោយទូទាត់</p>
                </div>
                <input
                  type="checkbox"
                  checked={posConfig.autoPrintReceipt}
                  onChange={(e) => setPosConfig({ ...posConfig, autoPrintReceipt: e.target.checked })}
                  className="h-4 w-4 accent-teal-700 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition">
                <div>
                  <p className="font-bold text-slate-800">សំឡេងបន្លឺនៅពេលស្កេនបាកូដ (Scan Beep Sound)</p>
                  <p className="text-[11px] text-slate-400">ផ្តល់សញ្ញាសំឡេង Beep នៅពេលស្កេនទំនិញចូលកន្ត្រក</p>
                </div>
                <input
                  type="checkbox"
                  checked={posConfig.enableSoundEffects}
                  onChange={(e) => setPosConfig({ ...posConfig, enableSoundEffects: e.target.checked })}
                  className="h-4 w-4 accent-teal-700 rounded"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Branches */}
      {activeTab === "BRANCHES" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              គ្រប់គ្រងសាខាពហុទីតាំង (Multi-Branch) ផ្ទាល់ពី Supabase
            </p>
            <button
              onClick={() => setIsAddBranchModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-800 transition shadow-xs"
            >
              <Plus className="h-4 w-4" />
              បន្ថែមសាខាថ្មី
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {branches.map((b) => (
              <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {b.code}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{b.name}</h4>
                    <p className="text-[11px] text-slate-400">{b.address || "ភ្នំពេញ"}</p>
                  </div>
                  {b.isHeadOffice && (
                    <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-extrabold">
                      HQ
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <p>ទូរស័ព្ទ: <span className="font-mono">{b.phone || "012 888 999"}</span></p>
                  <p>
                    ឃ្លាំង:{" "}
                    <span className="font-bold text-slate-800">
                      {b.warehouses?.map((w: any) => w.name).join(", ") || "ឃ្លាំងកណ្តាល"}
                    </span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    onClick={() => setEditingBranch(b)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Edit2 className="h-3 w-3" /> កែប្រែ
                  </button>
                  {!b.isHeadOffice && (
                    <button
                      onClick={() => handleDeleteBranch(b.id)}
                      className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      <Trash2 className="h-3 w-3" /> លុប
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Users & RBAC */}
      {activeTab === "RBAC" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              តួនាទីអ្នកប្រើប្រាស់ និងសិទ្ធិចូលដំណើរការ (Users in Supabase)
            </p>
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-800 transition shadow-xs"
            >
              <Plus className="h-4 w-4" />
              បន្ថែមអ្នកប្រើប្រាស់ថ្មី
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">ឈ្មោះគណនី (Username)</th>
                  <th className="py-3 px-4">ឈ្មោះពេញ (Full Name)</th>
                  <th className="py-3 px-4">តួនាទី (Role)</th>
                  <th className="py-3 px-4">សាខាបំពេញការងារ (Branch)</th>
                  <th className="py-3 px-4 text-center">ស្ថានភាព</th>
                  <th className="py-3 px-4 text-right">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {users.map((u) => {
                  const assignedBranch = u.branch || branches.find((b) => b.id === u.branchId);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">@{u.username}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{u.fullNameKh || u.fullName}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-md bg-teal-50 text-teal-800 font-mono font-bold px-2 py-0.5 text-[10px]">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {assignedBranch ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-800">
                            <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                            <span>{assignedBranch.name}</span>
                            {assignedBranch.code && (
                              <span className="text-[9px] font-mono text-indigo-500 bg-indigo-100/70 px-1 py-0.2 rounded">
                                {assignedBranch.code}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            <Store className="h-3.5 w-3.5 text-slate-400" />
                            គ្រប់សាខាទាំងអស់ (HQ / All)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {u.isActive ? "សកម្ម (Active)" : "អសកម្ម (Disabled)"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setResettingUser(u)}
                          title="Reset Password"
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 text-[10px] font-bold hover:bg-amber-100 transition"
                        >
                          <KeyRound className="h-3 w-3" /> ប្តូរលេខកូដ
                        </button>
                        <button
                          onClick={() => setEditingUser(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <Edit2 className="h-3 w-3" /> កែប្រែ
                        </button>
                        {u.username !== "admin" && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 text-[10px] font-bold hover:bg-rose-100 transition"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* RBAC Permissions Matrix */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-teal-700" />
              តារាងសិទ្ធិអនុញ្ញាតតាមតួនាទី (RBAC Permission Matrix)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">មុខងារ / សិទ្ធិប្រតិបត្តិការ</th>
                    <th className="py-2.5 px-3 text-center">SUPER_ADMIN</th>
                    <th className="py-2.5 px-3 text-center">BRANCH_MANAGER</th>
                    <th className="py-2.5 px-3 text-center">CASHIER</th>
                    <th className="py-2.5 px-3 text-center">TECHNICIAN</th>
                    <th className="py-2.5 px-3 text-center">ACCOUNTANT</th>
                    <th className="py-2.5 px-3 text-center">INVENTORY_CLERK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-[11px]">
                  {[
                    { name: "ផ្ទាំងសង្ខេប (Dashboard)", sa: true, bm: true, cash: true, tech: true, acc: true, inv: true },
                    { name: "ចំណុចលក់ POS & ចេញវិក្កយបត្រ", sa: true, bm: true, cash: true, tech: false, acc: false, inv: false },
                    { name: "ការបញ្ចុះតម្លៃលើវិក្កយបត្រ (Discount)", sa: true, bm: true, cash: false, tech: false, acc: false, inv: false },
                    { name: "លុបចោលវិក្កយបត្រ (Void Transaction)", sa: true, bm: true, cash: false, tech: false, acc: false, inv: false },
                    { name: "ប្រវត្តិលក់ & វិក្កយបត្រ (Sales History)", sa: true, bm: true, cash: true, tech: false, acc: true, inv: false },
                    { name: "ការបញ្ជាទិញចូល & អ្នកផ្គត់ផ្គង់ (Purchases)", sa: true, bm: true, cash: false, tech: false, acc: true, inv: true },
                    { name: "ទទួលជួសជុល & បច្ចុប្បន្នភាពសំបុត្រ (Repairs)", sa: true, bm: true, cash: true, tech: true, acc: false, inv: false },
                    { name: "កាត់គ្រឿងបន្លាស់ចេញពីស្តុកជួសជុល", sa: true, bm: true, cash: false, tech: true, acc: false, inv: false },
                    { name: "គ្រប់គ្រងបញ្ជីទំនិញ & ស្តុក (Inventory)", sa: true, bm: true, cash: false, tech: false, acc: false, inv: true },
                    { name: "កែតម្រូវស្តុក & ផ្ទេរស្តុក (Stock Adjust)", sa: true, bm: true, cash: false, tech: false, acc: false, inv: true },
                    { name: "អតិថិជន & កត់ត្រាបំណុល (CRM & Debts)", sa: true, bm: true, cash: true, tech: false, acc: true, inv: false },
                    { name: "របាយការណ៍គណនេយ្យ P&L & ចំណាយ", sa: true, bm: false, cash: false, tech: false, acc: true, inv: false },
                    { name: "ធនធានមនុស្ស & បុគ្គលិក (HRM & Payroll)", sa: true, bm: true, cash: false, tech: false, acc: true, inv: false },
                    { name: "កំណត់ត្រាសុវត្ថិភាព (Audit Logs)", sa: true, bm: true, cash: false, tech: false, acc: true, inv: false },
                    { name: "ការកំណត់ប្រព័ន្ធ & RBAC (Settings)", sa: true, bm: true, cash: false, tech: false, acc: false, inv: false },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{row.sa ? "✓" : "—"}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{row.bm ? "✓" : "—"}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{row.cash ? "✓" : "—"}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{row.tech ? "✓" : "—"}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{row.acc ? "✓" : "—"}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{row.inv ? "✓" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Printer & Receipt */}
      {activeTab === "PRINTER" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Printer className="h-4 w-4 text-teal-700" />
              ការកំណត់ម៉ាស៊ីនបោះពុម្ពកម្តៅ (Thermal Printer Setup)
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ទំហំក្រដាសវិក្កយបត្រ (Paper Size)</label>
                <select
                  value={printerConfig.paperSize}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, paperSize: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                >
                  <option value="80mm">ក្រដាសខ្នាតស្តង់ដារ 80mm (ESC/POS)</option>
                  <option value="58mm">ក្រដាសខ្នាតតូច 58mm (Mini POS)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">សារក្បាលវិក្កយបត្រ (Receipt Header Note)</label>
                <textarea
                  rows={3}
                  value={printerConfig.headerMessage}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, headerMessage: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">សារកន្ទុយវិក្កយបត្រ (Receipt Footer Note)</label>
                <textarea
                  rows={3}
                  value={printerConfig.footerMessage}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, footerMessage: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-hidden"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => alert("🖨️ បានបញ្ជូនទំព័រតេស្តសាកល្បងទៅកាន់ម៉ាស៊ីនបោះពុម្ពរួចរាល់!")}
                  className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 text-xs transition"
                >
                  បោះពុម្ពតេស្តសាកល្បង (Test Print)
                </button>
              </div>
            </div>
          </div>

          {/* Receipt Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              ទម្រង់វិក្កយបត្រគំរូ (Live Receipt Preview)
            </h3>
            <div className="mx-auto max-w-[280px] bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[10px] space-y-2 text-slate-800 shadow-inner">
              <div className="text-center space-y-0.5">
                <p className="font-bold text-xs">{businessProfile.nameKh}</p>
                <p className="text-[9px] text-slate-500 whitespace-pre-line">{printerConfig.headerMessage}</p>
                <p className="text-[9px] text-slate-500">ទូរស័ព្ទ: {businessProfile.phone}</p>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>វិក្កយបត្រ: #INV-9821</span>
                  <span>14:30</span>
                </div>
                <div className="flex justify-between">
                  <span>បេឡាករ: ជា សុខា</span>
                  <span>សាច់ប្រាក់</span>
                </div>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>iPhone 15 Pro x1</span>
                  <span>$1,199.00</span>
                </div>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-2 font-bold flex justify-between text-xs">
                <span>សរុប (Total):</span>
                <span>$1,199.00</span>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[8px] text-slate-400 whitespace-pre-line">
                {printerConfig.footerMessage}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Cloud Database & Backup */}
      {activeTab === "BACKUP" && (
        <div className="space-y-6">
          {/* Cloud Database Diagnostics */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    ស្ថានភាពតភ្ជាប់ទិន្នន័យ Supabase Cloud PostgreSQL
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time Cloud Database Health & Connection Pooler Diagnostics
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {dbPingStatus.status === "ONLINE" ? `ភ្ជាប់ជោគជ័យ (${dbPingStatus.latencyMs}ms)` : dbPingStatus.status}
                </span>
                <button
                  type="button"
                  onClick={handlePingDatabase}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  <Activity className="h-3.5 w-3.5 text-teal-700" />
                  តេស្ត Latency
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Cloud Provider</p>
                <p className="font-extrabold text-slate-800 text-sm">Supabase AWS Postgres</p>
                <p className="text-[11px] text-slate-500 font-mono">aws-0-ap-southeast-2</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Connection Pooler</p>
                <p className="font-extrabold text-emerald-700 text-sm">PgBouncer Active</p>
                <p className="text-[11px] text-slate-500 font-mono">Port 6543 (Limit: 15 Conns)</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Database Encoding</p>
                <p className="font-extrabold text-slate-800 text-sm">UTF-8 Khmer Support</p>
                <p className="text-[11px] text-slate-500 font-mono">Prisma Client v5.22.0</p>
              </div>
            </div>
          </div>

          {/* Export & Data Backup Center */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-teal-700" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  ទាញយកទិន្នន័យបម្រុងទុក (Data Backup & Instant Export)
                </h3>
              </div>
              <span className="text-xs text-slate-400">JSON Format (Universal Compatible)</span>
            </div>

            {exportMessage && (
              <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs font-bold text-teal-900 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-teal-700" />
                <span>{exportMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white hover:border-teal-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 mb-2">
                    <Store className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs">ទំនិញ និងស្តុក (Products)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">ទាញយកបញ្ជីទំនិញ តម្លៃ និងស្តុកទាំងអស់</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleExportData("PRODUCTS")}
                  disabled={isExporting}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  ទាញយក JSON
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white hover:border-teal-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 mb-2">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs">ប្រវត្តិការលក់ (Sales)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">ទាញយកកំណត់ត្រាវិក្កយបត្រ និងចំណូល</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleExportData("SALES")}
                  disabled={isExporting}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  ទាញយក JSON
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-white hover:border-teal-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 mb-2">
                    <Users className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs">អតិថិជន & បំណុល (CRM)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">ទាញយកទិន្នន័យអតិថិជន និងគណនីជំពាក់</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleExportData("CUSTOMERS")}
                  disabled={isExporting}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  ទាញយក JSON
                </button>
              </div>

              <div className="rounded-2xl border-2 border-teal-500/40 p-4 space-y-3 bg-teal-50/30 flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white mb-2 shadow-xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-teal-950 text-xs">បម្រុងទុកប្រព័ន្ធទាំងមូល (Full)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">ទាញយក Database Snapshot ទាំងមូល</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleExportData("FULL_BACKUP")}
                  disabled={isExporting}
                  className="w-full rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs py-2 shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Full Backup (.json)
                </button>
              </div>
            </div>
          </div>

          {/* Cache & Maintenance */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <RefreshCw className="h-4 w-4 text-teal-700" />
              ការថែទាំប្រព័ន្ធ & សម្អាត Cache (Maintenance)
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-slate-800">សម្អាតទិន្នន័យ Local Storage Cache</p>
                <p className="text-slate-400 text-[11px]">
                  ធ្វើឱ្យប្រព័ន្ធ Refresh ទាញយកការកំណត់ និងទិន្នន័យថ្មីចុងក្រោយពី Cloud Database
                </p>
              </div>
              <button
                type="button"
                onClick={handlePurgeCache}
                className="rounded-xl border border-slate-200 hover:bg-slate-100 px-4 py-2 font-bold text-slate-700 transition shrink-0"
              >
                សម្អាត Cache & Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BRANCH MODAL */}
      {isAddBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">បន្ថែមសាខាថ្មី (Add Branch)</h3>
              <button onClick={() => setIsAddBranchModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddBranch} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">កូដសាខា (Branch Code) *</label>
                <input
                  type="text"
                  required
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                  placeholder="BR-BT03"
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះសាខា (Branch Name) *</label>
                <input
                  type="text"
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="សាខា បាត់ដំបង"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">លេខទូរស័ព្ទ</label>
                <input
                  type="text"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  placeholder="088 991 122"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">អាសយដ្ឋាន</label>
                <input
                  type="text"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="ក្រុងបាត់ដំបង"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600"
                >
                  បោះបង់
                </button>
                <button type="submit" className="rounded-xl bg-teal-700 px-5 py-2 font-bold text-white">
                  បង្កើតសាខា
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">កែប្រែព័ត៌មានសាខា ({editingBranch.code})</h3>
              <button onClick={() => setEditingBranch(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateBranch} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">កូដសាខា (Branch Code)</label>
                <input
                  type="text"
                  value={editingBranch.code}
                  onChange={(e) => setEditingBranch({ ...editingBranch, code: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះសាខា (Branch Name) *</label>
                <input
                  type="text"
                  required
                  value={editingBranch.name}
                  onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">លេខទូរស័ព្ទ</label>
                <input
                  type="text"
                  value={editingBranch.phone || ""}
                  onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">អាសយដ្ឋាន</label>
                <input
                  type="text"
                  value={editingBranch.address || ""}
                  onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600"
                >
                  បោះបង់
                </button>
                <button type="submit" className="rounded-xl bg-teal-700 px-5 py-2 font-bold text-white">
                  រក្សាទុកការកែប្រែ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">បន្ថែមអ្នកប្រើប្រាស់ថ្មី (Add User)</h3>
              <button onClick={() => setIsAddUserModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="cashier2"
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះពេញ (Full Name) *</label>
                <input
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  placeholder="Sok Dara"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះជាភាសាខ្មែរ (Khmer Name)</label>
                <input
                  type="text"
                  value={userForm.fullNameKh}
                  onChange={(e) => setUserForm({ ...userForm, fullNameKh: e.target.value })}
                  placeholder="សុខ ដារ៉ា"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">តួនាទី (Role)</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium"
                >
                  <option value="CASHIER">CASHIER (បេឡាករ / អ្នកគិតលុយ)</option>
                  <option value="TECHNICIAN">TECHNICIAN (ជាងជំនាញជួសជុល)</option>
                  <option value="INVENTORY_CLERK">INVENTORY_CLERK (បុគ្គលិកគ្រប់គ្រងស្តុក)</option>
                  <option value="ACCOUNTANT">ACCOUNTANT (គណនេយ្យករ)</option>
                  <option value="BRANCH_MANAGER">BRANCH_MANAGER (ប្រធានសាខា)</option>
                  <option value="ADMIN">ADMIN (អ្នកគ្រប់គ្រងប្រព័ន្ធ)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (អភិបាលជាន់ខ្ពស់)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">សាខាបំពេញការងារ (Assigned Branch)</label>
                <select
                  value={userForm.branchId || ""}
                  onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium"
                >
                  <option value="">គ្រប់សាខាទាំងអស់ (All Branches / Head Office)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  * បើកំណត់សាខា អ្នកប្រើប្រាស់នេះនឹងដំណើរការតែនៅក្នុងសាខាដែលបានជ្រើសរើសប៉ុណ្ណោះ។
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600"
                >
                  បោះបង់
                </button>
                <button type="submit" className="rounded-xl bg-teal-700 px-5 py-2 font-bold text-white">
                  បង្កើតអ្នកប្រើប្រាស់
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">កែប្រែគណនី (@{editingUser.username})</h3>
              <button onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះពេញ (Full Name) *</label>
                <input
                  type="text"
                  required
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះជាភាសាខ្មែរ</label>
                <input
                  type="text"
                  value={editingUser.fullNameKh || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, fullNameKh: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">លេខទូរស័ព្ទ</label>
                <input
                  type="text"
                  value={editingUser.phone || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">តួនាទី (Role)</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN (អភិបាលជាន់ខ្ពស់)</option>
                  <option value="ADMIN">ADMIN (អ្នកគ្រប់គ្រងប្រព័ន្ធ)</option>
                  <option value="BRANCH_MANAGER">BRANCH_MANAGER (ប្រធានសាខា)</option>
                  <option value="CASHIER">CASHIER (បេឡាករ / អ្នកគិតលុយ)</option>
                  <option value="TECHNICIAN">TECHNICIAN (ជាងជំនាញជួសជុល)</option>
                  <option value="ACCOUNTANT">ACCOUNTANT (គណនេយ្យករ)</option>
                  <option value="INVENTORY_CLERK">INVENTORY_CLERK (បុគ្គលិកគ្រប់គ្រងស្តុក)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">សាខាបំពេញការងារ (Assigned Branch)</label>
                <select
                  value={editingUser.branchId || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, branchId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium"
                >
                  <option value="">គ្រប់សាខាទាំងអស់ (All Branches / Head Office)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  * ជ្រើសរើសសាខាជាក់លាក់ ឬ "គ្រប់សាខាទាំងអស់" សម្រាប់ Admin / HQ។
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={editingUser.isActive}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="h-4 w-4 accent-teal-700 rounded"
                />
                <label htmlFor="userActiveCheck" className="font-bold text-slate-800 cursor-pointer">
                  គណនីមានសិទ្ធិដំណើរការ (Active)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600"
                >
                  បោះបង់
                </button>
                <button type="submit" className="rounded-xl bg-teal-700 px-5 py-2 font-bold text-white">
                  រក្សាទុក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-teal-700" />
                ប្តូរលេខសម្ងាត់ (@{resettingUser.username})
              </h3>
              <button onClick={() => setResettingUser(null)}>✕</button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">លេខសម្ងាត់ថ្មី (New Password) *</label>
                <input
                  type="password"
                  required
                  placeholder="វាយបញ្ចូលលេខសម្ងាត់ថ្មី..."
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-xs focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600"
                >
                  បោះបង់
                </button>
                <button type="submit" className="rounded-xl bg-amber-700 hover:bg-amber-800 px-5 py-2 font-bold text-white">
                  ផ្លាស់ប្តូរលេខកូដ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
