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
      penaltyPaidUsd = 0,
      paymentMethod = "CASH_USD",
      notes,
    } = body;

    if (!scheduleId) {
      return NextResponse.json({ success: false, error: "Schedule ID is required" }, { status: 400 });
    }

    const payAmount = parseFloat(amountPaidUsd);
    const penaltyAmount = parseFloat(penaltyPaidUsd) || 0;

    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ success: false, error: "ចំនួនទឹកប្រាក់ត្រូវតែធំជាង 0" }, { status: 400 });
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

    const totalDue = Number(schedule.totalDueUsd);
    const prevPaid = Number(schedule.paidAmountUsd);
    const newPaid = prevPaid + payAmount;
    const isFullyPaid = newPaid >= totalDue;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update schedule item
      const updatedSchedule = await tx.installmentSchedule.update({
        where: { id: scheduleId },
        data: {
          paidAmountUsd: newPaid,
          paidDate: new Date(),
          paymentMethod: (paymentMethod as PaymentMethod) || PaymentMethod.CASH_USD,
          status: isFullyPaid ? SchedulePaymentStatus.PAID : SchedulePaymentStatus.PARTIALLY_PAID,
          penaltyPaidUsd: { increment: penaltyAmount },
          notes: notes ? `${schedule.notes || ""}; ${notes}` : schedule.notes,
          collectedBy: session?.fullName || "Staff",
        },
      });

      // 2. Increment contract totalPaidUsd
      await tx.installmentContract.update({
        where: { id: schedule.contractId },
        data: {
          totalPaidUsd: {
            increment: payAmount,
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
      message: "បានកត់ត្រាការបង់ប្រាក់រំលស់ដោយជោគជ័យ!",
    });
  } catch (error: any) {
    console.error("POST /api/installments/payments error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
