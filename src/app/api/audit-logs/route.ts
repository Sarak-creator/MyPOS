import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/audit-logs - Fetch Audit Logs with Multi-Branch & Store-level scoping
export async function GET(request: Request) {
  try {
    const session = await getAuthSession(request);

    // 1. Resolve Tenant
    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, logs: [] });
    }

    // 2. Check Role & Permissions
    const userRole = session?.role || "ADMIN";
    const isSuperAdminOrAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    const isBranchManager = userRole === "BRANCH_MANAGER";

    const hasAuditPerm =
      isSuperAdminOrAdmin ||
      isBranchManager ||
      session?.permissions?.includes("audit:view") ||
      session?.permissions?.includes("*");

    if (!hasAuditPerm) {
      return NextResponse.json(
        { success: false, error: "លោកអ្នកគ្មានសិទ្ធិមើលកំណត់ត្រាសុវត្ថិភាពទេ (Permission Denied)" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 100);
    const queryBranchId = searchParams.get("branchId");
    const action = searchParams.get("action");
    const severity = searchParams.get("severity");

    // 3. Resolve Branch Scoping
    let effectiveBranchId: string | null = null;
    let branchName: string | null = null;

    if (isBranchManager) {
      // Branch manager is strictly restricted to their assigned branch
      let branchId = session?.branchId;
      if (!branchId && session?.userId) {
        const userInDb = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { branchId: true, branch: { select: { name: true } } },
        });
        branchId = userInDb?.branchId || null;
        branchName = userInDb?.branch?.name || null;
      } else if (branchId) {
        const b = await prisma.branch.findUnique({
          where: { id: branchId },
          select: { name: true },
        });
        branchName = b?.name || null;
      }
      effectiveBranchId = branchId || null;
    } else if (isSuperAdminOrAdmin) {
      // Super Admin and Admin can filter by branchId or view all
      if (queryBranchId && queryBranchId !== "ALL") {
        effectiveBranchId = queryBranchId;
        const b = await prisma.branch.findUnique({
          where: { id: queryBranchId },
          select: { name: true },
        });
        branchName = b?.name || null;
      }
    }

    // 4. Build Filter Clause
    const whereClause: any = {
      user: {
        tenantId,
      },
    };

    if (effectiveBranchId) {
      whereClause.user.branchId = effectiveBranchId;
    }

    if (action && action !== "ALL") {
      whereClause.action = action;
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            fullNameKh: true,
            role: true,
            branchId: true,
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
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
      branchId: log.user.branchId || null,
      branch: log.user.branch?.name || (log.details as any)?.branchName || "គ្រប់សាខា / សាខាកណ្តាល",
      branchCode: log.user.branch?.code || "",
      ipAddress: log.ipAddress || "127.0.0.1",
      userAgent: log.userAgent || "Web / POS App",
      details: (log.details as any) || {},
    }));

    return NextResponse.json({
      success: true,
      logs: formatted,
      userRole,
      isBranchScoped: isBranchManager,
      scopedBranchId: effectiveBranchId,
      scopedBranchName: branchName,
    });
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
    case "ORDER_VOID":
      return "លុបចោលវិក្កយបត្រ (Void)";
    case "ORDER_REFUND":
      return "សងប្រាក់ត្រឡប់ (Refund)";
    case "ORDER_CREATE":
      return "បង្កើតវិក្កយបត្រថ្មី";
    case "DISCOUNT_APPLIED":
      return "ផ្តល់ការបញ្ចុះតម្លៃ";
    case "STOCK_ADJUST":
      return "កែតម្រូវស្តុក";
    case "STOCK_TRANSFER_CREATE":
      return "បង្កើតសំណើផ្ទេរស្តុក";
    case "STOCK_TRANSFER_IN_TRANSIT":
      return "បញ្ជូនទំនិញផ្ទេរស្តុកចេញ";
    case "STOCK_TRANSFER_COMPLETED":
      return "ទទួលទំនិញផ្ទេរចូលស្តុក";
    case "STOCK_TRANSFER_CANCELLED":
      return "បោះបង់ការផ្ទេរស្តុក";
    case "REPAIR_UPDATE":
      return "ធ្វើបច្ចុប្បន្នភាពជួសជុល";
    case "LOGIN_SUCCESS":
      return "ចូលប្រព័ន្ធជោគជ័យ";
    case "LOGIN_FAILED":
      return "ចូលប្រព័ន្ធបរាជ័យ (Failed Login)";
    case "REGISTER_USER":
      return "បង្កើតគណនីបុគ្គលិកថ្មី";
    case "SETTINGS_CHANGED":
      return "កែប្រែការកំណត់ប្រព័ន្ធ";
    case "CUSTOMER_DEBT_PAYMENT":
      return "កត់ត្រាការទូទាត់បំណុល";
    default:
      return action;
  }
}

function getActionSeverity(action: string): "INFO" | "WARNING" | "CRITICAL" {
  switch (action) {
    case "VOID_ORDER":
    case "ORDER_VOID":
    case "ORDER_REFUND":
    case "PRICE_OVERRIDE":
    case "LOGIN_FAILED":
    case "STOCK_TRANSFER_CANCELLED":
      return "CRITICAL";
    case "DRAWER_OPEN":
    case "STOCK_ADJUST":
    case "SETTINGS_CHANGED":
    case "STOCK_TRANSFER_IN_TRANSIT":
      return "WARNING";
    default:
      return "INFO";
  }
}
