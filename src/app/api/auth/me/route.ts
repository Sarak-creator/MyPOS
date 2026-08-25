import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwtToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectivePermissions } from "@/lib/permissions";

// Fast in-memory cache for user sessions (TTL: 15 seconds)
const userSessionCache = new Map<string, { user: any; expiresAt: number }>();

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get("anachak_token")?.value ||
      cookieStore.get("pos_token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const payload = verifyJwtToken(token);
    if (!payload) {
      const res = NextResponse.json({ success: false, user: null }, { status: 401 });
      res.cookies.set("anachak_token", "", { path: "/", maxAge: 0 });
      return res;
    }

    // Check fast in-memory cache
    const now = Date.now();
    const cached = userSessionCache.get(payload.userId);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json({ success: true, user: cached.user });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { branch: true, tenant: true },
    });

    if (!user || !user.isActive) {
      userSessionCache.delete(payload.userId);
      const res = NextResponse.json({ success: false, user: null }, { status: 401 });
      res.cookies.set("anachak_token", "", { path: "/", maxAge: 0 });
      return res;
    }

    const effectivePermissions = getEffectivePermissions(user.role, user.permissions);
    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullNameKh || user.fullName,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch?.name || "សាខាកណ្តាល ភ្នំពេញ",
      tenantName: user.tenant?.name || "អាណាចក្រPOS",
      permissions: effectivePermissions,
    };

    // Cache for 15 seconds
    userSessionCache.set(payload.userId, { user: userPayload, expiresAt: now + 15000 });

    return NextResponse.json({
      success: true,
      user: userPayload,
    });
  } catch (error: any) {
    const res = NextResponse.json({ success: false, error: error.message }, { status: 500 });
    res.cookies.set("anachak_token", "", { path: "/", maxAge: 0 });
    return res;
  }
}
