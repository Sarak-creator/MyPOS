import { NextResponse } from "next/server";
import { restoreTenantData, restoreMasterData } from "@/lib/seed-helpers";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/system/restore - Restore fresh master enterprise data scoped to caller's tenant
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json().catch(() => ({}));
    const { confirmation } = body;

    if (confirmation !== "CONFIRM_RESTORE_MASTER_DATA") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid confirmation token. Please confirm the restore action.",
        },
        { status: 400 }
      );
    }

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (tenantId) {
      console.log(`⚡ Executing Tenant-Scoped Restore for store ${tenantId}...`);
      await restoreTenantData(tenantId);

      return NextResponse.json({
        success: true,
        message: "ទិន្នន័យគំរូស្តង់ដារត្រូវបានស្តារឡើងវិញក្នុងហាងរបស់អ្នកដោយជោគជ័យ!",
      });
    } else {
      console.log("⚡ Executing Master Data Restore...");
      await restoreMasterData();

      return NextResponse.json({
        success: true,
        message: "Master Enterprise Data has been successfully restored!",
      });
    }
  } catch (error: any) {
    console.error("POST /api/system/restore error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to restore master data" },
      { status: 500 }
    );
  }
}
