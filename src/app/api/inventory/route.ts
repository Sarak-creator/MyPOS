import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/inventory - Fetch products, warehouses, stock items, and transfers scoped to tenant
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
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
        products: [],
        categories: [],
        stockItems: [],
        warehouses: [],
        transfers: [],
      });
    }

    const where: any = {
      tenantId,
      isActive: true,
    };

    if (category && category !== "ALL") {
      where.category = { slug: category };
    }

    if (search) {
      where.OR = [
        { nameKh: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    const effectiveBranchId = reqBranchId || session?.branchId || undefined;

    const [products, categories, stockItems, warehouses, transfers] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          stockItems: {
            where: {
              status: "IN_STOCK",
              ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
            },
          },
          variants: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.category.findMany({
        where: { tenantId },
        orderBy: { nameKh: "asc" },
      }),
      prisma.stockItem.findMany({
        where: {
          product: { tenantId },
          status: "IN_STOCK",
          ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
      prisma.warehouse.findMany({
        where: {
          branch: {
            tenantId,
            ...(effectiveBranchId ? { id: effectiveBranchId } : {}),
          },
        },
        include: { branch: true },
      }),
      prisma.stockTransfer.findMany({
        where: {
          fromBranch: { tenantId },
          ...(effectiveBranchId ? { OR: [{ fromBranchId: effectiveBranchId }, { toBranchId: effectiveBranchId }] } : {}),
        },
        include: {
          fromBranch: true,
          toBranch: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const formattedProducts = products.map((p) => {
      const stockQty = p.stockItems.reduce((sum, item) => sum + item.quantity, 0);
      const imeiList = p.stockItems
        .filter((item) => item.serialOrImei)
        .map((item) => item.serialOrImei as string);

      return {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode || p.sku,
        nameKh: p.nameKh,
        nameEn: p.nameEn,
        description: p.description || "",
        category: p.category?.nameKh || "ទូទៅ",
        categorySlug: p.category?.slug || "general",
        brand: p.brand?.name || "General",
        costPriceUsd: Number(p.costPriceUsd),
        salePriceUsd: Number(p.salePriceUsd),
        salePriceKhr: Number(p.salePriceKhr),
        stockQty,
        minStock: p.minStockAlert,
        unit: p.unit,
        type: p.type,
        imeiList,
      };
    });

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      categories,
      stockItems,
      warehouses,
      transfers,
    });
  } catch (error: any) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
