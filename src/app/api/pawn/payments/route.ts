import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { PaymentMethod, PawnPaymentType, PawnStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/pawn/payments - Record a payment or redemption for a Pawn Ticket
export async function POST(request: Request) {
  try {
    const session = await getAuthSession(request);
    const body = await request.json();

    const {
      pawnTicketId,
      paymentType = "INTEREST_PAYMENT",
      amountPaidUsd,
      penaltyPaidUsd = 0,
      paymentMethod = "CASH_USD",
      monthsExtended = 1,
      daysExtended,
      notes,
    } = body;

    if (!pawnTicketId) {
      return NextResponse.json({ success: false, error: "Pawn Ticket ID is required" }, { status: 400 });
    }

    const payAmount = parseFloat(amountPaidUsd);
    const penaltyAmount = parseFloat(penaltyPaidUsd) || 0;

    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ success: false, error: "ចំនួនទឹកប្រាក់ត្រូវតែធំជាង 0" }, { status: 400 });
    }

    const ticket = await prisma.pawnTicket.findUnique({
      where: { id: pawnTicketId },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: "រកមិនឃើញប័ណ្ណបញ្ចាំនេះទេ" }, { status: 404 });
    }

    const now = new Date();
    let newMaturity: Date | null = null;
    let newStatus: PawnStatus = ticket.status;

    if (paymentType === "FULL_REDEMPTION") {
      newStatus = PawnStatus.REDEEMED;
    } else if (paymentType === "INTEREST_PAYMENT") {
      // Extend maturity date by specified days or months
      const currentMaturity = new Date(ticket.maturityDate);
      const baseDate = currentMaturity < now ? now : currentMaturity;
      newMaturity = new Date(baseDate);

      const parsedDays = daysExtended !== undefined && daysExtended !== null && daysExtended !== "" ? parseInt(daysExtended) : null;
      if (parsedDays && parsedDays > 0) {
        newMaturity.setDate(newMaturity.getDate() + parsedDays);
      } else {
        const extMonths = parseInt(monthsExtended) || 1;
        newMaturity.setMonth(newMaturity.getMonth() + extMonths);
      }
      newStatus = PawnStatus.ACTIVE;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment Log
      const log = await tx.pawnPaymentLog.create({
        data: {
          pawnTicketId,
          paymentType: (paymentType as PawnPaymentType) || PawnPaymentType.INTEREST_PAYMENT,
          amountPaidUsd: payAmount,
          penaltyPaidUsd: penaltyAmount,
          paymentMethod: (paymentMethod as PaymentMethod) || PaymentMethod.CASH_USD,
          monthsExtended: paymentType === "INTEREST_PAYMENT" ? (parseInt(monthsExtended) || 1) : 0,
          newMaturityDate: newMaturity,
          paidDate: now,
          receivedBy: session?.fullName || "Staff",
          notes: notes || null,
        },
      });

      // 2. Update Pawn Ticket
      const ticketUpdate: any = {
        status: newStatus,
        daysOverdue: 0,
        penaltyAmountUsd: 0,
      };

      if (paymentType === "INTEREST_PAYMENT") {
        ticketUpdate.totalInterestPaidUsd = { increment: payAmount };
        if (newMaturity) {
          ticketUpdate.maturityDate = newMaturity;
        }
      } else if (paymentType === "FULL_REDEMPTION") {
        ticketUpdate.redeemedDate = now;
        ticketUpdate.redeemedAmountUsd = payAmount;
      }

      const updatedTicket = await tx.pawnTicket.update({
        where: { id: pawnTicketId },
        data: ticketUpdate,
      });

      return { log, updatedTicket };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message:
        paymentType === "FULL_REDEMPTION"
          ? "បានកត់ត្រាការលោះយកទ្រព្យបញ្ចាំវិញដោយជោគជ័យ!"
          : "បានកត់ត្រាការបង់ការប្រាក់ និងពន្យារពេលបញ្ចាំដោយជោគជ័យ!",
    });
  } catch (error: any) {
    console.error("POST /api/pawn/payments error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
