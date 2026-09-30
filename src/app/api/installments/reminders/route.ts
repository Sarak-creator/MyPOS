import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import {
  notifyInstallmentReminder,
  notifyInstallmentDigest,
  InstallmentReminderPayload,
  getServerTelegramConfig,
  TelegramConfig,
} from "@/lib/telegram";
import { ConfigManager } from "@/lib/config-manager";

export const dynamic = "force-dynamic";

// Helper to calculate exact days difference from today (normalized to midnight)
function getDaysRemaining(targetDate: Date, today: Date): number {
  const d1 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
}

// GET /api/installments/reminders - Query upcoming payments due in 2-3 days
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysWindow = Math.max(1, parseInt(searchParams.get("days") || "3", 10));
    const autoSend = searchParams.get("autoSend") === "true";
    const type = searchParams.get("type") || "ALL"; // "ALL" | "INSTALLMENT" | "PAWN"

    const session = await getAuthSession(request);
    let tenantId = session?.tenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ success: true, count: 0, items: [] });
    }

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const windowEnd = new Date(todayMidnight.getTime() + (daysWindow + 1) * 24 * 60 * 60 * 1000);

    const upcomingInstallments: InstallmentReminderPayload[] = [];
    const upcomingPawns: InstallmentReminderPayload[] = [];

    // 1. Fetch Installment Schedules due within window or overdue
    if (type === "ALL" || type === "INSTALLMENT") {
      const schedules = await prisma.installmentSchedule.findMany({
        where: {
          contract: {
            tenantId,
            status: "ACTIVE",
          },
          status: { not: "PAID" },
          dueDate: {
            lte: windowEnd,
          },
        },
        include: {
          contract: {
            include: {
              customer: { select: { id: true, name: true, phone: true } },
              branch: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { dueDate: "asc" },
      });

      for (const s of schedules) {
        const remainingDays = getDaysRemaining(new Date(s.dueDate), now);
        const amountUsd = Math.max(0, Number(s.totalDueUsd) - Number(s.paidAmountUsd));
        const amountKhr = s.totalDueKhr
          ? Math.max(0, Number(s.totalDueKhr) - Number(s.paidAmountKhr || 0))
          : Math.round(amountUsd * (s.contract.exchangeRate || 4100));

        upcomingInstallments.push({
          contractNumber: s.contract.contractNumber,
          customerName: s.contract.customer?.name || "អតិថិជន",
          customerPhone: s.contract.customer?.phone || "",
          productName: s.contract.productName,
          installmentNumber: s.installmentNumber,
          totalInstallments: s.contract.totalInstallments || undefined,
          dueDate: s.dueDate.toISOString().split("T")[0],
          daysRemaining: remainingDays,
          amountDueUsd: amountUsd,
          amountDueKhr: amountKhr,
          currency: s.contract.currency || "USD",
          branchName: s.contract.branch?.name || "សាខាកណ្តាល",
          contractType: "INSTALLMENT",
          notes: s.notes || undefined,
        });
      }
    }

    // 2. Fetch Pawn Tickets due within window or overdue
    if (type === "ALL" || type === "PAWN") {
      const pawns = await prisma.pawnTicket.findMany({
        where: {
          tenantId,
          status: "ACTIVE",
          maturityDate: {
            lte: windowEnd,
          },
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy: { maturityDate: "asc" },
      });

      for (const p of pawns) {
        const remainingDays = getDaysRemaining(new Date(p.maturityDate), now);
        const interestUsd = Number(p.monthlyInterestUsd || 0);

        upcomingPawns.push({
          contractNumber: p.ticketNumber,
          customerName: p.customer?.name || "អតិថិជន",
          customerPhone: p.customer?.phone || "",
          productName: p.itemName,
          installmentNumber: 1,
          dueDate: p.maturityDate.toISOString().split("T")[0],
          daysRemaining: remainingDays,
          amountDueUsd: interestUsd,
          amountDueKhr: Math.round(interestUsd * 4100),
          currency: "USD",
          branchName: p.branch?.name || "សាខាកណ្តាល",
          contractType: "PAWN",
          notes: p.storageLocation ? `ទីតាំងទុក: ${p.storageLocation}` : undefined,
        });
      }
    }

    const allReminders = [...upcomingInstallments, ...upcomingPawns].sort(
      (a, b) => a.daysRemaining - b.daysRemaining
    );

    // Filter strictly upcoming (0 to daysWindow days) vs overdue
    const dueSoon = allReminders.filter((r) => r.daysRemaining >= 1 && r.daysRemaining <= daysWindow);
    const dueToday = allReminders.filter((r) => r.daysRemaining === 0);
    const overdue = allReminders.filter((r) => r.daysRemaining < 0);

    // Optional Auto-send to Telegram if requested
    let autoSendResult: any = null;
    if (autoSend && (dueSoon.length > 0 || dueToday.length > 0)) {
      const config = await ConfigManager.getTelegramConfig();
      if (config.notifyOnInstallmentDue !== false) {
        const targetList = [...dueToday, ...dueSoon];
        autoSendResult = await notifyInstallmentDigest(targetList);
      }
    }

    return NextResponse.json({
      success: true,
      daysWindow,
      totalCount: allReminders.length,
      dueSoonCount: dueSoon.length,
      dueTodayCount: dueToday.length,
      overdueCount: overdue.length,
      dueSoon,
      dueToday,
      overdue,
      allReminders,
      autoSendResult,
    });
  } catch (error: any) {
    console.error("GET /api/installments/reminders error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/installments/reminders - Dispatch manual or bulk Telegram reminders
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = "SEND_ONE", payload, scheduleId, contractId, days = 3 } = body;

    const config = await ConfigManager.getTelegramConfig();
    const serverConfig = getServerTelegramConfig();
    const botToken = config.botToken || serverConfig.botToken;
    const chatId = config.chatId || serverConfig.chatId;

    if (!botToken || !chatId) {
      return NextResponse.json(
        {
          success: false,
          error: "មិនទាន់បានកំណត់ Telegram Bot Token ឬ Chat ID ឡើយ។ សូមចូលទៅកាន់ Settings -> Telegram Bot ដើម្បីកំណត់។",
        },
        { status: 400 }
      );
    }

    // 1. SEND DIRECT SINGLE REMINDER
    if (action === "SEND_ONE") {
      let reminderPayload: InstallmentReminderPayload | null = payload;

      // If only scheduleId is passed, build payload from DB
      if (!reminderPayload && scheduleId) {
        const schedule = await prisma.installmentSchedule.findUnique({
          where: { id: scheduleId },
          include: {
            contract: {
              include: {
                customer: true,
                branch: true,
              },
            },
          },
        });

        if (!schedule) {
          return NextResponse.json({ success: false, error: "រកមិនឃើញកាលវិភាគបង់ប្រាក់នេះទេ" }, { status: 404 });
        }

        const now = new Date();
        const daysRemaining = getDaysRemaining(new Date(schedule.dueDate), now);
        const amountUsd = Math.max(0, Number(schedule.totalDueUsd) - Number(schedule.paidAmountUsd));

        reminderPayload = {
          contractNumber: schedule.contract.contractNumber,
          customerName: schedule.contract.customer?.name || "អតិថិជន",
          customerPhone: schedule.contract.customer?.phone || "",
          productName: schedule.contract.productName,
          installmentNumber: schedule.installmentNumber,
          totalInstallments: schedule.contract.totalInstallments || undefined,
          dueDate: schedule.dueDate.toISOString().split("T")[0],
          daysRemaining,
          amountDueUsd: amountUsd,
          amountDueKhr: schedule.totalDueKhr
            ? Math.max(0, Number(schedule.totalDueKhr) - Number(schedule.paidAmountKhr || 0))
            : Math.round(amountUsd * (schedule.contract.exchangeRate || 4100)),
          currency: schedule.contract.currency || "USD",
          branchName: schedule.contract.branch?.name || "សាខាកណ្តាល",
          contractType: "INSTALLMENT",
          notes: schedule.notes || undefined,
        };
      }

      if (!reminderPayload) {
        return NextResponse.json({ success: false, error: "Missing reminder payload or scheduleId" }, { status: 400 });
      }

      const res = await notifyInstallmentReminder(reminderPayload, { botToken, chatId });
      return NextResponse.json({
        success: res.success,
        error: res.error,
        message: res.success ? `សាររំលឹកត្រូវបានផ្ញើទៅ Telegram សម្រាប់ ${reminderPayload.customerName} ដោយជោគជ័យ!` : res.error,
      });
    }

    // 2. SEND DIGEST SUMMARY (Consolidated Report)
    if (action === "SEND_DIGEST") {
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const windowEnd = new Date(todayMidnight.getTime() + (days + 1) * 24 * 60 * 60 * 1000);

      const schedules = await prisma.installmentSchedule.findMany({
        where: {
          contract: { status: "ACTIVE" },
          status: { not: "PAID" },
          dueDate: { lte: windowEnd, gte: todayMidnight },
        },
        include: {
          contract: {
            include: {
              customer: true,
              branch: true,
            },
          },
        },
        orderBy: { dueDate: "asc" },
      });

      const reminders: InstallmentReminderPayload[] = schedules.map((s) => {
        const daysRemaining = getDaysRemaining(new Date(s.dueDate), now);
        const amountUsd = Math.max(0, Number(s.totalDueUsd) - Number(s.paidAmountUsd));
        return {
          contractNumber: s.contract.contractNumber,
          customerName: s.contract.customer?.name || "អតិថិជន",
          customerPhone: s.contract.customer?.phone || "",
          productName: s.contract.productName,
          installmentNumber: s.installmentNumber,
          dueDate: s.dueDate.toISOString().split("T")[0],
          daysRemaining,
          amountDueUsd: amountUsd,
          branchName: s.contract.branch?.name || "សាខាកណ្តាល",
          contractType: "INSTALLMENT",
        };
      });

      if (reminders.length === 0) {
        return NextResponse.json({
          success: true,
          message: "មិនមានអតិថិជនដែលត្រូវបង់ប្រាក់ក្នុងរយៈពេល ២-៣ ថ្ងៃខាងមុខនេះទេ!",
          count: 0,
        });
      }

      const res = await notifyInstallmentDigest(reminders, { botToken, chatId });
      return NextResponse.json({
        success: res.success,
        error: res.error || null,
        count: reminders.length,
        message: res.success
          ? `របាយការណ៍សង្ខេបអតិថិជន ${reminders.length} នាក់ ត្រូវបានផ្ញើទៅ Telegram ដោយជោគជ័យ!`
          : (res.error || "បរាជ័យ"),
      });
    }

    // 3. SEND ALL INDIVIDUAL ALERTS (Batch Send)
    if (action === "SEND_ALL") {
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const windowEnd = new Date(todayMidnight.getTime() + (days + 1) * 24 * 60 * 60 * 1000);

      const schedules = await prisma.installmentSchedule.findMany({
        where: {
          contract: { status: "ACTIVE" },
          status: { not: "PAID" },
          dueDate: { lte: windowEnd, gte: todayMidnight },
        },
        include: {
          contract: {
            include: {
              customer: true,
              branch: true,
            },
          },
        },
        orderBy: { dueDate: "asc" },
      });

      let sentCount = 0;
      for (const s of schedules) {
        const daysRemaining = getDaysRemaining(new Date(s.dueDate), now);
        const amountUsd = Math.max(0, Number(s.totalDueUsd) - Number(s.paidAmountUsd));

        const payload: InstallmentReminderPayload = {
          contractNumber: s.contract.contractNumber,
          customerName: s.contract.customer?.name || "អតិថិជន",
          customerPhone: s.contract.customer?.phone || "",
          productName: s.contract.productName,
          installmentNumber: s.installmentNumber,
          totalInstallments: s.contract.totalInstallments || undefined,
          dueDate: s.dueDate.toISOString().split("T")[0],
          daysRemaining,
          amountDueUsd: amountUsd,
          amountDueKhr: Math.round(amountUsd * (s.contract.exchangeRate || 4100)),
          branchName: s.contract.branch?.name || "សាខាកណ្តាល",
          contractType: "INSTALLMENT",
        };

        const res = await notifyInstallmentReminder(payload, { botToken, chatId });
        if (res.success) sentCount++;
        // Small delay to prevent Telegram rate limit
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      return NextResponse.json({
        success: true,
        sentCount,
        totalFound: schedules.length,
        message: `បានផ្ញើសាររំលឹកទៅកាន់ Telegram ចំនួន ${sentCount} / ${schedules.length} នាក់រួចរាល់!`,
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/installments/reminders error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
