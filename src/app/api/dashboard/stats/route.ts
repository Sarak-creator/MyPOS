import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { CacheManager } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reqBranchId = searchParams.get("branchId") || "";
    const period = searchParams.get("period") || "today"; // today | yesterday | 7days | this_month

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
          averageOrderValue: 0,
          periodExpensesUsd: 0,
          costOfGoodsUsd: 0,
          estimatedNetProfitUsd: 0,
          activeRepairsCount: 0,
          totalProductsCount: 0,
          lowStockCount: 0,
          totalInventoryValueUsd: 0,
          totalCustomerDebtUsd: 0,
          debtCustomerCount: 0,
          activeInstallmentsCount: 0,
          totalInstallmentPrincipalUsd: 0,
          activePawnCount: 0,
          totalPawnLoanUsd: 0,
          paymentBreakdown: {
            KHQR_ABA: 0,
            CASH_USD: 0,
            CASH_KHR: 0,
            CUSTOMER_CREDIT: 0,
            CREDIT_CARD: 0,
          },
          last7DaysSales: [],
          topSellingProducts: [],
          lowStockItems: [],
          readyRepairs: [],
          recentOrders: [],
        },
      });
    }

    const effectiveBranchId = reqBranchId || session?.branchId || "";
    const cacheKey = `dashboard:${tenantId}:${effectiveBranchId || "ALL"}:${period}`;
    const cached = CacheManager.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Determine Date Filter for the selected period
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (period === "yesterday") {
      const yDate = new Date(now);
      yDate.setDate(yDate.getDate() - 1);
      startDate = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 0, 0, 0, 0);
      endDate = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 23, 59, 59, 999);
    } else if (period === "7days") {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      startDate = new Date(d7.getFullYear(), d7.getMonth(), d7.getDate(), 0, 0, 0, 0);
      endDate = new Date();
    } else if (period === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date();
    }

    const branchFilter = effectiveBranchId ? { id: effectiveBranchId } : {};

    // 1. Prepare 7 Days Date Windows for Chart
    const past7DaysWindows: Array<{ dateStr: string; dayName: string; start: Date; end: Date }> = [];
    const khDayNames = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហ", "សុក្រ", "សៅរ៍"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      past7DaysWindows.push({
        dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
        dayName: khDayNames[d.getDay()],
        start,
        end,
      });
    }

    // Execute parallel DB queries
    const [
      periodOrders,
      periodExpenses,
      past7DaysOrders,
      allActiveRepairs,
      readyRepairsList,
      allProducts,
      debtAgg,
      debtCustomersCount,
      activeInstallmentsCount,
      activeInstallmentsAgg,
      activePawnCount,
      activePawnAgg,
      recentOrders,
    ] = await Promise.all([
      // 1. Orders within selected period
      prisma.order.findMany({
        where: {
          branch: { tenantId, ...branchFilter },
          status: "COMPLETED",
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          totalUsd: true,
          totalKhr: true,
          payments: { select: { method: true, amountUsd: true } },
          items: {
            select: {
              productId: true,
              quantity: true,
              unitCostUsd: true,
              totalPriceUsd: true,
              product: { select: { nameKh: true, nameEn: true, sku: true, imageUrl: true } },
            },
          },
        },
      }),

      // 2. Expenses within selected period
      prisma.expense.findMany({
        where: {
          branch: { tenantId, ...branchFilter },
          date: { gte: startDate, lte: endDate },
        },
        select: { amountUsd: true, category: true },
      }),

      // 3. Past 7 days completed orders for visual sales trend
      prisma.order.findMany({
        where: {
          branch: { tenantId, ...branchFilter },
          status: "COMPLETED",
          createdAt: { gte: past7DaysWindows[0].start },
        },
        select: { totalUsd: true, createdAt: true },
      }),

      // 4. Total active repairs count
      prisma.repairTicket.count({
        where: {
          branch: { tenantId, ...branchFilter },
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

      // 5. Recent Repairs waiting for pickup or in progress
      prisma.repairTicket.findMany({
        where: {
          branch: { tenantId, ...branchFilter },
          status: { in: ["READY_FOR_PICKUP", "IN_PROGRESS"] },
        },
        take: 4,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          ticketNumber: true,
          deviceModel: true,
          customerProblem: true,
          estimatedCostUsd: true,
          finalCostUsd: true,
          status: true,
          customer: { select: { name: true, phone: true } },
        },
      }),

      // 6. Products with stock for stock valuation and low stock alerts
      prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          nameKh: true,
          nameEn: true,
          sku: true,
          minStockAlert: true,
          unit: true,
          costPriceUsd: true,
          salePriceUsd: true,
          stockItems: {
            where: {
              status: "IN_STOCK",
              ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
            },
            select: { quantity: true, costPriceUsd: true },
          },
        },
      }),

      // 7. Customer Debt AR sum
      prisma.customer.aggregate({
        where: { tenantId },
        _sum: { currentDebtUsd: true },
      }),

      // 8. Count of customers with debt > 0
      prisma.customer.count({
        where: { tenantId, currentDebtUsd: { gt: 0 } },
      }),

      // 9. Active installment contracts count
      prisma.installmentContract.count({
        where: { tenantId, status: "ACTIVE" },
      }),

      // 10. Active installment principal sum
      prisma.installmentContract.aggregate({
        where: { tenantId, status: "ACTIVE" },
        _sum: { principalRemainingUsd: true },
      }),

      // 11. Active pawn tickets count
      prisma.pawnTicket.count({
        where: { tenantId, status: "ACTIVE" },
      }),

      // 12. Active pawn loan sum
      prisma.pawnTicket.aggregate({
        where: { tenantId, status: "ACTIVE" },
        _sum: { loanAmountUsd: true },
      }),

      // 13. Recent 6 Orders
      prisma.order.findMany({
        where: {
          branch: { tenantId, ...branchFilter },
        },
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          payments: { select: { method: true, amountUsd: true } },
        },
      }),
    ]);

    // Compute Sales Metrics
    const periodSalesUsd = periodOrders.reduce((sum, o) => sum + Number(o.totalUsd || 0), 0);
    const periodSalesKhr = periodOrders.reduce((sum, o) => sum + Number(o.totalKhr || 0), 0);
    const totalTransactions = periodOrders.length;
    const averageOrderValue = totalTransactions > 0 ? periodSalesUsd / totalTransactions : 0;

    // Compute Cost of Goods & Profit
    let costOfGoodsUsd = 0;
    const productSoldMap: Record<
      string,
      { nameKh: string; nameEn: string; sku: string; qty: number; revenue: number; imageUrl?: string | null }
    > = {};

    for (const ord of periodOrders) {
      for (const it of ord.items) {
        const qty = Number(it.quantity || 1);
        const unitCost = Number(it.unitCostUsd || 0);
        costOfGoodsUsd += unitCost * qty;

        const pid = it.productId;
        if (!productSoldMap[pid]) {
          productSoldMap[pid] = {
            nameKh: it.product?.nameKh || "ទំនិញ",
            nameEn: it.product?.nameEn || "Item",
            sku: it.product?.sku || "",
            qty: 0,
            revenue: 0,
            imageUrl: it.product?.imageUrl,
          };
        }
        productSoldMap[pid].qty += qty;
        productSoldMap[pid].revenue += Number(it.totalPriceUsd || 0);
      }
    }

    // Top 5 Best Selling Products
    const topSellingProducts = Object.values(productSoldMap)
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 5);

    // Compute Expenses
    const periodExpensesUsd = periodExpenses.reduce((sum, e) => sum + Number(e.amountUsd || 0), 0);
    const estimatedNetProfitUsd = periodSalesUsd - costOfGoodsUsd - periodExpensesUsd;

    // Payment Methods Breakdown
    const paymentBreakdown: Record<string, number> = {
      KHQR_ABA: 0,
      CASH_USD: 0,
      CASH_KHR: 0,
      CUSTOMER_CREDIT: 0,
      CREDIT_CARD: 0,
      SPLIT_PAYMENT: 0,
    };

    for (const ord of periodOrders) {
      for (const p of ord.payments) {
        const m = p.method as string;
        const amt = Number(p.amountUsd || 0);
        if (paymentBreakdown[m] !== undefined) {
          paymentBreakdown[m] += amt;
        } else {
          paymentBreakdown[m] = (paymentBreakdown[m] || 0) + amt;
        }
      }
    }

    // 7-day Sales Chart Aggregation
    const last7DaysSales = past7DaysWindows.map((win) => {
      const ordersInDay = past7DaysOrders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= win.start && d <= win.end;
      });
      const dayTotalUsd = ordersInDay.reduce((sum, o) => sum + Number(o.totalUsd || 0), 0);
      return {
        date: win.dateStr,
        dayName: win.dayName,
        salesUsd: Number(dayTotalUsd.toFixed(2)),
        count: ordersInDay.length,
      };
    });

    // Inventory Valuation & Low Stock
    let totalInventoryValueUsd = 0;
    const lowStockItems: any[] = [];

    for (const p of allProducts) {
      const currentStock = p.stockItems.reduce((acc, s) => acc + s.quantity, 0);
      const unitCost = Number(p.costPriceUsd || 0);
      totalInventoryValueUsd += currentStock * unitCost;

      if (currentStock <= p.minStockAlert) {
        lowStockItems.push({
          id: p.id,
          nameKh: p.nameKh,
          nameEn: p.nameEn,
          sku: p.sku,
          stockQty: currentStock,
          minStock: p.minStockAlert,
          unit: p.unit || "Pcs",
          isOutOfStock: currentStock === 0,
        });
      }
    }

    // Sort low stock items (out of stock first, then lowest quantity)
    lowStockItems.sort((a, b) => a.stockQty - b.stockQty);

    const responseData = {
      success: true,
      stats: {
        period,
        todaySalesUsd: Number(periodSalesUsd.toFixed(2)),
        todaySalesKhr: Math.round(periodSalesKhr),
        totalTransactions,
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        periodExpensesUsd: Number(periodExpensesUsd.toFixed(2)),
        costOfGoodsUsd: Number(costOfGoodsUsd.toFixed(2)),
        estimatedNetProfitUsd: Number(estimatedNetProfitUsd.toFixed(2)),
        activeRepairsCount: allActiveRepairs,
        totalProductsCount: allProducts.length,
        lowStockCount: lowStockItems.length,
        totalInventoryValueUsd: Number(totalInventoryValueUsd.toFixed(2)),
        totalCustomerDebtUsd: Number(debtAgg._sum.currentDebtUsd || 0),
        debtCustomerCount: debtCustomersCount,
        activeInstallmentsCount,
        totalInstallmentPrincipalUsd: Number(activeInstallmentsAgg._sum.principalRemainingUsd || 0),
        activePawnCount,
        totalPawnLoanUsd: Number(activePawnAgg._sum.loanAmountUsd || 0),
        paymentBreakdown,
        last7DaysSales,
        topSellingProducts,
        lowStockItems: lowStockItems.slice(0, 6),
        readyRepairs: readyRepairsList.map((r) => ({
          id: r.id,
          ticketNumber: r.ticketNumber,
          customerName: r.customer?.name || "អតិថិជន",
          customerPhone: r.customer?.phone,
          deviceModel: r.deviceModel,
          customerProblem: r.customerProblem,
          amountUsd: Number(r.finalCostUsd || r.estimatedCostUsd || 0),
          status: r.status,
        })),
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          invoiceNumber: o.invoiceNumber,
          customerName: o.customer?.name || "អតិថិជនទូទៅ",
          totalUsd: Number(o.totalUsd),
          status: o.status,
          paymentMethod: o.payments?.[0]?.method || "CASH_USD",
          createdAt: o.createdAt.toISOString(),
        })),
      },
    };

    CacheManager.set(cacheKey, responseData, 5000);

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
