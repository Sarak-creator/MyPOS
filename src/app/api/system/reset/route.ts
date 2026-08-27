import { NextResponse } from "next/server";
import { deleteTenantData, deleteAllDatabaseData } from "@/lib/seed-helpers";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/system/reset - Delete all data scoped to caller's store / tenant
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json().catch(() => ({}));
    const { confirmation } = body;

    if (confirmation !== "CONFIRM_RESET_ALL_DATA") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid confirmation token. Please confirm the reset all action.",
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
      console.log(`⚡ Executing Tenant-Scoped Database Reset for store ${tenantId}...`);
      await deleteTenantData(tenantId);

      return NextResponse.json({
        success: true,
        message: "ទិន្នន័យទាំងអស់ក្នុងហាងរបស់អ្នកត្រូវបានលុបសម្អាតដោយជោគជ័យ (Store data deleted successfully)!",
      });
    } else {
      console.log("⚡ Executing Full Database Wipe...");
      await deleteAllDatabaseData();

      return NextResponse.json({
        success: true,
        message: "All data has been completely deleted from the database!",
      });
    }
  } catch (error: any) {
    console.error("POST /api/system/reset error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reset database" },
      { status: 500 }
    );
  }
}
