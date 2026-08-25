import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";

// GET /api/accounting - Fetch Chart of Accounts, P&L, and Expenses scoped to tenant
export async function GET(request: Request) {
  try {
    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, accounts: [], expenses: [], pnl: {} });
    }

    const [accounts, expenses, orders, repairs, orderItems, repairParts] = await Promise.all([
      prisma.account.findMany({
        where: { tenantId },
        orderBy: { code: "asc" },
      }),
      prisma.expense.findMany({
        where: { branch: { tenantId } },
        include: { account: true, branch: true },
        orderBy: { date: "desc" },
      }),
      prisma.order.findMany({
        where: {
          branch: { tenantId },
          status: "COMPLETED",
        },
        select: { totalUsd: true },
      }),
      prisma.repairTicket.findMany({
        where: {
          branch: { tenantId },
          status: { in: ["READY_FOR_PICKUP", "DELIVERED"] },
        },
        select: { finalCostUsd: true, estimatedCostUsd: true },
      }),
      prisma.orderItem.findMany({
        where: {
          order: { branch: { tenantId }, status: "COMPLETED" },
        },
        select: { unitCostUsd: true, quantity: true },
      }),
      prisma.repairPartUsed.findMany({
        where: {
          repairTicket: { branch: { tenantId } },
        },
        select: { costPriceUsd: true, quantity: true },
      }),
    ]);

    // Calculate P&L values from live Supabase tables
    const posRevenue = orders.reduce((sum, o) => sum + Number(o.totalUsd), 0);
    const repairRevenue = repairs.reduce(
      (sum, r) => sum + Number(r.finalCostUsd || r.estimatedCostUsd || 0),
      0
    );

    const posCogs = orderItems.reduce(
      (sum, item) => sum + Number(item.unitCostUsd) * item.quantity,
      0
    );
    const repairCogs = repairParts.reduce(
      (sum, part) => sum + Number(part.costPriceUsd) * part.quantity,
      0
    );

    const totalRevenue = posRevenue + repairRevenue;
    const totalCogs = posCogs + repairCogs;
    const grossProfit = totalRevenue - totalCogs;

    const opex = expenses.reduce((sum, exp) => sum + Number(exp.amountUsd), 0);
    const netProfit = grossProfit - opex;

    return NextResponse.json({
      success: true,
      accounts,
      expenses,
      pnl: {
        summary: {
          totalRevenue,
          totalCogs,
          grossProfit,
          totalExpenses: opex,
          netProfit,
          grossMarginPercent: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          netMarginPercent: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        },
        revenue: [
          { name: "ចំណូលពីការលក់ទំនិញ (POS Sales)", amountUsd: posRevenue },
          { name: "ចំណូលពីសេវាកម្មជួសជុល (Repair Services)", amountUsd: repairRevenue },
        ],
        cogs: [
          { name: "ថ្លៃដើមទំនិញលក់ចេញ (POS COGS)", amountUsd: posCogs },
          { name: "ថ្លៃដើមគ្រឿងបន្លាស់ជួសជុល (Repair Parts COGS)", amountUsd: repairCogs },
        ],
        expenses: [
          { name: "ចំណាយប្រតិបត្តិការទូទៅ (Operating Expenses)", amountUsd: opex },
        ],
        totalRevenueUsd: totalRevenue,
        posRevenueUsd: posRevenue,
        repairRevenueUsd: repairRevenue,
        totalCogsUsd: totalCogs,
        posCogsUsd: posCogs,
        repairCogsUsd: repairCogs,
        grossProfitUsd: grossProfit,
        operatingExpensesUsd: opex,
        netProfitUsd: netProfit,
        grossMarginPercent: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        netMarginPercent: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      },
    });
  } catch (error: any) {
    console.error("GET /api/accounting error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/accounting - Record an Expense scoped to tenant
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();
    const {
      accountId,
      amountUsd,
      amountKhr,
      category = "GENERAL_EXPENSE",
      description,
      vendorName,
      receiptUrl,
      branchId: customBranchId,
    } = body;

    if (!accountId || !amountUsd) {
      return NextResponse.json(
        { success: false, error: "Account and Amount (USD) are required." },
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

    const expense = await prisma.expense.create({
      data: {
        accountId,
        branchId: targetBranch.id,
        category,
        amountUsd: Number(amountUsd),
        amountKhr: Number(amountKhr) || Number(amountUsd) * 4100,
        notes: description || undefined,
        paidTo: vendorName || undefined,
        receiptUrl: receiptUrl || undefined,
        date: new Date(),
      },
      include: { account: true, branch: true },
    });

    // Update account balance
    await prisma.account.update({
      where: { id: accountId },
      data: { balanceUsd: { increment: Number(amountUsd) } },
    });

    return NextResponse.json({
      success: true,
      expense,
      message: "Expense recorded successfully",
    });
  } catch (error: any) {
    console.error("POST /api/accounting error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
