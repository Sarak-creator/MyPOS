import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { notifyStockTransfer } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// GET /api/transfers - Fetch inter-branch stock transfers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const fromBranchId = searchParams.get("fromBranchId") || "";
    const toBranchId = searchParams.get("toBranchId") || "";
    const reqBranchId = searchParams.get("branchId") || "";

    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, transfers: [] });
    }

    const where: any = {
      fromBranch: { tenantId },
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (fromBranchId) {
      where.fromBranchId = fromBranchId;
    }

    if (toBranchId) {
      where.toBranchId = toBranchId;
    }

    const effectiveBranchId = reqBranchId || (session?.role !== "SUPER_ADMIN" && session?.role !== "ADMIN" ? session?.branchId : undefined);
    if (effectiveBranchId) {
      where.OR = [
        { fromBranchId: effectiveBranchId },
        { toBranchId: effectiveBranchId },
      ];
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { transferNumber: { contains: search, mode: "insensitive" } },
            { notes: { contains: search, mode: "insensitive" } },
            { fromBranch: { name: { contains: search, mode: "insensitive" } } },
            { toBranch: { name: { contains: search, mode: "insensitive" } } },
          ],
        },
      ];
    }

    const transfers = await prisma.stockTransfer.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Gather all unique productIds to fetch product details
    const productIds = Array.from(
      new Set(transfers.flatMap((t) => t.items.map((i) => i.productId)))
    );

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

    const formattedTransfers = transfers.map((t) => {
      const enrichedItems = t.items.map((item) => {
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

      const totalQuantity = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        id: t.id,
        transferNumber: t.transferNumber,
        fromBranchId: t.fromBranchId,
        toBranchId: t.toBranchId,
        fromBranch: t.fromBranch,
        toBranch: t.toBranch,
        status: t.status,
        notes: t.notes || "",
        approvedBy: t.approvedBy || "",
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        items: enrichedItems,
        itemCount: enrichedItems.length,
        totalQuantity,
      };
    });

    return NextResponse.json({
      success: true,
      transfers: formattedTransfers,
    });
  } catch (error: any) {
    console.error("GET /api/transfers error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/transfers - Create a new inter-branch stock transfer
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 400 });
    }

    const body = await request.json();
    const { fromBranchId, toBranchId, items, notes, status = "IN_TRANSIT" } = body;

    if (!fromBranchId || !toBranchId) {
      return NextResponse.json(
        { success: false, error: "សូមជ្រើសរើសសាខាដើម និងសាខាគោលដៅ (Origin and destination branches are required)" },
        { status: 400 }
      );
    }

    if (fromBranchId === toBranchId) {
      return NextResponse.json(
        { success: false, error: "សាខាដើម និងសាខាគោលដៅមិនអាចដូចគ្នាបានទេ (Origin and destination branches must be different)" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ចូលមុខទំនិញដែលត្រូវផ្ទេរយ៉ាងតិច ១ មុខ (At least 1 transfer item is required)" },
        { status: 400 }
      );
    }

    // Verify branches exist and belong to tenant
    const [fromBranch, toBranch] = await Promise.all([
      prisma.branch.findFirst({
        where: { id: fromBranchId, tenantId },
        include: { warehouses: true },
      }),
      prisma.branch.findFirst({
        where: { id: toBranchId, tenantId },
        include: { warehouses: true },
      }),
    ]);

    if (!fromBranch || !toBranch) {
      return NextResponse.json(
        { success: false, error: "រកមិនឃើញព័ត៌មានសាខាដែលបានជ្រើសរើសទេ (Branch not found)" },
        { status: 404 }
      );
    }

    // Origin warehouse
    const fromWarehouse = fromBranch.warehouses[0] || (await prisma.warehouse.create({
      data: {
        branchId: fromBranch.id,
        name: `ឃ្លាំងចម្បង (${fromBranch.name})`,
        isDefault: true,
      },
    }));

    // Destination warehouse
    const toWarehouse = toBranch.warehouses[0] || (await prisma.warehouse.create({
      data: {
        branchId: toBranch.id,
        name: `ឃ្លាំងចម្បង (${toBranch.name})`,
        isDefault: true,
      },
    }));

    // Validate stock availability at fromBranch
    for (const item of items) {
      if (!item.productId || Number(item.quantity) <= 0) {
        return NextResponse.json(
          { success: false, error: "ចំនួនទំនិញត្រូវតែធំជាង ០ (Quantity must be greater than 0)" },
          { status: 400 }
        );
      }

      // Check available quantity in StockItem for fromBranch
      const stockRecords = await prisma.stockItem.findMany({
        where: {
          productId: item.productId,
          branchId: fromBranchId,
          status: "IN_STOCK",
        },
      });

      const totalAvailable = stockRecords.reduce((sum, s) => sum + s.quantity, 0);
      if (totalAvailable < Number(item.quantity)) {
        const prod = await prisma.product.findUnique({ where: { id: item.productId } });
        return NextResponse.json(
          {
            success: false,
            error: `ស្តុកនៃទំនិញ "${prod?.nameKh || item.productId}" នៅសាខា "${fromBranch.name}" មិនគ្រប់គ្រាន់ទេ (មានតែ ${totalAvailable} ឯកតា)`,
          },
          { status: 400 }
        );
      }

      // If specific IMEI list provided, verify each IMEI
      if (Array.isArray(item.serialOrImeis) && item.serialOrImeis.length > 0) {
        for (const imei of item.serialOrImeis) {
          const imeiItem = stockRecords.find((s) => s.serialOrImei === imei);
          if (!imeiItem) {
            return NextResponse.json(
              {
                success: false,
                error: `លេខ IMEI "${imei}" មិនមានក្នុងស្តុកសកម្មនៃសាខា "${fromBranch.name}" ឡើយ`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Generate unique transfer number: TR-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const countThisMonth = await prisma.stockTransfer.count({
      where: {
        fromBranch: { tenantId },
        transferNumber: { startsWith: `TR-${yearMonth}-` },
      },
    });
    const seq = String(countThisMonth + 1).padStart(4, "0");
    const transferNumber = `TR-${yearMonth}-${seq}`;

    // Execute transfer creation in a transaction
    const initialStatus = status === "PENDING" ? "PENDING" : status === "APPROVED" ? "APPROVED" : "IN_TRANSIT";

    const createdTransfer = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          transferNumber,
          fromBranchId,
          toBranchId,
          status: initialStatus,
          notes: notes || null,
          approvedBy: session?.fullName || session?.username || "Admin",
          items: {
            create: items.map((i: any) => ({
              productId: i.productId,
              quantity: Number(i.quantity),
              serialOrImeis: Array.isArray(i.serialOrImeis) ? i.serialOrImeis : [],
            })),
          },
        },
        include: {
          items: true,
          fromBranch: true,
          toBranch: true,
        },
      });

      // If initially created as IN_TRANSIT, deduct/flag stock from origin
      if (initialStatus === "IN_TRANSIT") {
        for (const item of items) {
          const targetQty = Number(item.quantity);
          const imeiList = Array.isArray(item.serialOrImeis) ? item.serialOrImeis : [];

          if (imeiList.length > 0) {
            // Update specific IMEI items to TRANSFERRED
            for (const imei of imeiList) {
              await tx.stockItem.updateMany({
                where: {
                  productId: item.productId,
                  branchId: fromBranchId,
                  serialOrImei: imei,
                  status: "IN_STOCK",
                },
                data: {
                  status: "TRANSFERRED",
                },
              });
            }
          } else {
            // Standard item: reduce quantity from origin warehouse
            let remainingToDeduct = targetQty;
            const originStockItems = await tx.stockItem.findMany({
              where: {
                productId: item.productId,
                branchId: fromBranchId,
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

      // Record AuditLog
      if (session?.userId) {
        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: "STOCK_TRANSFER_CREATE",
            entity: "StockTransfer",
            entityId: transfer.id,
            details: {
              transferNumber,
              fromBranch: fromBranch.name,
              toBranch: toBranch.name,
              status: initialStatus,
              itemCount: items.length,
            },
          },
        });
      }

      return transfer;
    });

    // Send Telegram Notification asynchronously
    try {
      const allProductIds = items.map((i: any) => i.productId);
      const productRecords = await prisma.product.findMany({
        where: { id: { in: allProductIds } },
        select: { id: true, nameKh: true, unit: true },
      });
      const prodMap = new Map(productRecords.map((p) => [p.id, p]));

      const itemsSummary = items
        .map((i: any) => {
          const p = prodMap.get(i.productId);
          return `• ${p?.nameKh || "ទំនិញ"} (${i.quantity} ${p?.unit || "ឯកតា"})${i.serialOrImeis?.length ? ` [IMEI: ${i.serialOrImeis.join(", ")}]` : ""}`;
        })
        .join("\n");

      const totalQty = items.reduce((sum: number, i: any) => sum + Number(i.quantity), 0);

      notifyStockTransfer({
        transferNumber: createdTransfer.transferNumber,
        fromBranchName: fromBranch.name,
        toBranchName: toBranch.name,
        status: createdTransfer.status,
        itemCount: items.length,
        totalQuantity: totalQty,
        itemsSummary,
        notes: notes || undefined,
        approvedBy: createdTransfer.approvedBy || undefined,
      }).catch((e) => console.error("Telegram transfer notify error:", e));
    } catch (tgErr) {
      console.error("Telegram notification error:", tgErr);
    }

    return NextResponse.json({
      success: true,
      transfer: createdTransfer,
      message: "បានបង្កើតសំណើផ្ទេរស្តុកដោយជោគជ័យ",
    });
  } catch (error: any) {
    console.error("POST /api/transfers error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
