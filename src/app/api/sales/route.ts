import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMethod, OrderStatus } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { CacheManager } from "@/lib/cache";

// GET /api/sales - Search, filter, and fetch sales invoices scoped to tenant and branch
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";
    const dateRange = searchParams.get("dateRange") || "all"; // today, this_week, this_month, custom, all
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const reqBranchId = searchParams.get("branchId") || "";
    const limit = Number(searchParams.get("limit") || 50);
    const page = Number(searchParams.get("page") || 1);
    const skip = (page - 1) * limit;

    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({
        success: true,
        invoices: [],
        total: 0,
        page: 1,
        totalPages: 0,
        stats: {
          totalRevenueUsd: 0,
          totalRevenueKhr: 0,
          completedCount: 0,
          refundedCount: 0,
          khqrRevenueUsd: 0,
          cashRevenueUsd: 0,
          debtRevenueUsd: 0,
          itemsSold: 0,
        },
      });
    }

    // Construct Date filter
    const now = new Date();
    let dateFilter: any = undefined;

    if (dateRange === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      dateFilter = { gte: startOfDay, lte: endOfDay };
    } else if (dateRange === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      dateFilter = { gte: start, lte: end };
    } else if (dateRange === "this_week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfWeek };
    } else if (dateRange === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      dateFilter = { gte: startOfMonth };
    } else if (dateRange === "custom" && startDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date(),
      };
    }

    const effectiveBranchId = reqBranchId || session?.branchId || undefined;

    // Build Where Clause
    const where: any = {
      branch: {
        tenantId,
        ...(effectiveBranchId ? { id: effectiveBranchId } : {}),
      },
    };

    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      where.status = status as OrderStatus;
    }

    if (paymentMethod && Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) {
      where.payments = {
        some: {
          method: paymentMethod as PaymentMethod,
        },
      };
    }

    if (query) {
      where.OR = [
        { invoiceNumber: { contains: query, mode: "insensitive" } },
        { customer: { name: { contains: query, mode: "insensitive" } } },
        { customer: { phone: { contains: query, mode: "insensitive" } } },
        { cashier: { fullName: { contains: query, mode: "insensitive" } } },
        { cashier: { fullNameKh: { contains: query, mode: "insensitive" } } },
        { notes: { contains: query, mode: "insensitive" } },
      ];
    }

    // Fetch Orders with Relations
    const [orders, totalCount, allOrdersForStats] = await Promise.all([
      prisma.order.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          cashier: { select: { id: true, fullName: true, fullNameKh: true, username: true } },
          branch: { select: { id: true, name: true, code: true } },
          items: {
            include: {
              product: {
                select: { id: true, nameKh: true, nameEn: true, sku: true, barcode: true, category: true },
              },
            },
          },
          payments: true,
        },
      }),
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        select: {
          totalUsd: true,
          totalKhr: true,
          status: true,
          items: { select: { quantity: true } },
          payments: { select: { method: true, amountUsd: true } },
        },
      }),
    ]);

    // Compute aggregated KPI Stats
    let totalRevenueUsd = 0;
    let totalRevenueKhr = 0;
    let completedCount = 0;
    let refundedCount = 0;
    let khqrRevenueUsd = 0;
    let cashRevenueUsd = 0;
    let debtRevenueUsd = 0;
    let itemsSold = 0;

    for (const ord of allOrdersForStats) {
      if (ord.status === OrderStatus.COMPLETED) {
        totalRevenueUsd += Number(ord.totalUsd);
        totalRevenueKhr += Number(ord.totalKhr);
        completedCount += 1;
        itemsSold += ord.items.reduce((acc, it) => acc + it.quantity, 0);

        for (const p of ord.payments) {
          if (p.method === PaymentMethod.KHQR_ABA || p.method === PaymentMethod.KHQR_BAKONG) {
            khqrRevenueUsd += Number(p.amountUsd);
          } else if (p.method === PaymentMethod.CASH_USD || p.method === PaymentMethod.CASH_KHR) {
            cashRevenueUsd += Number(p.amountUsd);
          } else if (p.method === PaymentMethod.CUSTOMER_CREDIT) {
            debtRevenueUsd += Number(p.amountUsd);
          }
        }
      } else if (ord.status === OrderStatus.REFUNDED) {
        refundedCount += 1;
      }
    }

    const averageOrderValue = completedCount > 0 ? totalRevenueUsd / completedCount : 0;

    return NextResponse.json({
      success: true,
      orders,
      invoices: orders,
      sales: orders,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        page,
        limit,
      },
      stats: {
        totalRevenueUsd,
        totalRevenueKhr,
        completedCount,
        completedOrdersCount: completedCount,
        refundedCount,
        refundedOrdersCount: refundedCount,
        khqrRevenueUsd,
        cashRevenueUsd,
        debtRevenueUsd,
        itemsSold,
        totalItemsSold: itemsSold,
        averageOrderValue,
        paymentBreakdown: {
          KHQR_ABA: khqrRevenueUsd,
          CASH_USD: cashRevenueUsd,
          CASH_KHR: 0,
          CUSTOMER_CREDIT: debtRevenueUsd,
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/sales error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/sales - Process Refund or Void Invoice scoped to tenant
export async function PATCH(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const { orderId, action, reason } = body;

    if (!orderId || !action) {
      return NextResponse.json(
        { success: false, error: "Order ID and action (REFUND / VOID) are required." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: true,
        payments: true,
        branch: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    // Check tenant isolation
    if (session?.tenantId && order.branch?.tenantId !== session.tenantId) {
      return NextResponse.json({ success: false, error: "Unauthorized access to order." }, { status: 403 });
    }

    if (action === "REFUND" || action === "VOID") {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // 1. Update Order Status
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.REFUNDED,
            notes: `${order.notes || ""} [${action}: ${reason || "Processed by Admin"}]`.trim(),
          },
        });

        // 2. If Customer Credit / Debt, adjust customer debt balance
        if (order.customerId) {
          const hasDebt = order.payments.some((p) => p.method === PaymentMethod.CUSTOMER_CREDIT);
          if (hasDebt) {
            await tx.customer.update({
              where: { id: order.customerId },
              data: {
                currentDebtUsd: {
                  decrement: Number(order.totalUsd),
                },
              },
            });

            // Update debt schedule
            await tx.debtPaymentSchedule.updateMany({
              where: { orderId: order.id },
              data: { status: "PAID", notes: `Reversed due to ${action}` },
            });
          }
        }

        // 3. Re-stock inventory items
        for (const item of order.items) {
          await tx.stockItem.updateMany({
            where: {
              productId: item.productId,
              status: "SOLD",
            },
            data: { status: "IN_STOCK" },
          });
        }

        // 4. Audit Log
        await tx.auditLog.create({
          data: {
            userId: session?.userId || order.cashierId,
            action: `ORDER_${action}`,
            entity: "Order",
            entityId: order.id,
            details: {
              invoiceNumber: order.invoiceNumber,
              refundAmountUsd: Number(order.totalUsd),
              reason,
            },
          },
        });

        return updated;
      });

      if (order.branch?.tenantId) {
        CacheManager.invalidatePrefix(`products:${order.branch.tenantId}`);
        CacheManager.invalidatePrefix(`dashboard:${order.branch.tenantId}`);
      }

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        message: `Order #${order.invoiceNumber} has been ${action === "REFUND" ? "refunded" : "voided"} successfully.`,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/sales error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
