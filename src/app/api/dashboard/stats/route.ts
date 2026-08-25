import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

// Fast in-memory cache for dashboard stats (TTL: 10 seconds)
const dashboardStatsCache = new Map<string, { data: any; expiresAt: number }>();

function invalidateDashboardStatsCache() {
  dashboardStatsCache.clear();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reqBranchId = searchParams.get("branchId") || "";

    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({
        success: true,
        stats: {
          todaySalesUsd: 0,
          todaySalesKhr: 0,
          totalTransactions: 0,
          activeRepairsCount: 0,
          totalProductsCount: 0,
          lowStockCount: 0,
          totalCustomerDebtUsd: 0,
          recentOrders: [],
        },
      });
    }

    const effectiveBranchId = reqBranchId || session?.branchId || "ALL";
    const cacheKey = `${tenantId}:${effectiveBranchId}`;
    const now = Date.now();
    const cached = dashboardStatsCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayOrders,
      activeRepairsCount,
      totalProductsCount,
      lowStockProducts,
      totalDebtAgg,
      recentOrders,
    ] = await Promise.all([
      // 1. Today's sales scoped to tenant
      prisma.order.findMany({
        where: {
          branch: {
            tenantId,
            ...(effectiveBranchId ? { id: effectiveBranchId } : {}),
          },
          createdAt: { gte: today },
        },
        select: { totalUsd: true, totalKhr: true },
      }),
      // 2. Active repairs scoped to tenant
      prisma.repairTicket.count({
        where: {
          branch: {
            tenantId,
            ...(effectiveBranchId ? { id: effectiveBranchId } : {}),
          },
          status: {
            in: [
              "RECEIVED",
              "DIAGNOSING",
              "QUOTED",
              "APPROVED_BY_CUSTOMER",
              "IN_PROGRESS",
              "WAITING_FOR_PARTS",
              "READY_FOR_PICKUP",
            ],
          },
        },
      }),
      // 3. Total products count scoped to tenant
      prisma.product.count({
        where: { tenantId, isActive: true },
      }),
      // 4. Low stock products scoped to tenant
      prisma.product.findMany({
        where: { tenantId, isActive: true },
        include: {
          stockItems: {
            where: {
              status: "IN_STOCK",
              ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
            },
          },
        },
      }),
      // 5. Total Customer Debt scoped to tenant
      prisma.customer.aggregate({
        where: { tenantId },
        _sum: { currentDebtUsd: true },
      }),
      // 6. Recent Orders scoped to tenant
      prisma.order.findMany({
        where: {
          branch: {
            tenantId,
            ...(effectiveBranchId ? { id: effectiveBranchId } : {}),
          },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { customer: true },
      }),
    ]);

    const todaySalesUsd = todayOrders.reduce((sum, o) => sum + Number(o.totalUsd), 0);
    const todaySalesKhr = todayOrders.reduce((sum, o) => sum + Number(o.totalKhr), 0);
    const totalTransactions = todayOrders.length;

    const lowStockCount = lowStockProducts.filter((p) => {
      const stock = p.stockItems.reduce((sum, s) => sum + s.quantity, 0);
      return stock <= p.minStockAlert;
    }).length;

    const responseData = {
      success: true,
      stats: {
        todaySalesUsd,
        todaySalesKhr,
        totalTransactions,
        activeRepairsCount,
        totalProductsCount,
        lowStockCount,
        totalCustomerDebtUsd: Number(totalDebtAgg._sum.currentDebtUsd || 0),
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          invoiceNumber: o.invoiceNumber,
          customerName: o.customer?.name || "អតិថិជនទូទៅ",
          totalUsd: Number(o.totalUsd),
          status: o.status,
          createdAt: o.createdAt.toISOString(),
        })),
      },
    };

    dashboardStatsCache.set(cacheKey, { data: responseData, expiresAt: now + 10000 });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
