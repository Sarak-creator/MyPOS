import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { notifyStockTransfer } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// GET /api/transfers/[id] - Fetch single stock transfer
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id,
        fromBranch: { tenantId },
      },
      include: {
        fromBranch: {
          select: {
            id: true,
            name: true,
            code: true,
            phone: true,
            address: true,
          },
        },
        toBranch: {
          select: {
            id: true,
            name: true,
            code: true,
            phone: true,
            address: true,
          },
        },
        items: true,
      },
    });

    if (!transfer) {
      return NextResponse.json({ success: false, error: "Transfer not found" }, { status: 404 });
    }

    // Enrich items with Product info
    const productIds = transfer.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        sku: true,
        barcode: true,
        nameKh: true,
        nameEn: true,
        unit: true,
        imageUrl: true,
        salePriceUsd: true,
        costPriceUsd: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const enrichedItems = transfer.items.map((item) => {
      const prod = productMap.get(item.productId);
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        serialOrImeis: item.serialOrImeis || [],
        productNameKh: prod?.nameKh || "ទំនិញ",
        productNameEn: prod?.nameEn || "",
        sku: prod?.sku || "",
        barcode: prod?.barcode || prod?.sku || "",
        unit: prod?.unit || "Pcs",
        imageUrl: prod?.imageUrl,
        salePriceUsd: prod ? Number(prod.salePriceUsd) : 0,
        costPriceUsd: prod ? Number(prod.costPriceUsd) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      transfer: {
        ...transfer,
        items: enrichedItems,
        totalQuantity: enrichedItems.reduce((sum, i) => sum + i.quantity, 0),
      },
    });
  } catch (error: any) {
    console.error("GET /api/transfers/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/transfers/[id] - Update transfer status & execute inventory movements
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: "Status is required" }, { status: 400 });
    }

    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id,
        fromBranch: { tenantId },
      },
      include: {
        fromBranch: { include: { warehouses: true } },
        toBranch: { include: { warehouses: true } },
        items: true,
      },
    });

    if (!transfer) {
      return NextResponse.json({ success: false, error: "Transfer not found" }, { status: 404 });
    }

    if (transfer.status === "COMPLETED") {
      return NextResponse.json(
        { success: false, error: "សំណើផ្ទេរនេះបានបញ្ចប់រួចរាល់ហើយ មិនអាចកែប្រែបានទៀតទេ (Transfer already completed)" },
        { status: 400 }
      );
    }

    if (transfer.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: "សំណើផ្ទេរនេះត្រូវបានបោះបង់រួចហើយ (Transfer already cancelled)" },
        { status: 400 }
      );
    }

    const fromBranch = transfer.fromBranch;
    const toBranch = transfer.toBranch;
    const oldStatus = transfer.status;
    const newStatus = status;

    // Ensure destination warehouse exists
    const toWarehouse = toBranch.warehouses[0] || (await prisma.warehouse.create({
      data: {
        branchId: toBranch.id,
        name: `ឃ្លាំងចម្បង (${toBranch.name})`,
        isDefault: true,
      },
    }));

    // Ensure origin warehouse exists
    const fromWarehouse = fromBranch.warehouses[0] || (await prisma.warehouse.create({
      data: {
        branchId: fromBranch.id,
        name: `ឃ្លាំងចម្បង (${fromBranch.name})`,
        isDefault: true,
      },
    }));

    const updatedTransfer = await prisma.$transaction(async (tx) => {
      // 1. Transition to IN_TRANSIT (Dispatch from origin)
      if (newStatus === "IN_TRANSIT" && oldStatus !== "IN_TRANSIT") {
        for (const item of transfer.items) {
          const targetQty = Number(item.quantity);
          const imeiList = Array.isArray(item.serialOrImeis) ? item.serialOrImeis : [];

          if (imeiList.length > 0) {
            for (const imei of imeiList) {
              await tx.stockItem.updateMany({
                where: {
                  productId: item.productId,
                  branchId: fromBranch.id,
                  serialOrImei: imei,
                  status: "IN_STOCK",
                },
                data: { status: "TRANSFERRED" },
              });
            }
          } else {
            let remainingToDeduct = targetQty;
            const originStockItems = await tx.stockItem.findMany({
              where: {
                productId: item.productId,
                branchId: fromBranch.id,
                status: "IN_STOCK",
              },
              orderBy: { createdAt: "asc" },
            });

            for (const stock of originStockItems) {
              if (remainingToDeduct <= 0) break;
              if (stock.quantity <= remainingToDeduct) {
                remainingToDeduct -= stock.quantity;
                await tx.stockItem.delete({ where: { id: stock.id } });
              } else {
                await tx.stockItem.update({
                  where: { id: stock.id },
                  data: { quantity: stock.quantity - remainingToDeduct },
                });
                remainingToDeduct = 0;
              }
            }
          }
        }
      }

      // 2. Transition to COMPLETED (Receive & add to destination)
      if (newStatus === "COMPLETED") {
        // If coming directly from PENDING or APPROVED without prior IN_TRANSIT deduction
        if (oldStatus !== "IN_TRANSIT") {
          for (const item of transfer.items) {
            const targetQty = Number(item.quantity);
            const imeiList = Array.isArray(item.serialOrImeis) ? item.serialOrImeis : [];

            if (imeiList.length === 0) {
              let remainingToDeduct = targetQty;
              const originStockItems = await tx.stockItem.findMany({
                where: {
                  productId: item.productId,
                  branchId: fromBranch.id,
                  status: "IN_STOCK",
                },
                orderBy: { createdAt: "asc" },
              });

              for (const stock of originStockItems) {
                if (remainingToDeduct <= 0) break;
                if (stock.quantity <= remainingToDeduct) {
                  remainingToDeduct -= stock.quantity;
                  await tx.stockItem.delete({ where: { id: stock.id } });
                } else {
                  await tx.stockItem.update({
                    where: { id: stock.id },
                    data: { quantity: stock.quantity - remainingToDeduct },
                  });
                  remainingToDeduct = 0;
                }
              }
            }
          }
        }

        // Add items to destination branch
        for (const item of transfer.items) {
          const targetQty = Number(item.quantity);
          const imeiList = Array.isArray(item.serialOrImeis) ? item.serialOrImeis : [];

          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          const costPrice = prod ? prod.costPriceUsd : 0;

          if (imeiList.length > 0) {
            for (const imei of imeiList) {
              // Check if stockItem exists (could be in status TRANSFERRED or IN_STOCK)
              const existingImei = await tx.stockItem.findFirst({
                where: {
                  productId: item.productId,
                  serialOrImei: imei,
                },
              });

              if (existingImei) {
                await tx.stockItem.update({
                  where: { id: existingImei.id },
                  data: {
                    branchId: toBranch.id,
                    warehouseId: toWarehouse.id,
                    status: "IN_STOCK",
                  },
                });
              } else {
                await tx.stockItem.create({
                  data: {
                    productId: item.productId,
                    branchId: toBranch.id,
                    warehouseId: toWarehouse.id,
                    serialOrImei: imei,
                    quantity: 1,
                    costPriceUsd: costPrice,
                    status: "IN_STOCK",
                  },
                });
              }
            }
          } else {
            // Standard item: find existing stock in destination warehouse
            const existingDestStock = await tx.stockItem.findFirst({
              where: {
                productId: item.productId,
                branchId: toBranch.id,
                warehouseId: toWarehouse.id,
                serialOrImei: null,
                status: "IN_STOCK",
              },
            });

            if (existingDestStock) {
              await tx.stockItem.update({
                where: { id: existingDestStock.id },
                data: {
                  quantity: existingDestStock.quantity + targetQty,
                },
              });
            } else {
              await tx.stockItem.create({
                data: {
                  productId: item.productId,
                  branchId: toBranch.id,
                  warehouseId: toWarehouse.id,
                  quantity: targetQty,
                  costPriceUsd: costPrice,
                  status: "IN_STOCK",
                },
              });
            }
          }
        }
      }

      // 3. Transition to CANCELLED (Rollback if was IN_TRANSIT)
      if (newStatus === "CANCELLED" && oldStatus === "IN_TRANSIT") {
        for (const item of transfer.items) {
          const targetQty = Number(item.quantity);
          const imeiList = Array.isArray(item.serialOrImeis) ? item.serialOrImeis : [];

          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          const costPrice = prod ? prod.costPriceUsd : 0;

          if (imeiList.length > 0) {
            for (const imei of imeiList) {
              await tx.stockItem.updateMany({
                where: {
                  productId: item.productId,
                  serialOrImei: imei,
                },
                data: {
                  branchId: fromBranch.id,
                  warehouseId: fromWarehouse.id,
                  status: "IN_STOCK",
                },
              });
            }
          } else {
            const existingOriginStock = await tx.stockItem.findFirst({
              where: {
                productId: item.productId,
                branchId: fromBranch.id,
                warehouseId: fromWarehouse.id,
                serialOrImei: null,
                status: "IN_STOCK",
              },
            });

            if (existingOriginStock) {
              await tx.stockItem.update({
                where: { id: existingOriginStock.id },
                data: {
                  quantity: existingOriginStock.quantity + targetQty,
                },
              });
            } else {
              await tx.stockItem.create({
                data: {
                  productId: item.productId,
                  branchId: fromBranch.id,
                  warehouseId: fromWarehouse.id,
                  quantity: targetQty,
                  costPriceUsd: costPrice,
                  status: "IN_STOCK",
                },
              });
            }
          }
        }
      }

      // Update StockTransfer record
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: newStatus,
          notes: notes !== undefined ? notes : transfer.notes,
          approvedBy: session?.fullName || session?.username || transfer.approvedBy,
        },
        include: {
          items: true,
          fromBranch: true,
          toBranch: true,
        },
      });

      // Audit Log
      if (session?.userId) {
        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: `STOCK_TRANSFER_${newStatus}`,
            entity: "StockTransfer",
            entityId: id,
            details: {
              transferNumber: transfer.transferNumber,
              oldStatus,
              newStatus,
              fromBranch: fromBranch.name,
              toBranch: toBranch.name,
            },
          },
        });
      }

      return updated;
    });

    // Notify Telegram asynchronously
    try {
      const allProductIds = transfer.items.map((i) => i.productId);
      const productRecords = await prisma.product.findMany({
        where: { id: { in: allProductIds } },
        select: { id: true, nameKh: true, unit: true },
      });
      const prodMap = new Map(productRecords.map((p) => [p.id, p]));

      const itemsSummary = transfer.items
        .map((i) => {
          const p = prodMap.get(i.productId);
          return `• ${p?.nameKh || "ទំនិញ"} (${i.quantity} ${p?.unit || "ឯកតា"})${i.serialOrImeis?.length ? ` [IMEI: ${i.serialOrImeis.join(", ")}]` : ""}`;
        })
        .join("\n");

      const totalQty = transfer.items.reduce((sum, i) => sum + Number(i.quantity), 0);

      notifyStockTransfer({
        transferNumber: updatedTransfer.transferNumber,
        fromBranchName: fromBranch.name,
        toBranchName: toBranch.name,
        status: updatedTransfer.status,
        itemCount: transfer.items.length,
        totalQuantity: totalQty,
        itemsSummary,
        notes: notes || transfer.notes || undefined,
        approvedBy: updatedTransfer.approvedBy || undefined,
      }).catch((e) => console.error("Telegram transfer status notify error:", e));
    } catch (tgErr) {
      console.error("Telegram notification error:", tgErr);
    }

    return NextResponse.json({
      success: true,
      transfer: updatedTransfer,
      message: `បានធ្វើបច្ចុប្បន្នភាពស្ថានភាពផ្ទេរស្តុកទៅជា "${newStatus}" ដោយជោគជ័យ`,
    });
  } catch (error: any) {
    console.error("PATCH /api/transfers/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/transfers/[id] - Delete a pending or cancelled transfer
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id,
        fromBranch: { tenantId },
      },
    });

    if (!transfer) {
      return NextResponse.json({ success: false, error: "Transfer not found" }, { status: 404 });
    }

    if (transfer.status === "IN_TRANSIT" || transfer.status === "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          error: "មិនអាចលុបសំណើដែលកំពុងដឹកជញ្ជូន ឬបានបញ្ចប់ឡើយ សូមធ្វើការបោះបង់ (Cancel) ជាមុនសិន",
        },
        { status: 400 }
      );
    }

    await prisma.stockTransfer.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "បានលុបសំណើផ្ទេរស្តុកដោយជោគជ័យ",
    });
  } catch (error: any) {
    console.error("DELETE /api/transfers/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
