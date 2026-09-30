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
          principalAmountKhr: Number(s.principalAmountKhr || Math.round(Number(s.principalAmountUsd) * (c.exchangeRate || 4100))),
          interestAmountKhr: Number(s.interestAmountKhr || Math.round(Number(s.interestAmountUsd) * (c.exchangeRate || 4100))),
          totalDueKhr: Number(s.totalDueKhr || Math.round(Number(s.totalDueUsd) * (c.exchangeRate || 4100))),
          paidAmountKhr: Number(s.paidAmountKhr || Math.round(Number(s.paidAmountUsd) * (c.exchangeRate || 4100))),
          paidDate: s.paidDate ? s.paidDate.toISOString().split("T")[0] : null,
          paymentMethod: s.paymentMethod,
          status: isPastDue && s.status === "PENDING" ? ("OVERDUE" as SchedulePaymentStatus) : s.status,
          daysOverdue: diffDays,
          penaltyAmountUsd: penaltyFee,
          penaltyPaidUsd: Number(s.penaltyPaidUsd || 0),
          penaltyAmountKhr: Number(s.penaltyAmountKhr || Math.round(penaltyFee * (c.exchangeRate || 4100))),
          penaltyPaidKhr: Number(s.penaltyPaidKhr || 0),
          notes: s.notes,
          collectedBy: s.collectedBy,
        };
      });

      if (c.status === "ACTIVE") totalActiveContracts++;
      if (c.status === "COMPLETED") totalCompletedContracts++;
      totalPrincipalReceivable += totalRemainingDue;

      const rate = c.exchangeRate || 4100;

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
        currency: c.currency || "USD",
        repaymentPlanType: c.repaymentPlanType || "MONTHLY",
        totalInstallments: c.totalInstallments || c.durationMonths,
        durationDays: c.durationDays || c.durationMonths * 30,
        intervalDays: c.intervalDays || 30,
        installmentAmountUsd: Number(c.installmentAmountUsd || c.monthlyAmountUsd),
        installmentAmountKhr: Number(c.installmentAmountKhr || Math.round(Number(c.monthlyAmountUsd) * rate)),
        exchangeRate: rate,
        totalPriceUsd: Number(c.totalPriceUsd),
        totalPriceKhr: Number(c.totalPriceKhr || Math.round(Number(c.totalPriceUsd) * rate)),
        downPaymentUsd: Number(c.downPaymentUsd),
        downPaymentKhr: Number(c.downPaymentKhr || Math.round(Number(c.downPaymentUsd) * rate)),
        principalRemainingUsd: Number(c.principalRemainingUsd),
        principalRemainingKhr: Number(c.principalRemainingKhr || Math.round(Number(c.principalRemainingUsd) * rate)),
        interestRatePercent: Number(c.interestRatePercent),
        durationMonths: c.durationMonths,
        monthlyAmountUsd: Number(c.monthlyAmountUsd),
        monthlyAmountKhr: Number(c.monthlyAmountKhr || Math.round(Number(c.monthlyAmountUsd) * rate)),
        totalRepaymentUsd: Number(c.totalRepaymentUsd),
        totalRepaymentKhr: Number(c.totalRepaymentKhr || Math.round(Number(c.totalRepaymentUsd) * rate)),
        totalPaidUsd: Number(c.totalPaidUsd),
        totalPaidKhr: Number(c.totalPaidKhr || Math.round(Number(c.totalPaidUsd) * rate)),
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
      currency = "USD", // "USD" | "KHR"
      repaymentPlanType = "MONTHLY", // "INSTALLMENT_COUNT" | "DAYS" | "MONTHLY" | "FIXED_AMOUNT"
      exchangeRate = 4100,
      totalPriceUsd,
      totalPriceKhr,
      downPaymentUsd = 0,
      downPaymentKhr = 0,
      interestRatePercent = 1.5, // monthly %
      durationMonths = 6,
      durationDays = 30,
      totalInstallments = 4,
      intervalDays = 30,
      installmentAmountUsd,
      installmentAmountKhr,
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

    const rate = parseInt(exchangeRate) || 4100;
    const isKhr = currency === "KHR";

    let totalUsd = parseFloat(totalPriceUsd);
    let totalKhr = parseFloat(totalPriceKhr);
    if (isKhr) {
      if (!totalKhr || isNaN(totalKhr)) {
        totalKhr = (totalUsd || 0) * rate;
      }
      totalUsd = Number((totalKhr / rate).toFixed(2));
    } else {
      if (!totalUsd || isNaN(totalUsd)) {
        totalUsd = (totalKhr || 0) / rate;
      }
      totalKhr = Math.round(totalUsd * rate);
    }

    let downUsd = parseFloat(downPaymentUsd) || 0;
    let downKhr = parseFloat(downPaymentKhr) || 0;
    if (isKhr) {
      if (downKhr > 0 && downUsd === 0) {
        downUsd = Number((downKhr / rate).toFixed(2));
      } else if (downUsd > 0 && downKhr === 0) {
        downKhr = Math.round(downUsd * rate);
      }
    } else {
      if (downUsd > 0 && downKhr === 0) {
        downKhr = Math.round(downUsd * rate);
      } else if (downKhr > 0 && downUsd === 0) {
        downUsd = Number((downKhr / rate).toFixed(2));
      }
    }

    if (isNaN(totalUsd) || totalUsd <= 0) {
      return NextResponse.json({ success: false, error: "តម្លៃទំនិញត្រូវតែធំជាង 0 (Total price must be > 0)" }, { status: 400 });
    }

    if (downUsd >= totalUsd) {
      return NextResponse.json({ success: false, error: "ប្រាក់កក់មិនអាចធំជាង ឬស្មើនឹងតម្លៃទំនិញសរុបទេ" }, { status: 400 });
    }

    const principalRemainingUsd = Number((totalUsd - downUsd).toFixed(2));
    const principalRemainingKhr = Math.round(principalRemainingUsd * rate);
    const ratePercent = parseFloat(interestRatePercent) || 0;

    let scheduleData: any[] = [];
    let calculatedDurationMonths = 1;
    let calculatedDurationDays = 30;
    let calculatedTotalInstallments = 1;
    let calculatedIntervalDays = parseInt(intervalDays) || 30;
    let calculatedInstallmentAmountUsd = 0;
    let calculatedInstallmentAmountKhr = 0;
    let totalRepaymentUsd = 0;
    let totalRepaymentKhr = 0;
    const start = new Date(startDate || new Date());
    let endDate = new Date(start);

    if (repaymentPlanType === "INSTALLMENT_COUNT") {
      // 1. គិតជាចំនួនដង (Installments Count)
      const count = Math.max(1, parseInt(totalInstallments) || 4);
      calculatedTotalInstallments = count;
      const interval = Math.max(1, parseInt(intervalDays) || 30);
      calculatedIntervalDays = interval;
      calculatedDurationDays = count * interval;
      calculatedDurationMonths = Math.max(1, Math.round(calculatedDurationDays / 30));

      const monthsEquivalent = calculatedDurationDays / 30;
      const totalInterestUsd = Number((principalRemainingUsd * (ratePercent / 100) * monthsEquivalent).toFixed(2));
      const interestPerInstallmentUsd = Number((totalInterestUsd / count).toFixed(2));
      const principalPerInstallmentUsd = Number((principalRemainingUsd / count).toFixed(2));
      const totalDuePerInstallmentUsd = Number((principalPerInstallmentUsd + interestPerInstallmentUsd).toFixed(2));

      calculatedInstallmentAmountUsd = totalDuePerInstallmentUsd;
      calculatedInstallmentAmountKhr = Math.round(totalDuePerInstallmentUsd * rate);

      for (let i = 1; i <= count; i++) {
        const dueDate = new Date(start);
        if (interval === 30) {
          dueDate.setMonth(dueDate.getMonth() + i);
        } else {
          dueDate.setDate(dueDate.getDate() + (i * interval));
        }

        const isLast = i === count;
        const pUsd = isLast
          ? Number((principalRemainingUsd - (principalPerInstallmentUsd * (count - 1))).toFixed(2))
          : principalPerInstallmentUsd;
        const iUsd = isLast
          ? Number((totalInterestUsd - (interestPerInstallmentUsd * (count - 1))).toFixed(2))
          : interestPerInstallmentUsd;
        const totUsd = Number((pUsd + iUsd).toFixed(2));

        scheduleData.push({
          installmentNumber: i,
          dueDate,
          principalAmountUsd: pUsd,
          interestAmountUsd: iUsd,
          totalDueUsd: totUsd,
          principalAmountKhr: Math.round(pUsd * rate),
          interestAmountKhr: Math.round(iUsd * rate),
          totalDueKhr: Math.round(totUsd * rate),
          paidAmountUsd: 0,
          paidAmountKhr: 0,
          status: SchedulePaymentStatus.PENDING,
          daysOverdue: 0,
          penaltyAmountUsd: 0,
          penaltyPaidUsd: 0,
          penaltyAmountKhr: 0,
          penaltyPaidKhr: 0,
        });
      }
      endDate = scheduleData[scheduleData.length - 1].dueDate;
      totalRepaymentUsd = Number((downUsd + scheduleData.reduce((sum, s) => sum + s.totalDueUsd, 0)).toFixed(2));
      totalRepaymentKhr = Math.round(totalRepaymentUsd * rate);

    } else if (repaymentPlanType === "DAYS") {
      // 2. គិតជាចំនួនថ្ងៃ (Days)
      const totalDays = Math.max(1, parseInt(durationDays) || 30);
      const interval = Math.max(1, parseInt(intervalDays) || 1); // 1 = daily, etc.
      calculatedDurationDays = totalDays;
      calculatedIntervalDays = interval;
      const count = Math.max(1, Math.ceil(totalDays / interval));
      calculatedTotalInstallments = count;
      calculatedDurationMonths = Math.max(1, Math.round(totalDays / 30));

      const monthsEquivalent = totalDays / 30;
      const totalInterestUsd = Number((principalRemainingUsd * (ratePercent / 100) * monthsEquivalent).toFixed(2));
      const interestPerInstallmentUsd = Number((totalInterestUsd / count).toFixed(2));
      const principalPerInstallmentUsd = Number((principalRemainingUsd / count).toFixed(2));
      const totalDuePerInstallmentUsd = Number((principalPerInstallmentUsd + interestPerInstallmentUsd).toFixed(2));

      calculatedInstallmentAmountUsd = totalDuePerInstallmentUsd;
      calculatedInstallmentAmountKhr = Math.round(totalDuePerInstallmentUsd * rate);

      for (let i = 1; i <= count; i++) {
        const dueDate = new Date(start);
        dueDate.setDate(dueDate.getDate() + (i * interval));

        const isLast = i === count;
        const pUsd = isLast
          ? Number((principalRemainingUsd - (principalPerInstallmentUsd * (count - 1))).toFixed(2))
          : principalPerInstallmentUsd;
        const iUsd = isLast
          ? Number((totalInterestUsd - (interestPerInstallmentUsd * (count - 1))).toFixed(2))
          : interestPerInstallmentUsd;
        const totUsd = Number((pUsd + iUsd).toFixed(2));

        scheduleData.push({
          installmentNumber: i,
          dueDate,
          principalAmountUsd: pUsd,
          interestAmountUsd: iUsd,
          totalDueUsd: totUsd,
          principalAmountKhr: Math.round(pUsd * rate),
          interestAmountKhr: Math.round(iUsd * rate),
          totalDueKhr: Math.round(totUsd * rate),
          paidAmountUsd: 0,
          paidAmountKhr: 0,
          status: SchedulePaymentStatus.PENDING,
          daysOverdue: 0,
          penaltyAmountUsd: 0,
          penaltyPaidUsd: 0,
          penaltyAmountKhr: 0,
          penaltyPaidKhr: 0,
        });
      }
      endDate = scheduleData[scheduleData.length - 1].dueDate;
      totalRepaymentUsd = Number((downUsd + scheduleData.reduce((sum, s) => sum + s.totalDueUsd, 0)).toFixed(2));
      totalRepaymentKhr = Math.round(totalRepaymentUsd * rate);

    } else if (repaymentPlanType === "FIXED_AMOUNT") {
      // 3. គិតតាមចំនួនទឹកប្រាក់កំណត់ (Fixed Payment Amount)
      let targetPayUsd = parseFloat(installmentAmountUsd);
      const targetPayKhr = parseFloat(installmentAmountKhr);
      if (isKhr && targetPayKhr > 0) {
        targetPayUsd = Number((targetPayKhr / rate).toFixed(2));
      }
      if (!targetPayUsd || targetPayUsd <= 0) {
        targetPayUsd = 50;
      }

      const interval = Math.max(1, parseInt(intervalDays) || 30);
      calculatedIntervalDays = interval;
      const periodMonths = interval / 30;
      const singlePeriodInterestUsd = Number((principalRemainingUsd * (ratePercent / 100) * periodMonths).toFixed(2));

      if (targetPayUsd <= singlePeriodInterestUsd && ratePercent > 0) {
        return NextResponse.json({
          success: false,
          error: `ចំនួនទឹកប្រាក់បង់ (${isKhr ? targetPayKhr + " ៛" : "$" + targetPayUsd}) ត្រូវតែធំជាងការប្រាក់ក្នុងមួយលើក (${isKhr ? Math.round(singlePeriodInterestUsd * rate) + " ៛" : "$" + singlePeriodInterestUsd})!`,
        }, { status: 400 });
      }

      let curPrincipal = principalRemainingUsd;
      let step = 1;
      const maxSteps = 120; // up to 120 installments safety

      while (curPrincipal > 0.01 && step <= maxSteps) {
        const periodInterest = Number((curPrincipal * (ratePercent / 100) * periodMonths).toFixed(2));
        const dueDate = new Date(start);
        if (interval === 30) {
          dueDate.setMonth(dueDate.getMonth() + step);
        } else {
          dueDate.setDate(dueDate.getDate() + (step * interval));
        }

        let pUsd = 0;
        let totDueUsd = 0;

        if (curPrincipal + periodInterest <= targetPayUsd) {
          pUsd = curPrincipal;
          totDueUsd = Number((pUsd + periodInterest).toFixed(2));
          curPrincipal = 0;
        } else {
          totDueUsd = targetPayUsd;
          pUsd = Number((totDueUsd - periodInterest).toFixed(2));
          curPrincipal = Number((curPrincipal - pUsd).toFixed(2));
        }

        scheduleData.push({
          installmentNumber: step,
          dueDate,
          principalAmountUsd: pUsd,
          interestAmountUsd: periodInterest,
          totalDueUsd: totDueUsd,
          principalAmountKhr: Math.round(pUsd * rate),
          interestAmountKhr: Math.round(periodInterest * rate),
          totalDueKhr: Math.round(totDueUsd * rate),
          paidAmountUsd: 0,
          paidAmountKhr: 0,
          status: SchedulePaymentStatus.PENDING,
          daysOverdue: 0,
          penaltyAmountUsd: 0,
          penaltyPaidUsd: 0,
          penaltyAmountKhr: 0,
          penaltyPaidKhr: 0,
        });

        step++;
      }

      calculatedTotalInstallments = scheduleData.length;
      calculatedDurationDays = scheduleData.length * interval;
      calculatedDurationMonths = Math.max(1, Math.round(calculatedDurationDays / 30));
      calculatedInstallmentAmountUsd = targetPayUsd;
      calculatedInstallmentAmountKhr = Math.round(targetPayUsd * rate);
      endDate = scheduleData[scheduleData.length - 1].dueDate;
      totalRepaymentUsd = Number((downUsd + scheduleData.reduce((sum, s) => sum + s.totalDueUsd, 0)).toFixed(2));
      totalRepaymentKhr = Math.round(totalRepaymentUsd * rate);

    } else {
      // 4. Default: MONTHLY (ចំនួនខែ)
      const months = Math.max(1, parseInt(durationMonths) || 6);
      calculatedDurationMonths = months;
      calculatedDurationDays = months * 30;
      calculatedTotalInstallments = months;
      calculatedIntervalDays = 30;

      const monthlyInterestAmount = Number(((principalRemainingUsd * (ratePercent / 100))).toFixed(2));
      const monthlyPrincipalAmount = Number((principalRemainingUsd / months).toFixed(2));
      const monthlyTotalAmount = Number((monthlyPrincipalAmount + monthlyInterestAmount).toFixed(2));

      calculatedInstallmentAmountUsd = monthlyTotalAmount;
      calculatedInstallmentAmountKhr = Math.round(monthlyTotalAmount * rate);

      for (let i = 1; i <= months; i++) {
        const dueDate = new Date(start);
        dueDate.setMonth(dueDate.getMonth() + i);

        const isLast = i === months;
        const pUsd = isLast
          ? Number((principalRemainingUsd - (monthlyPrincipalAmount * (months - 1))).toFixed(2))
          : monthlyPrincipalAmount;
        const iUsd = monthlyInterestAmount;
        const totUsd = Number((pUsd + iUsd).toFixed(2));

        scheduleData.push({
          installmentNumber: i,
          dueDate,
          principalAmountUsd: pUsd,
          interestAmountUsd: iUsd,
          totalDueUsd: totUsd,
          principalAmountKhr: Math.round(pUsd * rate),
          interestAmountKhr: Math.round(iUsd * rate),
          totalDueKhr: Math.round(totUsd * rate),
          paidAmountUsd: 0,
          paidAmountKhr: 0,
          status: SchedulePaymentStatus.PENDING,
          daysOverdue: 0,
          penaltyAmountUsd: 0,
          penaltyPaidUsd: 0,
          penaltyAmountKhr: 0,
          penaltyPaidKhr: 0,
        });
      }
      endDate = scheduleData[scheduleData.length - 1].dueDate;
      totalRepaymentUsd = Number((downUsd + scheduleData.reduce((sum, s) => sum + s.totalDueUsd, 0)).toFixed(2));
      totalRepaymentKhr = Math.round(totalRepaymentUsd * rate);
    }

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

    // Execute in transaction with automatic stock deduction
    const newContract = await prisma.$transaction(async (tx) => {
      let resolvedProductId = productId || null;
      let resolvedImeiOrSerial = productImeiOrSerial ? productImeiOrSerial.trim() : null;

      // 1. Stock validation & deduction for hire purchase / installment
      if (resolvedImeiOrSerial) {
        const imeiStock = await tx.stockItem.findFirst({
          where: {
            serialOrImei: resolvedImeiOrSerial,
            status: "IN_STOCK",
            branch: { tenantId },
          },
          include: { product: true },
        });

        if (!imeiStock) {
          throw new Error(`លេខ Serial / IMEI "${resolvedImeiOrSerial}" មិនមានក្នុងស្តុក ឬត្រូវបានលក់រួចហើយ!`);
        }

        // Deduct IMEI stock item
        await tx.stockItem.update({
          where: { id: imeiStock.id },
          data: { status: "SOLD", quantity: 0 },
        });

        if (!resolvedProductId) {
          resolvedProductId = imeiStock.productId;
        }
      } else if (resolvedProductId) {
        const product = await tx.product.findUnique({
          where: { id: resolvedProductId },
          include: {
            stockItems: {
              where: {
                status: "IN_STOCK",
                branchId: branchId!,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!product) {
          throw new Error(`រកមិនឃើញទំនិញក្នុងប្រព័ន្ធឡើយ`);
        }

        if (product.type !== "SERVICE_LABOR") {
          let availableStocks = product.stockItems;
          if (availableStocks.length === 0) {
            availableStocks = await tx.stockItem.findMany({
              where: {
                productId: resolvedProductId,
                status: "IN_STOCK",
                branch: { tenantId },
              },
              orderBy: { createdAt: "asc" },
            });
          }

          const totalAvailableStock = availableStocks.reduce((sum, s) => sum + s.quantity, 0);
          if (totalAvailableStock <= 0) {
            throw new Error(`ទំនិញ "${product.nameKh || product.nameEn}" អស់ពីស្តុកហើយ (ស្តុកនៅសល់ 0) មិនអាចបង់រំលោះបានទេ!`);
          }

          // If the product is SERIAL_IMEI_ITEM, pick first available IMEI
          const serialStock = availableStocks.find((s) => s.serialOrImei);
          if (product.type === "SERIAL_IMEI_ITEM" || serialStock) {
            const targetStock = serialStock || availableStocks[0];
            await tx.stockItem.update({
              where: { id: targetStock.id },
              data: { status: "SOLD", quantity: 0 },
            });
            if (targetStock.serialOrImei && !resolvedImeiOrSerial) {
              resolvedImeiOrSerial = targetStock.serialOrImei;
            }
          } else {
            // Standard / variant / spare part items: deduct 1 unit sequentially
            let remainingToDeduct = 1;
            for (const s of availableStocks) {
              if (remainingToDeduct <= 0) break;
              if (s.quantity <= remainingToDeduct) {
                remainingToDeduct -= s.quantity;
                await tx.stockItem.update({
                  where: { id: s.id },
                  data: { quantity: 0, status: "SOLD" },
                });
              } else {
                await tx.stockItem.update({
                  where: { id: s.id },
                  data: { quantity: s.quantity - remainingToDeduct },
                });
                remainingToDeduct = 0;
              }
            }
          }
        }
      } else {
        // Fallback: Check if productName matches an existing product in tenant
        const matchingProduct = await tx.product.findFirst({
          where: {
            tenantId,
            OR: [
              { nameKh: productName.trim() },
              { nameEn: productName.trim() },
              { sku: productName.trim() },
            ],
          },
          include: {
            stockItems: {
              where: {
                status: "IN_STOCK",
                branch: { tenantId },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (matchingProduct && matchingProduct.type !== "SERVICE_LABOR" && matchingProduct.stockItems.length > 0) {
          resolvedProductId = matchingProduct.id;
          const s = matchingProduct.stockItems[0];
          if (s.serialOrImei) {
            resolvedImeiOrSerial = s.serialOrImei;
            await tx.stockItem.update({
              where: { id: s.id },
              data: { status: "SOLD", quantity: 0 },
            });
          } else {
            if (s.quantity <= 1) {
              await tx.stockItem.update({
                where: { id: s.id },
                data: { quantity: 0, status: "SOLD" },
              });
            } else {
              await tx.stockItem.update({
                where: { id: s.id },
                data: { quantity: s.quantity - 1 },
              });
            }
          }
        }
      }

      // 2. Create the installment contract
      const contract = await tx.installmentContract.create({
        data: {
          contractNumber,
          tenantId,
          branchId: branchId!,
          customerId,
          productId: resolvedProductId,
          productName: productName.trim(),
          productImeiOrSerial: resolvedImeiOrSerial,
          currency,
          repaymentPlanType,
          totalInstallments: calculatedTotalInstallments,
          durationDays: calculatedDurationDays,
          intervalDays: calculatedIntervalDays,
          installmentAmountUsd: calculatedInstallmentAmountUsd,
          installmentAmountKhr: calculatedInstallmentAmountKhr,
          exchangeRate: rate,
          totalPriceUsd: totalUsd,
          totalPriceKhr: totalKhr,
          downPaymentUsd: downUsd,
          downPaymentKhr: downKhr,
          principalRemainingUsd,
          principalRemainingKhr,
          interestRatePercent: ratePercent,
          durationMonths: calculatedDurationMonths,
          monthlyAmountUsd: calculatedInstallmentAmountUsd,
          monthlyAmountKhr: calculatedInstallmentAmountKhr,
          totalRepaymentUsd,
          totalRepaymentKhr,
          totalPaidUsd: downUsd, // Down payment counts towards total paid
          totalPaidKhr: downKhr,
          startDate: start,
          endDate,
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
