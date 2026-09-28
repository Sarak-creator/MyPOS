import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/warranty/search?query=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";

    if (!query) {
      return NextResponse.json({ success: true, results: [] });
    }

    const now = new Date();

    // 1. Search in OrderItem joined with StockItem and Product and Order
    const orderItems = await prisma.orderItem.findMany({
      where: {
        OR: [
          { stockItem: { serialOrImei: { contains: query, mode: "insensitive" } } },
          { product: { nameKh: { contains: query, mode: "insensitive" } } },
          { product: { nameEn: { contains: query, mode: "insensitive" } } },
          { product: { sku: { contains: query, mode: "insensitive" } } },
          { order: { invoiceNumber: { contains: query, mode: "insensitive" } } },
          { order: { customer: { phone: { contains: query } } } },
          { order: { customer: { name: { contains: query, mode: "insensitive" } } } },
        ],
      },
      include: {
        product: true,
        stockItem: true,
        order: {
          include: {
            customer: true,
            branch: true,
          },
        },
      },
      take: 25,
      orderBy: { order: { createdAt: "desc" } },
    });

    const results = orderItems.map((item) => {
      const orderDate = new Date(item.order.createdAt);
      const warrantyDays = Number(item.warrantyDays || item.product?.warrantyDays || 365);
      const warrantyEndDate = new Date(orderDate);
      warrantyEndDate.setDate(warrantyEndDate.getDate() + warrantyDays);

      const isWarrantyActive = now <= warrantyEndDate;
      const diffMs = warrantyEndDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));

      return {
        id: item.id,
        invoiceNumber: item.order.invoiceNumber,
        purchaseDate: orderDate.toISOString().split("T")[0],
        customerName: item.order.customer?.name || "ភ្ញៀវទូទៅ (Walk-in)",
        customerPhone: item.order.customer?.phone || "N/A",
        customerId: item.order.customerId,
        branchName: item.order.branch?.name,
        productNameKh: item.product.nameKh,
        productNameEn: item.product.nameEn,
        sku: item.product.sku,
        serialOrImei: item.stockItem?.serialOrImei || "N/A",
        unitPriceUsd: Number(item.unitPriceUsd),
        quantity: item.quantity,
        warrantyDays,
        warrantyEndDate: warrantyEndDate.toISOString().split("T")[0],
        isWarrantyActive,
        remainingDays: isWarrantyActive ? diffDays : 0,
        expiredDays: !isWarrantyActive ? Math.abs(diffDays) : 0,
      };
    });

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("GET /api/warranty/search error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
