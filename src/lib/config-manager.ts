import { supabaseAdmin } from "@/lib/supabase";
import { normalizeDatabaseUrl } from "@/lib/prisma";

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
}

export interface PosSystemSettings {
  currency: string;
  exchangeRateKhr: number;
  exchangeRateThb: number;
  defaultTaxRate: number;
  appName: string;
  appSlogan: string;
}

// In-Memory Hot Cache
const cache = new Map<string, { value: any; expiresAt: number }>();
const CACHE_TTL_MS = 15000; // 15 seconds TTL for fast responses while allowing fast propagation

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
   * Get a config value from Supabase with caching and env fallback
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
      // 1. Try reading from Supabase system_configs table
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
    } catch (err) {
      // Fallback silently if table not created or network issue
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

    try {
      // 1. Upsert into Supabase system_configs table
      const { error } = await supabaseAdmin.from("system_configs").upsert(
        {
          key,
          value: stringVal,
          category,
          description: description || null,
          updatedAt: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      if (error) {
        console.warn(`[ConfigManager] Supabase set error for "${key}":`, error.message);
      }
    } catch (err: any) {
      console.warn(`[ConfigManager] Failed saving "${key}" to Supabase:`, err.message);
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
      const { error } = await supabaseAdmin
        .from("system_configs")
        .upsert(rows, { onConflict: "key" });

      if (error) {
        console.warn("[ConfigManager] Supabase batch upsert warning:", error.message);
      }
    } catch (err: any) {
      console.warn("[ConfigManager] Failed batch upserting to Supabase:", err.message);
    }

    // Update memory cache
    const now = Date.now();
    for (const [key, val] of Object.entries(entries)) {
      cache.set(key, { value: val, expiresAt: now + CACHE_TTL_MS });
      if (typeof val === "string") {
        setInProcessEnv(key, val);
      }
    }

    return true;
  }

  // ============================================================================
  // TYPED CONFIG HELPERS
  // ============================================================================

  /**
   * Get Active Database Connections (Database URL, Direct URL, Supabase Keys)
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
    };

    await this.set("TELEGRAM_CONFIG", merged, "TELEGRAM", "Telegram notification & alert settings");
    if (merged.botToken) setInProcessEnv("TELEGRAM_BOT_TOKEN", merged.botToken);
    if (merged.chatId) setInProcessEnv("TELEGRAM_CHAT_ID", merged.chatId);

    return true;
  }

  /**
   * Get KHQR / Bakong Payment Config
   */
  static async getKhqrConfig(forceRefresh = false): Promise<KhqrConfig> {
    const saved = await this.get<Partial<KhqrConfig>>("KHQR_CONFIG", {}, forceRefresh);

    return {
      merchantName: saved?.merchantName || process.env.NEXT_PUBLIC_KHQR_MERCHANT_NAME || "YOUR MERCHANT NAME",
      merchantCity: saved?.merchantCity || process.env.NEXT_PUBLIC_KHQR_MERCHANT_CITY || "Phnom Penh",
      merchantId: saved?.merchantId || process.env.NEXT_PUBLIC_KHQR_MERCHANT_ID || "85514965629",
      bakongAccount: saved?.bakongAccount || process.env.NEXT_PUBLIC_BAKONG_ACCOUNT || "khqr@aclb",
      acquiringBank: saved?.acquiringBank || process.env.NEXT_PUBLIC_ACQUIRING_BANK || "ACLEDA",
      merchantMobile: saved?.merchantMobile || process.env.NEXT_PUBLIC_MERCHANT_MOBILE || "0963760229",
      bakongToken: saved?.bakongToken || process.env.BAKONG_OPEN_API_TOKEN || process.env.BAKONG_API_TOKEN || "",
      bakongApiUrl: saved?.bakongApiUrl || process.env.BAKONG_API_URL || "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5",
    };
  }

  /**
   * Save KHQR / Bakong Payment Config
   */
  static async saveKhqrConfig(config: Partial<KhqrConfig>): Promise<boolean> {
    const existing = await this.getKhqrConfig();
    const merged: KhqrConfig = {
      ...existing,
      ...config,
    };
    return this.set("KHQR_CONFIG", merged, "PAYMENT", "Bakong KHQR payment configurations");
  }

  /**
   * Get POS Exchange Rate and Currency Settings
   */
  static async getPosSettings(forceRefresh = false): Promise<PosSystemSettings> {
    const saved = await this.get<Partial<PosSystemSettings>>("POS_SETTINGS", {}, forceRefresh);

    return {
      currency: saved?.currency || process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "USD",
      exchangeRateKhr: saved?.exchangeRateKhr || Number(process.env.NEXT_PUBLIC_EXCHANGE_RATE_KHR) || 4100,
      exchangeRateThb: saved?.exchangeRateThb || Number(process.env.NEXT_PUBLIC_EXCHANGE_RATE_THB) || 36,
      defaultTaxRate: saved?.defaultTaxRate ?? 0,
      appName: saved?.appName || process.env.NEXT_PUBLIC_APP_NAME || "អាណាចក្រPOS",
      appSlogan: saved?.appSlogan || process.env.NEXT_PUBLIC_APP_SLOGAN || "ប្រព័ន្ធគ្រប់គ្រងការលក់ និងសេវាកម្មជួសជុលកម្រិតសហគ្រាស",
    };
  }

  /**
   * Save POS Exchange Rate and Currency Settings
   */
  static async savePosSettings(config: Partial<PosSystemSettings>): Promise<boolean> {
    const existing = await this.getPosSettings();
    const merged: PosSystemSettings = {
      ...existing,
      ...config,
    };
    return this.set("POS_SETTINGS", merged, "GENERAL", "POS currency and exchange rate settings");
  }
}
