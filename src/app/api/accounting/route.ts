import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { CacheManager } from "@/lib/cache";
import { ConfigManager } from "@/lib/config-manager";

export const dynamic = "force-dynamic";

// GET /api/accounting - Fetch Chart of Accounts, P&L, Expenses, and Categories scoped to tenant
export async function GET(request: Request) {
  try {
    const session = await getAuthSession(request);

    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, accounts: [], expenses: [], categories: [], pnl: {} });
    }

    const [accounts, expenses, orders, repairs, orderItems, repairParts, configuredCategories] = await Promise.all([
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
      ConfigManager.getExpenseCategories().catch(() => []),
    ]);

    // Merge categories from config and distinct categories recorded in expenses
    const recordedCategories = expenses.map((e) => e.category).filter(Boolean);
    const allCategories = Array.from(new Set([...configuredCategories, ...recordedCategories]));

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
      categories: allCategories,
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

// POST /api/accounting - Record an Expense or manage expense categories scoped to tenant
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();

    // 1. Action: Add Expense Category
    if (body.action === "ADD_EXPENSE_CATEGORY") {
      const categoryName = (body.category || body.name || "").trim();
      if (!categoryName) {
        return NextResponse.json(
          { success: false, error: "ឈ្មោះប្រភេទចំណាយមិនអាចទទេបានទេ (Category name cannot be empty)." },
          { status: 400 }
        );
      }
      const updatedCategories = await ConfigManager.addExpenseCategory(categoryName);
      return NextResponse.json({
        success: true,
        categories: updatedCategories,
        message: "ប្រភេទចំណាយត្រូវបានបន្ថែមទៅ Supabase ដោយជោគជ័យ",
      });
    }

    // 2. Action: Delete Expense Category
    if (body.action === "DELETE_EXPENSE_CATEGORY") {
      const categoryName = (body.category || body.name || "").trim();
      if (!categoryName) {
        return NextResponse.json(
          { success: false, error: "Category name is required." },
          { status: 400 }
        );
      }
      const updatedCategories = await ConfigManager.deleteExpenseCategory(categoryName);
      return NextResponse.json({
        success: true,
        categories: updatedCategories,
        message: "ប្រភេទចំណាយត្រូវបានលុបចេញពី Supabase ដោយជោគជ័យ",
      });
    }

    // 3. Action: Set Expense Categories
    if (body.action === "SET_EXPENSE_CATEGORIES") {
      const rawList = body.categories;
      if (!Array.isArray(rawList)) {
        return NextResponse.json(
          { success: false, error: "Categories must be an array of strings." },
          { status: 400 }
        );
      }
      const updatedCategories = await ConfigManager.setExpenseCategories(rawList);
      return NextResponse.json({
        success: true,
        categories: updatedCategories,
        message: "បញ្ជីប្រភេទចំណាយត្រូវបានរក្សាទុកដោយជោគជ័យ",
      });
    }

    // 4. Action: Add Expense
    const {
      accountId,
      amountUsd,
      amount,
      amountKhr,
      category = "ថ្លៃជួលទីតាំង & អគ្គិសនី (Rent & Utilities)",
      description,
      notes,
      vendorName,
      paidTo,
      receiptUrl,
      date,
      branchId: customBranchId,
    } = body;

    const finalAmountUsd = Number(amountUsd ?? amount ?? 0);

    if (finalAmountUsd <= 0) {
      return NextResponse.json(
        { success: false, error: "ចំនួនទឹកប្រាក់ត្រូវតែធំជាង 0 (Amount must be greater than 0)." },
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
      return NextResponse.json(
        { success: false, error: "មិនមានសាខាដែលបានកំណត់រចនាសម្ព័ន្ធឡើយ (No branch configured)." },
        { status: 400 }
      );
    }

    const targetBranch = customBranchId
      ? tenant.branches.find((b: any) => b.id === customBranchId || b.code === customBranchId) || tenant.branches[0]
      : (session?.branchId ? tenant.branches.find((b: any) => b.id === session.branchId || b.code === session.branchId) : tenant.branches[0]);

    // Resolve or Auto-create Account
    let targetAccountId = accountId;
    if (!targetAccountId) {
      // 1. Look for existing EXPENSE account for this tenant
      let expAccount = await prisma.account.findFirst({
        where: {
          tenantId,
          type: AccountType.EXPENSE,
          isActive: true,
        },
      });

      // 2. Fallback to any account of this tenant
      if (!expAccount) {
        expAccount = await prisma.account.findFirst({
          where: { tenantId },
        });
      }

      // 3. If no accounts exist at all, create a default Operating Expense account
      if (!expAccount) {
        expAccount = await prisma.account.create({
          data: {
            tenantId: tenant.id,
            code: "5010",
            nameKh: "ចំណាយប្រតិបត្តិការទូទៅ",
            nameEn: "Operating Expenses",
            type: AccountType.EXPENSE,
            balanceUsd: 0,
            isActive: true,
          },
        });
      }

      targetAccountId = expAccount.id;
    } else {
      // Verify provided account exists
      const existing = await prisma.account.findUnique({
        where: { id: targetAccountId },
      });
      if (!existing) {
        // Fallback to tenant's first expense account
        const fallback = await prisma.account.findFirst({
          where: { tenantId, type: AccountType.EXPENSE },
        });
        targetAccountId = fallback ? fallback.id : targetAccountId;
      }
    }

    const finalNotes = notes || description || undefined;
    const finalPaidTo = paidTo || vendorName || undefined;
    const finalDate = date ? new Date(date) : new Date();
    const finalAmountKhr = Number(amountKhr) || finalAmountUsd * (tenant.exchangeRate || 4100);

    const expense = await prisma.expense.create({
      data: {
        accountId: targetAccountId,
        branchId: targetBranch.id,
        category: category || "ថ្លៃជួលទីតាំង & អគ្គិសនី (Rent & Utilities)",
        amountUsd: finalAmountUsd,
        amountKhr: finalAmountKhr,
        notes: finalNotes,
        paidTo: finalPaidTo,
        receiptUrl: receiptUrl || undefined,
        date: finalDate,
      },
      include: { account: true, branch: true },
    });

    if (category) {
      ConfigManager.addExpenseCategory(category).catch(() => {});
    }

    // Update account balance
    try {
      await prisma.account.update({
        where: { id: targetAccountId },
        data: { balanceUsd: { increment: finalAmountUsd } },
      });
    } catch (accErr) {
      console.warn("Could not update account balance:", accErr);
    }

    // Invalidate dashboard & accounting cache
    if (tenantId) {
      CacheManager.invalidatePrefix(`dashboard:${tenantId}`);
      CacheManager.invalidatePrefix("dashboard:");
    }

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
