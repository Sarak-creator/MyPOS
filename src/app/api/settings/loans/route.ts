import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { ConfigManager, LoanContractSettings } from "@/lib/config-manager";

export const dynamic = "force-dynamic";

// GET /api/settings/loans - Fetch loan & contract settings
export async function GET(request: Request) {
  try {
    const settings = await ConfigManager.getLoanContractSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("GET /api/settings/loans error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load contract settings" },
      { status: 500 }
    );
  }
}

// POST /api/settings/loans - Update loan & contract settings (Admin only)
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    
    // Check role: Only SUPER_ADMIN, ADMIN, or BRANCH_MANAGER can customize contract & interest rates
    if (session && !["SUPER_ADMIN", "ADMIN", "BRANCH_MANAGER"].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: "អ្នកមិនមានសិទ្ធិកែប្រែការកំណត់កិច្ចសន្យា និងអត្រាការប្រាក់ទេ (Unauthorized)" },
        { status: 403 }
      );
    }

    const body = await request.json();
    await ConfigManager.saveLoanContractSettings(body);
    const updated = await ConfigManager.getLoanContractSettings(true);

    return NextResponse.json({
      success: true,
      message: "បានរក្សាទុកការកំណត់កិច្ចសន្យា និងអត្រាការប្រាក់ដោយជោគជ័យ!",
      settings: updated,
    });
  } catch (error: any) {
    console.error("POST /api/settings/loans error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save contract settings" },
      { status: 500 }
    );
  }
}
