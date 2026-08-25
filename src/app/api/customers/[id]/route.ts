import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";

// PATCH /api/customers/[id] - Update customer or record debt repayment
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      name,
      phone,
      email,
      address,
      tier,
      creditLimitUsd,
      // Debt repayment fields
      repaymentAmountUsd,
      repaymentMethod = "CASH_USD",
      repaymentNotes,
    } = body;

    const existing = await prisma.customer.findUnique({
      where: { id },
      include: { debts: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    // 1. Process Debt Repayment
    if (repaymentAmountUsd && Number(repaymentAmountUsd) > 0) {
      const amountPaid = Number(repaymentAmountUsd);

      // Find active debt schedule or create one
      const pendingDebt = existing.debts.find(
        (d) => d.status === "PENDING" || d.status === "PARTIALLY_PAID"
      );

      if (pendingDebt) {
        await prisma.debtPaymentLog.create({
          data: {
            debtScheduleId: pendingDebt.id,
            amountPaidUsd: amountPaid,
            paymentMethod: (repaymentMethod as PaymentMethod) || "CASH_USD",
            receivedBy: "Admin",
            notes: repaymentNotes || "Debt repayment",
          },
        });

        const newRemaining = Math.max(0, Number(pendingDebt.remainingUsd) - amountPaid);
        const newPaid = Number(pendingDebt.paidAmountUsd) + amountPaid;
        const newStatus = newRemaining === 0 ? "PAID" : "PARTIALLY_PAID";

        await prisma.debtPaymentSchedule.update({
          where: { id: pendingDebt.id },
          data: {
            remainingUsd: newRemaining,
            paidAmountUsd: newPaid,
            status: newStatus,
          },
        });
      }

      // Decrement customer's current debt
      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: {
          currentDebtUsd: {
            decrement: amountPaid,
          },
        },
      });

      return NextResponse.json({
        success: true,
        customer: updatedCustomer,
        message: "Debt repayment recorded successfully",
      });
    }

    // 2. Standard customer info update
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email || null;
    if (address !== undefined) updateData.address = address || null;
    if (tier !== undefined) updateData.tier = tier;
    if (creditLimitUsd !== undefined) updateData.creditLimitUsd = Number(creditLimitUsd);

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      customer: updated,
      message: "Customer updated successfully",
    });
  } catch (error: any) {
    console.error("PATCH /api/customers/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/customers/[id] - Delete customer
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/customers/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
