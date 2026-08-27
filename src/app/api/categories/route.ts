import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Fast in-memory cache for categories (TTL: 30 seconds)
const categoryCache = new Map<string, { data: any; expiresAt: number }>();

function invalidateCategoryCache(tenantId?: string) {
  if (tenantId) categoryCache.delete(tenantId);
  else categoryCache.clear();
}

// GET /api/categories - Fetch all categories for caller's tenant
export async function GET(request: Request) {
  try {
    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, categories: [] });
    }

    // Check fast cache
    const now = Date.now();
    const cached = categoryCache.get(tenantId);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data);
    }

    const categories = await prisma.category.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const responsePayload = {
      success: true,
      categories: categories.map((c) => ({
        id: c.id,
        nameKh: c.nameKh,
        nameEn: c.nameEn,
        slug: c.slug,
        icon: c.icon || "tag",
        productCount: c._count.products,
        createdAt: c.createdAt,
      })),
    };

    categoryCache.set(tenantId, { data: responsePayload, expiresAt: now + 30000 });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new product category
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const { nameKh, nameEn, slug, icon = "tag" } = body;

    if (!nameKh && !nameEn) {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ចូលឈ្មោះប្រភេទទំនិញ (Category name is required)" },
        { status: 400 }
      );
    }

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant not found." },
        { status: 400 }
      );
    }

    // Generate unique slug
    let finalSlug = slug?.trim()
      ? slug.trim().toLowerCase().replace(/\s+/g, "-")
      : (nameEn || nameKh || "cat").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    if (!finalSlug) {
      finalSlug = `cat-${Date.now()}`;
    }

    // Check if slug exists in this tenant
    const existing = await prisma.category.findFirst({
      where: {
        tenantId,
        slug: finalSlug,
      },
    });

    if (existing) {
      finalSlug = `${finalSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const category = await prisma.category.create({
      data: {
        tenantId,
        nameKh: nameKh || nameEn,
        nameEn: nameEn || nameKh,
        slug: finalSlug,
        icon: icon || "tag",
      },
    });

    invalidateCategoryCache(tenantId);

    return NextResponse.json({
      success: true,
      category,
      message: "បានបង្កើតប្រភេទទំនិញថ្មីដោយជោគជ័យ!",
    });
  } catch (error: any) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create category" },
      { status: 500 }
    );
  }
}

// PUT /api/categories - Update an existing product category
export async function PUT(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const { id, nameKh, nameEn, slug, icon } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      );
    }

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    const updateData: any = {};
    if (nameKh !== undefined) updateData.nameKh = nameKh;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (slug !== undefined) updateData.slug = slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (icon !== undefined) updateData.icon = icon;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      category,
      message: "បានកែប្រែប្រភេទទំនិញដោយជោគជ័យ!",
    });
  } catch (error: any) {
    console.error("PUT /api/categories error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories - Delete a category
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      );
    }

    // Check if products are attached and decouple them to avoid foreign key errors
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "បានលុបប្រភេទទំនិញដោយជោគជ័យ!",
    });
  } catch (error: any) {
    console.error("DELETE /api/categories error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete category" },
      { status: 500 }
    );
  }
}
