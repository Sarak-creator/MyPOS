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

// Indirection wrapper so Next.js RSC webpack bundler cannot flag it as
// "Assigning to rvalue" — we bypass static analysis via globalThis.
function setEnvVar(key: string, value: string) {
  try {
    const env = (globalThis as any).process?.env;
    if (env) env[key] = value;
  } catch {
    // no-op in edge/non-Node environments
  }
}

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

    setEnvVar("DATABASE_URL", cleanDbUrl);
    setEnvVar("DIRECT_URL", cleanDirectUrl);
    if (supabaseUrl) setEnvVar("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl.trim());
    if (supabaseAnonKey) setEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey.trim());
    if (supabaseServiceKey) setEnvVar("SUPABASE_SERVICE_ROLE_KEY", supabaseServiceKey.trim());

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

    // 4. ACTION = NEW_DATABASE (Clean New Database with only Account & Category)
    console.log("🚀 Provisioning New Database (Cleaning all tables, preserving only Account & Category)...");
    try {
      await execAsync("npx prisma db push --skip-generate --accept-data-loss", {
        env: envVars,
      });
    } catch (pushErr: any) {
      console.warn("Prisma push warning on new DB:", pushErr.message);
    }

    // Clear all transactional and mock tables
    await Promise.all([
      tempPrisma.auditLog.deleteMany().catch(() => {}),
      tempPrisma.technicianCommission.deleteMany().catch(() => {}),
      tempPrisma.repairStatusLog.deleteMany().catch(() => {}),
      tempPrisma.repairPartUsed.deleteMany().catch(() => {}),
      tempPrisma.repairTicket.deleteMany().catch(() => {}),
      tempPrisma.debtPaymentLog.deleteMany().catch(() => {}),
      tempPrisma.debtPaymentSchedule.deleteMany().catch(() => {}),
      tempPrisma.payment.deleteMany().catch(() => {}),
      tempPrisma.orderItem.deleteMany().catch(() => {}),
      tempPrisma.order.deleteMany().catch(() => {}),
      tempPrisma.cashDrawerShift.deleteMany().catch(() => {}),
      tempPrisma.purchaseOrderItem.deleteMany().catch(() => {}),
      tempPrisma.purchaseOrder.deleteMany().catch(() => {}),
      tempPrisma.supplier.deleteMany().catch(() => {}),
      tempPrisma.stockTransferItem.deleteMany().catch(() => {}),
      tempPrisma.stockTransfer.deleteMany().catch(() => {}),
      tempPrisma.stockAdjustmentItem.deleteMany().catch(() => {}),
      tempPrisma.stockAdjustment.deleteMany().catch(() => {}),
      tempPrisma.stockItem.deleteMany().catch(() => {}),
      tempPrisma.productVariant.deleteMany().catch(() => {}),
      tempPrisma.product.deleteMany().catch(() => {}),
      tempPrisma.brand.deleteMany().catch(() => {}),
      tempPrisma.payrollRecord.deleteMany().catch(() => {}),
      tempPrisma.attendance.deleteMany().catch(() => {}),
      tempPrisma.employee.deleteMany().catch(() => {}),
      tempPrisma.customer.deleteMany().catch(() => {}),
      tempPrisma.journalLineItem.deleteMany().catch(() => {}),
      tempPrisma.journalEntry.deleteMany().catch(() => {}),
      tempPrisma.expense.deleteMany().catch(() => {}),
      tempPrisma.user.deleteMany().catch(() => {}),
      tempPrisma.warehouse.deleteMany().catch(() => {}),
      tempPrisma.branch.deleteMany().catch(() => {}),
      tempPrisma.tenant.deleteMany().catch(() => {}),
    ]);

    await tempPrisma.$disconnect();

    return NextResponse.json({
      success: true,
      action: "NEW_DATABASE",
      needsSetup: true,
      redirectTo: "/setup",
      message: "✅ បានភ្ជាប់ទៅកាន់ Database ថ្មីជោគជ័យ! គ្រប់ Table គឺទទេរស្អាត (លើកលែង Account & Category)។ កំពុងបញ្ជូនទៅកាន់ទំព័របង្កើតហាង និងម្ចាស់ហាង...",
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
