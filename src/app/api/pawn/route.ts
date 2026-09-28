import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { PawnStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/pawn - List pawn tickets and summary statistics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const overdueOnly = searchParams.get("overdue") === "true";
    const category = searchParams.get("category") || "";

    const session = await getAuthSession(request);
    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, tickets: [], stats: {} });
    }

    const where: any = { tenantId };

    if (status && Object.values(PawnStatus).includes(status as PawnStatus)) {
      where.status = status as PawnStatus;
    }

    if (category) {
      where.itemCategory = category;
    }

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { itemName: { contains: search, mode: "insensitive" } },
        { imeiOrSerial: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const tickets = await prisma.pawnTicket.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true } },
        branch: { select: { id: true, name: true, code: true } },
        paymentLogs: {
          orderBy: { paidDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    let totalActiveLoans = 0;
    let totalInterestCollected = 0;
    let totalEstimatedValue = 0;
    let overdueCount = 0;
    let totalPenaltyAmount = 0;

    const formattedTickets = tickets.map((t) => {
      const maturity = new Date(t.maturityDate);
      const isPastMaturity = maturity < now && t.status === "ACTIVE";
      const diffDays = isPastMaturity
        ? Math.max(0, Math.floor((now.getTime() - maturity.getTime()) / (1000 * 3600 * 24)))
        : 0;

      // Calculate suggested penalty fee for late interest: e.g. $1 per day late
      const penaltyFee = diffDays > 0 ? Number(t.penaltyAmountUsd || diffDays * 1) : 0;

      if (t.status === "ACTIVE") {
        totalActiveLoans += Number(t.loanAmountUsd);
        totalEstimatedValue += Number(t.estimatedValueUsd);
      }
      totalInterestCollected += Number(t.totalInterestPaidUsd);

      if (isPastMaturity) {
        overdueCount++;
        totalPenaltyAmount += penaltyFee;
      }

      return {
        id: t.id,
        ticketNumber: t.ticketNumber,
        tenantId: t.tenantId,
        branchId: t.branchId,
        branchName: t.branch?.name,
        customerId: t.customerId,
        customerName: t.customer?.name,
        customerPhone: t.customer?.phone,
        customerAddress: t.customer?.address,
        customerNationalId: t.customerNationalId,
        itemName: t.itemName,
        itemCategory: t.itemCategory,
        itemBrand: t.itemBrand,
        itemModel: t.itemModel,
        imeiOrSerial: t.imeiOrSerial,
        itemCondition: t.itemCondition,
        storageLocation: t.storageLocation,
        estimatedValueUsd: Number(t.estimatedValueUsd),
        loanAmountUsd: Number(t.loanAmountUsd),
        monthlyInterestRate: Number(t.monthlyInterestRate),
        monthlyInterestUsd: Number(t.monthlyInterestUsd),
        durationMonths: t.durationMonths,
        startDate: t.startDate.toISOString().split("T")[0],
        maturityDate: t.maturityDate.toISOString().split("T")[0],
        status: isPastMaturity && t.status === "ACTIVE" ? "OVERDUE" : t.status,
        totalInterestPaidUsd: Number(t.totalInterestPaidUsd),
        daysOverdue: diffDays,
        penaltyAmountUsd: penaltyFee,
        redeemedDate: t.redeemedDate ? t.redeemedDate.toISOString().split("T")[0] : null,
        redeemedAmountUsd: t.redeemedAmountUsd ? Number(t.redeemedAmountUsd) : null,
        notes: t.notes,
        handledBy: t.handledBy,
        createdAt: t.createdAt.toISOString(),
        paymentLogs: t.paymentLogs.map((p) => ({
          id: p.id,
          paymentType: p.paymentType,
          amountPaidUsd: Number(p.amountPaidUsd),
          penaltyPaidUsd: Number(p.penaltyPaidUsd),
          paymentMethod: p.paymentMethod,
          monthsExtended: p.monthsExtended,
          newMaturityDate: p.newMaturityDate ? p.newMaturityDate.toISOString().split("T")[0] : null,
          paidDate: p.paidDate.toISOString(),
          receivedBy: p.receivedBy,
          notes: p.notes,
        })),
        isOverdue: isPastMaturity,
      };
    });

    const finalTickets = overdueOnly
      ? formattedTickets.filter((t) => t.isOverdue)
      : formattedTickets;

    return NextResponse.json({
      success: true,
      tickets: finalTickets,
      stats: {
        totalTickets: tickets.length,
        totalActiveLoans,
        totalInterestCollected,
        totalEstimatedValue,
        overdueCount,
        totalPenaltyAmount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/pawn error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/pawn - Create a new Pawn Ticket
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "No active tenant found" }, { status: 400 });
    }

    const body = await request.json();
    const {
      customerId,
      branchId: reqBranchId,
      customerNationalId,
      itemName,
      itemCategory = "Phone",
      itemBrand,
      itemModel,
      imeiOrSerial,
      itemCondition,
      storageLocation,
      estimatedValueUsd,
      loanAmountUsd,
      monthlyInterestRate = 2.5, // monthly %
      durationMonths = 1,
      startDate = new Date().toISOString(),
      notes,
    } = body;

    if (!customerId) {
      return NextResponse.json({ success: false, error: "សូមជ្រើសរើសអតិថិជន (Customer is required)" }, { status: 400 });
    }

    if (!itemName || !itemName.trim()) {
      return NextResponse.json({ success: false, error: "សូមបញ្ចូលឈ្មោះទ្រព្យបញ្ចាំ (Collateral name is required)" }, { status: 400 });
    }

    const loanAmount = parseFloat(loanAmountUsd);
    const estimatedValue = parseFloat(estimatedValueUsd) || loanAmount * 1.5;
    const interestRate = parseFloat(monthlyInterestRate) || 2.5;
    const duration = parseInt(durationMonths) || 1;

    if (isNaN(loanAmount) || loanAmount <= 0) {
      return NextResponse.json({ success: false, error: "ទឹកប្រាក់កម្ចីបញ្ចាំត្រូវតែធំជាង 0 (Loan amount must be > 0)" }, { status: 400 });
    }

    // Branch selection
    let branchId = reqBranchId || session?.branchId;
    if (!branchId) {
      const defaultBranch = await prisma.branch.findFirst({ where: { tenantId } });
      branchId = defaultBranch?.id;
    }

    // Auto-generate Pawn Ticket Number: PWN-YYYYMM-XXXX
    const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
    const count = await prisma.pawnTicket.count({ where: { tenantId } });
    const ticketNumber = `PWN-${dateStr}-${String(count + 1).padStart(4, "0")}`;

    const start = new Date(startDate);
    const maturity = new Date(start);
    maturity.setMonth(maturity.getMonth() + duration);

    // Monthly interest in USD
    const monthlyInterestUsd = Number(((loanAmount * (interestRate / 100))).toFixed(2));

    const newTicket = await prisma.pawnTicket.create({
      data: {
        ticketNumber,
        tenantId,
        branchId: branchId!,
        customerId,
        customerNationalId: customerNationalId ? customerNationalId.trim() : null,
        itemName: itemName.trim(),
        itemCategory,
        itemBrand: itemBrand || null,
        itemModel: itemModel || null,
        imeiOrSerial: imeiOrSerial ? imeiOrSerial.trim() : null,
        itemCondition: itemCondition || null,
        storageLocation: storageLocation || "Safe Box 01",
        estimatedValueUsd: estimatedValue,
        loanAmountUsd: loanAmount,
        monthlyInterestRate: interestRate,
        monthlyInterestUsd,
        durationMonths: duration,
        startDate: start,
        maturityDate: maturity,
        status: PawnStatus.ACTIVE,
        totalInterestPaidUsd: 0,
        daysOverdue: 0,
        penaltyAmountUsd: 0,
        notes: notes || null,
        handledBy: session?.fullName || "Staff",
      },
      include: {
        customer: true,
        branch: true,
      },
    });

    return NextResponse.json({
      success: true,
      ticket: newTicket,
      message: `ប័ណ្ណបញ្ចាំ ${newTicket.ticketNumber} ត្រូវបានបង្កើតដោយជោគជ័យ!`,
    });
  } catch (error: any) {
    console.error("POST /api/pawn error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
