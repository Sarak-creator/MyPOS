import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getAuthSession } from "@/lib/auth";
import { RoleType } from "@prisma/client";
import { ConfigManager } from "@/lib/config-manager";

export const dynamic = "force-dynamic";

// In-memory cache for tenant settings (TTL: 5 seconds for fast propagation across devices)
const settingsCache = new Map<string, { data: any; expiresAt: number }>();

function invalidateSettingsCache(tenantId?: string) {
  if (tenantId) settingsCache.delete(tenantId);
  else settingsCache.clear();
  ConfigManager.invalidateCache();
}

// GET /api/settings - Fetch all settings from Supabase Database
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("ping") === "true") {
      await prisma.$queryRaw`SELECT 1`;
      return NextResponse.json({ success: true, ping: "pong", status: "HEALTHY", timestamp: Date.now() });
    }

    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, tenant: null, branches: [], users: [] });
    }

    // Check in-memory cache (unless forceRefresh is requested)
    const forceRefresh = searchParams.get("refresh") === "true";
    const now = Date.now();
    if (!forceRefresh) {
      const cached = settingsCache.get(tenantId);
      if (cached && cached.expiresAt > now) {
        return NextResponse.json(cached.data);
      }
    }

    // Fetch tenant and all Supabase configurations in parallel
    const [
      tenant,
      businessProfile,
      posConfig,
      khqrConfig,
      printerConfig,
      scannerConfig,
      appearanceConfig,
      telegramConfig,
      loanContractSettings,
    ] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          branches: {
            include: { warehouses: true },
            orderBy: { createdAt: "asc" },
          },
          users: {
            select: {
              id: true,
              username: true,
              email: true,
              fullName: true,
              fullNameKh: true,
              phone: true,
              role: true,
              permissions: true,
              branchId: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
              isActive: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      ConfigManager.getBusinessProfile(forceRefresh),
      ConfigManager.getPosSettings(forceRefresh),
      ConfigManager.getKhqrConfig(forceRefresh),
      ConfigManager.getPrinterConfig(forceRefresh),
      ConfigManager.getScannerConfig(forceRefresh),
      ConfigManager.getAppearanceConfig(forceRefresh),
      ConfigManager.getTelegramConfig(forceRefresh),
      ConfigManager.getLoanContractSettings(forceRefresh),
    ]);

    // Merge business profile with tenant database record
    const mergedBusinessProfile = {
      ...businessProfile,
      nameKh: tenant?.name || businessProfile.nameKh,
      legalName: tenant?.legalName || businessProfile.legalName,
      vatNumber: tenant?.vatNumber || businessProfile.vatNumber,
      phone: tenant?.phone || businessProfile.phone,
      email: tenant?.email || businessProfile.email,
      address: tenant?.address || businessProfile.address,
      baseCurrency: tenant?.currency || businessProfile.baseCurrency || "USD",
      logoUrl: tenant?.logoUrl || businessProfile.logoUrl,
    };

    const responseData = {
      success: true,
      tenant,
      branches: tenant?.branches || [],
      users: tenant?.users || [],
      businessProfile: mergedBusinessProfile,
      posConfig: {
        ...posConfig,
        exchangeRateKhr: tenant?.exchangeRate ? Number(tenant.exchangeRate) : posConfig.exchangeRateKhr,
        defaultTaxRate: tenant?.defaultTaxRate !== undefined ? Number(tenant.defaultTaxRate) : posConfig.defaultTaxRate,
        currency: tenant?.currency || posConfig.currency,
      },
      paymentConfig: khqrConfig,
      khqrConfig,
      printerConfig,
      scannerConfig,
      appearanceConfig,
      telegramConfig,
      loanContractSettings,
      // Legacy compatibility format for existing consumers
      settings: {
        exchangeRateKhr: tenant?.exchangeRate || posConfig.exchangeRateKhr,
        exchangeRateThb: posConfig.exchangeRateThb,
        vatRatePercent: tenant?.defaultTaxRate ?? posConfig.defaultTaxRate,
        currency: tenant?.currency || posConfig.currency,
        invoicePrefix: posConfig.invoicePrefix,
        allowManualDiscount: posConfig.allowManualDiscount,
        maxDiscountPercent: posConfig.maxDiscountPercent,
        enableSoundEffects: posConfig.enableSoundEffects,
        autoPrintReceipt: posConfig.autoPrintReceipt,
        requireCustomerPhone: posConfig.requireCustomerPhone,
        lowStockThreshold: posConfig.lowStockThreshold,
        dualDisplayPrice: posConfig.dualDisplayPrice,
        bakongMerchantId: khqrConfig.merchantId || khqrConfig.bakongAccount,
        bakongMerchantName: khqrConfig.merchantName,
        bakongMerchantCity: khqrConfig.merchantCity,
        merchantID: khqrConfig.merchantId,
        acquiringBank: khqrConfig.acquiringBank,
        mobileNumber: khqrConfig.merchantMobile,
        bakongOpenApiToken: khqrConfig.bakongToken,
        bakongToken: khqrConfig.bakongToken,
        abaMerchantId: khqrConfig.abaMerchantId || "",
        abaApiKey: khqrConfig.abaApiKey || "",
        enableBakongKhqr: khqrConfig.enableBakongKhqr ?? true,
        enableAbaKhqr: khqrConfig.enableAbaKhqr ?? true,
        enableCashUsd: khqrConfig.enableCashUsd ?? true,
        enableCashKhr: khqrConfig.enableCashKhr ?? true,
        enableCustomerCredit: khqrConfig.enableCustomerCredit ?? true,
        customKhqrRawString: khqrConfig.customKhqrRawString || "",
        paperSize: printerConfig.paperSize,
        receiptHeaderMessage: printerConfig.headerMessage,
        receiptFooterMessage: printerConfig.footerMessage,
        scannerMode: scannerConfig.scannerMode,
        scannerSoundFeedback: scannerConfig.scannerSoundFeedback,
        scannerAutoAddToCart: scannerConfig.scannerAutoAddToCart,
        scannerContinuousMode: scannerConfig.scannerContinuousMode,
        themeMode: appearanceConfig.themeMode,
        colorPalette: appearanceConfig.colorPalette,
      },
    };

    // Cache briefly (5s) to reduce database load while keeping fast device-sync
    settingsCache.set(tenantId, { data: responseData, expiresAt: now + 5000 });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/settings - Update and persist settings directly to Supabase Database
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const { action = "UPDATE_ALL_SETTINGS" } = body;

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 400 });
    }

    // Verify permissions: Only SUPER_ADMIN, ADMIN, or users with settings:manage/users:manage can modify settings
    const isSuperAdminOrAdmin = session?.role === "SUPER_ADMIN" || session?.role === "ADMIN";
    const canManageSettings = isSuperAdminOrAdmin || session?.permissions?.includes("settings:manage") || session?.permissions?.includes("*");
    const canManageUsers = isSuperAdminOrAdmin || session?.permissions?.includes("users:manage") || session?.permissions?.includes("*");

    if (session && !isSuperAdminOrAdmin) {
      const isUserAction = action === "ADD_USER" || action === "UPDATE_USER" || action === "DELETE_USER" || action === "RESET_PASSWORD";
      if (isUserAction && !canManageUsers) {
        return NextResponse.json(
          { success: false, error: "លោកអ្នកគ្មានសិទ្ធិគ្រប់គ្រងបុគ្គលិក ឬអ្នកប្រើប្រាស់ទេ (Permission Denied)" },
          { status: 403 }
        );
      }
      if (!isUserAction && !canManageSettings) {
        return NextResponse.json(
          { success: false, error: "លោកអ្នកមានសិទ្ធិតែត្រឹមមើលការកំណត់ប៉ុណ្ណោះ គ្មានសិទ្ធិកែប្រែទេ (View-only: Modification not allowed for Branch Manager)" },
          { status: 403 }
        );
      }
    }

    // Invalidate cached settings on any modification
    invalidateSettingsCache(tenantId);

    // =========================================================================
    // 0. UPDATE ALL SETTINGS AT ONCE (GLOBAL SAVE FROM SETTINGS PAGE)
    // =========================================================================
    if (action === "UPDATE_ALL_SETTINGS") {
      const {
        businessProfile,
        posConfig,
        paymentConfig,
        printerConfig,
        scannerConfig,
        appearanceConfig,
        telegramConfig,
      } = body;

      const tasks: Promise<any>[] = [];

      // 1. Business Profile & Tenant
      if (businessProfile) {
        tasks.push(
          ConfigManager.saveBusinessProfile(businessProfile),
          prisma.tenant.update({
            where: { id: tenantId },
            data: {
              name: businessProfile.nameKh || undefined,
              legalName: businessProfile.legalName || undefined,
              vatNumber: businessProfile.vatNumber || undefined,
              phone: businessProfile.phone || undefined,
              email: businessProfile.email || undefined,
              address: businessProfile.address || undefined,
              currency: businessProfile.baseCurrency || undefined,
              logoUrl: businessProfile.logoUrl || undefined,
            },
          }).catch(() => {})
        );
      }

      // 2. POS Settings
      if (posConfig) {
        tasks.push(
          ConfigManager.savePosSettings(posConfig),
          prisma.tenant.update({
            where: { id: tenantId },
            data: {
              exchangeRate: posConfig.exchangeRateKhr ? Number(posConfig.exchangeRateKhr) : undefined,
              defaultTaxRate: posConfig.defaultTaxRate !== undefined ? Number(posConfig.defaultTaxRate) : undefined,
              currency: posConfig.currency || undefined,
            },
          }).catch(() => {})
        );
      }

      // 3. Payment & KHQR
      if (paymentConfig) {
        tasks.push(ConfigManager.saveKhqrConfig(paymentConfig));
      }

      // 4. Printer
      if (printerConfig) {
        tasks.push(ConfigManager.savePrinterConfig(printerConfig));
      }

      // 5. Scanner
      if (scannerConfig) {
        tasks.push(ConfigManager.saveScannerConfig(scannerConfig));
      }

      // 6. Appearance
      if (appearanceConfig) {
        tasks.push(ConfigManager.saveAppearanceConfig(appearanceConfig));
      }

      // 7. Telegram
      if (telegramConfig) {
        tasks.push(ConfigManager.saveTelegramConfig(telegramConfig));
      }

      await Promise.all(tasks);

      return NextResponse.json({
        success: true,
        message: "ការកំណត់ទាំងអស់ត្រូវបានរក្សាទុក និងធ្វើសមកាលកម្មក្នុង Supabase Database ដោយជោគជ័យ!",
      });
    }

    // =========================================================================
    // 1. UPDATE TENANT / BUSINESS PROFILE
    // =========================================================================
    if (action === "UPDATE_TENANT" || action === "UPDATE_BUSINESS_PROFILE") {
      const {
        name,
        nameKh,
        nameEn,
        legalName,
        vatNumber,
        phone,
        email,
        address,
        website,
        telegramChannel,
        facebookPage,
        businessType,
        storeAddress,
        currency,
        exchangeRate,
        defaultTaxRate,
      } = body;

      const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: nameKh || name || undefined,
          legalName: legalName || undefined,
          vatNumber: vatNumber || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          storeAddress: storeAddress ? storeAddress.trim().toLowerCase() : undefined,
          currency: currency || undefined,
          exchangeRate: exchangeRate !== undefined ? Number(exchangeRate) : undefined,
          defaultTaxRate: defaultTaxRate !== undefined ? Number(defaultTaxRate) : undefined,
        },
      });

      // Persist full business profile to Supabase system_configs
      await ConfigManager.saveBusinessProfile({
        nameKh: nameKh || name,
        nameEn,
        legalName,
        vatNumber,
        phone,
        email,
        address,
        website,
        telegramChannel,
        facebookPage,
        businessType,
        baseCurrency: currency || "USD",
      });

      if (currency || exchangeRate !== undefined || defaultTaxRate !== undefined) {
        await ConfigManager.savePosSettings({
          currency: currency || undefined,
          exchangeRateKhr: exchangeRate !== undefined ? Number(exchangeRate) : undefined,
          defaultTaxRate: defaultTaxRate !== undefined ? Number(defaultTaxRate) : undefined,
        });
      }

      return NextResponse.json({
        success: true,
        tenant: updated,
        message: "ព័ត៌មានអាជីវកម្មត្រូវបានរក្សាទុកក្នុង Supabase Database ដោយជោគជ័យ!",
      });
    }

    // =========================================================================
    // 2. UPDATE POS & CURRENCY SETTINGS
    // =========================================================================
    if (action === "UPDATE_POS_CONFIG" || action === "UPDATE_POS_SETTINGS") {
      const {
        currency,
        exchangeRateKhr,
        exchangeRateThb,
        defaultTaxRate,
        invoicePrefix,
        allowManualDiscount,
        maxDiscountPercent,
        enableSoundEffects,
        autoPrintReceipt,
        requireCustomerPhone,
        lowStockThreshold,
        dualDisplayPrice,
        appName,
        appSlogan,
      } = body;

      await ConfigManager.savePosSettings({
        currency,
        exchangeRateKhr: exchangeRateKhr ? Number(exchangeRateKhr) : undefined,
        exchangeRateThb: exchangeRateThb ? Number(exchangeRateThb) : undefined,
        defaultTaxRate: defaultTaxRate !== undefined ? Number(defaultTaxRate) : undefined,
        invoicePrefix,
        allowManualDiscount,
        maxDiscountPercent: maxDiscountPercent !== undefined ? Number(maxDiscountPercent) : undefined,
        enableSoundEffects,
        autoPrintReceipt,
        requireCustomerPhone,
        lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : undefined,
        dualDisplayPrice,
        appName,
        appSlogan,
      });

      // Sync exchange rate & tax rate to Tenant record
      if (tenantId) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            currency: currency || undefined,
            exchangeRate: exchangeRateKhr ? Number(exchangeRateKhr) : undefined,
            defaultTaxRate: defaultTaxRate !== undefined ? Number(defaultTaxRate) : undefined,
          },
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: "ការកំណត់រូបិយប័ណ្ណ និងប្រតិបត្តិការ POS ត្រូវបានរក្សាទុកក្នុង Supabase រួចរាល់!",
      });
    }

    // =========================================================================
    // 3. UPDATE PAYMENTS & KHQR SETTINGS
    // =========================================================================
    if (action === "UPDATE_PAYMENTS" || action === "UPDATE_KHQR") {
      const {
        merchantName,
        merchantCity,
        merchantId,
        bakongAccount,
        acquiringBank,
        merchantMobile,
        bakongToken,
        abaMerchantId,
        abaApiKey,
        enableBakongKhqr,
        enableAbaKhqr,
        enableCashUsd,
        enableCashKhr,
        enableCustomerCredit,
        customKhqrRawString,
      } = body;

      await ConfigManager.saveKhqrConfig({
        merchantName,
        merchantCity,
        merchantId: merchantId || bakongAccount,
        bakongAccount,
        acquiringBank,
        merchantMobile,
        bakongToken: bakongToken !== undefined ? String(bakongToken).trim() : undefined,
        abaMerchantId: abaMerchantId !== undefined ? String(abaMerchantId).trim() : undefined,
        abaApiKey: abaApiKey !== undefined ? String(abaApiKey).trim() : undefined,
        enableBakongKhqr,
        enableAbaKhqr,
        enableCashUsd,
        enableCashKhr,
        enableCustomerCredit,
        customKhqrRawString,
      });

      return NextResponse.json({
        success: true,
        message: "ការកំណត់ KHQR & ការទូទាត់ត្រូវបានរក្សាទុកក្នុង Supabase Database រួចរាល់!",
      });
    }

    // =========================================================================
    // 4. UPDATE PRINTER CONFIGURATION
    // =========================================================================
    if (action === "UPDATE_PRINTER") {
      const { paperSize, autoDrawerKick, printDuplicateForKitchen, headerMessage, footerMessage } = body;

      await ConfigManager.savePrinterConfig({
        paperSize,
        autoDrawerKick,
        printDuplicateForKitchen,
        headerMessage,
        footerMessage,
      });

      return NextResponse.json({
        success: true,
        message: "ការកំណត់ម៉ាស៊ីនបោះពុម្ពត្រូវបានរក្សាទុកក្នុង Supabase Database រួចរាល់!",
      });
    }

    // =========================================================================
    // 5. UPDATE SCANNER CONFIGURATION
    // =========================================================================
    if (action === "UPDATE_SCANNER") {
      const { scannerMode, preferredCameraId, scannerSoundFeedback, scannerAutoAddToCart, scannerContinuousMode } = body;

      await ConfigManager.saveScannerConfig({
        scannerMode,
        preferredCameraId,
        scannerSoundFeedback,
        scannerAutoAddToCart,
        scannerContinuousMode,
      });

      return NextResponse.json({
        success: true,
        message: "ការកំណត់ឧបករណ៍ស្កេនបាកូដត្រូវបានរក្សាទុកក្នុង Supabase Database រួចរាល់!",
      });
    }

    // =========================================================================
    // 6. UPDATE APPEARANCE & THEME
    // =========================================================================
    if (action === "UPDATE_APPEARANCE") {
      const { themeMode, colorPalette } = body;

      await ConfigManager.saveAppearanceConfig({
        themeMode,
        colorPalette,
      });

      return NextResponse.json({
        success: true,
        message: "ការកំណត់រូបរាង និងពណ៌ប្រព័ន្ធត្រូវបានរក្សាទុកក្នុង Supabase Database រួចរាល់!",
      });
    }

    // =========================================================================
    // 7. UPDATE TELEGRAM CONFIGURATION
    // =========================================================================
    if (action === "UPDATE_TELEGRAM") {
      const {
        botToken,
        chatId,
        notifyOnSale,
        notifyOnLowStock,
        notifyOnRepair,
        notifyDailyReport,
        notifyOnInstallmentDue,
        installmentReminderDays,
      } = body;

      await ConfigManager.saveTelegramConfig({
        botToken,
        chatId,
        notifyOnSale,
        notifyOnLowStock,
        notifyOnRepair,
        notifyDailyReport,
        notifyOnInstallmentDue,
        installmentReminderDays,
      });

      return NextResponse.json({
        success: true,
        message: "ការកំណត់ Telegram Bot ត្រូវបានរក្សាទុកក្នុង Supabase Database រួចរាល់!",
      });
    }

    // =========================================================================
    // 8. ADD BRANCH
    // =========================================================================
    if (action === "ADD_BRANCH") {
      const { code, name, phone, address } = body;
      if (!code || !name) {
        return NextResponse.json({ success: false, error: "Code and Name are required" }, { status: 400 });
      }

      const newBranch = await prisma.branch.create({
        data: {
          tenantId,
          code: code.trim(),
          name: name.trim(),
          phone: phone || undefined,
          address: address || undefined,
          warehouses: {
            create: {
              name: `ឃ្លាំង ${name.trim()}`,
              isDefault: true,
            },
          },
        },
      });

      return NextResponse.json({ success: true, branch: newBranch, message: "Branch created" });
    }

    // =========================================================================
    // 9. UPDATE BRANCH
    // =========================================================================
    if (action === "UPDATE_BRANCH") {
      const { branchId, code, name, phone, address } = body;
      if (!branchId || !name) {
        return NextResponse.json({ success: false, error: "Branch ID and Name are required" }, { status: 400 });
      }

      const updated = await prisma.branch.update({
        where: { id: branchId },
        data: {
          code: code ? code.trim() : undefined,
          name: name.trim(),
          phone: phone || undefined,
          address: address || undefined,
        },
      });

      return NextResponse.json({ success: true, branch: updated, message: "Branch updated" });
    }

    // =========================================================================
    // 10. DELETE BRANCH
    // =========================================================================
    if (action === "DELETE_BRANCH") {
      const { branchId } = body;
      if (!branchId) {
        return NextResponse.json({ success: false, error: "Branch ID is required" }, { status: 400 });
      }

      const branchCount = await prisma.branch.count({ where: { tenantId } });
      if (branchCount <= 1) {
        return NextResponse.json({ success: false, error: "មិនអាចលុបសាខាចុងក្រោយបានទេ (Cannot delete only branch)" }, { status: 400 });
      }

      await prisma.branch.delete({ where: { id: branchId } });
      return NextResponse.json({ success: true, message: "Branch deleted" });
    }

    // =========================================================================
    // 11. ADD USER
    // =========================================================================
    if (action === "ADD_USER") {
      const { username, password, fullName, fullNameKh, phone, role, branchId, permissions } = body;
      if (!username || !password || !fullName) {
        return NextResponse.json({ success: false, error: "Username, Password, and Full Name are required" }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
      if (existing) {
        return NextResponse.json({ success: false, error: "Username នេះមានរួចហើយ (Username already exists)" }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);
      const newUser = await prisma.user.create({
        data: {
          tenantId,
          username: username.trim().toLowerCase(),
          passwordHash,
          fullName: fullName.trim(),
          fullNameKh: fullNameKh ? fullNameKh.trim() : undefined,
          phone: phone || undefined,
          role: (role as RoleType) || RoleType.CASHIER,
          branchId: branchId || undefined,
          permissions: Array.isArray(permissions) ? permissions : [],
        },
      });

      return NextResponse.json({ success: true, user: newUser, message: "User created" });
    }

    // =========================================================================
    // 12. UPDATE USER
    // =========================================================================
    if (action === "UPDATE_USER") {
      const { userId, fullName, fullNameKh, phone, role, branchId, permissions, isActive } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: fullName !== undefined ? fullName.trim() : undefined,
          fullNameKh: fullNameKh !== undefined ? fullNameKh.trim() : undefined,
          phone: phone !== undefined ? phone : undefined,
          role: role ? (role as RoleType) : undefined,
          branchId: branchId !== undefined ? (branchId || null) : undefined,
          permissions: Array.isArray(permissions) ? permissions : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
      });

      return NextResponse.json({ success: true, user: updated, message: "User updated" });
    }

    // =========================================================================
    // 13. DELETE USER
    // =========================================================================
    if (action === "DELETE_USER") {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
      }

      if (session?.userId === userId) {
        return NextResponse.json({ success: false, error: "មិនអាចលុបគណនីដែលកំពុង Login បានទេ (Cannot delete self)" }, { status: 400 });
      }

      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json({ success: true, message: "User deleted" });
    }

    // =========================================================================
    // 14. RESET PASSWORD
    // =========================================================================
    if (action === "RESET_PASSWORD") {
      const { userId, newPassword } = body;
      if (!userId || !newPassword) {
        return NextResponse.json({ success: false, error: "User ID and New Password are required" }, { status: 400 });
      }

      const passwordHash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      return NextResponse.json({ success: true, message: "ពាក្យសម្ងាត់ត្រូវបានប្តូរដោយជោគជ័យ (Password reset)" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
