import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { CacheManager } from "@/lib/cache";

// GET /api/products - List all products scoped to the authenticated tenant and branch
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const categorySlug = searchParams.get("category") || "";
    const reqBranchId = searchParams.get("branchId") || "";

    const session = await getAuthSession(request);

    // Resolve tenantId
    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, products: [], categories: [], branches: [] });
    }

    const scopedBranchId = reqBranchId || session?.branchId || undefined;
    const cacheKey = `products:${tenantId}:${scopedBranchId || "ALL"}:${categorySlug}:${search}`;
    const cached = CacheManager.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const whereClause: any = {
      tenantId,
      isActive: true,
    };

    if (search) {
      whereClause.OR = [
        { nameKh: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categorySlug && categorySlug !== "ALL") {
      whereClause.category = { slug: categorySlug };
    }

    const [products, categories, branches, warehouses] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          brand: true,
          stockItems: {
            where: scopedBranchId ? { branchId: scopedBranchId } : undefined,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.category.findMany({
        where: { tenantId },
      }),
      prisma.branch.findMany({
        where: { tenantId },
        include: { warehouses: true },
      }),
      prisma.warehouse.findMany({
        where: { branch: { tenantId } },
      }),
    ]);

    // Format for frontend
    const formatted = products.map((p) => {
      const totalStock = p.stockItems.reduce((acc, item) => {
        return item.status === "IN_STOCK" ? acc + item.quantity : acc;
      }, 0);

      const imeiList = p.stockItems
        .filter((item) => item.status === "IN_STOCK" && item.serialOrImei)
        .map((item) => item.serialOrImei as string);

      return {
        id: p.id,
        productId: p.id,
        sku: p.sku,
        barcode: p.barcode || "",
        nameKh: p.nameKh,
        nameEn: p.nameEn || p.nameKh,
        description: p.description || "",
        category: p.category?.nameKh || "ទូទៅ",
        categorySlug: p.category?.slug || "general",
        brand: p.brand?.name || "",
        costPriceUsd: Number(p.costPriceUsd),
        salePriceUsd: Number(p.salePriceUsd),
        salePriceKhr: Number(p.salePriceKhr),
        stockQty: totalStock,
        minStock: p.minStockAlert,
        unit: p.unit,
        type: p.type,
        imageUrl: p.imageUrl || "",
        imeiList,
      };
    });

    const responseData = {
      success: true,
      products: formatted,
      categories,
      branches,
      warehouses,
    };

    CacheManager.set(cacheKey, responseData, 15000);

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/products - Create a new product scoped to tenant
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const {
      sku,
      barcode,
      nameKh,
      nameEn,
      description,
      categoryId,
      brandName,
      type = "STANDARD_ITEM",
      costPriceUsd = 0,
      salePriceUsd = 0,
      salePriceKhr,
      minStockAlert = 5,
      unit = "Pcs",
      initialStock = 0,
      imeiList = [],
      branchId: customBranchId,
      warehouseId: customWarehouseId,
    } = body;

    if (!nameKh || !sku || salePriceUsd === undefined) {
      return NextResponse.json(
        { success: false, error: "Name (Khmer), SKU, and Sale Price are required." },
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

    if (!tenant || !tenantId) {
      return NextResponse.json({ success: false, error: "No active tenant found." }, { status: 400 });
    }

    // Determine branch and warehouse
    const targetBranch = customBranchId
      ? tenant.branches.find((b: any) => b.id === customBranchId) || tenant.branches[0]
      : (session?.branchId ? tenant.branches.find((b: any) => b.id === session.branchId) : tenant.branches[0]);

    const targetWarehouse = customWarehouseId
      ? targetBranch?.warehouses.find((w: any) => w.id === customWarehouseId) || targetBranch?.warehouses[0]
      : targetBranch?.warehouses[0];

    // Find or create Brand if provided
    let brandId: string | undefined = undefined;
    if (brandName) {
      const existingBrand = await prisma.brand.findFirst({
        where: { name: { equals: brandName, mode: "insensitive" } },
      });
      if (existingBrand) {
        brandId = existingBrand.id;
      } else {
        const newBrand = await prisma.brand.create({ data: { name: brandName } });
        brandId = newBrand.id;
      }
    }

    // Calculate KHR price if not given
    const calculatedKhr = salePriceKhr || Number(salePriceUsd) * 4100;

    const newProduct = await prisma.product.create({
      data: {
        tenantId,
        categoryId: categoryId || undefined,
        brandId,
        sku,
        barcode: barcode || undefined,
        nameKh,
        nameEn: nameEn || nameKh,
        description: description || undefined,
        type,
        costPriceUsd: Number(costPriceUsd),
        salePriceUsd: Number(salePriceUsd),
        salePriceKhr: calculatedKhr,
        minStockAlert: Number(minStockAlert),
        unit,
      },
    });

    // Create Initial Stock Items in target branch/warehouse
    if (targetBranch && targetWarehouse) {
      if (type === "SERIAL_IMEI_ITEM" && Array.isArray(imeiList) && imeiList.length > 0) {
        for (const imei of imeiList) {
          if (imei.trim()) {
            await prisma.stockItem.create({
              data: {
                productId: newProduct.id,
                branchId: targetBranch.id,
                warehouseId: targetWarehouse.id,
                serialOrImei: imei.trim(),
                quantity: 1,
                costPriceUsd: Number(costPriceUsd),
                status: "IN_STOCK",
              },
            });
          }
        }
      } else if (Number(initialStock) > 0) {
        await prisma.stockItem.create({
          data: {
            productId: newProduct.id,
            branchId: targetBranch.id,
            warehouseId: targetWarehouse.id,
            quantity: Number(initialStock),
            costPriceUsd: Number(costPriceUsd),
            status: "IN_STOCK",
          },
        });
      }
    }

    CacheManager.invalidatePrefix(`products:${tenantId}`);
    CacheManager.invalidatePrefix(`dashboard:${tenantId}`);

    return NextResponse.json({
      success: true,
      product: newProduct,
      message: "Product created successfully",
    });
  } catch (error: any) {
    console.error("POST /api/products error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
