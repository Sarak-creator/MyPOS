import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Language } from "@/lib/i18n";

export interface CartItem {
  id: string; // Product ID or Variant ID
  productId: string;
  nameKh: string;
  nameEn: string;
  sku: string;
  barcode?: string;
  priceUsd: number;
  costPriceUsd: number;
  quantity: number;
  discountAmount: number;
  type: "STANDARD_ITEM" | "SERIAL_IMEI_ITEM" | "VARIANT_ITEM" | "SERVICE_LABOR" | "SPARE_PART";
  selectedImei?: string;
  stockQty?: number;
}

export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  tier: string;
  loyaltyPoints: number;
  currentDebtUsd: number;
  creditLimitUsd: number;
}

export interface HeldCart {
  id: string;
  timestamp: string;
  customer?: CustomerOption | null;
  items: CartItem[];
  notes?: string;
}

export interface PaymentConfig {
  bakongMerchantId: string;
  bakongMerchantName: string;
  bakongMerchantCity: string;
  enableBakongKhqr: boolean;
  enableAbaKhqr: boolean;
  enableCashUsd: boolean;
  enableCashKhr: boolean;
  enableCustomerCredit: boolean;
}

interface POSState {
  // Localization & Currency
  language: Language;
  currency: "USD" | "KHR";
  exchangeRateKhr: number;
  currentBranchId: string;
  currentBranchName: string;

  // KHQR & Payments Config
  bakongMerchantId: string;
  bakongMerchantName: string;
  bakongMerchantCity: string;
  enableBakongKhqr: boolean;
  enableAbaKhqr: boolean;
  enableCashUsd: boolean;
  enableCashKhr: boolean;
  enableCustomerCredit: boolean;

  // Cart & Transaction
  items: CartItem[];
  selectedCustomer: CustomerOption | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  taxRatePercent: number;
  orderNotes: string;
  heldCarts: HeldCart[];

  // Current User Session
  currentUser: any;
  setCurrentUser: (user: any) => void;
  syncSettingsFromSupabase: (branchId?: string) => Promise<void>;

  // Additional Payment / KHQR fields
  merchantID?: string;
  acquiringBank?: string;
  mobileNumber?: string;
  merchantCategoryCode?: string;
  terminalLabel?: string;
  bakongOpenApiToken?: string;
  customKhqrRawString?: string;

  // Telegram Bot Configuration
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramNotifyOnSale?: boolean;
  telegramNotifyOnLowStock?: boolean;
  telegramNotifyOnRepair?: boolean;
  setTelegramConfig: (config: {
    botToken?: string;
    chatId?: string;
    notifyOnSale?: boolean;
    notifyOnLowStock?: boolean;
    notifyOnRepair?: boolean;
  }) => void;

  // Actions
  setLanguage: (lang: Language) => void;
  setCurrency: (curr: "USD" | "KHR") => void;
  setBranch: (id: string, name: string) => void;
  setExchangeRateKhr: (rate: number) => void;
  setTaxRatePercent: (rate: number) => void;
  setPaymentConfig: (config: Partial<PaymentConfig> & Record<string, any>) => void;
  addItem: (item: Omit<CartItem, "quantity" | "discountAmount">) => void;
  updateQuantity: (id: string, delta: number) => void;
  setItemDiscount: (id: string, discount: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setCustomer: (customer: CustomerOption | null) => void;
  setOrderDiscount: (type: "PERCENT" | "FIXED", value: number) => void;
  setOrderNotes: (notes: string) => void;
  holdCurrentCart: () => void;
  resumeCart: (heldCartId: string) => void;
  deleteHeldCart: (heldCartId: string) => void;

  // Computed Helpers
  getSubtotal: () => number;
  getDiscountTotal: () => number;
  getTaxTotal: () => number;
  getGrandTotalUsd: () => number;
  getGrandTotalKhr: () => number;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      language: "km",
      currency: "USD",
      exchangeRateKhr: 4100,
      currentBranchId: "BR-PP01",
      currentBranchName: "សាខាកណ្តាល ភ្នំពេញ (Phnom Penh Main)",

      // Default KHQR settings (ACLEDA / Bakong)
      bakongMerchantId: "khqr@aclb",
      bakongMerchantName: "IEM SARAK",
      bakongMerchantCity: "Phnom Penh",
      merchantID: "85514965629",
      acquiringBank: "ACLEDA",
      mobileNumber: "0963760229",
      customKhqrRawString: "00020101021129380009khqr@aclb0111855149656290206ACLEDA391300042CCY01014520459995802KH53031165909IEM SARAK6010Phnom Penh6214021009637602296304009A",
      enableBakongKhqr: true,
      enableAbaKhqr: true,
      enableCashUsd: true,
      enableCashKhr: true,
      enableCustomerCredit: true,

      currentUser: null,
      setCurrentUser: (currentUser) => set({ currentUser }),

      syncSettingsFromSupabase: async (branchId?: string) => {
        try {
          const url = branchId ? `/api/settings?branchId=${encodeURIComponent(branchId)}` : "/api/settings";
          const res = await fetch(url);
          const data = await res.json();
          if (data.success && data.settings) {
            const s = data.settings;
            set({
              exchangeRateKhr: Number(s.exchangeRateKhr) || 4100,
              taxRatePercent: Number(s.vatRatePercent) || 0,
              bakongMerchantId: s.bakongMerchantId || "khqr@aclb",
              bakongMerchantName: s.bakongMerchantName || "IEM SARAK",
              bakongMerchantCity: s.bakongMerchantCity || "Phnom Penh",
              merchantID: s.merchantID || "85514965629",
              acquiringBank: s.acquiringBank || "ACLEDA",
              merchantCategoryCode: s.merchantCategoryCode || "5999",
              terminalLabel: s.terminalLabel,
              bakongOpenApiToken: s.bakongOpenApiToken,
              customKhqrRawString: s.customKhqrRawString || "00020101021129380009khqr@aclb0111855149656290206ACLEDA391300042CCY01014520459995802KH53031165909IEM SARAK6010Phnom Penh6214021009637602296304009A",
              enableBakongKhqr: s.enableBakongKhqr ?? true,
              enableAbaKhqr: s.enableAbaKhqr ?? true,
              enableCashUsd: s.enableCashUsd ?? true,
              enableCashKhr: s.enableCashKhr ?? true,
              enableCustomerCredit: s.enableCustomerCredit ?? true,
            });
          }

          // Sync Telegram settings from server
          try {
            const tgRes = await fetch("/api/telegram");
            const tgData = await tgRes.json();
            if (tgData.success && (tgData.botToken || tgData.chatId)) {
              set({
                telegramBotToken: tgData.botToken,
                telegramChatId: tgData.chatId,
                telegramNotifyOnSale: tgData.notifyOnSale ?? true,
                telegramNotifyOnLowStock: tgData.notifyOnLowStock ?? true,
                telegramNotifyOnRepair: tgData.notifyOnRepair ?? true,
              });
            }
          } catch {}
        } catch (err) {
          console.error("Error syncing POS settings:", err);
        }
      },

      // Telegram Bot Defaults
      telegramBotToken: "",
      telegramChatId: "",
      telegramNotifyOnSale: true,
      telegramNotifyOnLowStock: true,
      telegramNotifyOnRepair: true,
      setTelegramConfig: (cfg) =>
        set((state) => ({
          telegramBotToken: cfg.botToken !== undefined ? cfg.botToken : state.telegramBotToken,
          telegramChatId: cfg.chatId !== undefined ? cfg.chatId : state.telegramChatId,
          telegramNotifyOnSale: cfg.notifyOnSale !== undefined ? cfg.notifyOnSale : state.telegramNotifyOnSale,
          telegramNotifyOnLowStock: cfg.notifyOnLowStock !== undefined ? cfg.notifyOnLowStock : state.telegramNotifyOnLowStock,
          telegramNotifyOnRepair: cfg.notifyOnRepair !== undefined ? cfg.notifyOnRepair : state.telegramNotifyOnRepair,
        })),

      items: [],
      selectedCustomer: null,
      discountType: "FIXED",
      discountValue: 0,
      taxRatePercent: 0,
      orderNotes: "",
      heldCarts: [],

      setLanguage: (language) => set({ language }),
      setCurrency: (currency) => set({ currency }),
      setBranch: (id, name) => set({ currentBranchId: id, currentBranchName: name }),
      setExchangeRateKhr: (exchangeRateKhr) => set({ exchangeRateKhr }),
      setTaxRatePercent: (taxRatePercent) => set({ taxRatePercent }),

      setPaymentConfig: (config) => set((state) => ({ ...state, ...config })),

      addItem: (product) => {
        const { items } = get();
        const existingIndex = items.findIndex((i) => i.id === product.id);

        // Check if product is out of stock (non-service items)
        if (product.type !== "SERVICE_LABOR" && product.stockQty !== undefined && product.stockQty <= 0) {
          return;
        }

        if (existingIndex > -1 && product.type !== "SERIAL_IMEI_ITEM") {
          const currentQty = items[existingIndex].quantity;
          const maxStock = product.stockQty ?? items[existingIndex].stockQty;

          // Prevent adding beyond available stock
          if (product.type !== "SERVICE_LABOR" && maxStock !== undefined && currentQty >= maxStock) {
            return;
          }

          const updated = [...items];
          updated[existingIndex].quantity += 1;
          set({ items: updated });
        } else {
          set({
            items: [
              ...items,
              {
                ...product,
                quantity: 1,
                discountAmount: 0,
              },
            ],
          });
        }
      },

      updateQuantity: (id, delta) => {
        const { items } = get();
        const updated = items
          .map((item) => {
            if (item.id === id) {
              const newQty = item.quantity + delta;
              if (delta > 0 && item.type !== "SERVICE_LABOR" && item.stockQty !== undefined && newQty > item.stockQty) {
                return item;
              }
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[];

        set({ items: updated });
      },

      setItemDiscount: (id, discountAmount) => {
        const { items } = get();
        set({
          items: items.map((i) => (i.id === id ? { ...i, discountAmount } : i)),
        });
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      clearCart: () => {
        set({
          items: [],
          selectedCustomer: null,
          discountValue: 0,
          orderNotes: "",
        });
      },

      setCustomer: (selectedCustomer) => set({ selectedCustomer }),

      setOrderDiscount: (discountType, discountValue) =>
        set({ discountType, discountValue }),

      setOrderNotes: (orderNotes) => set({ orderNotes }),

      holdCurrentCart: () => {
        const { items, selectedCustomer, orderNotes, heldCarts } = get();
        if (items.length === 0) return;

        const newHeld: HeldCart = {
          id: `HOLD-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          customer: selectedCustomer,
          items: [...items],
          notes: orderNotes,
        };

        set({
          heldCarts: [newHeld, ...heldCarts],
          items: [],
          selectedCustomer: null,
          orderNotes: "",
        });
      },

      resumeCart: (heldCartId) => {
        const { heldCarts } = get();
        const target = heldCarts.find((c) => c.id === heldCartId);
        if (!target) return;

        set({
          items: target.items,
          selectedCustomer: target.customer || null,
          orderNotes: target.notes || "",
          heldCarts: heldCarts.filter((c) => c.id !== heldCartId),
        });
      },

      deleteHeldCart: (heldCartId) => {
        set({
          heldCarts: get().heldCarts.filter((c) => c.id !== heldCartId),
        });
      },

      getSubtotal: () => {
        return get().items.reduce((acc, item) => {
          const lineTotal = item.priceUsd * item.quantity - item.discountAmount;
          return acc + Math.max(0, lineTotal);
        }, 0);
      },

      getDiscountTotal: () => {
        const { discountType, discountValue, getSubtotal } = get();
        const subtotal = getSubtotal();
        if (discountType === "PERCENT") {
          return (subtotal * discountValue) / 100;
        }
        return Math.min(subtotal, discountValue);
      },

      getTaxTotal: () => {
        const { taxRatePercent, getSubtotal, getDiscountTotal } = get();
        const taxableAmount = Math.max(0, getSubtotal() - getDiscountTotal());
        return (taxableAmount * taxRatePercent) / 100;
      },

      getGrandTotalUsd: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountTotal();
        const tax = get().getTaxTotal();
        return Math.max(0, subtotal - discount + tax);
      },

      getGrandTotalKhr: () => {
        const usd = get().getGrandTotalUsd();
        const rate = get().exchangeRateKhr;
        return Math.round(usd * rate);
      },
    }),
    {
      name: "anachak-pos-storage",
      partialize: (state) => ({
        language: state.language,
        currency: state.currency,
        exchangeRateKhr: state.exchangeRateKhr,
        currentBranchId: state.currentBranchId,
        currentBranchName: state.currentBranchName,
        taxRatePercent: state.taxRatePercent,
        bakongMerchantId: state.bakongMerchantId,
        bakongMerchantName: state.bakongMerchantName,
        bakongMerchantCity: state.bakongMerchantCity,
        enableBakongKhqr: state.enableBakongKhqr,
        enableAbaKhqr: state.enableAbaKhqr,
        enableCashUsd: state.enableCashUsd,
        enableCashKhr: state.enableCashKhr,
        enableCustomerCredit: state.enableCustomerCredit,
        // Telegram Bot Configuration
        telegramBotToken: state.telegramBotToken,
        telegramChatId: state.telegramChatId,
        telegramNotifyOnSale: state.telegramNotifyOnSale,
        telegramNotifyOnLowStock: state.telegramNotifyOnLowStock,
        telegramNotifyOnRepair: state.telegramNotifyOnRepair,
        // Extended Payment / KHQR fields
        merchantID: state.merchantID,
        acquiringBank: state.acquiringBank,
        mobileNumber: state.mobileNumber,
        merchantCategoryCode: state.merchantCategoryCode,
        terminalLabel: state.terminalLabel,
        bakongOpenApiToken: state.bakongOpenApiToken,
        customKhqrRawString: state.customKhqrRawString,
      }),
    }
  )
);
