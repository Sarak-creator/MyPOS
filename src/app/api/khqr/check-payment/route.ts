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
    let md5 = (providedMd5 || "").trim();
    if (!md5 && qrString) {
      md5 = crypto.createHash("md5").update(qrString.trim()).digest("hex");
    }

    const cleanBill = (billNumber || "").trim();

    // 2. Check if this MD5 or Bill Number was marked as PAID via Webhook, Push, or Simulator
    const md5Keys = [md5, md5.toLowerCase(), md5.toUpperCase()].filter(Boolean);
    for (const key of md5Keys) {
      if (paidRegistry.has(key)) {
        const tx = paidRegistry.get(key)!;
        return NextResponse.json({
          success: true,
          paid: true,
          transactionId: tx.txId,
          amount: tx.amount || amount,
          currency: tx.currency || currency,
          description: "Payment confirmed via Webhook / Push notification",
          md5,
          billNumber: cleanBill,
        });
      }
    }

    if (cleanBill) {
      const billKeys = [cleanBill, cleanBill.includes("-") ? cleanBill.split("-").pop()! : ""].filter(Boolean);
      for (const bKey of billKeys) {
        if (paidRegistry.has(bKey)) {
          const tx = paidRegistry.get(bKey)!;
          return NextResponse.json({
            success: true,
            paid: true,
            transactionId: tx.txId,
            amount: tx.amount || amount,
            currency: tx.currency || currency,
            description: "Payment confirmed via Webhook / Push notification",
            md5,
            billNumber: cleanBill,
          });
        }
      }
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
          body: JSON.stringify({ md5: md5.toLowerCase() }),
        });

        const data = await response.json().catch(() => null);
        if (data && (data.responseCode === 0 || data.responseCode === "0") && data.data) {
          const txRecord = {
            amount: data.data.amount || amount,
            currency: data.data.currency || currency,
            timestamp: Date.now(),
            txId: data.data.hash || data.data.externalTransactionId || `TX-${Date.now()}`,
          };

          paidRegistry.set(md5, txRecord);
          paidRegistry.set(md5.toLowerCase(), txRecord);
          paidRegistry.set(md5.toUpperCase(), txRecord);
          if (cleanBill) {
            paidRegistry.set(cleanBill, txRecord);
          }

          return NextResponse.json({
            success: true,
            paid: true,
            transactionId: txRecord.txId,
            fromAccountId: data.data.fromAccountId,
            amount: data.data.amount,
            currency: data.data.currency,
            description: "Payment confirmed via Bakong Open API",
            md5,
            billNumber: cleanBill,
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
      billNumber: cleanBill,
      message: "Waiting for payment scan",
    });
  } catch (error: any) {
    console.error("KHQR check-payment error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
