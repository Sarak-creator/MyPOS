import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = global as unknown as {
  prismaInstance?: PrismaClient;
  currentDbUrl?: string;
};

export function normalizeDatabaseUrl(url: string): string {
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

function readCurrentDbUrlFromEnv(): string {
  let url = process.env.DATABASE_URL || "";
  if (!url) {
    try {
      const envPath = path.join(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("DATABASE_URL=")) {
            let val = trimmed.slice("DATABASE_URL=".length).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            url = val;
            break;
          }
        }
      }
    } catch {}
  }
  return normalizeDatabaseUrl(url);
}

export function getPrismaClient(): PrismaClient {
  const currentUrl = readCurrentDbUrlFromEnv();

  if (
    !globalForPrisma.prismaInstance ||
    (currentUrl && globalForPrisma.currentDbUrl !== currentUrl)
  ) {
    if (globalForPrisma.prismaInstance) {
      globalForPrisma.prismaInstance.$disconnect().catch(() => {});
    }

    if (currentUrl) {
      process.env.DATABASE_URL = currentUrl;
    }

    globalForPrisma.currentDbUrl = currentUrl;
    globalForPrisma.prismaInstance = new PrismaClient({
      datasources: currentUrl ? { db: { url: currentUrl } } : undefined,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return globalForPrisma.prismaInstance;
}

export async function resetPrismaClient(newUrl?: string): Promise<PrismaClient> {
  if (globalForPrisma.prismaInstance) {
    await globalForPrisma.prismaInstance.$disconnect().catch(() => {});
    globalForPrisma.prismaInstance = undefined;
  }
  if (newUrl) {
    const cleanUrl = normalizeDatabaseUrl(newUrl);
    process.env.DATABASE_URL = cleanUrl;
    globalForPrisma.currentDbUrl = cleanUrl;
  }
  return getPrismaClient();
}

// Proxy object that forwards all operations to the active PrismaClient
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
