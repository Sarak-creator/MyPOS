import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/system/status - Check whether the database has a Store & Owner configured
export async function GET() {
  try {
    // 1. Verify PostgreSQL connection
    await prisma.$queryRaw`SELECT 1`;

    // 2. Check if Tenant and User exist
    let tenantCount = 0;
    let userCount = 0;
    let categoryCount = 0;
    let accountCount = 0;

    try {
      [tenantCount, userCount, categoryCount, accountCount] = await Promise.all([
        prisma.tenant.count(),
        prisma.user.count(),
        prisma.category.count(),
        prisma.account.count(),
      ]);
    } catch {
      // Tables might not exist yet
      return NextResponse.json({
        success: true,
        connected: true,
        needsSetup: true,
        message: "Database tables are not initialized or empty. Setup is required.",
      });
    }

    const needsSetup = tenantCount === 0 || userCount === 0;

    let defaultStoreAddress = "";
    let storeName = "";
    if (!needsSetup) {
      const firstTenant = await prisma.tenant.findFirst({
        select: { name: true, storeAddress: true },
      });
      if (firstTenant) {
        storeName = firstTenant.name;
        defaultStoreAddress = firstTenant.storeAddress;
      }
    }

    return NextResponse.json({
      success: true,
      connected: true,
      needsSetup,
      tenantCount,
      userCount,
      categoryCount,
      accountCount,
      storeName,
      defaultStoreAddress,
      message: needsSetup
        ? "មិនទាន់មានហាង និងគណនីម្ចាស់ហាងនៅឡើយទេ សូមបង្កើតហាងជាមុនសិន (Setup Required)"
        : "ប្រព័ន្ធមានហាង និងគណនីរួចរាល់ហើយ (System Ready)",
    });
  } catch (error: any) {
    console.error("GET /api/system/status error:", error);
    return NextResponse.json({
      success: false,
      connected: false,
      needsSetup: true,
      error: error.message || "Failed to connect to database",
    });
  }
}
