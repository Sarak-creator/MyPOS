import { NextResponse } from "next/server";
import { paidRegistry } from "@/lib/khqr-registry";

// POST /api/khqr/webhook - Receives incoming payment notifications from Telegram Bots or Bank Webhooks
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { md5, billNumber, amount, currency = "USD", transactionId } = body;

    const txId = transactionId || `TX-${Date.now()}`;
    const txData = {
      amount: Number(amount) || 0,
      currency: currency || "USD",
      timestamp: Date.now(),
      txId,
    };

    if (md5) {
      paidRegistry.set(md5, txData);
    }
    if (billNumber) {
      paidRegistry.set(billNumber, txData);
    }

    return NextResponse.json({
      success: true,
      message: "Payment registered successfully",
      registered: { md5, billNumber, txId },
    });
  } catch (error: any) {
    console.error("KHQR Webhook error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
