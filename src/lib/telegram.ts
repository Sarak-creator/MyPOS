/**
 * Telegram Bot Notification Engine for អាណាចក្រPOS (Anachak POS)
 * Handles instant notifications for sales, low stock, repair tickets, and daily reports.
 */

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  notifyOnSale?: boolean;
  notifyOnLowStock?: boolean;
  notifyOnRepair?: boolean;
  notifyDailyReport?: boolean;
}

export interface SaleNotificationPayload {
  invoiceNumber: string;
  branchName?: string;
  cashierName?: string;
  customerName?: string;
  totalUsd: number;
  totalKhr: number;
  paymentMethod: string;
  items: Array<{
    name?: string;
    quantity: number;
    priceUsd: number;
  }>;
  date?: string;
}

export interface RepairNotificationPayload {
  ticketCode: string;
  customerName: string;
  customerPhone?: string;
  deviceModel: string;
  issueDescription: string;
  technicianName?: string;
  status: string;
  estimatedCostUsd?: number;
}

export interface LowStockNotificationPayload {
  productName: string;
  productCode: string;
  currentStock: number;
  lowStockThreshold: number;
  branchName?: string;
}

function escapeHtml(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseTelegramError(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes("unauthorized")) {
    return "Bot Token មិនត្រឹមត្រូវ (Invalid Bot Token - 401 Unauthorized)។ សូមពិនិត្យ Bot Token ពី @BotFather។";
  }
  if (desc.includes("chat not found")) {
    return "រកមិនឃើញ Chat ID នេះទេ (Chat not found)។ សូមបើក Bot ក្នុង Telegram រួចចុច /start ជាមុនសិន ឬពិនិត្យមើល Chat ID ឡើងវិញ។";
  }
  if (desc.includes("bot was blocked by the user")) {
    return "Bot ត្រូវបាន Block (Bot was blocked by user)។ សូម Unblock និងចុច /start Bot ក្នុង Telegram។";
  }
  if (desc.includes("chat_id is empty") || desc.includes("wrong type of chat_id")) {
    return "Chat ID មិនត្រឹមត្រូវ (Invalid/Empty Chat ID)។ សូមបញ្ចូលលេខ Chat ID (ឧទាហរណ៍: 123456789 ឬ -100123456789)។";
  }
  if (desc.includes("can't parse entities")) {
    return `កំហុសទម្រង់សារ (Entity parse error): ${description}`;
  }
  return description || "Telegram API Error";
}

import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "scratch", "telegram_config.json");

export function cleanCredential(val?: string | null): string {
  if (!val) return "";
  const trimmed = String(val).trim();
  if (
    trimmed === "your_telegram_bot_token_here" ||
    trimmed === "your_telegram_group_chat_id" ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === ""
  ) {
    return "";
  }
  return trimmed;
}

export function getServerTelegramConfig(): TelegramConfig {
  try {
    if (typeof process !== "undefined" && typeof window === "undefined") {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          botToken: cleanCredential(parsed.botToken) || cleanCredential(process.env.TELEGRAM_BOT_TOKEN),
          chatId: cleanCredential(parsed.chatId) || cleanCredential(process.env.TELEGRAM_CHAT_ID),
          notifyOnSale: parsed.notifyOnSale ?? true,
          notifyOnLowStock: parsed.notifyOnLowStock ?? true,
          notifyOnRepair: parsed.notifyOnRepair ?? true,
          notifyDailyReport: parsed.notifyDailyReport ?? true,
        };
      }
    }
  } catch (err) {
    console.warn("Failed reading telegram_config.json:", err);
  }

  return {
    botToken: cleanCredential(process.env.TELEGRAM_BOT_TOKEN),
    chatId: cleanCredential(process.env.TELEGRAM_CHAT_ID),
    notifyOnSale: true,
    notifyOnLowStock: true,
    notifyOnRepair: true,
    notifyDailyReport: true,
  };
}

export function saveServerTelegramConfig(config: Partial<TelegramConfig>): boolean {
  try {
    if (typeof process !== "undefined" && typeof window === "undefined") {
      const dir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const existing = getServerTelegramConfig();
      const merged = { ...existing, ...config };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
      
      if (merged.botToken) process.env.TELEGRAM_BOT_TOKEN = merged.botToken;
      if (merged.chatId) process.env.TELEGRAM_CHAT_ID = merged.chatId;

      // Also attempt to update .env
      try {
        const envPath = path.join(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, "utf-8");
          if (envContent.includes("TELEGRAM_BOT_TOKEN=")) {
            envContent = envContent.replace(/TELEGRAM_BOT_TOKEN=.*(\r?\n|$)/g, `TELEGRAM_BOT_TOKEN="${merged.botToken}"$1`);
          } else {
            envContent += `\nTELEGRAM_BOT_TOKEN="${merged.botToken}"`;
          }
          if (envContent.includes("TELEGRAM_CHAT_ID=")) {
            envContent = envContent.replace(/TELEGRAM_CHAT_ID=.*(\r?\n|$)/g, `TELEGRAM_CHAT_ID="${merged.chatId}"$1`);
          } else {
            envContent += `\nTELEGRAM_CHAT_ID="${merged.chatId}"`;
          }
          fs.writeFileSync(envPath, envContent, "utf-8");
        }
      } catch (envErr) {
        console.warn("Could not update .env file:", envErr);
      }

      return true;
    }
  } catch (err) {
    console.error("Failed writing telegram_config.json:", err);
  }
  return false;
}

/**
 * Send raw message to Telegram via Bot API
 */
export async function sendTelegramMessage(
  text: string,
  config?: Partial<TelegramConfig>,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<{ success: boolean; data?: any; error?: string }> {
  const serverConfig = typeof window === "undefined" ? getServerTelegramConfig() : { botToken: "", chatId: "" };
  const token =
    cleanCredential(config?.botToken) ||
    cleanCredential(serverConfig.botToken) ||
    cleanCredential(process.env.TELEGRAM_BOT_TOKEN);
  const chatId =
    cleanCredential(config?.chatId) ||
    cleanCredential(serverConfig.chatId) ||
    cleanCredential(process.env.TELEGRAM_CHAT_ID);

  if (!token || !chatId) {
    return {
      success: false,
      error: "Telegram Bot Token ឬ Chat ID មិនទាន់ត្រូវបានកំណត់ត្រឹមត្រូវ (Missing or invalid Telegram credentials)។ សូមចូលទៅ Settings -> Telegram Bot ដើម្បីកំណត់។",
    };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true, data: data.result };
    } else {
      const friendlyError = parseTelegramError(data.description || "");
      console.warn("Telegram API Error Response:", data);
      return { success: false, error: friendlyError };
    }
  } catch (err: any) {
    console.error("Telegram fetch exception:", err);
    return { success: false, error: err.message || "Failed to reach Telegram servers" };
  }
}

function formatSafeDate(): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());
  } catch {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  }
}

/**
 * Format & Send New Sale Notification
 */
export async function notifyNewSale(
  payload: SaleNotificationPayload,
  config?: Partial<TelegramConfig>
) {
  const dateStr = payload.date || formatSafeDate();
  const totalUsd = Number(payload.totalUsd || 0);
  const totalKhr = Number(payload.totalKhr || 0);
  
  const itemsText = payload.items && payload.items.length > 0
    ? payload.items
        .slice(0, 8)
        .map((i) => `  • ${escapeHtml(i.name || "ទំនិញ")} (x${i.quantity || 1}) - $${((Number(i.priceUsd) || 0) * (Number(i.quantity) || 1)).toFixed(2)}`)
        .join("\n") + (payload.items.length > 8 ? `\n  • ...និង ${payload.items.length - 8} មុខទៀត` : "")
    : "  • មិនមានបញ្ជីទំនិញ";

  const message = `
🛒 <b>ការលក់ថ្មី (NEW SALE COMPLETED)</b>
━━━━━━━━━━━━━━━━━━━
🧾 <b>វិក្កយបត្រ:</b> <code>#${escapeHtml(payload.invoiceNumber || "N/A")}</code>
🏢 <b>សាខា:</b> ${escapeHtml(payload.branchName || "សាខាកណ្តាល")}
👤 <b>បេឡាករ:</b> ${escapeHtml(payload.cashierName || "បុគ្គលិក POS")}
👥 <b>អតិថិជន:</b> ${escapeHtml(payload.customerName || "ទូទៅ (General)")}

📦 <b>មុខទំនិញ:</b>
${itemsText}

💵 <b>សរុបទឹកប្រាក់:</b> <b>$${totalUsd.toFixed(2)}</b> (~ ${totalKhr.toLocaleString()} ៛)
💳 <b>វិធីសាស្ត្រទូទាត់:</b> <code>${escapeHtml(payload.paymentMethod || "CASH")}</code>
🕒 <b>កាលបរិច្ឆេទ:</b> ${escapeHtml(dateStr)}
━━━━━━━━━━━━━━━━━━━
<i>អាណាចក្រPOS • Real-time Notification</i>
`.trim();

  return sendTelegramMessage(message, config, "HTML");
}

/**
 * Format & Send Low Stock Alert
 */
export async function notifyLowStock(
  payload: LowStockNotificationPayload,
  config?: Partial<TelegramConfig>
) {
  const message = `
⚠️ <b>ការជូនដំណឹង: ទំនិញជិតអស់ពីស្តុក (LOW STOCK ALERT)</b>
━━━━━━━━━━━━━━━━━━━
📦 <b>ឈ្មោះទំនិញ:</b> <b>${escapeHtml(payload.productName)}</b>
🏷️ <b>កូដទំនិញ (SKU):</b> <code>${escapeHtml(payload.productCode)}</code>
🏢 <b>សាខា:</b> ${escapeHtml(payload.branchName || "សាខាកណ្តាល ភ្នំពេញ")}
🚨 <b>ស្តុកនៅសល់បច្ចុប្បន្ន:</b> <b>${payload.currentStock} ដើម/ឯកតា</b>
📊 <b>កម្រិតជូនដំណឹង:</b> &lt; ${payload.lowStockThreshold}

💡 <i>សូមរៀបចំកម្ម៉ង់ទិញ ឬផ្ទេរស្តុកបន្ថែម!</i>
━━━━━━━━━━━━━━━━━━━
<i>អាណាចក្រPOS • Real-time Inventory Alert</i>
`.trim();

  return sendTelegramMessage(message, config, "HTML");
}

/**
 * Format & Send Repair Ticket Status Update
 */
export async function notifyRepairTicket(
  payload: RepairNotificationPayload,
  config?: Partial<TelegramConfig>
) {
  const phoneText = payload.customerPhone ? `(${escapeHtml(payload.customerPhone)})` : "";
  const message = `
🔧 <b>បច្ចុប្បន្នភាពការជួសជុល (REPAIR TICKET UPDATE)</b>
━━━━━━━━━━━━━━━━━━━
🎫 <b>ប័ណ្ណជួសជុល:</b> <code>#${escapeHtml(payload.ticketCode)}</code>
👤 <b>អតិថិជន:</b> ${escapeHtml(payload.customerName)} ${phoneText}
📱 <b>ឧបករណ៍/ម៉ូឌែល:</b> <b>${escapeHtml(payload.deviceModel)}</b>
⚠️ <b>រោគសញ្ញា/បញ្ហា:</b> ${escapeHtml(payload.issueDescription)}
🛠️ <b>ជាងជួសជុល:</b> ${escapeHtml(payload.technicianName || "ជាងជំនាញ")}
📌 <b>ស្ថានភាពថ្មី:</b> <b>${escapeHtml(payload.status)}</b>
${payload.estimatedCostUsd ? `💰 <b>តម្លៃសេវាជួសជុល:</b> $${payload.estimatedCostUsd.toFixed(2)}` : ""}
━━━━━━━━━━━━━━━━━━━
<i>អាណាចក្រPOS • Smart Repair Management</i>
`.trim();

  return sendTelegramMessage(message, config, "HTML");
}

/**
 * Format & Send Inter-Branch Stock Transfer Notification
 */
export interface StockTransferNotificationPayload {
  transferNumber: string;
  fromBranchName: string;
  toBranchName: string;
  status: string;
  itemCount: number;
  totalQuantity: number;
  itemsSummary: string;
  notes?: string;
  approvedBy?: string;
}

export async function notifyStockTransfer(
  payload: StockTransferNotificationPayload,
  config?: Partial<TelegramConfig>
) {
  const statusEmojiMap: Record<string, string> = {
    PENDING: "⏳ រង់ចាំអនុម័ត (PENDING)",
    APPROVED: "✅ បានអនុម័ត (APPROVED)",
    IN_TRANSIT: "🚚 កំពុងដឹកជញ្ជូន (IN TRANSIT)",
    COMPLETED: "🎉 បានទទួលចូលស្តុក (COMPLETED)",
    CANCELLED: "❌ បានបោះបង់ (CANCELLED)",
  };

  const statusDisplay = statusEmojiMap[payload.status] || payload.status;

  const message = `
🚚 <b>ការផ្ទេរស្តុកអន្តរសាខា (STOCK TRANSFER)</b>
━━━━━━━━━━━━━━━━━━━
📋 <b>លេខប័ណ្ណផ្ទេរ:</b> <code>#${escapeHtml(payload.transferNumber)}</code>
🏢 <b>សាខាដើម:</b> ${escapeHtml(payload.fromBranchName)}
📍 <b>សាខាគោលដៅ:</b> <b>${escapeHtml(payload.toBranchName)}</b>
🏷️ <b>ស្ថានភាព:</b> <b>${escapeHtml(statusDisplay)}</b>
📦 <b>ចំនួនមុខទំនិញ:</b> ${payload.itemCount} មុខ (សរុប ${payload.totalQuantity} ឯកតា)
📝 <b>ទំនិញផ្ទេរ:</b>
${escapeHtml(payload.itemsSummary)}
${payload.notes ? `💬 <b>កំណត់សម្គាល់:</b> <i>${escapeHtml(payload.notes)}</i>\n` : ""}${payload.approvedBy ? `👤 <b>អ្នករៀបចំ/អនុម័ត:</b> ${escapeHtml(payload.approvedBy)}\n` : ""}━━━━━━━━━━━━━━━━━━━
<i>អាណាចក្រPOS • Multi-Branch Inventory Transfer</i>
`.trim();

  return sendTelegramMessage(message, config, "HTML");
}

/**
 * Test Connection & Verify Bot Token / Chat ID
 */
export async function testTelegramConnection(botToken: string, chatId: string) {
  const testMsg = `
✅ <b>ការតភ្ជាប់ Telegram Bot ជោគជ័យ! (CONNECTION TEST)</b>
━━━━━━━━━━━━━━━━━━━
🤖 <b>ប្រព័ន្ធ:</b> អាណាចក្រPOS (Anachak POS & ERP)
💬 <b>Chat ID:</b> <code>${chatId}</code>
🕒 <b>ម៉ោងតេស្ត:</b> ${formatSafeDate()}

🎉 <i>ប្រព័ន្ធរបស់អ្នកឥឡូវនេះអាចទទួលដំណឹងការលក់ ស្តុក និងសេវាជួសជុលបានភ្លាមៗ!</i>
━━━━━━━━━━━━━━━━━━━
`.trim();

  return sendTelegramMessage(testMsg, { botToken, chatId }, "HTML");
}

