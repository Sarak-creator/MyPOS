import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RepairStatus } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/repairs - Scoped to caller's tenant & branch
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reqBranchId = searchParams.get("branchId") || "";

    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, repairs: [], technicians: [], customers: [], spareParts: [] });
    }

    const effectiveBranchId = reqBranchId || session?.branchId || undefined;

    const [repairs, technicians, customers, spareParts] = await Promise.all([
      prisma.repairTicket.findMany({
        where: {
          branch: {
            tenantId,
            ...(effectiveBranchId ? { id: effectiveBranchId } : {}),
          },
        },
        include: {
          customer: true,
          technician: true,
          partsUsed: { include: { product: true } },
          statusLogs: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: {
          tenantId,
          role: { in: ["TECHNICIAN", "SUPER_ADMIN", "ADMIN"] },
        },
        select: { id: true, fullName: true, fullNameKh: true, username: true, role: true },
      }),
      prisma.customer.findMany({
        where: { tenantId },
        select: { id: true, name: true, phone: true, currentDebtUsd: true },
      }),
      prisma.product.findMany({
        where: {
          tenantId,
          type: "SPARE_PART",
          isActive: true,
        },
        select: {
          id: true,
          nameKh: true,
          nameEn: true,
          costPriceUsd: true,
          salePriceUsd: true,
          sku: true,
          stockItems: {
            where: { status: "IN_STOCK" },
            select: { quantity: true, branchId: true },
          },
        },
      }),
    ]);

    const formattedSpareParts = spareParts.map((sp: any) => {
      const branchStock = sp.stockItems
        ? sp.stockItems
            .filter((s: any) => !effectiveBranchId || s.branchId === effectiveBranchId)
            .reduce((sum: number, s: any) => sum + (s.quantity || 0), 0)
        : 0;
      return {
        id: sp.id,
        nameKh: sp.nameKh,
        nameEn: sp.nameEn,
        costPriceUsd: Number(sp.costPriceUsd || 0),
        salePriceUsd: Number(sp.salePriceUsd || 0),
        sku: sp.sku,
        stockQty: branchStock,
      };
    });

    const formatted = repairs.map((r) => ({
      id: r.id,
      ticketNumber: r.ticketNumber,
      customerId: r.customerId,
      customerName: r.customer?.name || "អតិថិជនទូទៅ",
      customerPhone: r.customer?.phone || "",
      deviceModel: r.deviceModel,
      deviceBrand: r.deviceBrand,
      deviceType: r.deviceType,
      imeiOrSerial: r.imeiOrSerial || "",
      passcode: r.passcode || "",
      problemDescription: r.customerProblem,
      physicalCondition: r.cosmeticCondition || "",
      technicianId: r.technicianId || "",
      technicianName: r.technician?.fullNameKh || r.technician?.fullName || "មិនទាន់ចាត់តាំង",
      estimatedCostUsd: Number(r.estimatedCostUsd || 0),
      finalCostUsd: Number(r.finalCostUsd || 0),
      depositAmountUsd: Number(r.depositPaidUsd || 0),
      status: r.status,
      warrantyDays: r.warrantyDays,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() || null,
      partsUsed: r.partsUsed.map((p: any) => ({
        id: p.id,
        productId: p.productId,
        productName: p.product?.nameKh || p.product?.nameEn,
        name: p.product?.nameKh || p.product?.nameEn || "គ្រឿងបន្លាស់",
        quantity: p.quantity || 1,
        unitPriceUsd: Number(p.salePriceUsd || 0),
        priceUsd: Number(p.salePriceUsd || 0),
        costUsd: Number(p.costPriceUsd || 0),
        totalPriceUsd: Number(p.salePriceUsd || 0) * (p.quantity || 1),
      })),
      statusLogs: r.statusLogs.map((l) => ({
        id: l.id,
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
        notes: l.notes || "",
        createdAt: l.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({
      success: true,
      repairs: formatted,
      technicians,
      customers,
      spareParts: formattedSpareParts,
    });
  } catch (error: any) {
    console.error("GET /api/repairs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/repairs - Create a new repair ticket scoped to tenant
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      deviceModel,
      deviceBrand = "General",
      deviceType = "Smartphone",
      imeiOrSerial,
      passcode,
      problemDescription,
      customerProblem,
      physicalCondition,
      cosmeticCondition,
      technicianId,
      estimatedCostUsd = 0,
      depositAmountUsd = 0,
      depositPaidUsd = 0,
      warrantyDays = 30,
      branchId: customBranchId,
    } = body;

    const finalProblem = problemDescription || customerProblem;
    const finalCondition = physicalCondition || cosmeticCondition;
    const finalDeposit = depositAmountUsd || depositPaidUsd || 0;

    if (!deviceModel || !finalProblem) {
      return NextResponse.json(
        { success: false, error: "Device Model and Problem Description are required." },
        { status: 400 }
      );
    }

    let tenantId = session?.tenantId;
    let tenant: any = null;

    if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { branches: true },
      });
    } else {
      tenant = await prisma.tenant.findFirst({
        include: { branches: true },
      });
      tenantId = tenant?.id;
    }

    if (!tenant || tenant.branches.length === 0) {
      return NextResponse.json({ success: false, error: "No branch configured." }, { status: 400 });
    }

    const targetBranch = customBranchId
      ? tenant.branches.find((b: any) => b.id === customBranchId) || tenant.branches[0]
      : (session?.branchId ? tenant.branches.find((b: any) => b.id === session.branchId) : tenant.branches[0]);

    // Generate ticket number
    const count = await prisma.repairTicket.count({
      where: { branch: { tenantId } },
    });
    const now = new Date();
    const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const ticketNumber = `REP-${monthStr}-${String(count + 1).padStart(4, "0")}`;

    // Ensure we have a valid customer
    let validCustomerId = customerId;
    if (!validCustomerId) {
      if (customerPhone) {
        const existingCust = await prisma.customer.findFirst({
          where: { tenantId, phone: customerPhone },
        });
        if (existingCust) {
          validCustomerId = existingCust.id;
        } else {
          const newCust = await prisma.customer.create({
            data: {
              tenantId: tenant.id,
              name: customerName || "អតិថិជនជួសជុល",
              phone: customerPhone,
            },
          });
          validCustomerId = newCust.id;
        }
      } else {
        let defaultCustomer = await prisma.customer.findFirst({ where: { tenantId } });
        if (!defaultCustomer) {
          defaultCustomer = await prisma.customer.create({
            data: {
              tenantId: tenant.id,
              name: "អតិថិជនទូទៅ (Walk-in)",
              phone: "012000000",
            },
          });
        }
        validCustomerId = defaultCustomer.id;
      }
    }

    const newTicket = await prisma.repairTicket.create({
      data: {
        ticketNumber,
        branchId: targetBranch.id,
        customerId: validCustomerId,
        technicianId: technicianId || undefined,
        deviceType: deviceType || "Smartphone",
        deviceBrand: deviceBrand || "General",
        deviceModel,
        imeiOrSerial: imeiOrSerial || undefined,
        passcode: passcode || undefined,
        customerProblem: finalProblem,
        cosmeticCondition: finalCondition || undefined,
        estimatedCostUsd: Number(estimatedCostUsd),
        finalCostUsd: body.finalCostUsd !== undefined ? Number(body.finalCostUsd) : Number(estimatedCostUsd),
        depositPaidUsd: Number(finalDeposit),
        warrantyDays: Number(warrantyDays),
        status: RepairStatus.RECEIVED,
        statusLogs: {
          create: [
            {
              fromStatus: RepairStatus.RECEIVED,
              toStatus: RepairStatus.RECEIVED,
              notes: "បានទទួលម៉ាស៊ីនចូលជួសជុល (Ticket created)",
              changedBy: session?.username || "Admin",
            },
          ],
        },
      },
    });

    return NextResponse.json({
      success: true,
      ticket: newTicket,
      message: `Repair Ticket #${newTicket.ticketNumber} created successfully.`,
    });
  } catch (error: any) {
    console.error("POST /api/repairs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
