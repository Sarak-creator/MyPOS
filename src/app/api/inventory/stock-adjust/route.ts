import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { CacheManager } from "@/lib/cache";
import { AdjustmentReason } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const {
      productId,
      type, // "RESTOCK" (បញ្ចូលស្តុក) or "DEDUCT" (កាត់ស្តុក)
      quantity = 1,
      reason = "COUNT_CORRECTION",
      notes = "",
      imeiList = [],
      branchId: customBranchId,
      warehouseId: customWarehouseId,
    } = body;

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required." },
        { status: 400 }
      );
    }

    if (type !== "RESTOCK" && type !== "DEDUCT") {
      return NextResponse.json(
        { success: false, error: "Type must be RESTOCK or DEDUCT." },
        { status: 400 }
      );
    }

    let tenantId = session?.tenantId;
    let tenant: any = null;

    if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          branches: {
            include: { warehouses: true },
          },
          users: true,
        },
      });
    } else {
      tenant = await prisma.tenant.findFirst({
        include: {
          branches: {
            include: { warehouses: true },
          },
          users: true,
        },
      });
      tenantId = tenant?.id;
    }

    if (!tenant || tenant.branches.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active tenant or branch found." },
        { status: 400 }
      );
    }

    const targetBranch = customBranchId
      ? tenant.branches.find((b: any) => b.id === customBranchId || b.code === customBranchId) || tenant.branches[0]
      : (session?.branchId ? tenant.branches.find((b: any) => b.id === session.branchId || b.code === session.branchId) : tenant.branches[0]);

    const targetWarehouse = customWarehouseId
      ? targetBranch?.warehouses.find((w: any) => w.id === customWarehouseId) || targetBranch?.warehouses[0]
      : targetBranch?.warehouses[0];

    const targetUser = session?.userId
      ? tenant.users.find((u: any) => u.id === session.userId) || tenant.users[0]
      : tenant.users[0];

    const result = await prisma.$transaction(
      async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: productId },
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
          throw new Error("រកមិនឃើញទំនិញក្នុងប្រព័ន្ធឡើយ (Product not found)");
        }

        const currentTotalStock = product.stockItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        );

        let finalStockQty = currentTotalStock;

        // Map AdjustmentReason enum
        let validReason: AdjustmentReason = AdjustmentReason.COUNT_CORRECTION;
        if (reason && Object.values(AdjustmentReason).includes(reason as AdjustmentReason)) {
          validReason = reason as AdjustmentReason;
        } else if (type === "DEDUCT") {
          validReason = AdjustmentReason.COUNT_CORRECTION;
        }

        if (type === "RESTOCK") {
          // 1. RESTOCK (បញ្ចូលស្តុក)
          if (product.type === "SERIAL_IMEI_ITEM" && Array.isArray(imeiList) && imeiList.length > 0) {
            for (const imei of imeiList) {
              if (imei && imei.trim()) {
                await tx.stockItem.create({
                  data: {
                    productId: product.id,
                    branchId: targetBranch.id,
                    warehouseId: targetWarehouse.id,
                    serialOrImei: imei.trim(),
                    quantity: 1,
                    costPriceUsd: product.costPriceUsd,
                    status: "IN_STOCK",
                  },
                });
              }
            }
            finalStockQty += imeiList.length;
          } else {
            // Find existing standard stock record or create one
            const existingStock = product.stockItems.find((s) => !s.serialOrImei);
            if (existingStock) {
              await tx.stockItem.update({
                where: { id: existingStock.id },
                data: {
                  quantity: { increment: qty },
                },
              });
            } else {
              await tx.stockItem.create({
                data: {
                  productId: product.id,
                  branchId: targetBranch.id,
                  warehouseId: targetWarehouse.id,
                  quantity: qty,
                  costPriceUsd: product.costPriceUsd,
                  status: "IN_STOCK",
                },
              });
            }
            finalStockQty += qty;
          }
        } else {
          // 2. DEDUCT (កាត់ស្តុកចេញ)
          if (currentTotalStock < qty) {
            throw new Error(
              `ស្តុកមិនគ្រប់គ្រាន់សម្រាប់កាត់ចេញទេ (ស្តុកបច្ចុប្បន្ន: ${currentTotalStock}, ចំនួនស្នើកាត់: ${qty})`
            );
          }

          let remainingToDeduct = qty;
          for (const stockRec of product.stockItems) {
            if (remainingToDeduct <= 0) break;
            if (stockRec.quantity <= remainingToDeduct) {
              remainingToDeduct -= stockRec.quantity;
              await tx.stockItem.update({
                where: { id: stockRec.id },
                data: {
                  quantity: 0,
                  status: "DEFECTIVE",
                },
              });
            } else {
              await tx.stockItem.update({
                where: { id: stockRec.id },
                data: {
                  quantity: stockRec.quantity - remainingToDeduct,
                },
              });
              remainingToDeduct = 0;
            }
          }
          finalStockQty = Math.max(0, currentTotalStock - qty);
        }

        // Record Stock Adjustment Audit Trail
        if (targetWarehouse) {
          try {
            const adj = await tx.stockAdjustment.create({
              data: {
                warehouseId: targetWarehouse.id,
                reason: validReason,
                notes: notes || `${type === "RESTOCK" ? "ReStock" : "Stock Cut"}: ${qty} ${product.unit}`,
                adjustedBy: targetUser?.fullNameKh || targetUser?.fullName || "Admin",
              },
            });

            await tx.stockAdjustmentItem.create({
              data: {
                adjustmentId: adj.id,
                productId: product.id,
                quantityDelta: type === "RESTOCK" ? qty : -qty,
                costImpactUsd: Number(product.costPriceUsd) * qty,
              },
            });
          } catch (adjErr) {
            console.warn("Could not record stock adjustment audit:", adjErr);
          }
        }

        return {
          productId: product.id,
          productName: product.nameKh,
          previousStock: currentTotalStock,
          newStockQty: finalStockQty,
          delta: type === "RESTOCK" ? qty : -qty,
        };
      },
      {
        maxWait: 15000,
        timeout: 45000,
      }
    );

    // Invalidate caches immediately
    CacheManager.invalidatePrefix("products:");
    CacheManager.invalidatePrefix("dashboard:");

    return NextResponse.json({
      success: true,
      data: result,
      message:
        type === "RESTOCK"
          ? `✓ បានបញ្ចូលស្តុក ${result.productName} (+${quantity}) ដោយជោគជ័យ!`
          : `✓ បានកាត់ស្តុក ${result.productName} (-${quantity}) ដោយជោគជ័យ!`,
    });
  } catch (error: any) {
    console.error("POST /api/inventory/stock-adjust error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to adjust stock." },
      { status: 400 }
    );
  }
}
