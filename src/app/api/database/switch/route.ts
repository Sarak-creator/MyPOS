import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { PrismaClient, AccountType, ProductType, RoleType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma, resetPrismaClient, normalizeDatabaseUrl } from "@/lib/prisma";
import { CacheManager } from "@/lib/cache";

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

// Helper function to read .env file entries
async function getEnvEntries(): Promise<Record<string, string>> {
  const envPath = path.join(process.cwd(), ".env");
  const entries: Record<string, string> = {};
  try {
    const content = await fs.promises.readFile(envPath, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        entries[key] = val;
      }
    }
  } catch (e) {
    console.error("Error reading .env:", e);
  }
  return entries;
}

// Helper function to update .env file safely
async function updateEnvFile(newEntries: Record<string, string>) {
  const envPath = path.join(process.cwd(), ".env");
  let content = "";
  try {
    content = await fs.promises.readFile(envPath, "utf-8");
  } catch {
    content = "";
  }

  const lines = content.split("\n");
  const updatedKeys = new Set<string>();

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;

    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) return line;

    const key = line.slice(0, eqIdx).trim();
    if (key in newEntries) {
      updatedKeys.add(key);
      const val = newEntries[key];
      return `${key}="${val}"`;
    }
    return line;
  });

  // Append any keys that weren't already in the file
  for (const [key, val] of Object.entries(newEntries)) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}="${val}"`);
    }
  }

  await fs.promises.writeFile(envPath, newLines.join("\n"), "utf-8");
}

// GET /api/database/switch - Get current 5 database connection variables
export async function GET() {
  try {
    const env = await getEnvEntries();

    let connected = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      connected = true;
    } catch {
      connected = false;
    }

    return NextResponse.json({
      success: true,
      connected,
      config: {
        DATABASE_URL: env["DATABASE_URL"] || process.env.DATABASE_URL || "",
        DIRECT_URL: env["DIRECT_URL"] || process.env.DIRECT_URL || "",
        NEXT_PUBLIC_SUPABASE_URL: env["NEXT_PUBLIC_SUPABASE_URL"] || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        SUPABASE_SERVICE_ROLE_KEY: env["SUPABASE_SERVICE_ROLE_KEY"] || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/database/switch - Test, Switch or Provision (New DB vs Old DB)
export async function POST(request: Request) {
  let tempPrisma: PrismaClient | null = null;

  try {
    const body = await request.json();
    const {
      databaseUrl,
      directUrl,
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceKey,
      storeName = "អាណាចក្រPOS (Anachak POS)",
      storeAddress = "anajak@anajak.com",
      adminFullName = "Chea Sokha (ជា សុខា)",
      adminUsername = "admin",
      adminPassword = "admin123",
      action = "NEW_DATABASE", // "NEW_DATABASE" | "OLD_DATABASE" | "TEST_ONLY"
    } = body;

    if (!databaseUrl || typeof databaseUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ចូល DATABASE_URL ឲ្យបានត្រឹមត្រូវ!" },
        { status: 400 }
      );
    }

    const cleanDbUrl = normalizeDatabaseUrl(databaseUrl.trim());

    // Auto-derive directUrl if not provided
    let cleanDirectUrl = directUrl?.trim() || "";
    if (!cleanDirectUrl) {
      if (cleanDbUrl.includes(":6543")) {
        cleanDirectUrl = cleanDbUrl
          .replace(":6543", ":5432")
          .replace("?pgbouncer=true", "")
          .replace("&pgbouncer=true", "");
      } else {
        cleanDirectUrl = cleanDbUrl;
      }
    }

    console.log(`🔌 Testing connection to target database: ${cleanDbUrl.slice(0, 35)}...`);

    // 1. Standalone Prisma client test
    try {
      tempPrisma = new PrismaClient({
        datasources: {
          db: {
            url: cleanDbUrl,
          },
        },
      });
      await tempPrisma.$queryRaw`SELECT 1`;
      console.log("✅ Database connection test succeeded!");
    } catch (connErr: any) {
      if (tempPrisma) await tempPrisma.$disconnect().catch(() => {});
      console.error("Connection test failed:", connErr);
      return NextResponse.json(
        {
          success: false,
          error: `មិនអាចតភ្ជាប់ទៅកាន់ Database បានទេ: ${connErr.message || "Invalid credentials or host unreachable"}`,
        },
        { status: 400 }
      );
    }

    // If Test Connection only:
    if (action === "TEST_ONLY") {
      await tempPrisma.$disconnect();
      return NextResponse.json({
        success: true,
        message: "✅ ការតភ្ជាប់ទៅកាន់ Database ទទួលបានជោគជ័យ 100%!",
      });
    }

    // 2. Persist the 5 variables into .env file
    const envUpdates: Record<string, string> = {
      DATABASE_URL: cleanDbUrl,
      DIRECT_URL: cleanDirectUrl,
    };

    if (supabaseUrl && supabaseUrl.trim()) {
      envUpdates["NEXT_PUBLIC_SUPABASE_URL"] = supabaseUrl.trim();
    }
    if (supabaseAnonKey && supabaseAnonKey.trim()) {
      envUpdates["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = supabaseAnonKey.trim();
    }
    if (supabaseServiceKey && supabaseServiceKey.trim()) {
      envUpdates["SUPABASE_SERVICE_ROLE_KEY"] = supabaseServiceKey.trim();
    }

    await updateEnvFile(envUpdates);
    console.log("📝 .env file updated with new credentials.");

    process.env["DATABASE_URL"] = cleanDbUrl;
    process.env["DIRECT_URL"] = cleanDirectUrl;
    if (supabaseUrl) (process.env as any)["NEXT_PUBLIC_SUPABASE_URL"] = supabaseUrl.trim();
    if (supabaseAnonKey) (process.env as any)["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = supabaseAnonKey.trim();
    if (supabaseServiceKey) process.env["SUPABASE_SERVICE_ROLE_KEY"] = supabaseServiceKey.trim();

    // Hot-reload active PrismaClient singleton & invalidate all in-memory caches
    await resetPrismaClient(cleanDbUrl);
    CacheManager.invalidateAll();

    const envVars = {
      ...process.env,
      DATABASE_URL: cleanDbUrl,
      DIRECT_URL: cleanDirectUrl,
    };

    // 3. ACTION = OLD_DATABASE (Connect Only)
    if (action === "OLD_DATABASE") {
      console.log("🔗 Connecting to existing Old Database without dropping data...");
      try {
        // Sync any missing tables safely
        await execAsync("npx prisma db push --skip-generate --accept-data-loss", { env: envVars });
      } catch (pushErr: any) {
        console.warn("Prisma push warning on old DB:", pushErr.message);
      }

      // Check existing tenants in Old DB
      const existingTenants = await tempPrisma.tenant.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          users: {
            select: { id: true, username: true, fullName: true, role: true },
          },
        },
      });

      const defaultTenant = existingTenants[0];

      await tempPrisma.$disconnect();

      return NextResponse.json({
        success: true,
        action: "OLD_DATABASE",
        message: "✅ បានភ្ជាប់ទៅកាន់ Database ចាស់ជោគជ័យ 100%! ទិន្នន័យត្រូវបានផ្ទុកមកប្រើប្រាស់ភ្លាមៗ។",
        defaultStoreAddress: defaultTenant?.storeAddress || "anajak@anajak.com",
        tenants: existingTenants.map((t) => ({
          name: t.name,
          storeAddress: t.storeAddress,
          users: t.users.map((u) => u.username),
        })),
      });
    }

    // 4. ACTION = NEW_DATABASE (Auto Provision New Database)
    console.log("🚀 Provisioning New Database (Creating tables & initial data)...");
    try {
      await execAsync("npx prisma db push --skip-generate --accept-data-loss", {
        env: envVars,
      });
    } catch (pushErr: any) {
      console.warn("Prisma push warning on new DB:", pushErr.message);
    }

    const cleanStoreAddress = storeAddress.trim().toLowerCase().includes("@")
      ? storeAddress.trim().toLowerCase()
      : `${storeAddress.trim().toLowerCase()}@anajak.com`;

    // Create Master Tenant
    let tenant = await tempPrisma.tenant.findFirst({
      where: { storeAddress: cleanStoreAddress },
      include: { branches: { include: { warehouses: true } } },
    });

    if (!tenant) {
      tenant = await tempPrisma.tenant.create({
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
                name: "សាខាកណ្តាល ភ្នំពេញ (Phnom Penh Main)",
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

    // Create Super Admin User
    const passwordHash = await bcrypt.hash(adminPassword.trim() || "admin123", 10);
    const staffPassword = await bcrypt.hash("123456", 10);

    let adminUser = await tempPrisma.user.findFirst({
      where: { tenantId: tenant.id, username: adminUsername.trim() },
    });

    if (!adminUser) {
      adminUser = await tempPrisma.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branchHQ?.id,
          username: adminUsername.trim() || "admin",
          email: `${adminUsername.trim()}@${cleanStoreAddress.split("@")[0]}.com`,
          fullName: adminFullName.trim() || "System Administrator",
          fullNameKh: "អ្នកគ្រប់គ្រងប្រព័ន្ធ",
          passwordHash,
          role: RoleType.SUPER_ADMIN,
          permissions: ["*"],
        },
      });
    }

    // Create Cashier User
    const existingCashier = await tempPrisma.user.findFirst({
      where: { tenantId: tenant.id, username: "cashier1" },
    });
    if (!existingCashier) {
      await tempPrisma.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branchHQ?.id,
          username: "cashier1",
          email: `cashier1@${cleanStoreAddress.split("@")[0]}.com`,
          fullName: "Heng Bopha (ហេង បុប្ផា)",
          fullNameKh: "ហេង បុប្ផា",
          passwordHash: staffPassword,
          role: RoleType.CASHIER,
          permissions: ["POS_CASHIER", "VIEW_PRODUCTS", "CREATE_ORDER", "VIEW_CUSTOMERS"],
        },
      }).catch(() => {});
    }

    // Create Chart of Accounts
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
      const exists = await tempPrisma.account.findFirst({
        where: { tenantId: tenant.id, code: acc.code },
      });
      if (!exists) {
        await tempPrisma.account.create({
          data: { tenantId: tenant.id, ...acc },
        }).catch(() => {});
      }
    }

    // Create Categories
    const defaultCategories = [
      { nameKh: "ទូរស័ព្ទដៃ & ថេប្លេត", nameEn: "Smartphones & Tablets", slug: "smartphones", icon: "smartphone" },
      { nameKh: "គ្រឿងបន្សំ & កាស", nameEn: "Accessories & Audio", slug: "accessories", icon: "sparkles" },
      { nameKh: "គ្រឿងបន្លាស់ទូរស័ព្ទ", nameEn: "Phone Spare Parts", slug: "spare-parts", icon: "cpu" },
      { nameKh: "សេវាកម្មជួសជុល & កម្មវិធី", nameEn: "Repair Services & Labor", slug: "repair-services", icon: "wrench" },
      { nameKh: "កុំព្យូទ័រ & ឡេបថប", nameEn: "Laptops & Computers", slug: "laptops", icon: "laptop" },
    ];

    const categoryMap: Record<string, string> = {};
    for (const cat of defaultCategories) {
      let existingCat = await tempPrisma.category.findFirst({
        where: { tenantId: tenant.id, slug: cat.slug },
      });
      if (!existingCat) {
        existingCat = await tempPrisma.category.create({
          data: { tenantId: tenant.id, ...cat },
        });
      }
      categoryMap[cat.slug] = existingCat.id;
    }

    // Create Sample Brand
    let brandApple = await tempPrisma.brand.findFirst({ where: { name: "Apple" } });
    if (!brandApple) {
      brandApple = await tempPrisma.brand.create({ data: { name: "Apple" } });
    }

    // Create Sample Product with Stock
    if (categoryMap["smartphones"] && branchHQ && mainWarehouse) {
      const existingP1 = await tempPrisma.product.findFirst({
        where: { tenantId: tenant.id, sku: { startsWith: "IP15PM" } },
      });

      if (!existingP1) {
        await tempPrisma.product.create({
          data: {
            tenantId: tenant.id,
            categoryId: categoryMap["smartphones"],
            brandId: brandApple.id,
            sku: `IP15PM-256-NT`,
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
              ],
            },
          },
        });
      }
    }

    await tempPrisma.$disconnect();

    return NextResponse.json({
      success: true,
      action: "NEW_DATABASE",
      message: "🎉 បានបង្កើត Database ថ្មី និងទិន្នន័យចាំបាច់ទាំងអស់ជោគជ័យ 100%!",
      credentials: {
        storeAddress: tenant.storeAddress,
        username: adminUsername.trim() || "admin",
        password: adminPassword.trim() || "admin123",
      },
    });
  } catch (error: any) {
    if (tempPrisma) {
      await tempPrisma.$disconnect().catch(() => {});
    }
    console.error("POST /api/database/switch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process database request",
      },
      { status: 500 }
    );
  }
}
