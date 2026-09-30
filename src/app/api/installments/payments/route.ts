import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { PaymentMethod, SchedulePaymentStatus, InstallmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/installments/payments - Record a payment for an installment schedule item
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();

    const {
      scheduleId,
      amountPaidUsd,
      amountPaidKhr,
      penaltyPaidUsd = 0,
      penaltyPaidKhr = 0,
      paymentCurrency = "USD",
      paymentMethod = "CASH_USD",
      notes,
    } = body;

    if (!scheduleId) {
      return NextResponse.json({ success: false, error: "Schedule ID is required" }, { status: 400 });
    }

    const schedule = await prisma.installmentSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        contract: {
          include: {
            schedules: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ success: false, error: "រកមិនឃើញតារាងបង់រំលស់នេះទេ" }, { status: 404 });
    }

    const rate = schedule.contract.exchangeRate || 4100;
    let payAmountUsd = parseFloat(amountPaidUsd) || 0;
    let payAmountKhr = parseFloat(amountPaidKhr) || 0;

    if (paymentCurrency === "KHR" || paymentMethod === "CASH_KHR") {
      if (payAmountKhr > 0 && payAmountUsd === 0) {
        payAmountUsd = Number((payAmountKhr / rate).toFixed(2));
      } else if (payAmountUsd > 0 && payAmountKhr === 0) {
        payAmountKhr = Math.round(payAmountUsd * rate);
      }
    } else {
      if (payAmountUsd > 0 && payAmountKhr === 0) {
        payAmountKhr = Math.round(payAmountUsd * rate);
      } else if (payAmountKhr > 0 && payAmountUsd === 0) {
        payAmountUsd = Number((payAmountKhr / rate).toFixed(2));
      }
    }

    let penaltyUsd = parseFloat(penaltyPaidUsd) || 0;
    let penaltyKhr = parseFloat(penaltyPaidKhr) || 0;
    if (penaltyUsd > 0 && penaltyKhr === 0) {
      penaltyKhr = Math.round(penaltyUsd * rate);
    } else if (penaltyKhr > 0 && penaltyUsd === 0) {
      penaltyUsd = Number((penaltyKhr / rate).toFixed(2));
    }

    if (payAmountUsd <= 0 && payAmountKhr <= 0) {
      return NextResponse.json({ success: false, error: "ចំនួនទឹកប្រាក់ត្រូវតែធំជាង 0" }, { status: 400 });
    }

    const totalDueUsd = Number(schedule.totalDueUsd);
    const prevPaidUsd = Number(schedule.paidAmountUsd);
    const newPaidUsd = Number((prevPaidUsd + payAmountUsd).toFixed(2));

    const totalDueKhr = Number(schedule.totalDueKhr || Math.round(totalDueUsd * rate));
    const prevPaidKhr = Number(schedule.paidAmountKhr || Math.round(prevPaidUsd * rate));
    const newPaidKhr = Math.round(prevPaidKhr + payAmountKhr);

    const isFullyPaid = newPaidUsd >= (totalDueUsd - 0.01) || newPaidKhr >= (totalDueKhr - 50);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update schedule item
      const updatedSchedule = await tx.installmentSchedule.update({
        where: { id: scheduleId },
        data: {
          paidAmountUsd: newPaidUsd,
          paidAmountKhr: newPaidKhr,
          paidDate: new Date(),
          paymentMethod: (paymentMethod as PaymentMethod) || PaymentMethod.CASH_USD,
          status: isFullyPaid ? SchedulePaymentStatus.PAID : SchedulePaymentStatus.PARTIALLY_PAID,
          penaltyPaidUsd: { increment: penaltyUsd },
          penaltyPaidKhr: { increment: penaltyKhr },
          notes: notes ? `${schedule.notes || ""}; ${notes}` : schedule.notes,
          collectedBy: session?.fullName || "Staff",
        },
      });

      // 2. Increment contract totalPaidUsd and totalPaidKhr
      await tx.installmentContract.update({
        where: { id: schedule.contractId },
        data: {
          totalPaidUsd: {
            increment: payAmountUsd,
          },
          totalPaidKhr: {
            increment: payAmountKhr,
          },
        },
      });

      // 3. Check if all schedules for this contract are PAID
      const remainingUnpaid = await tx.installmentSchedule.count({
        where: {
          contractId: schedule.contractId,
          status: { not: SchedulePaymentStatus.PAID },
        },
      });

      if (remainingUnpaid === 0) {
        await tx.installmentContract.update({
          where: { id: schedule.contractId },
          data: { status: InstallmentStatus.COMPLETED },
        });
      }

      return updatedSchedule;
    });

    return NextResponse.json({
      success: true,
      schedule: result,
      message: `បានកត់ត្រាការបង់ប្រាក់រំលស់ចំនួន ${paymentCurrency === "KHR" ? payAmountKhr.toLocaleString() + " ៛" : "$" + payAmountUsd.toFixed(2)} ដោយជោគជ័យ!`,
    });
  } catch (error: any) {
    console.error("POST /api/installments/payments error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
