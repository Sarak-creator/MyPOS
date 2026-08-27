import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT or PATCH /api/products/[id] - Update product
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      sku,
      barcode,
      nameKh,
      nameEn,
      description,
      categoryId,
      costPriceUsd,
      salePriceUsd,
      salePriceKhr,
      minStockAlert,
      unit,
      type,
    } = body;

    const updateData: any = {};
    if (sku !== undefined) updateData.sku = sku;
    if (barcode !== undefined) updateData.barcode = barcode || null;
    if (nameKh !== undefined) updateData.nameKh = nameKh;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (description !== undefined) updateData.description = description;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (costPriceUsd !== undefined) updateData.costPriceUsd = Number(costPriceUsd);
    if (salePriceUsd !== undefined) {
      updateData.salePriceUsd = Number(salePriceUsd);
      updateData.salePriceKhr = salePriceKhr || Number(salePriceUsd) * 4100;
    }
    if (minStockAlert !== undefined) updateData.minStockAlert = Number(minStockAlert);
    if (unit !== undefined) updateData.unit = unit;
    if (type !== undefined) updateData.type = type;

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      product: updated,
      message: "Product updated successfully",
    });
  } catch (error: any) {
    console.error("PATCH /api/products/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete or deactivate product
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Delete associated stock items first or soft delete
    await prisma.stockItem.deleteMany({
      where: { productId: id },
    });

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
