import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { CacheManager } from "@/lib/cache";

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
          ...(effectiveBranchId
            ? {
                OR: [{ id: effectiveBranchId }, { code: effectiveBranchId }],
              }
            : {}),
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
        { success: false, error: "មិនអាចដំណើរការកន្ត្រកទទេបានឡើយ (Empty cart)." },
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
      return NextResponse.json({ success: false, error: "មិនមានសាខាដែលបានកំណត់រចនាសម្ព័ន្ធឡើយ (No branch configured)." }, { status: 400 });
    }

    const targetBranch = customBranchId
      ? tenant.branches.find((b: any) => b.id === customBranchId || b.code === customBranchId) || tenant.branches[0]
      : (session?.branchId ? tenant.branches.find((b: any) => b.id === session.branchId || b.code === session.branchId) : tenant.branches[0]);

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

    // Execute atomic transaction with strict stock check & deduction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Pre-validate stock availability for ALL items before creating anything
      for (const item of items) {
        const prodId = item.productId || item.id;
        const requestedQty = Number(item.quantity || 1);

        const product = await tx.product.findUnique({
          where: { id: prodId },
          include: {
            stockItems: {
              where: {
                branchId: targetBranch.id,
                status: "IN_STOCK",
              },
            },
          },
        });

        if (!product) {
          throw new Error(`រកមិនឃើញទំនិញ (ID: ${prodId}) ក្នុងប្រព័ន្ធឡើយ`);
        }

        // Service/Labor does not require stock verification
        if (product.type !== "SERVICE_LABOR") {
          if (item.selectedImei) {
            const imeiRecord = product.stockItems.find(
              (s) => s.serialOrImei === item.selectedImei && s.status === "IN_STOCK"
            );
            if (!imeiRecord) {
              throw new Error(
                `ទំនិញ "${product.nameKh}" (IMEI: ${item.selectedImei}) មិនមានក្នុងស្តុក ឬត្រូវបានលក់រួចហើយ`
              );
            }
          } else {
            const totalAvailableStock = product.stockItems.reduce(
              (sum, s) => sum + s.quantity,
              0
            );

            if (totalAvailableStock <= 0) {
              throw new Error(
                `ទំនិញ "${product.nameKh}" អស់ពីស្តុកហើយ (ស្តុកនៅសល់ 0) មិនអាចលក់បានទេ!`
              );
            }

            if (totalAvailableStock < requestedQty) {
              throw new Error(
                `ទំនិញ "${product.nameKh}" មិនមានចំនួនគ្រប់គ្រាន់ក្នុងស្តុកទេ (ក្នុងស្តុកនៅសល់: ${totalAvailableStock}, ចំនួនបញ្ជាទិញ: ${requestedQty})`
              );
            }
          }
        }
      }

      // 2. Create Order Header
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

      // 3. Create Order Items & deduct stock accurately
      for (const item of items) {
        const prodId = item.productId || item.id;
        const requestedQty = Number(item.quantity || 1);

        const createdOrderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: prodId,
            unitCostUsd: Number(item.costPriceUsd || 0),
            unitPriceUsd: Number(item.priceUsd || 0),
            unitPriceKhr: Number(item.priceUsd || 0) * exchangeRateKhr,
            quantity: requestedQty,
            discountAmount: Number(item.discountAmount || 0),
            totalPriceUsd:
              Number(item.priceUsd || 0) * requestedQty -
              Number(item.discountAmount || 0),
          },
        });

        // Deduct inventory stock
        if (item.selectedImei) {
          const imeiItem = await tx.stockItem.findFirst({
            where: {
              productId: prodId,
              serialOrImei: item.selectedImei,
              branchId: targetBranch.id,
              status: "IN_STOCK",
            },
          });

          if (imeiItem) {
            await tx.stockItem.update({
              where: { id: imeiItem.id },
              data: { status: "SOLD", orderItemId: createdOrderItem.id },
            });
          }
        } else {
          // Sequential deduction for standard / variant / spare part items
          let remainingToDeduct = requestedQty;
          const stockRecords = await tx.stockItem.findMany({
            where: {
              productId: prodId,
              branchId: targetBranch.id,
              status: "IN_STOCK",
            },
            orderBy: { createdAt: "asc" },
          });

          for (const stockRec of stockRecords) {
            if (remainingToDeduct <= 0) break;
            if (stockRec.quantity <= remainingToDeduct) {
              remainingToDeduct -= stockRec.quantity;
              await tx.stockItem.update({
                where: { id: stockRec.id },
                data: { quantity: 0, status: "SOLD" },
              });
            } else {
              await tx.stockItem.update({
                where: { id: stockRec.id },
                data: { quantity: stockRec.quantity - remainingToDeduct },
              });
              remainingToDeduct = 0;
            }
          }
        }
      }

      // 4. Create Payment record
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

      // 5. If Customer Credit / Debt, record debt schedule
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

    // Invalidate caches so UI sees updated stock & stats immediately
    if (tenantId) {
      CacheManager.invalidatePrefix(`products:${tenantId}`);
      CacheManager.invalidatePrefix(`dashboard:${tenantId}`);
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      payment: result.payment,
      message: "Order processed successfully",
    });
  } catch (error: any) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process order" },
      { status: 400 }
    );
  }
}
