import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

// Fast in-memory cache for branches (TTL: 30 seconds)
const branchesCache = new Map<string, { data: any; expiresAt: number }>();

function invalidateBranchesCache(tenantId?: string) {
  if (tenantId) branchesCache.delete(tenantId);
  else branchesCache.clear();
}

// GET /api/branches - Fetch all branches for current tenant directly from database
export async function GET(request: Request) {
  try {
    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, branches: [] });
    }

    // Check fast cache
    const now = Date.now();
    const cached = branchesCache.get(tenantId);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data);
    }

    const branches = await prisma.branch.findMany({
      where: { tenantId },
      include: {
        warehouses: {
          select: { id: true, name: true, isDefault: true },
        },
      },
      orderBy: [{ isHeadOffice: "desc" }, { createdAt: "asc" }],
    });

    const responsePayload = {
      success: true,
      branches: branches.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        phone: b.phone,
        address: b.address,
        isHeadOffice: b.isHeadOffice,
        warehouses: b.warehouses,
      })),
    };

    branchesCache.set(tenantId, { data: responsePayload, expiresAt: now + 30000 });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("GET /api/branches error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch branches" },
      { status: 500 }
    );
  }
}
