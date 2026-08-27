import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { exec } from "child_process";
import { promisify } from "util";
import { AccountType, ProductType, RoleType } from "@prisma/client";

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

// GET /api/database/setup - Check DB connection and initialization status
export async function GET() {
  try {
    // 1. Test database connection
    await prisma.$queryRaw`SELECT 1`;

    // 2. Check if tables exist and count records
    let isInitialized = false;
    let tenantCount = 0;
    let userCount = 0;
    let productCount = 0;
    let categoryCount = 0;
    let defaultStoreAddress = "anajak@anajak.com";

    try {
      tenantCount = await prisma.tenant.count();
      userCount = await prisma.user.count();
      productCount = await prisma.product.count();
      categoryCount = await prisma.category.count();

      if (tenantCount > 0 && userCount > 0) {
        isInitialized = true;
        const firstTenant = await prisma.tenant.findFirst({ select: { storeAddress: true } });
        if (firstTenant?.storeAddress) {
          defaultStoreAddress = firstTenant.storeAddress;
        }
      }
    } catch (e: any) {
      // Tables may not exist yet
      isInitialized = false;
    }

    // Mask database URL for security
    const rawDbUrl = process.env.DATABASE_URL || "";
    let maskedDbUrl = "PostgreSQL Database";
    try {
      if (rawDbUrl) {
        const urlObj = new URL(rawDbUrl.replace("postgresql://", "http://"));
        maskedDbUrl = `postgresql://${urlObj.username}:***@${urlObj.hostname}:${urlObj.port}${urlObj.pathname}`;
      }
    } catch {
      maskedDbUrl = rawDbUrl.length > 20 ? rawDbUrl.slice(0, 15) + "..." : rawDbUrl;
    }

    return NextResponse.json({
      success: true,
      connected: true,
      initialized: isInitialized,
      stats: {
        tenantCount,
        userCount,
        productCount,
        categoryCount,
      },
      defaultStoreAddress,
      databaseUrlMasked: maskedDbUrl,
      message: isInitialized
        ? "Database ត្រូវបានភ្ជាប់ និងមានទិន្នន័យរួចរាល់ហើយ (Database Connected & Initialized)"
        : "Database ត្រូវបានភ្ជាប់ ប៉ុន្តែមិនទាន់មានទិន្នន័យដំបូងនៅឡើយទេ (Database Connected, Needs Initialization)",
    });
  } catch (error: any) {
    console.error("GET /api/database/setup error:", error);
    return NextResponse.json({
      success: false,
      connected: false,
      initialized: false,
      error: error.message || "Failed to connect to PostgreSQL Database",
      message: "មិនអាចភ្ជាប់ទៅកាន់ Database បានទេ សូមពិនិត្យមើល Connection String (Connection Failed)",
    });
  }
}

// POST /api/database/setup - Auto-create database tables and seed required initial data
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      storeName = "អាណាចក្រPOS (Anachak POS)",
      storeAddress = "anajak@anajak.com",
      adminFullName = "Chea Sokha (ជា សុខា)",
      adminUsername = "admin",
      adminPassword = "admin123",
      branchName = "សាខាកណ្តាល ភ្នំពេញ (Phnom Penh Main)",
      forceRecreate = false,
    } = body;

    console.log("🚀 Starting Database Auto-Setup and Initialization...");

    // Step 1: Verify PostgreSQL connection
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbErr: any) {
      throw new Error(`មិនអាចភ្ជាប់ទៅកាន់ Database បានទេ: ${dbErr.message}`);
    }

    // Step 2: Ensure Prisma DB schema is pushed / synced if tables don't exist
    let tablesReady = false;
    try {
      await prisma.tenant.count();
      tablesReady = true;
    } catch (tableErr) {
      console.log("⚡ Tables not found. Executing Prisma db push...");
      try {
        await execAsync("npx prisma db push --skip-generate --accept-data-loss");
        tablesReady = true;
      } catch (pushErr: any) {
        console.error("Prisma db push error:", pushErr);
      }
    }

    // Step 3: Check if tenant already exists or create new
    let tenant = await prisma.tenant.findFirst({
      where: { storeAddress: storeAddress.trim().toLowerCase() },
      include: { branches: { include: { warehouses: true } } },
    });

    if (!tenant || forceRecreate) {
      if (tenant && forceRecreate) {
        // Clean existing records for this tenant
        console.log(`🧹 Recreating data for tenant ${tenant.id}...`);
      }

      const cleanStoreAddress = storeAddress.trim().toLowerCase().includes("@")
        ? storeAddress.trim().toLowerCase()
        : `${storeAddress.trim().toLowerCase()}@anajak.com`;

      // 1. Create Master Tenant
      tenant = await prisma.tenant.create({
        data: {
          storeAddress: cleanStoreAddress,
          name: storeName.trim(),
          legalName: `${storeName.trim()} Co., Ltd.`,
          phone: "012 888 999",
          email: `contact@${cleanStoreAddress.split("@")[0]}.com`,
          address: "#128, មហាវិថីព្រះមុនីវង្ស, រាជធានីភ្នំពេញ",
          plan: "ENTERPRISE",
          branches: {
            create: [
              {
                code: "BR-01",
                name: branchName.trim(),
                nameEn: "Main Head Branch",
                phone: "012 888 999",
                isHeadOffice: true,
                warehouses: {
                  create: [
                    { name: "ឃ្លាំងទំនិញកណ្តាល (Main Warehouse)", isDefault: true },
                    { name: "ឃ្លាំងគ្រឿងបន្លាស់ជួសជុល (Spare Parts Room)", isDefault: false },
                  ],
                },
              },
            ],
          },
        },
        include: { branches: { include: { warehouses: true } } },
      });
    }

    const branchHQ = tenant.branches[0];
    const mainWarehouse = branchHQ?.warehouses.find((w) => w.isDefault) || branchHQ?.warehouses[0];

    // Step 4: Create Admin User if not exists
    const passwordHash = await bcrypt.hash(adminPassword.trim() || "admin123", 10);
    const staffPassword = await bcrypt.hash("123456", 10);

    let adminUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id, username: adminUsername.trim() },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branchHQ?.id,
          username: adminUsername.trim() || "admin",
          email: `${adminUsername.trim()}@${tenant.storeAddress.split("@")[0]}.com`,
          fullName: adminFullName.trim() || "System Administrator",
          fullNameKh: "អ្នកគ្រប់គ្រងប្រព័ន្ធ",
          passwordHash,
          role: RoleType.SUPER_ADMIN,
          permissions: ["*"],
        },
      });
    }

    // Create Cashier if not exists
    const existingCashier = await prisma.user.findFirst({
      where: { tenantId: tenant.id, username: "cashier1" },
    });
    if (!existingCashier) {
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branchHQ?.id,
          username: "cashier1",
          email: `cashier1@${tenant.storeAddress.split("@")[0]}.com`,
          fullName: "Heng Bopha (ហេង បុប្ផា)",
          fullNameKh: "ហេង បុប្ផា",
          passwordHash: staffPassword,
          role: RoleType.CASHIER,
          permissions: ["POS_CASHIER", "VIEW_PRODUCTS", "CREATE_ORDER", "VIEW_CUSTOMERS"],
        },
      }).catch(() => {});
    }

    // Step 5: Seed Chart of Accounts (COA)
    const coaData = [
      { code: "1010", nameKh: "សាច់ប្រាក់ក្នុងដៃ (Cash on Hand USD)", nameEn: "Cash on Hand USD", type: AccountType.ASSET },
      { code: "1020", nameKh: "សាច់ប្រាក់រៀល (Cash KHR)", nameEn: "Cash on Hand KHR", type: AccountType.ASSET },
      { code: "1030", nameKh: "គណនីធនាគារ ABA (ABA Bank Account)", nameEn: "ABA Bank Account", type: AccountType.ASSET },
      { code: "1100", nameKh: "គណនីត្រូវទារ / បំណុលអតិថិជន (Accounts Receivable)", nameEn: "Accounts Receivable (AR)", type: AccountType.ASSET },
      { code: "1200", nameKh: "ស្តុកទំនិញក្នុងដៃ (Merchandise Inventory)", nameEn: "Merchandise Inventory", type: AccountType.ASSET },
      { code: "2010", nameKh: "គណនីត្រូវសងអ្នកផ្គត់ផ្គង់ (Accounts Payable)", nameEn: "Accounts Payable (AP)", type: AccountType.LIABILITY },
      { code: "4010", nameKh: "ចំណូលពីការលក់ទំនិញ POS (POS Retail Sales)", nameEn: "Retail Sales Revenue", type: AccountType.REVENUE },
      { code: "4020", nameKh: "ចំណូលពីសេវាកម្មជួសជុល (Repair Service Revenue)", nameEn: "Repair Service Revenue", type: AccountType.REVENUE },
      { code: "5010", nameKh: "ថ្លៃដើមទំនិញលក់ចេញ (Cost of Goods Sold - COGS)", nameEn: "Cost of Goods Sold", type: AccountType.EXPENSE },
      { code: "6010", nameKh: "ចំណាយប្រាក់បៀវត្សបុគ្គលិក (Salaries & Wages)", nameEn: "Salaries Expense", type: AccountType.EXPENSE },
    ];

    for (const acc of coaData) {
      const exists = await prisma.account.findFirst({
        where: { tenantId: tenant.id, code: acc.code },
      });
      if (!exists) {
        await prisma.account.create({
          data: { tenantId: tenant.id, ...acc },
        }).catch(() => {});
      }
    }

    // Step 6: Seed Initial Product Categories
    const defaultCategories = [
      { nameKh: "ទូរស័ព្ទដៃ & ថេប្លេត", nameEn: "Smartphones & Tablets", slug: "smartphones", icon: "smartphone" },
      { nameKh: "គ្រឿងបន្សំ & កាស", nameEn: "Accessories & Audio", slug: "accessories", icon: "sparkles" },
      { nameKh: "គ្រឿងបន្លាស់ទូរស័ព្ទ", nameEn: "Phone Spare Parts", slug: "spare-parts", icon: "cpu" },
      { nameKh: "សេវាកម្មជួសជុល & កម្មវិធី", nameEn: "Repair Services & Labor", slug: "repair-services", icon: "wrench" },
      { nameKh: "កុំព្យូទ័រ & ឡេបថប", nameEn: "Laptops & Computers", slug: "laptops", icon: "laptop" },
    ];

    const categoryMap: Record<string, string> = {};
    for (const cat of defaultCategories) {
      let existingCat = await prisma.category.findFirst({
        where: { tenantId: tenant.id, slug: cat.slug },
      });
      if (!existingCat) {
        existingCat = await prisma.category.create({
          data: { tenantId: tenant.id, ...cat },
        });
      }
      categoryMap[cat.slug] = existingCat.id;
    }

    // Step 7: Seed Sample Brand & Products with Initial Stock
    let brandApple = await prisma.brand.findFirst({ where: { name: "Apple" } });
    if (!brandApple) {
      brandApple = await prisma.brand.create({ data: { name: "Apple" } });
    }

    // Product 1: iPhone 15 Pro Max (IMEI Item)
    const existingP1 = await prisma.product.findFirst({
      where: { tenantId: tenant.id, sku: { startsWith: "IP15PM" } },
    });

    if (!existingP1 && categoryMap["smartphones"] && branchHQ && mainWarehouse) {
      await prisma.product.create({
        data: {
          tenantId: tenant.id,
          categoryId: categoryMap["smartphones"],
          brandId: brandApple.id,
          sku: `IP15PM-256-NT-${Date.now().toString().slice(-4)}`,
          nameKh: "iPhone 15 Pro Max 256GB Natural Titanium (LL/A)",
          nameEn: "iPhone 15 Pro Max 256GB Natural Titanium",
          type: ProductType.SERIAL_IMEI_ITEM,
          costPriceUsd: 1040.0,
          salePriceUsd: 1169.0,
          salePriceKhr: 1169.0 * 4100,
          minStockAlert: 2,
          unit: "គ្រឿង",
          stockItems: {
            create: [
              {
                branchId: branchHQ.id,
                warehouseId: mainWarehouse.id,
                serialOrImei: `359876100982341`,
                quantity: 1,
                costPriceUsd: 1040.0,
                status: "IN_STOCK",
              },
              {
                branchId: branchHQ.id,
                warehouseId: mainWarehouse.id,
                serialOrImei: `359876100982342`,
                quantity: 1,
                costPriceUsd: 1040.0,
                status: "IN_STOCK",
              },
            ],
          },
        },
      });
    }

    // Product 2: Apple 20W Charger (Standard Item)
    const existingP2 = await prisma.product.findFirst({
      where: { tenantId: tenant.id, sku: { startsWith: "AP-20W" } },
    });

    if (!existingP2 && categoryMap["accessories"] && branchHQ && mainWarehouse) {
      await prisma.product.create({
        data: {
          tenantId: tenant.id,
          categoryId: categoryMap["accessories"],
          brandId: brandApple.id,
          sku: `AP-20W-USB-C-${Date.now().toString().slice(-4)}`,
          barcode: "885909123456",
          nameKh: "ក្បាលឆ្នាំងសាក Apple 20W USB-C Power Adapter",
          nameEn: "Apple 20W USB-C Power Adapter",
          type: ProductType.STANDARD_ITEM,
          costPriceUsd: 6.5,
          salePriceUsd: 12.0,
          salePriceKhr: 12.0 * 4100,
          minStockAlert: 5,
          unit: "ដើម",
          stockItems: {
            create: [
              {
                branchId: branchHQ.id,
                warehouseId: mainWarehouse.id,
                quantity: 25,
                costPriceUsd: 6.5,
                status: "IN_STOCK",
              },
            ],
          },
        },
      });
    }

    // Product 3: Screen Replacement Labor Service
    const existingP3 = await prisma.product.findFirst({
      where: { tenantId: tenant.id, sku: { startsWith: "SRV-IPHONE" } },
    });

    if (!existingP3 && categoryMap["repair-services"]) {
      await prisma.product.create({
        data: {
          tenantId: tenant.id,
          categoryId: categoryMap["repair-services"],
          sku: `SRV-IPHONE-SCREEN`,
          nameKh: "សេវាកម្មដូរអេក្រង់ទូរស័ព្ទ iPhone (Original Service)",
          nameEn: "iPhone Screen Replacement Labor Service",
          type: ProductType.SERVICE_LABOR,
          costPriceUsd: 0,
          salePriceUsd: 15.0,
          salePriceKhr: 15.0 * 4100,
          minStockAlert: 0,
          unit: "ដង",
        },
      });
    }

    console.log("✅ Database Auto-Setup & Seed Completed Successfully!");

    return NextResponse.json({
      success: true,
      message: "🎉 ការតភ្ជាប់ និងបង្កើតទិន្នន័យចាំបាច់ទាំងអស់បានជោគជ័យ 100%!",
      credentials: {
        storeAddress: tenant.storeAddress,
        username: adminUsername.trim() || "admin",
        password: adminPassword.trim() || "admin123",
        role: "SUPER_ADMIN",
      },
      stats: {
        tenantName: tenant.name,
        branchName: branchHQ?.name,
        warehouseName: mainWarehouse?.name,
        categoriesCount: Object.keys(categoryMap).length,
      },
    });
  } catch (error: any) {
    console.error("POST /api/database/setup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to initialize database",
      },
      { status: 500 }
    );
  }
}
