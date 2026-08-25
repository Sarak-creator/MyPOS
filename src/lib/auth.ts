import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { checkPermission, getEffectivePermissions } from "./permissions";

const JWT_SECRET = process.env.JWT_SECRET || "anachak-pos-enterprise-default-secret-2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface SessionPayload {
  userId: string;
  tenantId: string;
  storeAddress?: string;
  branchId?: string | null;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signJwtToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export function verifyJwtToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies session token from Request Authorization header or cookies
 */
export async function getAuthSession(request?: Request): Promise<SessionPayload | null> {
  try {
    let token: string | undefined;

    // 1. Try Authorization header (Bearer <token>)
    if (request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    // 2. Fallback to HTTP-only cookie
    if (!token) {
      try {
        const cookieStore = cookies();
        token = cookieStore.get("anachak_token")?.value;
      } catch {
        // cookies() might fail if not in Next.js Server Components / Route Handler context
      }
    }

    if (!token) return null;

    return verifyJwtToken(token);
  } catch {
    return null;
  }
}

export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return checkPermission(userPermissions, requiredPermission);
}

export { checkPermission, getEffectivePermissions };
