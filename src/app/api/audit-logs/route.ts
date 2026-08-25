import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/audit-logs - Fetch Audit Logs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 50);

    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, fullName: true, fullNameKh: true, role: true } },
      },
    });

    const formatted = logs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      userId: log.userId,
      userName: log.user.fullNameKh || log.user.fullName,
      userRole: log.user.role,
      action: log.action,
      actionLabelKh: getActionLabelKh(log.action),
      severity: getActionSeverity(log.action),
      entity: log.entity,
      entityId: log.entityId || "",
      branch: "សាខាកណ្តាល ភ្នំពេញ",
      ipAddress: log.ipAddress || "127.0.0.1",
      userAgent: log.userAgent || "Chrome on Windows",
      details: (log.details as any) || {},
    }));

    return NextResponse.json({ success: true, logs: formatted });
  } catch (error: any) {
    console.error("GET /api/audit-logs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function getActionLabelKh(action: string): string {
  switch (action) {
    case "PRICE_OVERRIDE":
      return "កែប្រែតម្លៃលក់ (Override)";
    case "DRAWER_OPEN":
      return "បើកថតប្រាក់ដោយដៃ";
    case "VOID_ORDER":
      return "លុបវិក្កយបត្រ";
    case "DISCOUNT_APPLIED":
      return "ផ្តល់ការបញ្ចុះតម្លៃ";
    case "STOCK_ADJUST":
      return "កែតម្រូវស្តុក";
    case "REPAIR_UPDATE":
      return "ធ្វើបច្ចុប្បន្នភាពជួសជុល";
    case "LOGIN_SUCCESS":
      return "ចូលប្រព័ន្ធជោគជ័យ";
    case "SETTINGS_CHANGED":
      return "កែប្រែការកំណត់ប្រព័ន្ធ";
    default:
      return action;
  }
}

function getActionSeverity(action: string): "INFO" | "WARNING" | "CRITICAL" {
  switch (action) {
    case "VOID_ORDER":
    case "PRICE_OVERRIDE":
      return "CRITICAL";
    case "DRAWER_OPEN":
    case "STOCK_ADJUST":
      return "WARNING";
    default:
      return "INFO";
  }
}
