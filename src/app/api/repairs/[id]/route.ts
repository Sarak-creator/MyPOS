import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RepairStatus } from "@prisma/client";

// PATCH /api/repairs/[id] - Update status, diagnostic notes, technician, or parts
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      status,
      technicianId,
      diagnosticNotes,
      estimatedCostUsd,
      finalCostUsd,
      depositPaidUsd,
      warrantyDays,
      partsToAdd, // array of { productId, quantity, costPriceUsd, salePriceUsd }
      changedBy = "Admin",
      statusNote = "",
    } = body;

    const existing = await prisma.repairTicket.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Repair ticket not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (technicianId !== undefined) updateData.technicianId = technicianId || null;
    if (diagnosticNotes !== undefined) updateData.diagnosticNotes = diagnosticNotes;
    if (estimatedCostUsd !== undefined) updateData.estimatedCostUsd = Number(estimatedCostUsd);
    if (finalCostUsd !== undefined) updateData.finalCostUsd = Number(finalCostUsd);
    if (depositPaidUsd !== undefined) updateData.depositPaidUsd = Number(depositPaidUsd);
    if (warrantyDays !== undefined) updateData.warrantyDays = Number(warrantyDays);

    if (status && status !== existing.status) {
      updateData.status = status as RepairStatus;
      if (status === "READY_FOR_PICKUP") {
        updateData.completedAt = new Date();
      } else if (status === "DELIVERED") {
        updateData.deliveredAt = new Date();
      }

      // Add status log
      await prisma.repairStatusLog.create({
        data: {
          repairTicketId: id,
          fromStatus: existing.status,
          toStatus: status as RepairStatus,
          changedBy,
          notes: statusNote || `Status updated to ${status}`,
        },
      });
    }

    // 1. Add spare parts used and deduct stock
    if (Array.isArray(partsToAdd) && partsToAdd.length > 0) {
      for (const part of partsToAdd) {
        if (part.productId) {
          const qty = Math.max(1, Number(part.quantity) || 1);
          const costPrice = Number(part.costPriceUsd) || 0;
          const salePrice = Number(part.salePriceUsd) || 0;

          // Create repair part record
          const createdPart = await prisma.repairPartUsed.create({
            data: {
              repairTicketId: id,
              productId: part.productId,
              quantity: qty,
              costPriceUsd: costPrice,
              salePriceUsd: salePrice,
            },
          });

          // Deduct stock from StockItem in the ticket's branch
          const stock = await prisma.stockItem.findFirst({
            where: {
              productId: part.productId,
              branchId: existing.branchId,
              status: "IN_STOCK",
            },
          });

          if (stock) {
            const newQty = Math.max(0, stock.quantity - qty);
            await prisma.stockItem.update({
              where: { id: stock.id },
              data: {
                quantity: newQty,
                ...(newQty === 0 && stock.serialOrImei ? { status: "USED_IN_REPAIR", repairPartId: createdPart.id } : {}),
              },
            });
          }
        }
      }
    }

    // 2. Remove spare part and restore stock if requested
    if (body.partIdToRemove) {
      const partToDelete = await prisma.repairPartUsed.findUnique({
        where: { id: body.partIdToRemove },
      });

      if (partToDelete && partToDelete.repairTicketId === id) {
        // Restore stock
        const stock = await prisma.stockItem.findFirst({
          where: {
            productId: partToDelete.productId,
            branchId: existing.branchId,
          },
        });

        if (stock) {
          await prisma.stockItem.update({
            where: { id: stock.id },
            data: {
              quantity: stock.quantity + partToDelete.quantity,
              status: "IN_STOCK",
            },
          });
        }

        // Delete the part used record
        await prisma.repairPartUsed.delete({
          where: { id: body.partIdToRemove },
        });
      }
    }

    const updated = await prisma.repairTicket.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        technician: true,
        partsUsed: { include: { product: true } },
      },
    });

    return NextResponse.json({
      success: true,
      repair: updated,
      message: "Repair ticket updated successfully",
    });
  } catch (error: any) {
    console.error("PATCH /api/repairs/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/repairs/[id] - Delete repair ticket
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.repairTicket.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Repair ticket deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/repairs/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
