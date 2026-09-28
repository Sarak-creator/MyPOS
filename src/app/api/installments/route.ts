import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { InstallmentStatus, SchedulePaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/installments - List installment contracts with metrics and filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const overdueOnly = searchParams.get("overdue") === "true";
    const customerId = searchParams.get("customerId") || "";

    const session = await getAuthSession(request);
    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, contracts: [], stats: {} });
    }

    const where: any = { tenantId };

    if (customerId) {
      where.customerId = customerId;
    }

    if (status && Object.values(InstallmentStatus).includes(status as InstallmentStatus)) {
      where.status = status as InstallmentStatus;
    }

    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: "insensitive" } },
        { productName: { contains: search, mode: "insensitive" } },
        { productImeiOrSerial: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const contracts = await prisma.installmentContract.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true } },
        branch: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, nameKh: true, nameEn: true, sku: true, imageUrl: true } },
        schedules: {
          orderBy: { installmentNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    // Dynamically evaluate overdue schedules and calculate stats
    let totalPrincipalReceivable = 0;
    let totalActiveContracts = 0;
    let totalCompletedContracts = 0;
    let totalOverdueCount = 0;
    let totalPenaltyAmount = 0;

    const formattedContracts = contracts.map((c) => {
      let contractHasOverdue = false;
      let totalRemainingDue = 0;

      const schedules = c.schedules.map((s) => {
        const dueDate = new Date(s.dueDate);
        const isPastDue = dueDate < now && s.status !== "PAID";
        const diffDays = isPastDue
          ? Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)))
          : 0;

        // Auto-calculate suggested penalty fee: $1 per day if late
        const penaltyFee = diffDays > 0 ? Number(s.penaltyAmountUsd || diffDays * 1) : 0;

        if (isPastDue) {
          contractHasOverdue = true;
          totalOverdueCount++;
          totalPenaltyAmount += penaltyFee;
        }

        const remainingItemDue = Math.max(0, Number(s.totalDueUsd) - Number(s.paidAmountUsd));
        totalRemainingDue += remainingItemDue;

        return {
          id: s.id,
          installmentNumber: s.installmentNumber,
          dueDate: s.dueDate.toISOString().split("T")[0],
          principalAmountUsd: Number(s.principalAmountUsd),
          interestAmountUsd: Number(s.interestAmountUsd),
          totalDueUsd: Number(s.totalDueUsd),
          paidAmountUsd: Number(s.paidAmountUsd),
          paidDate: s.paidDate ? s.paidDate.toISOString().split("T")[0] : null,
          paymentMethod: s.paymentMethod,
          status: isPastDue && s.status === "PENDING" ? ("OVERDUE" as SchedulePaymentStatus) : s.status,
          daysOverdue: diffDays,
          penaltyAmountUsd: penaltyFee,
          penaltyPaidUsd: Number(s.penaltyPaidUsd || 0),
          notes: s.notes,
          collectedBy: s.collectedBy,
        };
      });

      if (c.status === "ACTIVE") totalActiveContracts++;
      if (c.status === "COMPLETED") totalCompletedContracts++;
      totalPrincipalReceivable += totalRemainingDue;

      return {
        id: c.id,
        contractNumber: c.contractNumber,
        tenantId: c.tenantId,
        branchId: c.branchId,
        branchName: c.branch?.name,
        customerId: c.customerId,
        customerName: c.customer?.name,
        customerPhone: c.customer?.phone,
        customerAddress: c.customer?.address,
        customerNationalId: c.customerNationalId,
        productId: c.productId,
        productName: c.productName,
        productImeiOrSerial: c.productImeiOrSerial,
        totalPriceUsd: Number(c.totalPriceUsd),
        downPaymentUsd: Number(c.downPaymentUsd),
        downPaymentKhr: Number(c.downPaymentKhr),
        principalRemainingUsd: Number(c.principalRemainingUsd),
        interestRatePercent: Number(c.interestRatePercent),
        durationMonths: c.durationMonths,
        monthlyAmountUsd: Number(c.monthlyAmountUsd),
        totalRepaymentUsd: Number(c.totalRepaymentUsd),
        totalPaidUsd: Number(c.totalPaidUsd),
        startDate: c.startDate.toISOString().split("T")[0],
        endDate: c.endDate.toISOString().split("T")[0],
        status: contractHasOverdue && c.status === "ACTIVE" ? "OVERDUE" : c.status,
        guarantorName: c.guarantorName,
        guarantorPhone: c.guarantorPhone,
        guarantorNationalId: c.guarantorNationalId,
        guarantorAddress: c.guarantorAddress,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
        schedules,
        hasOverdue: contractHasOverdue,
      };
    });

    const finalContracts = overdueOnly
      ? formattedContracts.filter((c) => c.hasOverdue)
      : formattedContracts;

    return NextResponse.json({
      success: true,
      contracts: finalContracts,
      stats: {
        totalContracts: contracts.length,
        totalActiveContracts,
        totalCompletedContracts,
        totalPrincipalReceivable,
        totalOverdueCount,
        totalPenaltyAmount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/installments error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/installments - Create a new Installment Contract with Amortization Schedule
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
      productId,
      productName,
      productImeiOrSerial,
      totalPriceUsd,
      downPaymentUsd = 0,
      downPaymentKhr = 0,
      interestRatePercent = 1.5, // monthly %
      durationMonths = 6,
      startDate = new Date().toISOString(),
      guarantorName,
      guarantorPhone,
      guarantorNationalId,
      guarantorAddress,
      customerNationalId,
      notes,
    } = body;

    if (!customerId) {
      return NextResponse.json({ success: false, error: "សូមជ្រើសរើសអតិថិជន (Customer is required)" }, { status: 400 });
    }

    if (!productName || !productName.trim()) {
      return NextResponse.json({ success: false, error: "សូមបញ្ចូលឈ្មោះទំនិញ (Product name is required)" }, { status: 400 });
    }

    const total = parseFloat(totalPriceUsd);
    const downPayment = parseFloat(downPaymentUsd) || 0;
    const ratePercent = parseFloat(interestRatePercent) || 0;
    const months = parseInt(durationMonths) || 1;

    if (isNaN(total) || total <= 0) {
      return NextResponse.json({ success: false, error: "តម្លៃទំនិញត្រូវតែធំជាង 0 (Total price must be > 0)" }, { status: 400 });
    }

    if (downPayment >= total) {
      return NextResponse.json({ success: false, error: "ប្រាក់កក់មិនអាចធំជាង ឬស្មើនឹងតម្លៃទំនិញសរុបទេ" }, { status: 400 });
    }

    const principalRemaining = total - downPayment;
    // Flat monthly interest calculation
    const monthlyInterestAmount = Number(((principalRemaining * (ratePercent / 100))).toFixed(2));
    const monthlyPrincipalAmount = Number((principalRemaining / months).toFixed(2));
    const monthlyTotalAmount = Number((monthlyPrincipalAmount + monthlyInterestAmount).toFixed(2));
    const totalRepayment = Number((downPayment + (monthlyTotalAmount * months)).toFixed(2));

    // Branch selection
    let branchId = reqBranchId || session?.branchId;
    if (!branchId) {
      const defaultBranch = await prisma.branch.findFirst({ where: { tenantId } });
      branchId = defaultBranch?.id;
    }

    // Auto-generate Contract Number: INS-YYYYMM-XXXX
    const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
    const count = await prisma.installmentContract.count({
      where: { tenantId },
    });
    const contractNumber = `INS-${dateStr}-${String(count + 1).padStart(4, "0")}`;

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);

    // Build Schedules
    const scheduleData: any[] = [];
    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i);

      scheduleData.push({
        installmentNumber: i,
        dueDate,
        principalAmountUsd: monthlyPrincipalAmount,
        interestAmountUsd: monthlyInterestAmount,
        totalDueUsd: monthlyTotalAmount,
        paidAmountUsd: 0,
        status: SchedulePaymentStatus.PENDING,
        daysOverdue: 0,
        penaltyAmountUsd: 0,
        penaltyPaidUsd: 0,
      });
    }

    // Execute in transaction
    const newContract = await prisma.$transaction(async (tx) => {
      const contract = await tx.installmentContract.create({
        data: {
          contractNumber,
          tenantId,
          branchId: branchId!,
          customerId,
          productId: productId || null,
          productName: productName.trim(),
          productImeiOrSerial: productImeiOrSerial ? productImeiOrSerial.trim() : null,
          totalPriceUsd: total,
          downPaymentUsd: downPayment,
          downPaymentKhr: parseFloat(downPaymentKhr) || 0,
          principalRemainingUsd: principalRemaining,
          interestRatePercent: ratePercent,
          durationMonths: months,
          monthlyAmountUsd: monthlyTotalAmount,
          totalRepaymentUsd: totalRepayment,
          totalPaidUsd: downPayment, // Down payment counts towards total paid
          startDate: start,
          endDate: end,
          status: InstallmentStatus.ACTIVE,
          guarantorName: guarantorName || null,
          guarantorPhone: guarantorPhone || null,
          guarantorNationalId: guarantorNationalId || null,
          guarantorAddress: guarantorAddress || null,
          customerNationalId: customerNationalId || null,
          notes: notes || null,
          schedules: {
            create: scheduleData,
          },
        },
        include: {
          customer: true,
          branch: true,
          schedules: true,
        },
      });

      return contract;
    });

    return NextResponse.json({
      success: true,
      contract: newContract,
      message: `កិច្ចសន្យាបង់រំលោះ ${newContract.contractNumber} ត្រូវបានបង្កើតដោយជោគជ័យ!`,
    });
  } catch (error: any) {
    console.error("POST /api/installments error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
