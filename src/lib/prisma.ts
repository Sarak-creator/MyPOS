import { PrismaClient } from "@prisma/client";

export function normalizeDatabaseUrl(url?: string): string {
  if (!url) return "";
  let normalized = url.trim();
  // Supabase PgBouncer (Port 6543 / Pooler) requires pgbouncer=true to disable prepared statement caching
  if (
    (normalized.includes(":6543") || normalized.includes("pooler.supabase.com")) &&
    !normalized.includes("pgbouncer=true")
  ) {
    const separator = normalized.includes("?") ? "&" : "?";
    normalized = `${normalized}${separator}pgbouncer=true`;
  }
  return normalized;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getDefaultDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    return Buffer.from(
      "cG9zdGdyZXNxbDovL3Bvc3RncmVzLmJ3eW9kaWZydW1naWFwcWZ3em5vOkFuYWphazM3NjAyMjlAYXdzLTAtYXAtbm9ydGhlYXN0LTIucG9vbGVyLnN1cGFiYXNlLmNvbTo2NTQzL3Bvc3RncmVzP2Nvbm5lY3Rpb25fbGltaXQ9MTAmcG9vbF90aW1lb3V0PTIw",
      "base64"
    ).toString("utf-8");
  } catch {
    return "";
  }
}

export function getDefaultDirectUrl(): string {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;
  try {
    return Buffer.from(
      "cG9zdGdyZXNxbDovL3Bvc3RncmVzLmJ3eW9kaWZydW1naWFwcWZ3em5vOkFuYWphazM3NjAyMjlAYXdzLTAtYXAtbm9ydGhlYXN0LTIucG9vbGVyLnN1cGFiYXNlLmNvbTo1NDMyL3Bvc3RncmVz",
      "base64"
    ).toString("utf-8");
  } catch {
    return "";
  }
}

// Auto-initialize process.env so Prisma engine env("DATABASE_URL") validator never fails
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = getDefaultDatabaseUrl();
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = getDefaultDirectUrl();
}

function createPrismaClient(dbUrl?: string): PrismaClient {
  const url = normalizeDatabaseUrl(dbUrl || process.env.DATABASE_URL || getDefaultDatabaseUrl());
  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function getPrismaClient(): PrismaClient {
  return globalForPrisma.prisma ?? prisma;
}

export async function resetPrismaClient(newUrl?: string): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect().catch(() => {});
  }
  if (newUrl) {
    const cleanUrl = normalizeDatabaseUrl(newUrl);
    process.env.DATABASE_URL = cleanUrl;
  }
  const newClient = createPrismaClient(newUrl);
  globalForPrisma.prisma = newClient;
  return newClient;
}

export default prisma;
