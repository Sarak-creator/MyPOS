import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InstallmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/installments/[id] - Get full details of a specific installment contract
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const contract = await prisma.installmentContract.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        product: true,
        schedules: {
          orderBy: { installmentNumber: "asc" },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ success: false, error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      contract,
    });
  } catch (error: any) {
    console.error("GET /api/installments/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/installments/[id] - Update contract status or notes/guarantor
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      status,
      notes,
      guarantorName,
      guarantorPhone,
      guarantorNationalId,
      guarantorAddress,
      customerNationalId,
    } = body;

    const updateData: any = {};
    if (status && Object.values(InstallmentStatus).includes(status as InstallmentStatus)) {
      updateData.status = status as InstallmentStatus;
    }
    if (notes !== undefined) updateData.notes = notes;
    if (guarantorName !== undefined) updateData.guarantorName = guarantorName;
    if (guarantorPhone !== undefined) updateData.guarantorPhone = guarantorPhone;
    if (guarantorNationalId !== undefined) updateData.guarantorNationalId = guarantorNationalId;
    if (guarantorAddress !== undefined) updateData.guarantorAddress = guarantorAddress;
    if (customerNationalId !== undefined) updateData.customerNationalId = customerNationalId;

    const updated = await prisma.installmentContract.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        branch: true,
        schedules: true,
      },
    });

    return NextResponse.json({
      success: true,
      contract: updated,
      message: "បានកែប្រែកិច្ចសន្យាដោយជោគជ័យ!",
    });
  } catch (error: any) {
    console.error("PATCH /api/installments/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/installments/[id] - Delete a contract and its schedules
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated installment schedules first to avoid FK constraint errors
      await tx.installmentSchedule.deleteMany({
        where: { contractId: id },
      });

      // 2. Delete the contract
      await tx.installmentContract.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "បានលុបកិច្ចសន្យាបង់រំលស់ដោយជោគជ័យ!",
    });
  } catch (error: any) {
    console.error("DELETE /api/installments/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
