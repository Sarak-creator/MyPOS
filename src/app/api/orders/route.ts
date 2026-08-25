import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";

// GET /api/orders - Fetch recent orders scoped to tenant and branch
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 20);
    const reqBranchId = searchParams.get("branchId") || "";

    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const effectiveBranchId = reqBranchId || session?.branchId || undefined;

    const orders = await prisma.order.findMany({
      where: {
        branch: {
          tenantId,
          ...(effectiveBranchId ? { id: effectiveBranchId } : {}),
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        cashier: { select: { id: true, fullName: true, fullNameKh: true, username: true } },
        items: { include: { product: true } },
        payments: true,
        branch: true,
      },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/orders - Create a POS order transaction scoped to caller's tenant and branch
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const {
      invoiceNumber,
      customerId,
      items = [],
      subtotalUsd = 0,
      discountType = "FIXED",
      discountAmount = 0,
      taxRatePercent = 0,
      taxAmountUsd = 0,
      totalUsd = 0,
      totalKhr = 0,
      exchangeRateKhr = 4100,
      notes = "",
      paymentMethod = "KHQR_ABA",
      tenderedUsd = 0,
      changeUsd = 0,
      referenceNumber = "",
      khqrQrString = "",
      khqrMd5 = "",
      branchId: customBranchId,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cannot process empty order." },
        { status: 400 }
      );
    }

    let tenantId = session?.tenantId;
    let tenant: any = null;

    if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          branches: true,
          users: true,
        },
      });
    } else {
      tenant = await prisma.tenant.findFirst({
        include: {
          branches: true,
          users: true,
        },
      });
      tenantId = tenant?.id;
    }

    if (!tenant || tenant.branches.length === 0) {
      return NextResponse.json({ success: false, error: "No branch configured." }, { status: 400 });
    }

    const targetBranch = customBranchId
      ? tenant.branches.find((b: any) => b.id === customBranchId) || tenant.branches[0]
      : (session?.branchId ? tenant.branches.find((b: any) => b.id === session.branchId) : tenant.branches[0]);

    const targetCashier = session?.userId
      ? tenant.users.find((u: any) => u.id === session.userId) || tenant.users[0]
      : tenant.users[0];

    // Generate Invoice Number if not provided
    let finalInvoiceNumber = invoiceNumber;
    if (!finalInvoiceNumber) {
      const now = new Date();
      const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const count = await prisma.order.count({
        where: { branch: { tenantId } },
      });
      finalInvoiceNumber = `INV-${monthStr}-${String(count + 1).padStart(4, "0")}`;
    }

    // Execute transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Order
      const order = await tx.order.create({
        data: {
          invoiceNumber: finalInvoiceNumber,
          branchId: targetBranch.id,
          customerId: customerId || undefined,
          cashierId: targetCashier.id,
          status: "COMPLETED",
          subtotalUsd: Number(subtotalUsd),
          discountType,
          discountAmount: Number(discountAmount),
          taxRatePercent: Number(taxRatePercent),
          taxAmountUsd: Number(taxAmountUsd),
          totalUsd: Number(totalUsd),
          totalKhr: Number(totalKhr) || Number(totalUsd) * exchangeRateKhr,
          exchangeRateKhr: Number(exchangeRateKhr),
          notes,
          khqrQrString,
          khqrMd5,
        },
      });

      // 2. Create Order Items & deduct stock
      for (const item of items) {
        const createdOrderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId || item.id,
            unitCostUsd: Number(item.costPriceUsd || 0),
            unitPriceUsd: Number(item.priceUsd || 0),
            unitPriceKhr: Number(item.priceUsd || 0) * exchangeRateKhr,
            quantity: Number(item.quantity || 1),
            discountAmount: Number(item.discountAmount || 0),
            totalPriceUsd:
              Number(item.priceUsd || 0) * Number(item.quantity || 1) -
              Number(item.discountAmount || 0),
          },
        });

        // Deduct inventory stock
        if (item.selectedImei) {
          await tx.stockItem.updateMany({
            where: {
              productId: item.productId || item.id,
              serialOrImei: item.selectedImei,
              branchId: targetBranch.id,
              status: "IN_STOCK",
            },
            data: { status: "SOLD", orderItemId: createdOrderItem.id },
          });
        } else {
          // Deduct from standard stock item
          const stock = await tx.stockItem.findFirst({
            where: {
              productId: item.productId || item.id,
              branchId: targetBranch.id,
              status: "IN_STOCK",
            },
          });

          if (stock) {
            const newQty = Math.max(0, stock.quantity - Number(item.quantity || 1));
            await tx.stockItem.update({
              where: { id: stock.id },
              data: { quantity: newQty },
            });
          }
        }
      }

      // 3. Create Payment record
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          method: paymentMethod as PaymentMethod,
          amountUsd: Number(totalUsd),
          amountKhr: Number(totalKhr) || Number(totalUsd) * exchangeRateKhr,
          exchangeRate: Number(exchangeRateKhr),
          tenderedUsd: Number(tenderedUsd || totalUsd),
          changeUsd: Number(changeUsd || 0),
          referenceNumber: referenceNumber || undefined,
        },
      });

      // 4. If Customer Credit / Debt, record debt schedule
      if (paymentMethod === "CUSTOMER_CREDIT" && customerId) {
        await tx.debtPaymentSchedule.create({
          data: {
            customerId,
            orderId: order.id,
            totalDebtUsd: Number(totalUsd),
            remainingUsd: Number(totalUsd),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            status: "PENDING",
          },
        });

        await tx.customer.update({
          where: { id: customerId },
          data: { currentDebtUsd: { increment: Number(totalUsd) } },
        });
      }

      return { order, payment };
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      payment: result.payment,
      message: "Order processed successfully",
    });
  } catch (error: any) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
