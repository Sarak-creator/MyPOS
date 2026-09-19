import { NextResponse } from "next/server";
import { paidRegistry } from "@/lib/khqr-registry";

// POST /api/khqr/webhook - Receives incoming payment notifications from Telegram Bots, Bank Webhooks or Simulators
export async function POST(request: Request) {
  try {
    let body: any = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json().catch(() => ({}));
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData().catch(() => null);
      if (formData) {
        formData.forEach((value, key) => {
          body[key] = value.toString();
        });
      }
    } else {
      body = await request.json().catch(() => ({}));
    }

    const md5 = body.md5 || body.hash || body.md5_hash;
    const billNumber =
      body.billNumber ||
      body.bill_number ||
      body.invoiceNumber ||
      body.invoice_no ||
      body.tran_id ||
      body.tranId ||
      body.orderNumber;
    const amount = Number(body.amount || body.total_amount || 0);
    const currency = body.currency || "USD";
    const txId =
      body.transactionId ||
      body.txId ||
      body.hash ||
      body.reference ||
      body.apv ||
      `ABA-${Date.now().toString().slice(-6)}`;

    const txData = {
      amount,
      currency,
      timestamp: Date.now(),
      txId: String(txId),
    };

    if (md5) {
      const cleanMd5 = String(md5).trim();
      paidRegistry.set(cleanMd5, txData);
      paidRegistry.set(cleanMd5.toLowerCase(), txData);
      paidRegistry.set(cleanMd5.toUpperCase(), txData);
    }

    if (billNumber) {
      const cleanBill = String(billNumber).trim();
      paidRegistry.set(cleanBill, txData);
      // Also register without prefix if applicable
      if (cleanBill.includes("-")) {
        const parts = cleanBill.split("-");
        paidRegistry.set(parts[parts.length - 1], txData);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment registered successfully",
      registered: { md5, billNumber, txId, amount, currency },
    });
  } catch (error: any) {
    console.error("KHQR Webhook error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET /api/khqr/webhook - Quick URL trigger for testing / simulator
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const md5 = searchParams.get("md5") || searchParams.get("hash");
    const billNumber = searchParams.get("billNumber") || searchParams.get("invoiceNumber") || searchParams.get("tranId");
    const amount = Number(searchParams.get("amount") || 0);
    const currency = searchParams.get("currency") || "USD";
    const txId = searchParams.get("txId") || `TEST-ABA-${Date.now().toString().slice(-6)}`;

    if (!md5 && !billNumber) {
      return NextResponse.json(
        { success: false, error: "Please provide 'md5' or 'billNumber' in query params" },
        { status: 400 }
      );
    }

    const txData = {
      amount,
      currency,
      timestamp: Date.now(),
      txId,
    };

    if (md5) {
      const cleanMd5 = md5.trim();
      paidRegistry.set(cleanMd5, txData);
      paidRegistry.set(cleanMd5.toLowerCase(), txData);
      paidRegistry.set(cleanMd5.toUpperCase(), txData);
    }

    if (billNumber) {
      paidRegistry.set(billNumber.trim(), txData);
    }

    return NextResponse.json({
      success: true,
      message: "Payment simulated successfully",
      registered: { md5, billNumber, txId, amount, currency },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
