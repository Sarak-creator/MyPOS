import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { POStatus } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helper to generate PO Number
function generatePONumber(count: number): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `PO-${yearMonth}-${String(count + 1).padStart(4, "0")}`;
}

// GET /api/purchases - Fetch purchase orders scoped to caller's tenant
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status") || "";
    const supplierId = searchParams.get("supplierId") || "";
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
        purchaseOrders: [],
        total: 0,
        page: 1,
        totalPages: 0,
        stats: {
          totalSpentUsd: 0,
          pendingOrdersCount: 0,
          receivedOrdersCount: 0,
          totalSuppliersCount: 0,
        },
      });
    }

    const where: any = {
      supplier: { tenantId },
    };

    if (status && Object.values(POStatus).includes(status as POStatus)) {
      where.status = status as POStatus;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (query) {
      where.OR = [
        { poNumber: { contains: query, mode: "insensitive" } },
        { supplier: { companyName: { contains: query, mode: "insensitive" } } },
        { supplier: { contactPerson: { contains: query, mode: "insensitive" } } },
        { notes: { contains: query, mode: "insensitive" } },
      ];
    }

    const [purchaseOrders, totalCount, allPOsForStats, suppliers] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        take: limit,
        skip,
        orderBy: { orderedAt: "desc" },
        include: {
          supplier: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  nameKh: true,
                  nameEn: true,
                  sku: true,
                  barcode: true,
                  costPriceUsd: true,
                  salePriceUsd: true,
                },
              },
            },
          },
        },
      }),
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where: { supplier: { tenantId } },
        select: {
          totalCostUsd: true,
          status: true,
        },
      }),
      prisma.supplier.findMany({
        where: { tenantId },
        orderBy: { companyName: "asc" },
      }),
    ]);

    // Compute aggregated KPI Stats
    let totalSpentUsd = 0;
    let pendingOrdersCount = 0;
    let receivedOrdersCount = 0;

    for (const po of allPOsForStats) {
      totalSpentUsd += Number(po.totalCostUsd || 0);
      if (po.status === POStatus.ORDERED || po.status === POStatus.DRAFT) {
        pendingOrdersCount += 1;
      } else if (po.status === POStatus.RECEIVED) {
        receivedOrdersCount += 1;
      }
    }

    return NextResponse.json({
      success: true,
      purchaseOrders,
      suppliers,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      stats: {
        totalSpentUsd,
        pendingOrdersCount,
        receivedOrdersCount,
        totalSuppliersCount: suppliers.length,
      },
    });
  } catch (error: any) {
    console.error("GET /api/purchases error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/purchases - Create a new Purchase Order scoped to tenant
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const {
      supplierId,
      poNumber,
      status = "ORDERED",
      items = [],
      notes = "",
      orderedAt = new Date().toISOString(),
      branchId: customBranchId,
      warehouseId: customWarehouseId,
    } = body;

    if (!supplierId) {
      return NextResponse.json({ success: false, error: "Supplier is required." }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: "Must include at least one item." }, { status: 400 });
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
        },
      });
    } else {
      tenant = await prisma.tenant.findFirst({
        include: {
          branches: {
            include: { warehouses: true },
          },
        },
      });
      tenantId = tenant?.id;
    }

    if (!tenant || tenant.branches.length === 0) {
      return NextResponse.json({ success: false, error: "No branch/warehouse configured." }, { status: 400 });
    }

    const targetBranch = customBranchId
      ? tenant.branches.find((b: any) => b.id === customBranchId) || tenant.branches[0]
      : (session?.branchId ? tenant.branches.find((b: any) => b.id === session.branchId) : tenant.branches[0]);

    const targetWarehouse = customWarehouseId
      ? targetBranch?.warehouses.find((w: any) => w.id === customWarehouseId) || targetBranch?.warehouses[0]
      : targetBranch?.warehouses[0];

    // Calculate total
    let totalCostUsd = 0;
    for (const item of items) {
      totalCostUsd += Number(item.quantity) * Number(item.unitCostUsd);
    }

    // Generate PO Number
    let finalPoNumber = poNumber;
    if (!finalPoNumber) {
      const poCount = await prisma.purchaseOrder.count({
        where: { supplier: { tenantId } },
      });
      finalPoNumber = generatePONumber(poCount);
    }

    const targetStatus = Object.values(POStatus).includes(status as POStatus)
      ? (status as POStatus)
      : POStatus.ORDERED;

    const isReceived = targetStatus === POStatus.RECEIVED;

    const newPO = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase Order
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: finalPoNumber,
          supplierId,
          status: targetStatus,
          totalCostUsd,
          notes,
          orderedAt: new Date(orderedAt),
          receivedAt: isReceived ? new Date() : null,
          items: {
            create: items.map((i: any) => ({
              productId: i.productId,
              quantity: Number(i.quantity),
              unitCostUsd: Number(i.unitCostUsd),
              totalCostUsd: Number(i.quantity) * Number(i.unitCostUsd),
            })),
          },
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 2. If directly received, increase stock
      if (isReceived && targetBranch && targetWarehouse) {
        for (const item of items) {
          const existingStock = await tx.stockItem.findFirst({
            where: {
              productId: item.productId,
              branchId: targetBranch.id,
              status: "IN_STOCK",
            },
          });

          if (existingStock) {
            await tx.stockItem.update({
              where: { id: existingStock.id },
              data: {
                quantity: { increment: Number(item.quantity) },
                costPriceUsd: Number(item.unitCostUsd),
              },
            });
          } else {
            await tx.stockItem.create({
              data: {
                productId: item.productId,
                branchId: targetBranch.id,
                warehouseId: targetWarehouse.id,
                quantity: Number(item.quantity),
                costPriceUsd: Number(item.unitCostUsd),
                status: "IN_STOCK",
              },
            });
          }
        }
      }

      // 3. Update Supplier balance
      await tx.supplier.update({
        where: { id: supplierId },
        data: {
          currentBalanceUsd: { increment: totalCostUsd },
        },
      });

      return po;
    });

    return NextResponse.json({
      success: true,
      purchaseOrder: newPO,
      message: `Purchase Order ${newPO.poNumber} created successfully.`,
    });
  } catch (error: any) {
    console.error("POST /api/purchases error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/purchases - Update PO Status (Receive items, Cancel, etc.)
export async function PATCH(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const { poId, status, notes } = body;

    if (!poId || !status) {
      return NextResponse.json({ success: false, error: "PO ID and Status are required." }, { status: 400 });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        supplier: true,
        items: true,
      },
    });

    if (!po) {
      return NextResponse.json({ success: false, error: "Purchase order not found." }, { status: 404 });
    }

    // Tenant check
    if (session?.tenantId && po.supplier.tenantId !== session.tenantId) {
      return NextResponse.json({ success: false, error: "Unauthorized access to purchase order." }, { status: 403 });
    }

    const previousStatus = po.status;
    const isNowReceived = status === "RECEIVED" && previousStatus !== "RECEIVED";

    const updatedPO = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: status as POStatus,
          notes: notes ? `${po.notes || ""} [Update: ${notes}]`.trim() : po.notes,
          receivedAt: isNowReceived ? new Date() : po.receivedAt,
        },
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      });

      // If transition to RECEIVED, increment stock items
      if (isNowReceived) {
        const tenant = await tx.tenant.findUnique({
          where: { id: po.supplier.tenantId },
          include: {
            branches: {
              include: { warehouses: true },
            },
          },
        });

        const targetBranch = tenant?.branches[0];
        const targetWarehouse = targetBranch?.warehouses[0];

        if (targetBranch && targetWarehouse) {
          for (const item of po.items) {
            const existingStock = await tx.stockItem.findFirst({
              where: {
                productId: item.productId,
                branchId: targetBranch.id,
                status: "IN_STOCK",
              },
            });

            if (existingStock) {
              await tx.stockItem.update({
                where: { id: existingStock.id },
                data: {
                  quantity: { increment: item.quantity },
                  costPriceUsd: Number(item.unitCostUsd),
                },
              });
            } else {
              await tx.stockItem.create({
                data: {
                  productId: item.productId,
                  branchId: targetBranch.id,
                  warehouseId: targetWarehouse.id,
                  quantity: item.quantity,
                  costPriceUsd: Number(item.unitCostUsd),
                  status: "IN_STOCK",
                },
              });
            }
          }
        }
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      purchaseOrder: updatedPO,
      message: `Purchase Order status updated to ${status}.`,
    });
  } catch (error: any) {
    console.error("PATCH /api/purchases error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
