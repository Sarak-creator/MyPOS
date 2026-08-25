import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signJwtToken } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { storeAddress, username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ចូលឈ្មោះគណនី និងលេខសម្ងាត់ (Username and password are required)" },
        { status: 400 }
      );
    }

    // Default to standard store if not explicitly provided
    if (!storeAddress) {
      storeAddress = "anajak@anajak.com";
    } else {
      storeAddress = storeAddress.trim().toLowerCase();
      if (!storeAddress.includes("@")) {
        storeAddress = `${storeAddress}@anajak.com`;
      }
    }

    // 1. Locate Tenant by Store Address
    const tenant = await prisma.tenant.findUnique({
      where: { storeAddress },
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: `រកមិនឃើញអាសយដ្ឋានហាង "${storeAddress}" នៅក្នុងប្រព័ន្ធទេ (Store Address not found or inactive)`,
        },
        { status: 401 }
      );
    }

    // 2. Locate User specifically inside this Tenant
    const user = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { username: { equals: username.trim(), mode: "insensitive" as const } },
          { email: { equals: username.trim(), mode: "insensitive" as const } },
        ],
      },
      include: {
        branch: true,
        tenant: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "ឈ្មោះគណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវសម្រាប់ហាងនេះ (Invalid username or password for this store)",
        },
        { status: 401 }
      );
    }

    // 3. Verify Password Hash
    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          error: "ឈ្មោះគណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវសម្រាប់ហាងនេះ (Invalid username or password for this store)",
        },
        { status: 401 }
      );
    }

    // 4. Compute effective permissions based on user custom permissions and role defaults
    const effectivePermissions = getEffectivePermissions(user.role, user.permissions);

    // 5. Create session token with tenantId and storeAddress
    const token = signJwtToken({
      userId: user.id,
      tenantId: user.tenantId,
      storeAddress: tenant.storeAddress,
      branchId: user.branchId,
      username: user.username,
      fullName: user.fullNameKh || user.fullName,
      role: user.role,
      permissions: effectivePermissions,
    });

    // 6. Record audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_SUCCESS",
        entity: "User",
        entityId: user.id,
        details: {
          storeAddress: tenant.storeAddress,
          ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      },
    }).catch(() => {});

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullNameKh || user.fullName,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch?.name || "សាខាកណ្តាល ភ្នំពេញ",
        tenantName: user.tenant?.name || "អាណាចក្រPOS",
        storeAddress: tenant.storeAddress,
        permissions: effectivePermissions,
      },
      token,
    });

    // 7. Set HTTP-only session cookies
    response.cookies.set("anachak_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    response.cookies.set("pos_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
