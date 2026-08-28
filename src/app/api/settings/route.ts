import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getAuthSession } from "@/lib/auth";
import { RoleType } from "@prisma/client";
import { getEffectivePermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// In-memory cache for tenant settings (TTL: 15 seconds)
const settingsCache = new Map<string, { data: any; expiresAt: number }>();

function invalidateSettingsCache(tenantId?: string) {
  if (tenantId) settingsCache.delete(tenantId);
  else settingsCache.clear();
}

// GET /api/settings - Fetch Tenant profile, branches, and users scoped to caller's tenant
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("ping") === "true") {
      await prisma.$queryRaw`SELECT 1`;
      return NextResponse.json({ success: true, ping: "pong", status: "HEALTHY", timestamp: Date.now() });
    }

    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, tenant: null, branches: [], users: [] });
    }

    // Check in-memory cache
    const now = Date.now();
    const cached = settingsCache.get(tenantId);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: {
          include: { warehouses: true },
          orderBy: { createdAt: "asc" },
        },
        users: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            fullNameKh: true,
            phone: true,
            role: true,
            permissions: true,
            branchId: true,
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const responseData = {
      success: true,
      tenant,
      branches: tenant?.branches || [],
      users: tenant?.users || [],
    };

    // Cache for 15s
    settingsCache.set(tenantId, { data: responseData, expiresAt: now + 15000 });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/settings - Update Tenant profile, branches, and users
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const { action = "UPDATE_TENANT" } = body;

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 400 });
    }

    // Invalidate cached settings on any modification
    invalidateSettingsCache(tenantId);

    // 1. UPDATE TENANT BUSINESS PROFILE
    if (action === "UPDATE_TENANT") {
      const { name, legalName, vatNumber, phone, email, address, storeAddress } = body;
      const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: name || undefined,
          legalName: legalName || undefined,
          vatNumber: vatNumber || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          storeAddress: storeAddress ? storeAddress.trim().toLowerCase() : undefined,
        },
      });
      return NextResponse.json({ success: true, tenant: updated, message: "Settings saved" });
    }

    // 2. ADD BRANCH
    if (action === "ADD_BRANCH") {
      const { code, name, phone, address } = body;
      if (!code || !name) {
        return NextResponse.json({ success: false, error: "Code and Name are required" }, { status: 400 });
      }

      const newBranch = await prisma.branch.create({
        data: {
          tenantId,
          code: code.trim(),
          name: name.trim(),
          phone: phone || undefined,
          address: address || undefined,
          warehouses: {
            create: {
              name: `ឃ្លាំង ${name.trim()}`,
              isDefault: true,
            },
          },
        },
      });

      return NextResponse.json({ success: true, branch: newBranch, message: "Branch created" });
    }

    // 3. UPDATE BRANCH
    if (action === "UPDATE_BRANCH") {
      const { branchId, code, name, phone, address } = body;
      if (!branchId || !name) {
        return NextResponse.json({ success: false, error: "Branch ID and Name are required" }, { status: 400 });
      }

      const updated = await prisma.branch.update({
        where: { id: branchId },
        data: {
          code: code ? code.trim() : undefined,
          name: name.trim(),
          phone: phone || undefined,
          address: address || undefined,
        },
      });

      return NextResponse.json({ success: true, branch: updated, message: "Branch updated" });
    }

    // 4. DELETE BRANCH
    if (action === "DELETE_BRANCH") {
      const { branchId } = body;
      if (!branchId) {
        return NextResponse.json({ success: false, error: "Branch ID is required" }, { status: 400 });
      }

      await prisma.branch.delete({ where: { id: branchId } });
      return NextResponse.json({ success: true, message: "Branch deleted" });
    }

    // 5. ADD USER
    if (action === "ADD_USER") {
      const { username, password, fullName, fullNameKh, phone, role = "CASHIER", branchId, permissions } = body;
      if (!username || !password || !fullName) {
        return NextResponse.json(
          { success: false, error: "Username, password and full name are required." },
          { status: 400 }
        );
      }

      // Check if username already exists in this tenant
      const existing = await prisma.user.findFirst({
        where: {
          tenantId,
          username: { equals: username.trim(), mode: "insensitive" as const },
        },
      });

      if (existing) {
        return NextResponse.json({ success: false, error: `Username @${username} is already taken in this store.` }, { status: 400 });
      }

      const effectivePermissions = getEffectivePermissions(role, permissions);

      const passwordHash = await hashPassword(password);
      const newUser = await prisma.user.create({
        data: {
          tenantId,
          username: username.trim(),
          passwordHash,
          fullName,
          fullNameKh: fullNameKh || fullName,
          phone: phone || undefined,
          role: role as RoleType,
          branchId: branchId && branchId.trim() !== "" ? branchId.trim() : null,
          permissions: effectivePermissions,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return NextResponse.json({ success: true, user: newUser, message: "User created" });
    }

    // 6. UPDATE USER
    if (action === "UPDATE_USER") {
      const { userId, fullName, fullNameKh, phone, role, branchId, isActive, permissions } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
      }

      const effectivePermissions = role || permissions ? getEffectivePermissions(role || "CASHIER", permissions) : undefined;

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: fullName || undefined,
          fullNameKh: fullNameKh || undefined,
          phone: phone || undefined,
          role: role ? (role as RoleType) : undefined,
          branchId: branchId !== undefined ? (branchId && String(branchId).trim() !== "" ? String(branchId).trim() : null) : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
          permissions: effectivePermissions || undefined,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return NextResponse.json({ success: true, user: updated, message: "User updated" });
    }

    // 7. RESET USER PASSWORD
    if (action === "RESET_PASSWORD") {
      const { userId, newPassword } = body;
      if (!userId || !newPassword) {
        return NextResponse.json({ success: false, error: "User ID and new password are required." }, { status: 400 });
      }

      const passwordHash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      return NextResponse.json({ success: true, message: "Password updated successfully" });
    }

    // 8. DELETE USER
    if (action === "DELETE_USER") {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
      }

      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json({ success: true, message: "User deleted" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
