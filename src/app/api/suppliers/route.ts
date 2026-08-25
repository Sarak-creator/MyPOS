import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

// GET /api/suppliers - List suppliers scoped to caller's tenant
export async function GET(request: Request) {
  try {
    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, suppliers: [] });
    }

    const suppliers = await prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { companyName: "asc" },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    return NextResponse.json({ success: true, suppliers });
  } catch (error: any) {
    console.error("GET /api/suppliers error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/suppliers - Create a new Supplier scoped to caller's tenant
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const { companyName, contactPerson, phone, email, address, currentBalanceUsd = 0 } = body;

    if (!companyName || !phone) {
      return NextResponse.json(
        { success: false, error: "Company name and phone number are required." },
        { status: 400 }
      );
    }

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "No tenant configured." }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        tenantId,
        companyName,
        contactPerson,
        phone,
        email,
        address,
        currentBalanceUsd: Number(currentBalanceUsd || 0),
      },
    });

    return NextResponse.json({
      success: true,
      supplier,
      message: `Supplier "${supplier.companyName}" added successfully.`,
    });
  } catch (error: any) {
    console.error("POST /api/suppliers error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
