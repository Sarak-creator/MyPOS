import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PawnStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/pawn/[id] - Detail of pawn ticket
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const ticket = await prisma.pawnTicket.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        paymentLogs: {
          orderBy: { paidDate: "desc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: "Pawn ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    console.error("GET /api/pawn/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/pawn/[id] - Update pawn ticket status or notes
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const { status, notes, storageLocation, itemCondition } = body;

    const updateData: any = {};
    if (status && Object.values(PawnStatus).includes(status as PawnStatus)) {
      updateData.status = status as PawnStatus;
    }
    if (notes !== undefined) updateData.notes = notes;
    if (storageLocation !== undefined) updateData.storageLocation = storageLocation;
    if (itemCondition !== undefined) updateData.itemCondition = itemCondition;

    const updated = await prisma.pawnTicket.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        branch: true,
        paymentLogs: true,
      },
    });

    return NextResponse.json({
      success: true,
      ticket: updated,
      message: "បានកែប្រែព័ត៌មានបញ្ចាំដោយជោគជ័យ!",
    });
  } catch (error: any) {
    console.error("PATCH /api/pawn/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/pawn/[id] - Delete pawn ticket
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.pawnTicket.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "បានលុបប័ណ្ណបញ្ចាំដោយជោគជ័យ!",
    });
  } catch (error: any) {
    console.error("DELETE /api/pawn/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
