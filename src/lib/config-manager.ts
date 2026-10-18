import { supabaseAdmin } from "@/lib/supabase";
import { normalizeDatabaseUrl, prisma } from "@/lib/prisma";
import { POSDisplayConfig, DEFAULT_POS_DISPLAY_CONFIG } from "@/types/product";

export interface DatabaseConnectionConfig {
  DATABASE_URL: string;
  DIRECT_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  notifyOnSale: boolean;
  notifyOnLowStock: boolean;
  notifyOnRepair: boolean;
  notifyDailyReport: boolean;
  notifyOnInstallmentDue?: boolean;
  installmentReminderDays?: number;
}

export interface KhqrConfig {
  merchantName: string;
  merchantCity: string;
  merchantId: string;
  bakongAccount: string;
  acquiringBank: string;
  merchantMobile: string;
  bakongToken: string;
  bakongApiUrl: string;
  abaMerchantId?: string;
  abaApiKey?: string;
  abaApiUrl?: string;
  enableBakongKhqr?: boolean;
  enableAbaKhqr?: boolean;
  enableCashUsd?: boolean;
  enableCashKhr?: boolean;
  enableCustomerCredit?: boolean;
  customKhqrRawString?: string;
}

export interface PosSystemSettings {
  currency: string;
  exchangeRateKhr: number;
  exchangeRateThb: number;
  defaultTaxRate: number;
  invoicePrefix: string;
  allowManualDiscount: boolean;
  maxDiscountPercent: number;
  enableSoundEffects: boolean;
  autoPrintReceipt: boolean;
  requireCustomerPhone: boolean;
  lowStockThreshold: number;
  dualDisplayPrice: boolean;
  appName: string;
  appSlogan: string;
}

export interface PrinterConfig {
  paperSize: string; // "80mm" | "58mm"
  autoDrawerKick: boolean;
  printDuplicateForKitchen: boolean;
  headerMessage: string;
  footerMessage: string;
}

export interface ScannerConfig {
  scannerMode: "SCANNER_DEVICE" | "CAMERA_DEVICE" | "BOTH";
  preferredCameraId: string;
  scannerSoundFeedback: boolean;
  scannerAutoAddToCart: boolean;
  scannerContinuousMode: boolean;
}

export interface AppearanceConfig {
  themeMode: "light" | "dark" | "system";
  colorPalette: "emerald-teal" | "ocean-blue" | "sunset-amber" | "royal-indigo" | "rose-crimson" | "midnight-slate";
}

export interface BusinessProfileConfig {
  nameKh: string;
  nameEn: string;
  legalName: string;
  vatNumber: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  telegramChannel: string;
  facebookPage: string;
  businessType: string;
  baseCurrency: string;
  logoUrl?: string;
}

export interface LoanContractSettings {
  installmentInterestRate: number; // default: 1.5%
  pawnMonthlyInterestRate: number; // default: 2.5%
  pawnDailyInterestRate: number; // default: 0.1%
  latePenaltyPerDayUsd: number; // default: 1.0
  defaultPawnDurationDays: number; // default: 30
  defaultPawnDurationType: "DAYS" | "MONTHS"; // default: "DAYS"
  storeName: string;
  storePhone: string;
  storeAddress: string;
  witnessName: string;
  installmentContractTitle: string;
  installmentContractTerms: string;
  pawnContractTitle: string;
  pawnContractTerms: string;
}

export const DEFAULT_INSTALLMENT_TERMS = `មាត្រា ១៖ ភាគី "ក" បានប្រគល់ទំនិញដែលមានគុណភាពត្រឹមត្រូវតាមការបញ្ជាក់ខាងលើជូនភាគី "ខ" ហើយភាគី "ខ" បានពិនិត្យ និងយល់ព្រមទទួលយកទំនិញដោយពេញចិត្ត។
មាត្រា ២៖ ភាគី "ខ" សន្យាបង់ប្រាក់រំលស់ប្រចាំខែតាមកាលបរិច្ឆេទកំណត់ក្នុងតារាងបង់ប្រាក់រំលស់។ ប្រសិនបើភាគី "ខ" បង់ប្រាក់យឺតយ៉ាវ ត្រូវបង់ប្រាក់ពិន័យបន្ថែមចំនួន $1.00 (មួយដុល្លារ) ក្នុងមួយថ្ងៃនៃថ្ងៃយឺត។
មាត្រា ៣៖ ប្រសិនបើភាគី "ខ" ខកខានមិនបានបង់ប្រាក់រំលស់ជាប់ៗគ្នាចំនួន ២ (ពីរ) ខែ ភាគី "ក" មានសិទ្ធិស្របច្បាប់ក្នុងការដកហូត និងរឹបអូសទំនិញខាងលើមកវិញភ្លាមៗ ដោយភាគី "ខ" គ្មានសិទ្ធិទាមទារប្រាក់កក់ ឬប្រាក់រំលស់ដែលបានបង់កន្លងមកវិញឡើយ។
មាត្រា ៤៖ ភាគី "គ" (អ្នកធានា) ត្រូវធានា និងទទួលខុសត្រូវជំនួសភាគី "ខ" ទាំងស្រុងចំពោះបំណុលទាំងអស់ក្នុងករណីភាគី "ខ" គេចវេះមិនព្រមទូទាត់។
មាត្រា ៥៖ កិច្ចសន្យានេះត្រូវបានធ្វើឡើងជា ០២ ច្បាប់ដែលមានតម្លៃច្បាប់ស្មើគ្នា ដោយភាគីនីមួយៗរក្សាទុកម្នាក់មួយច្បាប់ជាភស្តុតាង។`;

export const DEFAULT_PAWN_TERMS = `មាត្រា ១៖ ភាគី "ខ" បានយកទ្រព្យបញ្ចាំស្របច្បាប់ផ្ទាល់ខ្លួនខាងលើមកដាក់បញ្ចាំជាមួយភាគី "ក" ហើយបានទទួលទឹកប្រាក់កម្ចីគ្រប់ចំនួនរួចរាល់ហើយ។ ភាគី "ខ" ធានាថាទ្រព្យនេះមិនមែនជាផលនៃបទល្មើស ឬទ្រព្យខុសច្បាប់ឡើយ។
មាត្រា ២៖ ភាគី "ខ" ត្រូវមកបង់ការប្រាក់ ឬលោះយកទ្រព្យបញ្ចាំវិញឱ្យបានត្រឹមត្រូវតាមកាលបរិច្ឆេទផុតកំណត់នៃកិច្ចសន្យាបញ្ចាំ។
មាត្រា ៣ (លក្ខខណ្ឌដាច់បញ្ចាំ)៖ ប្រសិនបើហួសកាលបរិច្ឆេទផុតកំណត់លើសពី ០៧ (ប្រាំពីរ) ថ្ងៃ ដោយភាគី "ខ" មិនបានមកបង់ការប្រាក់ដើម្បីបន្តកិច្ចសន្យា ឬមិនបានមកលោះយកទ្រព្យវិញទេនោះ ទ្រព្យបញ្ចាំខាងលើនេះនឹងត្រូវចាត់ទុកថា "ដាច់បញ្ចាំជាស្ថាពរ" ហើយក្លាយជាកម្មសិទ្ធិស្របច្បាប់របស់អ្នកទទួលបញ្ចាំ (ភាគី ក) ដោយស្វ័យប្រវត្តិ។ ភាគី "ក" មានសិទ្ធិលក់ឡៃឡុង ឬចាត់ចែងតាមការគួរ ដោយភាគី "ខ" គ្មានសិទ្ធិតវ៉ា ឬទាមទារសំណងអ្វីទាំងអស់។
មាត្រា ៤៖ កិច្ចសន្យានេះត្រូវបានធ្វើឡើងជា ០២ ច្បាប់ដែលមានតម្លៃច្បាប់ស្មើគ្នា ដោយភាគីនីមួយៗរក្សាទុកម្នាក់មួយច្បាប់ជាភស្តុតាង។`;

export const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  "ថ្លៃជួលទីតាំង & អគ្គិសនី (Rent & Utilities)",
  "ចំណាយអ៊ីនធឺណិត & ទឹកភ្លើង (Internet & Water)",
  "សម្ភារៈការិយាល័យ & បោះពុម្ព (Office & Printing)",
  "ទីផ្សារ & ការផ្សាយពាណិជ្ជកម្ម (Marketing)",
  "ចំណាយដឹកជញ្ជូន (Logistics & Shipping)",
  "ប្រាក់បៀវត្ស & ប្រាក់ឧបត្ថម្ភ (Salary & Allowances)",
  "ចំណាយជួសជុល & ថែទាំ (Repairs & Maintenance)",
  "ថ្លៃសាំង & មធ្យោបាយធ្វើដំណើរ (Gasoline & Travel)",
  "ថ្លៃអាហារ & បដិសណ្ឋារកិច្ច (Food & Beverage)",
  "ចំណាយផ្សេងៗ (Miscellaneous)",
];

// In-Memory Hot Cache
const cache = new Map<string, { value: any; expiresAt: number }>();
const CACHE_TTL_MS = 10000; // 10 seconds TTL for fast responses while ensuring quick propagation across devices

function setInProcessEnv(key: string, val: string) {
  try {
    const env = (globalThis as any).process?.env;
    if (env && typeof val === "string") {
      env[key] = val;
    }
  } catch {}
}

export class ConfigManager {
  /**
   * Invalidate local memory cache for a specific key or all keys
   */
  static invalidateCache(key?: string) {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  }

  /**
   * Get a config value from Supabase with caching, Prisma fallback and env fallback
   */
  static async get<T = any>(key: string, defaultValue?: T, forceRefresh = false): Promise<T> {
    const now = Date.now();
    if (!forceRefresh) {
      const cached = cache.get(key);
      if (cached && cached.expiresAt > now) {
        return cached.value as T;
      }
    }

    try {
      // 1. Try reading from Supabase system_configs table via Supabase client
      const { data, error } = await supabaseAdmin
        .from("system_configs")
        .select("key, value")
        .eq("key", key)
        .maybeSingle();

      if (!error && data && data.value !== undefined && data.value !== null) {
        let parsed = data.value;
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            // keep as string
          }
        }
        cache.set(key, { value: parsed, expiresAt: now + CACHE_TTL_MS });
        if (typeof parsed === "string") {
          setInProcessEnv(key, parsed);
        }
        return parsed as T;
      }
    } catch {
      // Fallback to Prisma below
    }

    // 1.1 Direct Prisma database fallback (connects to Supabase Postgres)
    try {
      const record = await prisma.systemConfig.findUnique({
        where: { key },
      });
      if (record && record.value !== undefined && record.value !== null) {
        let parsed: any = record.value;
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            // keep as string
          }
        }
        cache.set(key, { value: parsed, expiresAt: now + CACHE_TTL_MS });
        return parsed as T;
      }
    } catch {
      // Ignore
    }

    // 2. Fallback to process.env
    const envVal = process.env[key];
    if (envVal !== undefined && envVal !== "") {
      let parsed: any = envVal;
      try {
        parsed = JSON.parse(envVal);
      } catch {
        // keep as string
      }
      cache.set(key, { value: parsed, expiresAt: now + CACHE_TTL_MS });
      return parsed as T;
    }

    // 3. Fallback to default
    return defaultValue as T;
  }

  /**
   * Set a config value in Supabase and sync with memory cache
   */
  static async set(key: string, value: any, category = "GENERAL", description?: string): Promise<boolean> {
    const stringVal = typeof value === "string" ? value : JSON.stringify(value);

    // 1. Upsert into Supabase system_configs table via Supabase client
    try {
      await supabaseAdmin.from("system_configs").upsert(
        {
          key,
          value: stringVal,
          category,
          description: description || null,
          updatedAt: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    } catch (err: any) {
      console.warn(`[ConfigManager] Supabase client upsert error for "${key}":`, err.message);
    }

    // 1.1 Direct Prisma fallback to ensure Postgres database is guaranteed saved
    try {
      await prisma.systemConfig.upsert({
        where: { key },
        create: {
          key,
          value: stringVal,
          category,
          description: description || null,
        },
        update: {
          value: stringVal,
          category,
          description: description || null,
        },
      });
    } catch (err: any) {
      console.warn(`[ConfigManager] Prisma database upsert error for "${key}":`, err.message);
    }

    // 2. Update local in-memory cache & process.env
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    if (typeof value === "string") {
      setInProcessEnv(key, value);
    }

    return true;
  }

  /**
   * Set multiple config entries at once in Supabase
   */
  static async setMultiple(
    entries: Record<string, any>,
    category = "GENERAL"
  ): Promise<boolean> {
    const rows = Object.entries(entries).map(([key, val]) => ({
      key,
      value: typeof val === "string" ? val : JSON.stringify(val),
      category,
      updatedAt: new Date().toISOString(),
    }));

    try {
      await supabaseAdmin
        .from("system_configs")
        .upsert(rows, { onConflict: "key" });
    } catch (err: any) {
      console.warn("[ConfigManager] Failed batch upserting to Supabase:", err.message);
    }

    // Update Prisma & cache
    const now = Date.now();
    for (const [key, val] of Object.entries(entries)) {
      const stringVal = typeof val === "string" ? val : JSON.stringify(val);
      prisma.systemConfig.upsert({
        where: { key },
        create: { key, value: stringVal, category },
        update: { value: stringVal, category },
      }).catch(() => {});

      cache.set(key, { value: val, expiresAt: now + CACHE_TTL_MS });
      if (typeof val === "string") {
        setInProcessEnv(key, val);
      }
    }

    return true;
  }

  // ============================================================================
  // TYPED CONFIG HELPERS (STORED DIRECTLY IN SUPABASE DATABASE)
  // ============================================================================

  /**
   * Get Active Database Connections
   */
  static async getDatabaseConfig(forceRefresh = false): Promise<DatabaseConnectionConfig> {
    const [dbUrl, directUrl, supaUrl, supaAnon, supaService] = await Promise.all([
      this.get<string>("DATABASE_URL", process.env.DATABASE_URL || "", forceRefresh),
      this.get<string>("DIRECT_URL", process.env.DIRECT_URL || "", forceRefresh),
      this.get<string>("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL || "", forceRefresh),
      this.get<string>("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", forceRefresh),
      this.get<string>("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY || "", forceRefresh),
    ]);

    return {
      DATABASE_URL: normalizeDatabaseUrl(dbUrl),
      DIRECT_URL: directUrl || dbUrl,
      NEXT_PUBLIC_SUPABASE_URL: supaUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supaAnon,
      SUPABASE_SERVICE_ROLE_KEY: supaService,
    };
  }

  /**
   * Save Active Database Connection details to Supabase
   */
  static async saveDatabaseConfig(config: Partial<DatabaseConnectionConfig>): Promise<boolean> {
    const entries: Record<string, string> = {};
    if (config.DATABASE_URL) entries["DATABASE_URL"] = normalizeDatabaseUrl(config.DATABASE_URL);
    if (config.DIRECT_URL) entries["DIRECT_URL"] = config.DIRECT_URL.trim();
    if (config.NEXT_PUBLIC_SUPABASE_URL) entries["NEXT_PUBLIC_SUPABASE_URL"] = config.NEXT_PUBLIC_SUPABASE_URL.trim();
    if (config.NEXT_PUBLIC_SUPABASE_ANON_KEY) entries["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = config.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim();
    if (config.SUPABASE_SERVICE_ROLE_KEY) entries["SUPABASE_SERVICE_ROLE_KEY"] = config.SUPABASE_SERVICE_ROLE_KEY.trim();

    return this.setMultiple(entries, "DATABASE");
  }

  /**
   * Get Business Profile (Store Info & Social Links) from Supabase
   */
  static async getBusinessProfile(forceRefresh = false): Promise<BusinessProfileConfig> {
    const saved = await this.get<Partial<BusinessProfileConfig>>("BUSINESS_PROFILE", {}, forceRefresh);

    return {
      nameKh: saved?.nameKh || process.env.NEXT_PUBLIC_APP_NAME || "អាណាចក្រPOS (Anachak POS)",
      nameEn: saved?.nameEn || "Anachak Tech & Repair ERP",
      legalName: saved?.legalName || "Anachak Technologies Co., Ltd.",
      vatNumber: saved?.vatNumber || "K008-902348911",
      phone: saved?.phone || "012 888 999",
      email: saved?.email || "contact@anachakpos.com",
      address: saved?.address || "#128, មហាវិថីព្រះមុនីវង្ស, សង្កាត់បឹងរាំង, ខណ្ឌដូនពេញ, រាជធានីភ្នំពេញ",
      website: saved?.website || "https://anachakpos.com",
      telegramChannel: saved?.telegramChannel || "https://t.me/anachak_pos",
      facebookPage: saved?.facebookPage || "https://facebook.com/anachakpos",
      businessType: saved?.businessType || "Smartphones, Laptops, Repairs & Electronics Retail",
      baseCurrency: saved?.baseCurrency || "USD",
      logoUrl: saved?.logoUrl || "",
    };
  }

  /**
   * Save Business Profile to Supabase
   */
  static async saveBusinessProfile(config: Partial<BusinessProfileConfig>): Promise<boolean> {
    const existing = await this.getBusinessProfile();
    const merged: BusinessProfileConfig = {
      ...existing,
      ...config,
    };
    return this.set("BUSINESS_PROFILE", merged, "GENERAL", "Store business profile and social contact details");
  }

  /**
   * Get POS Exchange Rate, Tax, and Operating Settings from Supabase
   */
  static async getPosSettings(forceRefresh = false): Promise<PosSystemSettings> {
    const saved = await this.get<Partial<PosSystemSettings>>("POS_SETTINGS", {}, forceRefresh);

    return {
      currency: saved?.currency || process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "USD",
      exchangeRateKhr: saved?.exchangeRateKhr ? Number(saved.exchangeRateKhr) : Number(process.env.NEXT_PUBLIC_EXCHANGE_RATE_KHR) || 4100,
      exchangeRateThb: saved?.exchangeRateThb ? Number(saved.exchangeRateThb) : Number(process.env.NEXT_PUBLIC_EXCHANGE_RATE_THB) || 36,
      defaultTaxRate: saved?.defaultTaxRate !== undefined ? Number(saved.defaultTaxRate) : 0,
      invoicePrefix: saved?.invoicePrefix || "INV-",
      allowManualDiscount: saved?.allowManualDiscount ?? true,
      maxDiscountPercent: saved?.maxDiscountPercent !== undefined ? Number(saved.maxDiscountPercent) : 20,
      enableSoundEffects: saved?.enableSoundEffects ?? true,
      autoPrintReceipt: saved?.autoPrintReceipt ?? true,
      requireCustomerPhone: saved?.requireCustomerPhone ?? false,
      lowStockThreshold: saved?.lowStockThreshold !== undefined ? Number(saved.lowStockThreshold) : 5,
      dualDisplayPrice: saved?.dualDisplayPrice ?? true,
      appName: saved?.appName || process.env.NEXT_PUBLIC_APP_NAME || "អាណាចក្រPOS",
      appSlogan: saved?.appSlogan || process.env.NEXT_PUBLIC_APP_SLOGAN || "ប្រព័ន្ធគ្រប់គ្រងការលក់ និងសេវាកម្មជួសជុលកម្រិតសហគ្រាស",
    };
  }

  /**
   * Save POS Exchange Rate, Tax, and Operating Settings to Supabase
   */
  static async savePosSettings(config: Partial<PosSystemSettings>): Promise<boolean> {
    const existing = await this.getPosSettings();
    const merged: PosSystemSettings = {
      ...existing,
      ...config,
      exchangeRateKhr: config.exchangeRateKhr !== undefined ? Number(config.exchangeRateKhr) : existing.exchangeRateKhr,
      exchangeRateThb: config.exchangeRateThb !== undefined ? Number(config.exchangeRateThb) : existing.exchangeRateThb,
      defaultTaxRate: config.defaultTaxRate !== undefined ? Number(config.defaultTaxRate) : existing.defaultTaxRate,
      maxDiscountPercent: config.maxDiscountPercent !== undefined ? Number(config.maxDiscountPercent) : existing.maxDiscountPercent,
      lowStockThreshold: config.lowStockThreshold !== undefined ? Number(config.lowStockThreshold) : existing.lowStockThreshold,
    };
    return this.set("POS_SETTINGS", merged, "POS", "POS currency, tax, and operation parameters");
  }

  /**
   * Get KHQR / Bakong / Payments Configuration from Supabase
   */
  static async getKhqrConfig(forceRefresh = false): Promise<KhqrConfig> {
    const [saved, standaloneBakongToken] = await Promise.all([
      this.get<Partial<KhqrConfig>>("KHQR_CONFIG", {}, forceRefresh),
      this.get<string>("BAKONG_OPEN_API_TOKEN", "", forceRefresh),
    ]);

    return {
      merchantName: saved?.merchantName || process.env.NEXT_PUBLIC_KHQR_MERCHANT_NAME || "ANACHAK POS STORE",
      merchantCity: saved?.merchantCity || process.env.NEXT_PUBLIC_KHQR_MERCHANT_CITY || "Phnom Penh",
      merchantId: saved?.merchantId || process.env.NEXT_PUBLIC_KHQR_MERCHANT_ID || "012888999@aba",
      bakongAccount: saved?.bakongAccount || process.env.NEXT_PUBLIC_BAKONG_ACCOUNT || "012888999@aba",
      acquiringBank: saved?.acquiringBank || process.env.NEXT_PUBLIC_ACQUIRING_BANK || "ABA Bank",
      merchantMobile: saved?.merchantMobile || process.env.NEXT_PUBLIC_MERCHANT_MOBILE || "012888999",
      bakongToken: saved?.bakongToken || standaloneBakongToken || process.env.BAKONG_OPEN_API_TOKEN || process.env.BAKONG_API_TOKEN || "",
      bakongApiUrl: saved?.bakongApiUrl || process.env.BAKONG_API_URL || "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5",
      abaMerchantId: saved?.abaMerchantId || process.env.ABA_PAYWAY_MERCHANT_ID || "",
      abaApiKey: saved?.abaApiKey || process.env.ABA_PAYWAY_API_KEY || "",
      abaApiUrl: saved?.abaApiUrl || process.env.ABA_PAYWAY_CHECK_URL || "https://checkout.payway.com.kh/api/payment-gateway/v1/payments/check-transaction-2",
      enableBakongKhqr: saved?.enableBakongKhqr ?? true,
      enableAbaKhqr: saved?.enableAbaKhqr ?? true,
      enableCashUsd: saved?.enableCashUsd ?? true,
      enableCashKhr: saved?.enableCashKhr ?? true,
      enableCustomerCredit: saved?.enableCustomerCredit ?? true,
      customKhqrRawString: saved?.customKhqrRawString || "",
    };
  }

  /**
   * Save KHQR / Bakong / Payments Configuration to Supabase
   */
  static async saveKhqrConfig(config: Partial<KhqrConfig>): Promise<boolean> {
    const existing = await this.getKhqrConfig();
    const merged: KhqrConfig = {
      ...existing,
      ...config,
    };
    if (config.bakongToken !== undefined) {
      await this.set("BAKONG_OPEN_API_TOKEN", config.bakongToken.trim(), "PAYMENT", "Bakong Open API Bearer Token");
    }
    return this.set("KHQR_CONFIG", merged, "PAYMENT", "Bakong KHQR payment configurations");
  }

  /**
   * Get Printer Configuration from Supabase
   */
  static async getPrinterConfig(forceRefresh = false): Promise<PrinterConfig> {
    const saved = await this.get<Partial<PrinterConfig>>("PRINTER_CONFIG", {}, forceRefresh);

    return {
      paperSize: saved?.paperSize || "80mm",
      autoDrawerKick: saved?.autoDrawerKick ?? true,
      printDuplicateForKitchen: saved?.printDuplicateForKitchen ?? false,
      headerMessage:
        saved?.headerMessage ||
        "សូមស្វាគមន៍មកកាន់ អាណាចក្រPOS\nឯកទេសលក់ទូរស័ព្ទ កុំព្យូទ័រ និងសេវាជួសជុលរហ័ស",
      footerMessage:
        saved?.footerMessage ||
        "ទំនិញទិញរួចមិនអាចប្តូរប្រាក់វិញបានទេ\nធានាជួសជុលរយៈពេល ៣០ ថ្ងៃ • សូមអរគុណ!",
    };
  }

  /**
   * Save Printer Configuration to Supabase
   */
  static async savePrinterConfig(config: Partial<PrinterConfig>): Promise<boolean> {
    const existing = await this.getPrinterConfig();
    const merged: PrinterConfig = {
      ...existing,
      ...config,
    };
    return this.set("PRINTER_CONFIG", merged, "HARDWARE", "Thermal receipt printer configuration");
  }

  /**
   * Get Scanner Configuration from Supabase
   */
  static async getScannerConfig(forceRefresh = false): Promise<ScannerConfig> {
    const saved = await this.get<Partial<ScannerConfig>>("SCANNER_CONFIG", {}, forceRefresh);

    return {
      scannerMode: saved?.scannerMode || "SCANNER_DEVICE",
      preferredCameraId: saved?.preferredCameraId || "",
      scannerSoundFeedback: saved?.scannerSoundFeedback ?? true,
      scannerAutoAddToCart: saved?.scannerAutoAddToCart ?? true,
      scannerContinuousMode: saved?.scannerContinuousMode ?? false,
    };
  }

  /**
   * Save Scanner Configuration to Supabase
   */
  static async saveScannerConfig(config: Partial<ScannerConfig>): Promise<boolean> {
    const existing = await this.getScannerConfig();
    const merged: ScannerConfig = {
      ...existing,
      ...config,
    };
    return this.set("SCANNER_CONFIG", merged, "HARDWARE", "Barcode and QR scanner configuration");
  }

  /**
   * Get Appearance & Theme Configuration from Supabase
   */
  static async getAppearanceConfig(forceRefresh = false): Promise<AppearanceConfig> {
    const saved = await this.get<Partial<AppearanceConfig>>("APPEARANCE_CONFIG", {}, forceRefresh);

    return {
      themeMode: saved?.themeMode || "light",
      colorPalette: saved?.colorPalette || "emerald-teal",
    };
  }

  /**
   * Save Appearance & Theme Configuration to Supabase
   */
  static async saveAppearanceConfig(config: Partial<AppearanceConfig>): Promise<boolean> {
    const existing = await this.getAppearanceConfig();
    const merged: AppearanceConfig = {
      ...existing,
      ...config,
    };
    return this.set("APPEARANCE_CONFIG", merged, "APPEARANCE", "System theme mode and color palette");
  }

  /**
   * Get POS Display & Card Layout Configuration from Supabase
   */
  static async getPosDisplayConfig(forceRefresh = false): Promise<POSDisplayConfig> {
    const saved = await this.get<Partial<POSDisplayConfig>>("POS_DISPLAY_CONFIG", {}, forceRefresh);

    return {
      layout: saved?.layout || DEFAULT_POS_DISPLAY_CONFIG.layout,
      showImages: saved?.showImages ?? DEFAULT_POS_DISPLAY_CONFIG.showImages,
      showBarcode: saved?.showBarcode ?? DEFAULT_POS_DISPLAY_CONFIG.showBarcode,
      defaultCurrency: saved?.defaultCurrency || DEFAULT_POS_DISPLAY_CONFIG.defaultCurrency,
      showDualPrice: saved?.showDualPrice ?? DEFAULT_POS_DISPLAY_CONFIG.showDualPrice,
      itemsPerRow: saved?.itemsPerRow || DEFAULT_POS_DISPLAY_CONFIG.itemsPerRow,
      enableHapticFeedback: saved?.enableHapticFeedback ?? DEFAULT_POS_DISPLAY_CONFIG.enableHapticFeedback,
      enableClickSound: saved?.enableClickSound ?? DEFAULT_POS_DISPLAY_CONFIG.enableClickSound,
    };
  }

  /**
   * Save POS Display & Card Layout Configuration to Supabase
   */
  static async savePosDisplayConfig(config: Partial<POSDisplayConfig>): Promise<boolean> {
    const existing = await this.getPosDisplayConfig();
    const merged: POSDisplayConfig = {
      ...existing,
      ...config,
    };
    return this.set("POS_DISPLAY_CONFIG", merged, "POS", "POS dynamic card layout and catalog display configuration");
  }

  /**
   * Get Telegram Bot Config from Supabase
   */
  static async getTelegramConfig(forceRefresh = false): Promise<TelegramConfig> {
    const saved = await this.get<Partial<TelegramConfig>>("TELEGRAM_CONFIG", {}, forceRefresh);
    const botToken = saved?.botToken || process.env.TELEGRAM_BOT_TOKEN || "";
    const chatId = saved?.chatId || process.env.TELEGRAM_CHAT_ID || "";

    return {
      botToken,
      chatId,
      notifyOnSale: saved?.notifyOnSale ?? true,
      notifyOnLowStock: saved?.notifyOnLowStock ?? true,
      notifyOnRepair: saved?.notifyOnRepair ?? true,
      notifyDailyReport: saved?.notifyDailyReport ?? true,
      notifyOnInstallmentDue: saved?.notifyOnInstallmentDue ?? true,
      installmentReminderDays: saved?.installmentReminderDays ?? 3,
    };
  }

  /**
   * Save Telegram Bot Config to Supabase
   */
  static async saveTelegramConfig(config: Partial<TelegramConfig>): Promise<boolean> {
    const existing = await this.getTelegramConfig();
    const merged: TelegramConfig = {
      botToken: config.botToken !== undefined ? config.botToken.trim() : existing.botToken,
      chatId: config.chatId !== undefined ? config.chatId.trim() : existing.chatId,
      notifyOnSale: config.notifyOnSale ?? existing.notifyOnSale ?? true,
      notifyOnLowStock: config.notifyOnLowStock ?? existing.notifyOnLowStock ?? true,
      notifyOnRepair: config.notifyOnRepair ?? existing.notifyOnRepair ?? true,
      notifyDailyReport: config.notifyDailyReport ?? existing.notifyDailyReport ?? true,
      notifyOnInstallmentDue: config.notifyOnInstallmentDue ?? existing.notifyOnInstallmentDue ?? true,
      installmentReminderDays: config.installmentReminderDays ?? existing.installmentReminderDays ?? 3,
    };

    await this.set("TELEGRAM_CONFIG", merged, "TELEGRAM", "Telegram notification & alert settings");
    if (merged.botToken) setInProcessEnv("TELEGRAM_BOT_TOKEN", merged.botToken);
    if (merged.chatId) setInProcessEnv("TELEGRAM_CHAT_ID", merged.chatId);

    return true;
  }

  /**
   * Get Loan, Installment, and Pawn Contract Settings from Supabase
   */
  static async getLoanContractSettings(forceRefresh = false): Promise<LoanContractSettings> {
    const saved = await this.get<Partial<LoanContractSettings>>("LOAN_CONTRACT_SETTINGS", {}, forceRefresh);

    return {
      installmentInterestRate: saved?.installmentInterestRate !== undefined ? Number(saved.installmentInterestRate) : 1.5,
      pawnMonthlyInterestRate: saved?.pawnMonthlyInterestRate !== undefined ? Number(saved.pawnMonthlyInterestRate) : 2.5,
      pawnDailyInterestRate: saved?.pawnDailyInterestRate !== undefined ? Number(saved.pawnDailyInterestRate) : 0.1,
      latePenaltyPerDayUsd: saved?.latePenaltyPerDayUsd !== undefined ? Number(saved.latePenaltyPerDayUsd) : 1.0,
      defaultPawnDurationDays: saved?.defaultPawnDurationDays !== undefined ? Number(saved.defaultPawnDurationDays) : 30,
      defaultPawnDurationType: saved?.defaultPawnDurationType || "DAYS",
      storeName: saved?.storeName || process.env.NEXT_PUBLIC_APP_NAME || "អាណាចក្រPOS (ANACHAK POS)",
      storePhone: saved?.storePhone || "012 345 678 / 096 376 0229",
      storeAddress: saved?.storeAddress || "រាជធានីភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា",
      witnessName: saved?.witnessName || "",
      installmentContractTitle: saved?.installmentContractTitle || "កិច្ចសន្យាទិញ-លក់បង់រំលស់ទំនិញ",
      installmentContractTerms: saved?.installmentContractTerms || DEFAULT_INSTALLMENT_TERMS,
      pawnContractTitle: saved?.pawnContractTitle || "កិច្ចសន្យាបញ្ចាំទ្រព្យ និងប័ណ្ណទទួលបញ្ចាំ",
      pawnContractTerms: saved?.pawnContractTerms || DEFAULT_PAWN_TERMS,
    };
  }

  /**
   * Save Loan, Installment, and Pawn Contract Settings to Supabase
   */
  static async saveLoanContractSettings(config: Partial<LoanContractSettings>): Promise<boolean> {
    const existing = await this.getLoanContractSettings();
    const merged: LoanContractSettings = {
      ...existing,
      ...config,
    };
    return this.set("LOAN_CONTRACT_SETTINGS", merged, "LOANS", "Installment, Pawn contract terms and interest rate settings");
  }

  /**
   * Get Expense Categories from Supabase Database
   */
  static async getExpenseCategories(forceRefresh = false): Promise<string[]> {
    const saved = await this.get<string[]>("EXPENSE_CATEGORIES", DEFAULT_EXPENSE_CATEGORIES, forceRefresh);
    if (Array.isArray(saved) && saved.length > 0) {
      const combined = Array.from(new Set([...saved, ...DEFAULT_EXPENSE_CATEGORIES]));
      return combined.filter(Boolean);
    }
    return DEFAULT_EXPENSE_CATEGORIES;
  }

  /**
   * Add a new Expense Category to Supabase Database
   */
  static async addExpenseCategory(categoryName: string): Promise<string[]> {
    const trimmed = categoryName?.trim();
    if (!trimmed) return await this.getExpenseCategories();
    const current = await this.getExpenseCategories(true);
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed];
      await this.set("EXPENSE_CATEGORIES", updated, "ACCOUNTING", "Business expense categories list");
      return updated;
    }
    return current;
  }

  /**
   * Delete an Expense Category from Supabase Database
   */
  static async deleteExpenseCategory(categoryName: string): Promise<string[]> {
    const trimmed = categoryName?.trim();
    const current = await this.getExpenseCategories(true);
    const updated = current.filter((c) => c !== trimmed);
    await this.set("EXPENSE_CATEGORIES", updated, "ACCOUNTING", "Business expense categories list");
    return updated;
  }

  /**
   * Set entire Expense Categories list in Supabase Database
   */
  static async setExpenseCategories(categories: string[]): Promise<string[]> {
    const cleaned = Array.from(new Set(categories.map((c) => c.trim()).filter(Boolean)));
    await this.set("EXPENSE_CATEGORIES", cleaned, "ACCOUNTING", "Business expense categories list");
    return cleaned;
  }
}
