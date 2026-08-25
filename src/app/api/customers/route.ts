import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";

// GET /api/customers - List customers and debts scoped to caller's tenant
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, customers: [], debts: [] });
    }

    const whereClause: any = { tenantId };
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        debts: {
          include: { payments: true },
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute aging categories for debts
    const now = new Date();
    const formattedDebts = customers
      .filter((c) => Number(c.currentDebtUsd) > 0)
      .map((c) => {
        const latestDebt = c.debts[0];
        const dueDate = latestDebt ? new Date(latestDebt.dueDate) : new Date();
        const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

        let agingCategory: "0_30" | "31_60" | "61_90" | "OVER_90" = "0_30";
        if (diffDays > 90) agingCategory = "OVER_90";
        else if (diffDays > 60) agingCategory = "61_90";
        else if (diffDays > 30) agingCategory = "31_60";

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          tier: c.tier,
          loyaltyPoints: c.loyaltyPoints,
          creditLimitUsd: Number(c.creditLimitUsd),
          totalDebtUsd: Number(c.currentDebtUsd),
          agingCategory,
          dueDate: latestDebt ? latestDebt.dueDate.toISOString().split("T")[0] : "2026-08-30",
          lastPaymentDate: latestDebt?.payments[0]?.paidAt?.toISOString().split("T")[0],
        };
      });

    return NextResponse.json({
      success: true,
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || "",
        address: c.address || "",
        tier: c.tier,
        loyaltyPoints: c.loyaltyPoints,
        creditLimitUsd: Number(c.creditLimitUsd),
        currentDebtUsd: Number(c.currentDebtUsd),
      })),
      debts: formattedDebts,
    });
  } catch (error: any) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/customers - Create new customer scoped to caller's tenant
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const { name, phone, email, address, tier = "RETAIL", creditLimitUsd = 0 } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "Name and Phone are required." },
        { status: 400 }
      );
    }

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant not found." }, { status: 400 });
    }

    const existing = await prisma.customer.findFirst({
      where: { phone: phone.trim(), tenantId },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Customer with this phone already exists in this store." },
        { status: 400 }
      );
    }

    const newCustomer = await prisma.customer.create({
      data: {
        tenantId,
        name,
        phone: phone.trim(),
        email: email || undefined,
        address: address || undefined,
        tier,
        creditLimitUsd: Number(creditLimitUsd),
      },
    });

    return NextResponse.json({
      success: true,
      customer: newCustomer,
      message: "Customer created successfully",
    });
  } catch (error: any) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
