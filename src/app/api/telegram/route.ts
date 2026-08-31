import { NextResponse } from "next/server";
import {
  sendTelegramMessage,
  notifyNewSale,
  notifyLowStock,
  notifyRepairTicket,
  testTelegramConnection,
  getServerTelegramConfig,
  saveServerTelegramConfig,
  cleanCredential,
  TelegramConfig,
} from "@/lib/telegram";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/telegram - Check current Telegram Bot configuration status and retrieve saved config
export async function GET(request: Request) {
  try {
    const serverConfig = getServerTelegramConfig();
    const rawToken = cleanCredential(serverConfig.botToken) || cleanCredential(process.env.TELEGRAM_BOT_TOKEN);
    const rawChatId = cleanCredential(serverConfig.chatId) || cleanCredential(process.env.TELEGRAM_CHAT_ID);
    const hasToken = Boolean(rawToken);
    const hasChatId = Boolean(rawChatId);

    return NextResponse.json({
      success: true,
      configured: hasToken && hasChatId,
      botToken: rawToken || "",
      chatId: rawChatId || "",
      botTokenMasked: hasToken
        ? `${rawToken.slice(0, 6)}...${rawToken.slice(-4)}`
        : null,
      notifyOnSale: serverConfig.notifyOnSale ?? true,
      notifyOnLowStock: serverConfig.notifyOnLowStock ?? true,
      notifyOnRepair: serverConfig.notifyOnRepair ?? true,
      notifyDailyReport: serverConfig.notifyDailyReport ?? true,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/telegram - Handle test ping, saving config, or sending automated notifications
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = "TEST", config, payload } = body;

    // 0. SAVE CONFIGURATION
    if (action === "SAVE_CONFIG") {
      const token = cleanCredential(config?.botToken);
      const chat = cleanCredential(config?.chatId);
      if (!token || !chat) {
        return NextResponse.json(
          {
            success: false,
            error: "សូមបញ្ចូល Telegram Bot Token និង Chat ID ឱ្យបានត្រឹមត្រូវជាមុនសិន។",
          },
          { status: 400 }
        );
      }

      const saved = saveServerTelegramConfig({
        botToken: token,
        chatId: chat,
        notifyOnSale: config?.notifyOnSale ?? true,
        notifyOnLowStock: config?.notifyOnLowStock ?? true,
        notifyOnRepair: config?.notifyOnRepair ?? true,
        notifyDailyReport: config?.notifyDailyReport ?? true,
      });

      if (!saved) {
        return NextResponse.json({ success: false, error: "បរាជ័យក្នុងការកត់ត្រាការកំណត់លើ Server" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "ការកំណត់ Telegram Bot ត្រូវបានរក្សាទុកដោយជោគជ័យ!",
        botToken: token,
        chatId: chat,
        isVercel: Boolean(process.env.VERCEL),
      });
    }

    const serverConfig = getServerTelegramConfig();
    const botToken =
      cleanCredential(config?.botToken) ||
      cleanCredential(serverConfig.botToken) ||
      cleanCredential(process.env.TELEGRAM_BOT_TOKEN);
    const chatId =
      cleanCredential(config?.chatId) ||
      cleanCredential(serverConfig.chatId) ||
      cleanCredential(process.env.TELEGRAM_CHAT_ID);

    if (!botToken || !chatId) {
      return NextResponse.json(
        {
          success: false,
          error: "Telegram Bot Token ឬ Chat ID មិនទាន់ត្រូវបានកំណត់ត្រឹមត្រូវ (Missing or invalid Telegram credentials)។ សូមចូលទៅកាន់ Settings -> Telegram Bot ដើម្បីបញ្ចូល Token និង Chat ID។",
        },
        { status: 400 }
      );
    }

    // 1. TEST CONNECTION
    if (action === "TEST") {

      const res = await testTelegramConnection(botToken, chatId);
      if (res.success) {
        return NextResponse.json({
          success: true,
          message: "សារតេស្តត្រូវបានផ្ញើទៅកាន់ Telegram របស់អ្នកដោយជោគជ័យ!",
          data: res.data,
        });
      } else {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
    }

    // 2. NOTIFY NEW SALE
    if (action === "NOTIFY_SALE") {
      if (!payload || !payload.invoiceNumber) {
        return NextResponse.json({ success: false, error: "Missing sale payload" }, { status: 400 });
      }
      const res = await notifyNewSale(payload, { botToken, chatId });
      return NextResponse.json({ success: res.success, error: res.error });
    }

    // 3. NOTIFY LOW STOCK
    if (action === "NOTIFY_LOW_STOCK") {
      if (!payload || !payload.productName) {
        return NextResponse.json({ success: false, error: "Missing stock payload" }, { status: 400 });
      }
      const res = await notifyLowStock(payload, { botToken, chatId });
      return NextResponse.json({ success: res.success, error: res.error });
    }

    // 4. NOTIFY REPAIR TICKET
    if (action === "NOTIFY_REPAIR") {
      if (!payload || !payload.ticketCode) {
        return NextResponse.json({ success: false, error: "Missing repair payload" }, { status: 400 });
      }
      const res = await notifyRepairTicket(payload, { botToken, chatId });
      return NextResponse.json({ success: res.success, error: res.error });
    }

    // 5. SEND CUSTOM MESSAGE
    if (action === "SEND_MESSAGE") {
      if (!body.text) {
        return NextResponse.json({ success: false, error: "Missing message text" }, { status: 400 });
      }
      const res = await sendTelegramMessage(body.text, { botToken, chatId }, body.parseMode || "HTML");
      return NextResponse.json({ success: res.success, error: res.error });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/telegram error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
