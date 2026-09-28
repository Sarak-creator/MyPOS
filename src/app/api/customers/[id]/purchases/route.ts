import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/customers/[id]/purchases - Full Purchase History & Warranty Details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            cashier: { select: { fullName: true, fullNameKh: true, username: true } },
            branch: { select: { name: true, code: true } },
            payments: true,
            items: {
              include: {
                product: true,
                stockItem: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const now = new Date();

    // Flatten all purchased items across all orders with warranty details
    const purchasedItems: any[] = [];

    const formattedOrders = customer.orders.map((order) => {
      const orderDate = new Date(order.createdAt);

      const itemsWithWarranty = order.items.map((item) => {
        // Warranty duration in days: item override > product warrantyDays > category default (365 for tech)
        const warrantyDays = Number(item.warrantyDays || item.product?.warrantyDays || 365);
        const warrantyStartDate = new Date(orderDate);
        const warrantyEndDate = new Date(orderDate);
        warrantyEndDate.setDate(warrantyEndDate.getDate() + warrantyDays);

        const isWarrantyActive = now <= warrantyEndDate;
        const diffMs = warrantyEndDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));

        const itemObj = {
          orderItemId: item.id,
          orderId: order.id,
          invoiceNumber: order.invoiceNumber,
          purchaseDate: orderDate.toISOString().split("T")[0],
          productId: item.productId,
          productNameKh: item.product?.nameKh,
          productNameEn: item.product?.nameEn,
          productSku: item.product?.sku,
          serialOrImei: item.stockItem?.serialOrImei || null,
          quantity: item.quantity,
          unitPriceUsd: Number(item.unitPriceUsd),
          totalPriceUsd: Number(item.totalPriceUsd),
          warrantyDays,
          warrantyStartDate: warrantyStartDate.toISOString().split("T")[0],
          warrantyEndDate: warrantyEndDate.toISOString().split("T")[0],
          isWarrantyActive,
          remainingDays: isWarrantyActive ? diffDays : 0,
          expiredDays: !isWarrantyActive ? Math.abs(diffDays) : 0,
        };

        purchasedItems.push(itemObj);
        return itemObj;
      });

      return {
        id: order.id,
        invoiceNumber: order.invoiceNumber,
        createdAt: order.createdAt.toISOString(),
        purchaseDate: orderDate.toISOString().split("T")[0],
        totalUsd: Number(order.totalUsd),
        totalKhr: Number(order.totalKhr),
        status: order.status,
        cashierName: order.cashier?.fullNameKh || order.cashier?.fullName || "Cashier",
        branchName: order.branch?.name,
        paymentMethods: order.payments.map((p) => p.method),
        items: itemsWithWarranty,
      };
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        tier: customer.tier,
        loyaltyPoints: customer.loyaltyPoints,
        currentDebtUsd: Number(customer.currentDebtUsd),
      },
      orders: formattedOrders,
      purchasedItems,
      summary: {
        totalOrders: formattedOrders.length,
        totalItemsPurchased: purchasedItems.reduce((acc, it) => acc + it.quantity, 0),
        activeWarrantyCount: purchasedItems.filter((it) => it.isWarrantyActive).length,
        expiredWarrantyCount: purchasedItems.filter((it) => !it.isWarrantyActive).length,
      },
    });
  } catch (error: any) {
    console.error("GET /api/customers/[id]/purchases error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
