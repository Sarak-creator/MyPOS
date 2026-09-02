import { NextResponse } from "next/server";
import crypto from "crypto";
import { paidRegistry } from "@/lib/khqr-registry";
import { ConfigManager } from "@/lib/config-manager";

// POST /api/khqr/check-payment - Check KHQR Payment Status via Bakong Open API or Webhook
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { qrString, md5: providedMd5, billNumber, amount, currency = "USD", bakongToken: providedToken } = body;

    // 1. Calculate MD5 of QR String
    let md5 = providedMd5;
    if (!md5 && qrString) {
      md5 = crypto.createHash("md5").update(qrString).digest("hex");
    }

    // 2. Check if this MD5 or Bill Number was marked as PAID via Webhook or Simulator
    if (md5 && paidRegistry.has(md5)) {
      const tx = paidRegistry.get(md5)!;
      return NextResponse.json({
        success: true,
        paid: true,
        transactionId: tx.txId,
        amount: tx.amount,
        currency: tx.currency,
        description: "Payment confirmed via Webhook / Push notification",
      });
    }

    if (billNumber && paidRegistry.has(billNumber)) {
      const tx = paidRegistry.get(billNumber)!;
      return NextResponse.json({
        success: true,
        paid: true,
        transactionId: tx.txId,
        amount: tx.amount,
        currency: tx.currency,
        description: "Payment confirmed via Webhook / Push notification",
      });
    }

    // 3. If real Bakong Open API token is available, check with NBC Open API directly
    const khqrConfig = await ConfigManager.getKhqrConfig();
    const bakongToken =
      (providedToken && providedToken.trim()) ||
      khqrConfig.bakongToken ||
      process.env.BAKONG_OPEN_API_TOKEN ||
      process.env.BAKONG_API_TOKEN;
    const bakongApiUrl =
      khqrConfig.bakongApiUrl ||
      process.env.BAKONG_API_URL ||
      "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5";

    if (bakongToken && md5) {
      try {
        const response = await fetch(bakongApiUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${bakongToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ md5 }),
        });

        const data = await response.json();
        if (data.responseCode === 0 && data.data) {
          paidRegistry.set(md5, {
            amount: data.data.amount || amount,
            currency: data.data.currency || currency,
            timestamp: Date.now(),
            txId: data.data.hash || `TX-${Date.now()}`,
          });

          return NextResponse.json({
            success: true,
            paid: true,
            transactionId: data.data.hash || data.data.externalTransactionId,
            fromAccountId: data.data.fromAccountId,
            amount: data.data.amount,
            currency: data.data.currency,
            description: "Payment confirmed via Bakong Open API",
          });
        }
      } catch (err: any) {
        console.warn("Bakong Open API check failed:", err.message);
      }
    }

    // 4. Return pending status
    return NextResponse.json({
      success: true,
      paid: false,
      md5,
      billNumber,
      message: "Waiting for payment scan",
    });
  } catch (error: any) {
    console.error("KHQR check-payment error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
