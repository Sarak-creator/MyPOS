/**
 * Official Bakong KHQR (EMVCo QR Code standard for Cambodia) Generator, Decoder & Validator
 * Standardized according to National Bank of Cambodia (NBC) Bakong Specifications
 * Supports both Individual (Tag 29) & Merchant (Tag 30 ACLEDA / ABA PayWay / Wing)
 */
import { BakongKHQR, IndividualInfo, MerchantInfo, khqrData } from "bakong-khqr";

export interface KHQROptions {
  bakongAccount: string;          // e.g. "store@aclb" or "012888999@aba"
  merchantName: string;            // e.g. "My Store Name"
  merchantCity?: string;           // e.g. "Phnom Penh"
  amount?: number;                 // e.g. 25.50 (for dynamic QR)
  currency?: "USD" | "KHR";        // USD or KHR
  billNumber?: string;             // e.g. "INV-9821"
  storeLabel?: string;             // e.g. "Main Branch"
  terminalLabel?: string;          // e.g. "0000504397"
  merchantID?: string;             // e.g. "85514965629"
  accountInformation?: string;     // e.g. "85514965629"
  acquiringBank?: string;          // e.g. "ACLEDA"
  mobileNumber?: string;           // e.g. "012888999"
  merchantCategoryCode?: string;   // e.g. "5999" or "1520"
  customKhqrRawString?: string;
}

export const CAMBODIA_BANKS = [
  { id: "aclb", name: "ACLEDA Bank", domain: "@aclb" },
  { id: "aba", name: "ABA Bank", domain: "@aba" },
  { id: "wing", name: "Wing Bank", domain: "@wing" },
  { id: "cnba", name: "Canadia Bank", domain: "@cnba" },
  { id: "spnb", name: "Sathapana Bank", domain: "@spnb" },
  { id: "prcb", name: "Prince Bank", domain: "@prcb" },
  { id: "jtrb", name: "J Trust Royal Bank", domain: "@jtrb" },
  { id: "vaba", name: "Vattanac Bank", domain: "@vaba" },
  { id: "bakong", name: "Bakong App", domain: "@bakong" },
];

/**
 * Ensures Bakong Account ID has a valid bank domain suffix
 */
export function formatBakongAccountId(account: string, defaultBankDomain: string = ""): string {
  const cleaned = (account || "").trim();
  if (!cleaned) return "";
  if (cleaned.includes("@")) return cleaned;
  if (defaultBankDomain) {
    return `${cleaned}${defaultBankDomain.startsWith("@") ? defaultBankDomain : `@${defaultBankDomain}`}`;
  }
  return cleaned;
}

/**
 * Decodes any raw NBC KHQR String into structured parameters
 */
export function decodeKHQR(qrString: string) {
  try {
    const res = BakongKHQR.decode(qrString.trim());
    if (res && res.status.code === 0 && res.data) {
      return {
        success: true,
        data: res.data,
      };
    }
    return { success: false, error: res?.status?.message || "Invalid KHQR string" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates an official EMVCo compliant Bakong KHQR String (Individual Tag 29 or Merchant Tag 30)
 */
export function generateBakongKHQR(options: KHQROptions): string {
  const {
    bakongAccount = "",
    merchantName = "",
    merchantCity = "Phnom Penh",
    amount,
    currency = "USD",
    billNumber = "INV-000000",
    storeLabel = "Store",
    terminalLabel,
    merchantID = "",
    accountInformation = "",
    acquiringBank = "",
    mobileNumber = "",
    merchantCategoryCode = "5999",
  } = options;

  const formattedAccount = formatBakongAccountId(bakongAccount);
  if (!formattedAccount) {
    return "";
  }

  const isDynamic = amount !== undefined && amount > 0;
  const khqrCurrency = currency === "USD" ? khqrData.currency.usd : khqrData.currency.khr;

  try {
    const khqr = new BakongKHQR();

    // 1. If merchantID is provided, attempt Merchant Info Tag 30
    if (merchantID && merchantID.trim().length > 0) {
      const mInfo = new MerchantInfo();
      mInfo.bakongAccountID = formattedAccount;
      mInfo.merchantID = merchantID.trim();
      mInfo.acquiringBank = acquiringBank || "ACLEDA";
      mInfo.merchantName = (merchantName || "MERCHANT").trim();
      mInfo.merchantCity = (merchantCity || "Phnom Penh").trim();
      mInfo.merchantCategoryCode = merchantCategoryCode || "5999";
      mInfo.currency = khqrCurrency;
      mInfo.expirationTimestamp = Date.now() + 1000 * 60 * 60 * 24; // 24 Hours
      if (terminalLabel) mInfo.terminalLabel = terminalLabel.trim();

      if (isDynamic && amount !== undefined) {
        mInfo.amount = currency === "USD" ? parseFloat(amount.toFixed(2)) : Math.round(amount);
        if (billNumber) mInfo.billNumber = billNumber.slice(0, 25);
        if (storeLabel) mInfo.storeLabel = storeLabel.slice(0, 25);
      }

      const res = khqr.generateMerchant(mInfo);
      if (res.status.code === 0 && res.data?.qr) {
        return res.data.qr;
      }
    }

    // 2. Individual Info Tag 29 (Standard for Bakong / ACLEDA / ABA Individual Accounts)
    const info = new IndividualInfo();
    info.bakongAccountID = formattedAccount;
    if (accountInformation || merchantID) {
      info.accountInformation = (accountInformation || merchantID).trim();
    }
    if (acquiringBank) info.acquiringBank = acquiringBank.trim();
    if (mobileNumber) info.mobileNumber = mobileNumber.trim();
    info.merchantName = (merchantName || "MERCHANT").trim();
    info.merchantCity = (merchantCity || "Phnom Penh").trim();
    info.merchantCategoryCode = merchantCategoryCode || "5999";
    info.currency = khqrCurrency;
    info.expirationTimestamp = Date.now() + 1000 * 60 * 60 * 24; // 24 Hours

    if (isDynamic && amount !== undefined) {
      info.amount = currency === "USD" ? parseFloat(amount.toFixed(2)) : Math.round(amount);
      if (billNumber) info.billNumber = billNumber.slice(0, 25);
      if (storeLabel) info.storeLabel = storeLabel.slice(0, 25);
      if (terminalLabel) info.terminalLabel = terminalLabel.slice(0, 25);
    }

    const response = khqr.generateIndividual(info);
    if (response.status.code === 0 && response.data?.qr) {
      return response.data.qr;
    }

    return generateFallbackTLV(options, formattedAccount);
  } catch (err) {
    console.error("Error generating official Bakong KHQR:", err);
    return generateFallbackTLV(options, formattedAccount);
  }
}

/**
 * Fallback TLV Generator with CRC-16 Calculation
 */
function generateFallbackTLV(options: KHQROptions, formattedAccount: string): string {
  const {
    merchantName = "MERCHANT",
    merchantCity = "Phnom Penh",
    amount,
    currency = "USD",
    billNumber = "INV-000000",
  } = options;

  const isDynamic = amount !== undefined && amount > 0;
  const currencyCode = currency === "USD" ? "840" : "116";

  const pad = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, "0");
    return `${id}${len}${value}`;
  };

  let payload = "";
  payload += pad("00", "01"); // Payload Format Indicator
  payload += pad("01", isDynamic ? "12" : "11"); // Point of Initiation (12 = Dynamic, 11 = Static)

  // Tag 29: Merchant Account Info (Individual)
  const tag29 = pad("00", formattedAccount) + pad("01", options.merchantID || "") + pad("02", options.acquiringBank || "");
  payload += pad("29", tag29);

  payload += pad("52", options.merchantCategoryCode || "5999");
  payload += pad("53", currencyCode);

  if (isDynamic && amount !== undefined) {
    const formattedAmount = currency === "USD" ? amount.toFixed(2) : Math.round(amount).toString();
    payload += pad("54", formattedAmount);
  }

  payload += pad("58", "KH");
  payload += pad("59", merchantName.trim());
  payload += pad("60", merchantCity.trim());

  if (billNumber || options.mobileNumber) {
    let tag62 = "";
    if (billNumber) tag62 += pad("01", billNumber.slice(0, 25));
    if (options.mobileNumber) tag62 += pad("02", options.mobileNumber.slice(0, 25));
    payload += pad("62", tag62);
  }

  // Tag 63: CRC16
  payload += "6304";
  const crc = computeCRC16(payload);
  return `${payload}${crc}`;
}

/**
 * Computes CRC-16 (CCITT-FALSE) as specified by EMVCo / Bakong standard
 */
export function computeCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    crc ^= c << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Validates whether a KHQR string conforms to NBC EMVCo checksum
 */
export function validateKHQR(qrString: string): boolean {
  if (!qrString || qrString.length < 10) return false;
  try {
    const clean = qrString.trim();
    const dataPart = clean.slice(0, -4);
    const givenCRC = clean.slice(-4).toUpperCase();
    const calculatedCRC = computeCRC16(dataPart);
    return givenCRC === calculatedCRC;
  } catch {
    return false;
  }
}
