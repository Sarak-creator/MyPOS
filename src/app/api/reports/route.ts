import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { OrderStatus, POStatus, PawnStatus, InstallmentStatus, RepairStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// Helper to construct date ranges
function getDateFilter(dateRange: string, startDate?: string | null, endDate?: string | null) {
  const now = new Date();
  if (dateRange === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (dateRange === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
    const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (dateRange === "this_week") {
    const curr = new Date(now);
    const firstDay = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1); // Monday
    const start = new Date(curr.setDate(firstDay));
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (dateRange === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (dateRange === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (dateRange === "this_year") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (dateRange === "custom" && startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  return undefined; // All time
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reqBranchId = searchParams.get("branchId") || "";
    const dateRange = searchParams.get("dateRange") || "this_month";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const reportType = searchParams.get("type") || "all";

    const session = await getAuthSession(request);
    let tenantId = session?.tenantId;

    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: "Tenant not found",
      }, { status: 404 });
    }

    const effectiveBranchId = reqBranchId && reqBranchId !== "ALL" ? reqBranchId : undefined;
    const dateFilter = getDateFilter(dateRange, startDate, endDate);

    // Common branch filter helper
    const branchFilter = effectiveBranchId ? { branchId: effectiveBranchId } : {};
    const branchRelationFilter = effectiveBranchId
      ? { branch: { tenantId, id: effectiveBranchId } }
      : { branch: { tenantId } };

    // 1. Fetch Branches for Selector
    const branches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { isHeadOffice: "desc" },
    });

    // -------------------------------------------------------------------------
    // A. SALES REPORT DATA
    // -------------------------------------------------------------------------
    const shouldFetchSales = reportType === "all" || reportType === "sales" || reportType === "summary";
    let salesData: any = {
      totalRevenueUsd: 0,
      totalRevenueKhr: 0,
      totalCostUsd: 0,
      grossProfitUsd: 0,
      orderCount: 0,
      completedCount: 0,
      refundedCount: 0,
      averageTicketUsd: 0,
      paymentBreakdown: {
        KHQR_ABA: 0,
        KHQR_BAKONG: 0,
        CASH_USD: 0,
        CASH_KHR: 0,
        CREDIT_CARD: 0,
        CUSTOMER_CREDIT: 0,
        SPLIT_PAYMENT: 0,
      },
      topProducts: [],
      topCashiers: [],
      recentOrders: [],
    };

    if (shouldFetchSales) {
      const orders = await prisma.order.findMany({
        where: {
          ...branchRelationFilter,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          cashier: { select: { id: true, fullName: true, username: true } },
          branch: { select: { id: true, name: true, code: true } },
          payments: { select: { method: true, amountUsd: true, amountKhr: true } },
          items: {
            include: {
              product: { select: { id: true, nameKh: true, nameEn: true, sku: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: reportType === "sales" ? 150 : 40,
      });

      const productSalesMap: Record<string, { id: string; name: string; sku: string; qty: number; revenue: number; profit: number }> = {};
      const cashierSalesMap: Record<string, { id: string; name: string; orderCount: number; revenue: number }> = {};

      let totalRevUsd = 0;
      let totalRevKhr = 0;
      let totalCostUsd = 0;
      let completedCount = 0;
      let refundedCount = 0;

      orders.forEach((ord) => {
        const revUsd = Number(ord.totalUsd) || 0;
        const revKhr = Number(ord.totalKhr) || 0;
        totalRevUsd += revUsd;
        totalRevKhr += revKhr;

        if (ord.status === OrderStatus.COMPLETED) completedCount++;
        else if (ord.status === OrderStatus.REFUNDED || ord.status === OrderStatus.PARTIALLY_REFUNDED) refundedCount++;

        // Payments
        ord.payments.forEach((p) => {
          const methodKey = p.method as keyof typeof salesData.paymentBreakdown;
          if (salesData.paymentBreakdown[methodKey] !== undefined) {
            salesData.paymentBreakdown[methodKey] += Number(p.amountUsd) || 0;
          }
        });

        // Cashier stats
        const cId = ord.cashierId;
        const cName = ord.cashier?.fullName || ord.cashier?.username || "Unknown";
        if (!cashierSalesMap[cId]) {
          cashierSalesMap[cId] = { id: cId, name: cName, orderCount: 0, revenue: 0 };
        }
        cashierSalesMap[cId].orderCount += 1;
        cashierSalesMap[cId].revenue += revUsd;

        // Items & Cost
        let orderCost = 0;
        ord.items.forEach((it) => {
          const qty = it.quantity || 1;
          const cost = (Number(it.unitCostUsd) || 0) * qty;
          const itemRev = Number(it.totalPriceUsd) || 0;
          orderCost += cost;

          const pId = it.productId;
          const pName = it.product?.nameKh || it.product?.nameEn || "Product";
          const pSku = it.product?.sku || "";

          if (!productSalesMap[pId]) {
            productSalesMap[pId] = { id: pId, name: pName, sku: pSku, qty: 0, revenue: 0, profit: 0 };
          }
          productSalesMap[pId].qty += qty;
          productSalesMap[pId].revenue += itemRev;
          productSalesMap[pId].profit += itemRev - cost;
        });
        totalCostUsd += orderCost;
      });

      salesData = {
        totalRevenueUsd: totalRevUsd,
        totalRevenueKhr: totalRevKhr,
        totalCostUsd: totalCostUsd,
        grossProfitUsd: totalRevUsd - totalCostUsd,
        orderCount: orders.length,
        completedCount,
        refundedCount,
        averageTicketUsd: orders.length > 0 ? totalRevUsd / orders.length : 0,
        paymentBreakdown: salesData.paymentBreakdown,
        topProducts: Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
        topCashiers: Object.values(cashierSalesMap).sort((a, b) => b.revenue - a.revenue),
        recentOrders: orders.slice(0, 50).map((o) => ({
          id: o.id,
          invoiceNumber: o.invoiceNumber,
          branchName: o.branch?.name,
          customerName: o.customer?.name || "អតិថិជនទូទៅ",
          customerPhone: o.customer?.phone || "-",
          cashierName: o.cashier?.fullName || o.cashier?.username,
          status: o.status,
          totalUsd: Number(o.totalUsd),
          totalKhr: Number(o.totalKhr),
          itemsCount: o.items.reduce((s, it) => s + it.quantity, 0),
          createdAt: o.createdAt,
          paymentMethod: o.payments[0]?.method || "CASH_USD",
        })),
      };
    }

    // -------------------------------------------------------------------------
    // B. PURCHASES REPORT DATA (ទិញចូល)
    // -------------------------------------------------------------------------
    const shouldFetchPurchases = reportType === "all" || reportType === "purchases" || reportType === "summary";
    let purchasesData: any = {
      totalPurchaseCostUsd: 0,
      totalOrdersCount: 0,
      statusCounts: { DRAFT: 0, ORDERED: 0, RECEIVED: 0, CANCELLED: 0 },
      topSuppliers: [],
      topPurchasedItems: [],
      recentPurchases: [],
    };

    if (shouldFetchPurchases) {
      const pos = await prisma.purchaseOrder.findMany({
        where: {
          supplier: { tenantId },
          ...(dateFilter ? { orderedAt: dateFilter } : {}),
        },
        include: {
          supplier: { select: { id: true, companyName: true, contactPerson: true, phone: true } },
          items: {
            include: {
              product: { select: { id: true, nameKh: true, nameEn: true, sku: true } },
            },
          },
        },
        orderBy: { orderedAt: "desc" },
        take: reportType === "purchases" ? 150 : 40,
      });

      const supplierMap: Record<string, { id: string; name: string; phone: string; poCount: number; spend: number }> = {};
      const itemMap: Record<string, { id: string; name: string; sku: string; qty: number; spend: number }> = {};
      let totalPurchaseCost = 0;
      const statusCounts = { DRAFT: 0, ORDERED: 0, RECEIVED: 0, CANCELLED: 0 };

      pos.forEach((po) => {
        const cost = Number(po.totalCostUsd) || 0;
        totalPurchaseCost += cost;

        if (statusCounts[po.status] !== undefined) {
          statusCounts[po.status] += 1;
        }

        // Supplier stats
        const supId = po.supplierId;
        const supName = po.supplier?.companyName || "Unknown Supplier";
        const supPhone = po.supplier?.phone || "";
        if (!supplierMap[supId]) {
          supplierMap[supId] = { id: supId, name: supName, phone: supPhone, poCount: 0, spend: 0 };
        }
        supplierMap[supId].poCount += 1;
        supplierMap[supId].spend += cost;

        // Items
        po.items.forEach((it) => {
          const itId = it.productId;
          const itName = it.product?.nameKh || it.product?.nameEn || "Item";
          const itSku = it.product?.sku || "";
          const itSpend = Number(it.totalCostUsd) || 0;
          if (!itemMap[itId]) {
            itemMap[itId] = { id: itId, name: itName, sku: itSku, qty: 0, spend: 0 };
          }
          itemMap[itId].qty += it.quantity;
          itemMap[itId].spend += itSpend;
        });
      });

      purchasesData = {
        totalPurchaseCostUsd: totalPurchaseCost,
        totalOrdersCount: pos.length,
        statusCounts,
        topSuppliers: Object.values(supplierMap).sort((a, b) => b.spend - a.spend).slice(0, 8),
        topPurchasedItems: Object.values(itemMap).sort((a, b) => b.spend - a.spend).slice(0, 8),
        recentPurchases: pos.slice(0, 50).map((po) => ({
          id: po.id,
          poNumber: po.poNumber,
          supplierName: po.supplier?.companyName,
          supplierPhone: po.supplier?.phone,
          status: po.status,
          totalCostUsd: Number(po.totalCostUsd),
          itemsCount: po.items.reduce((s, it) => s + it.quantity, 0),
          orderedAt: po.orderedAt,
          receivedAt: po.receivedAt,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // C. PAWN REPORT DATA (បញ្ចាំ)
    // -------------------------------------------------------------------------
    const shouldFetchPawn = reportType === "all" || reportType === "pawn" || reportType === "summary";
    let pawnData: any = {
      totalActiveLoansUsd: 0,
      totalInterestCollectedUsd: 0,
      totalRedeemedAmountUsd: 0,
      activeTicketsCount: 0,
      redeemedTicketsCount: 0,
      overdueTicketsCount: 0,
      forfeitedTicketsCount: 0,
      totalTicketsCount: 0,
      categoryDistribution: {},
      recentPawnTickets: [],
    };

    if (shouldFetchPawn) {
      const tickets = await prisma.pawnTicket.findMany({
        where: {
          tenantId,
          ...branchFilter,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true } },
          paymentLogs: { select: { amountPaidUsd: true, paymentType: true, paidDate: true } },
        },
        orderBy: { createdAt: "desc" },
        take: reportType === "pawn" ? 150 : 40,
      });

      let activeLoansUsd = 0;
      let interestCollectedUsd = 0;
      let redeemedAmountUsd = 0;
      let activeCount = 0;
      let redeemedCount = 0;
      let overdueCount = 0;
      let forfeitedCount = 0;
      const catMap: Record<string, number> = {};

      tickets.forEach((tk) => {
        const loan = Number(tk.loanAmountUsd) || 0;
        const interest = Number(tk.totalInterestPaidUsd) || 0;
        interestCollectedUsd += interest;

        if (tk.status === PawnStatus.ACTIVE || tk.status === PawnStatus.EXTENDED) {
          activeCount++;
          activeLoansUsd += loan;
        } else if (tk.status === PawnStatus.REDEEMED) {
          redeemedCount++;
          redeemedAmountUsd += Number(tk.redeemedAmountUsd || loan);
        } else if (tk.status === PawnStatus.OVERDUE) {
          overdueCount++;
          activeLoansUsd += loan;
        } else if (tk.status === PawnStatus.DEFAULTED_FORFEITED) {
          forfeitedCount++;
        }

        const cat = tk.itemCategory || "ទូទៅ (Other)";
        catMap[cat] = (catMap[cat] || 0) + 1;
      });

      pawnData = {
        totalActiveLoansUsd: activeLoansUsd,
        totalInterestCollectedUsd: interestCollectedUsd,
        totalRedeemedAmountUsd: redeemedAmountUsd,
        activeTicketsCount: activeCount,
        redeemedTicketsCount: redeemedCount,
        overdueTicketsCount: overdueCount,
        forfeitedTicketsCount: forfeitedCount,
        totalTicketsCount: tickets.length,
        categoryDistribution: Object.entries(catMap).map(([name, count]) => ({ name, count })),
        recentPawnTickets: tickets.slice(0, 50).map((tk) => ({
          id: tk.id,
          ticketNumber: tk.ticketNumber,
          customerName: tk.customer?.name,
          customerPhone: tk.customer?.phone,
          itemName: tk.itemName,
          itemCategory: tk.itemCategory,
          loanAmountUsd: Number(tk.loanAmountUsd),
          monthlyInterestRate: Number(tk.monthlyInterestRate),
          totalInterestPaidUsd: Number(tk.totalInterestPaidUsd),
          status: tk.status,
          startDate: tk.startDate,
          maturityDate: tk.maturityDate,
          daysOverdue: tk.daysOverdue,
          branchName: tk.branch?.name,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // D. INSTALLMENT REPORT DATA (បង់រំលោះ)
    // -------------------------------------------------------------------------
    const shouldFetchInstallment = reportType === "all" || reportType === "installments" || reportType === "summary";
    let installmentData: any = {
      totalFinancedValueUsd: 0,
      totalDownPaymentCollectedUsd: 0,
      totalPrincipalRemainingUsd: 0,
      totalCollectedUsd: 0,
      activeContractsCount: 0,
      completedContractsCount: 0,
      overdueContractsCount: 0,
      totalContractsCount: 0,
      collectionRatePercent: 0,
      recentContracts: [],
    };

    if (shouldFetchInstallment) {
      const contracts = await prisma.installmentContract.findMany({
        where: {
          tenantId,
          ...branchFilter,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true } },
          schedules: {
            select: {
              installmentNumber: true,
              dueDate: true,
              totalDueUsd: true,
              paidAmountUsd: true,
              status: true,
              daysOverdue: true,
              penaltyAmountUsd: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: reportType === "installments" ? 150 : 40,
      });

      let financedUsd = 0;
      let downPaymentUsd = 0;
      let remainingUsd = 0;
      let totalPaidUsd = 0;
      let activeCount = 0;
      let completedCount = 0;
      let overdueCount = 0;

      contracts.forEach((c) => {
        const total = Number(c.totalPriceUsd) || 0;
        const down = Number(c.downPaymentUsd) || 0;
        const rem = Number(c.principalRemainingUsd) || 0;
        const paid = Number(c.totalPaidUsd) || 0;

        financedUsd += total;
        downPaymentUsd += down;
        remainingUsd += rem;
        totalPaidUsd += paid;

        if (c.status === InstallmentStatus.ACTIVE) activeCount++;
        else if (c.status === InstallmentStatus.COMPLETED) completedCount++;
        else if (c.status === InstallmentStatus.OVERDUE || c.status === InstallmentStatus.DEFAULTED) overdueCount++;
      });

      const totalExpected = financedUsd || 1;
      const rate = Math.min(100, Math.round(((totalPaidUsd + downPaymentUsd) / totalExpected) * 100));

      installmentData = {
        totalFinancedValueUsd: financedUsd,
        totalDownPaymentCollectedUsd: downPaymentUsd,
        totalPrincipalRemainingUsd: remainingUsd,
        totalCollectedUsd: totalPaidUsd,
        activeContractsCount: activeCount,
        completedContractsCount: completedCount,
        overdueContractsCount: overdueCount,
        totalContractsCount: contracts.length,
        collectionRatePercent: rate,
        recentContracts: contracts.slice(0, 50).map((c) => ({
          id: c.id,
          contractNumber: c.contractNumber,
          customerName: c.customer?.name,
          customerPhone: c.customer?.phone,
          productName: c.productName,
          totalPriceUsd: Number(c.totalPriceUsd),
          downPaymentUsd: Number(c.downPaymentUsd),
          principalRemainingUsd: Number(c.principalRemainingUsd),
          totalPaidUsd: Number(c.totalPaidUsd),
          monthlyAmountUsd: Number(c.monthlyAmountUsd),
          durationMonths: c.durationMonths,
          status: c.status,
          startDate: c.startDate,
          endDate: c.endDate,
          branchName: c.branch?.name,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // E. REPAIRS REPORT DATA (ជួសជុល)
    // -------------------------------------------------------------------------
    const shouldFetchRepairs = reportType === "all" || reportType === "repairs" || reportType === "summary";
    let repairsData: any = {
      totalRepairRevenueUsd: 0,
      totalSparePartsCostUsd: 0,
      netRepairProfitUsd: 0,
      totalTicketsCount: 0,
      statusCounts: {
        RECEIVED: 0,
        IN_PROGRESS: 0,
        READY_FOR_PICKUP: 0,
        DELIVERED: 0,
        CANCELLED: 0,
      },
      topDeviceBrands: [],
      topTechnicians: [],
      recentRepairs: [],
    };

    if (shouldFetchRepairs) {
      const repairTickets = await prisma.repairTicket.findMany({
        where: {
          ...branchRelationFilter,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          technician: { select: { id: true, fullName: true, username: true } },
          branch: { select: { id: true, name: true } },
          partsUsed: {
            include: {
              product: { select: { id: true, nameKh: true, nameEn: true } },
            },
          },
          commissions: { select: { commissionUsd: true, isPaid: true } },
        },
        orderBy: { createdAt: "desc" },
        take: reportType === "repairs" ? 150 : 40,
      });

      let totalRevenue = 0;
      let totalPartsCost = 0;
      const statusCounts: Record<string, number> = {
        RECEIVED: 0,
        IN_PROGRESS: 0,
        READY_FOR_PICKUP: 0,
        DELIVERED: 0,
        CANCELLED: 0,
      };
      const brandMap: Record<string, number> = {};
      const techMap: Record<string, { id: string; name: string; ticketCount: number; revenue: number; commissions: number }> = {};

      repairTickets.forEach((rep) => {
        const rev = Number(rep.finalCostUsd || rep.estimatedCostUsd || 0);
        totalRevenue += rev;

        // Parts cost
        rep.partsUsed.forEach((pu) => {
          totalPartsCost += (Number(pu.costPriceUsd) || 0) * (pu.quantity || 1);
        });

        // Status counts
        const st = rep.status;
        if (st === RepairStatus.DELIVERED) statusCounts.DELIVERED = (statusCounts.DELIVERED || 0) + 1;
        else if (st === RepairStatus.READY_FOR_PICKUP) statusCounts.READY_FOR_PICKUP = (statusCounts.READY_FOR_PICKUP || 0) + 1;
        else if (st === RepairStatus.IN_PROGRESS || st === RepairStatus.DIAGNOSING || st === RepairStatus.WAITING_FOR_PARTS) {
          statusCounts.IN_PROGRESS = (statusCounts.IN_PROGRESS || 0) + 1;
        } else if (st === RepairStatus.RECEIVED || st === RepairStatus.QUOTED) {
          statusCounts.RECEIVED = (statusCounts.RECEIVED || 0) + 1;
        } else if (st === RepairStatus.CANCELLED) {
          statusCounts.CANCELLED = (statusCounts.CANCELLED || 0) + 1;
        }

        // Brands
        const brand = rep.deviceBrand || "ទូទៅ";
        brandMap[brand] = (brandMap[brand] || 0) + 1;

        // Technician
        const tId = rep.technicianId || "unassigned";
        const tName = rep.technician?.fullName || rep.technician?.username || "មិនទាន់កំណត់ (Unassigned)";
        if (!techMap[tId]) {
          techMap[tId] = { id: tId, name: tName, ticketCount: 0, revenue: 0, commissions: 0 };
        }
        techMap[tId].ticketCount += 1;
        techMap[tId].revenue += rev;
        rep.commissions.forEach((com) => {
          techMap[tId].commissions += Number(com.commissionUsd) || 0;
        });
      });

      repairsData = {
        totalRepairRevenueUsd: totalRevenue,
        totalSparePartsCostUsd: totalPartsCost,
        netRepairProfitUsd: totalRevenue - totalPartsCost,
        totalTicketsCount: repairTickets.length,
        statusCounts,
        topDeviceBrands: Object.entries(brandMap)
          .map(([brand, count]) => ({ brand, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
        topTechnicians: Object.values(techMap).sort((a, b) => b.revenue - a.revenue),
        recentRepairs: repairTickets.slice(0, 50).map((r) => ({
          id: r.id,
          ticketNumber: r.ticketNumber,
          customerName: r.customer?.name,
          customerPhone: r.customer?.phone,
          device: `${r.deviceBrand} ${r.deviceModel}`,
          technicianName: r.technician?.fullName || r.technician?.username || "-",
          status: r.status,
          finalCostUsd: Number(r.finalCostUsd || r.estimatedCostUsd || 0),
          depositPaidUsd: Number(r.depositPaidUsd),
          createdAt: r.createdAt,
          branchName: r.branch?.name,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // F. STAFF / HRM REPORT DATA (បុគ្គលិក)
    // -------------------------------------------------------------------------
    const shouldFetchHrm = reportType === "all" || reportType === "hrm" || reportType === "summary";
    let hrmData: any = {
      totalEmployeesCount: 0,
      activeEmployeesCount: 0,
      attendanceStats: { PRESENT: 0, LATE: 0, ABSENT: 0, LEAVE: 0 },
      payrollStats: {
        totalBaseSalaryUsd: 0,
        totalOvertimeUsd: 0,
        totalCommissionsUsd: 0,
        totalDeductionsUsd: 0,
        totalNetSalaryUsd: 0,
      },
      employeeList: [],
    };

    if (shouldFetchHrm) {
      const employees = await prisma.employee.findMany({
        where: {
          user: { tenantId },
          ...(effectiveBranchId ? { attendances: { some: { branchId: effectiveBranchId } } } : {}),
        },
        include: {
          user: { select: { id: true, username: true, role: true, branchId: true } },
          attendances: {
            where: {
              ...(dateFilter ? { date: dateFilter } : {}),
              ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
            },
          },
          payrolls: {
            take: 12,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      let activeCount = 0;
      const attStats = { PRESENT: 0, LATE: 0, ABSENT: 0, LEAVE: 0 };
      let baseSal = 0;
      let ot = 0;
      let com = 0;
      let ded = 0;
      let net = 0;

      employees.forEach((emp) => {
        if (emp.isActive) activeCount++;

        emp.attendances.forEach((a) => {
          const st = a.status as keyof typeof attStats;
          if (attStats[st] !== undefined) {
            attStats[st] += 1;
          }
        });

        emp.payrolls.forEach((pr) => {
          baseSal += Number(pr.baseSalaryUsd) || 0;
          ot += Number(pr.overtimePayUsd) || 0;
          com += Number(pr.commissionUsd) || 0;
          ded += Number(pr.deductionUsd) || 0;
          net += Number(pr.netSalaryUsd) || 0;
        });
      });

      hrmData = {
        totalEmployeesCount: employees.length,
        activeEmployeesCount: activeCount,
        attendanceStats: attStats,
        payrollStats: {
          totalBaseSalaryUsd: baseSal,
          totalOvertimeUsd: ot,
          totalCommissionsUsd: com,
          totalDeductionsUsd: ded,
          totalNetSalaryUsd: net,
        },
        employeeList: employees.map((emp) => ({
          id: emp.id,
          employeeCode: emp.employeeCode,
          nameKh: emp.fullNameKh,
          nameEn: emp.fullNameEn,
          position: emp.position,
          baseSalaryUsd: Number(emp.baseSalaryUsd),
          phone: emp.phone,
          isActive: emp.isActive,
          attendanceCount: emp.attendances.length,
          presentCount: emp.attendances.filter((a) => a.status === "PRESENT").length,
          lateCount: emp.attendances.filter((a) => a.status === "LATE").length,
          hireDate: emp.hireDate,
        })),
      };
    }

    // -------------------------------------------------------------------------
    // G. EXPENSES & FINANCIAL OVERVIEW (ចំណាយ & ហិរញ្ញវត្ថុ)
    // -------------------------------------------------------------------------
    const shouldFetchFinancial = reportType === "all" || reportType === "financial" || reportType === "summary";
    let financialData: any = {
      totalOperatingExpensesUsd: 0,
      expenseByCategory: [],
      netBusinessProfitUsd: 0,
      totalIncomeUsd: 0,
      totalOutgoingUsd: 0,
    };

    if (shouldFetchFinancial) {
      const expenses = await prisma.expense.findMany({
        where: {
          ...branchRelationFilter,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        select: {
          id: true,
          category: true,
          amountUsd: true,
          amountKhr: true,
          paidTo: true,
          date: true,
          notes: true,
        },
        orderBy: { date: "desc" },
      });

      const catExpenseMap: Record<string, number> = {};
      let totalExpenses = 0;

      expenses.forEach((ex) => {
        const amt = Number(ex.amountUsd) || 0;
        totalExpenses += amt;
        catExpenseMap[ex.category] = (catExpenseMap[ex.category] || 0) + amt;
      });

      // Income = Sales Rev + Repair Rev + Installment Paid + Pawn Interest
      const totalIncome =
        (salesData.totalRevenueUsd || 0) +
        (repairsData.totalRepairRevenueUsd || 0) +
        (installmentData.totalCollectedUsd || 0) +
        (pawnData.totalInterestCollectedUsd || 0);

      // Outgoing = Purchases spend + Operating Expenses + Parts Cost + Payroll (Net)
      const totalOutgoing =
        (purchasesData.totalPurchaseCostUsd || 0) +
        totalExpenses +
        (repairsData.totalSparePartsCostUsd || 0) +
        (hrmData.payrollStats.totalNetSalaryUsd || 0);

      financialData = {
        totalOperatingExpensesUsd: totalExpenses,
        expenseByCategory: Object.entries(catExpenseMap).map(([category, amountUsd]) => ({
          category,
          amountUsd,
        })),
        totalIncomeUsd: totalIncome,
        totalOutgoingUsd: totalOutgoing,
        netBusinessProfitUsd: totalIncome - totalOutgoing,
      };
    }

    // -------------------------------------------------------------------------
    // H. INVENTORY REPORT DATA (ស្តុក)
    // -------------------------------------------------------------------------
    const shouldFetchInventory = reportType === "all" || reportType === "inventory" || reportType === "summary";
    let inventoryData: any = {
      totalProductsCount: 0,
      totalStockCostUsd: 0,
      totalRetailValueUsd: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      categoryDistribution: [],
    };

    if (shouldFetchInventory) {
      const products = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        include: {
          category: { select: { id: true, nameKh: true, nameEn: true } },
          stockItems: {
            where: {
              status: "IN_STOCK",
              ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
            },
          },
        },
      });

      let totalStockCost = 0;
      let totalRetailValue = 0;
      let lowStock = 0;
      let outOfStock = 0;
      const catProductMap: Record<string, number> = {};

      products.forEach((p) => {
        const inStockCount = p.stockItems.reduce((acc, it) => acc + it.quantity, 0);
        const cost = Number(p.costPriceUsd) || 0;
        const retail = Number(p.salePriceUsd) || 0;

        totalStockCost += inStockCount * cost;
        totalRetailValue += inStockCount * retail;

        if (inStockCount === 0) outOfStock++;
        else if (inStockCount <= (p.minStockAlert || 5)) lowStock++;

        const catName = p.category?.nameKh || p.category?.nameEn || "ទូទៅ";
        catProductMap[catName] = (catProductMap[catName] || 0) + inStockCount;
      });

      inventoryData = {
        totalProductsCount: products.length,
        totalStockCostUsd: totalStockCost,
        totalRetailValueUsd: totalRetailValue,
        lowStockCount: lowStock,
        outOfStockCount: outOfStock,
        categoryDistribution: Object.entries(catProductMap).map(([name, count]) => ({ name, count })),
      };
    }

    return NextResponse.json({
      success: true,
      branches,
      activeBranchId: effectiveBranchId || "ALL",
      dateRange,
      sales: salesData,
      purchases: purchasesData,
      pawn: pawnData,
      installments: installmentData,
      repairs: repairsData,
      hrm: hrmData,
      financial: financialData,
      inventory: inventoryData,
    });
  } catch (error: any) {
    console.error("❌ Error fetching reports:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
