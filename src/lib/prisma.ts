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

function createPrismaClient(dbUrl?: string): PrismaClient {
  const url = normalizeDatabaseUrl(dbUrl || process.env.DATABASE_URL);
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
