declare module "bakong-khqr" {
  export class BakongKHQR {
    generateIndividual(info: IndividualInfo): {
      status: { code: number; message: string | null };
      data: { qr: string; md5: string } | null;
    };
    generateMerchant(info: MerchantInfo): {
      status: { code: number; message: string | null };
      data: { qr: string; md5: string } | null;
    };
    static verify(qrString: string): { isValid: boolean };
    static decode(qrString: string): any;
  }

  export class IndividualInfo {
    bakongAccountID: string;
    merchantName: string;
    merchantCity?: string;
    currency: any;
    amount?: number;
    billNumber?: string;
    storeLabel?: string;
    terminalLabel?: string;
    expirationTimestamp?: number;
    accountInformation?: string;
    acquiringBank?: string;
    mobileNumber?: string;
    purposeOfTransaction?: string;
    languagePreference?: string;
    merchantNameAlternateLanguage?: string;
    merchantCityAlternateLanguage?: string;
    upiMerchantAccount?: string;
    merchantCategoryCode?: string;
  }

  export class MerchantInfo extends IndividualInfo {
    merchantID?: string;
  }

  export const khqrData: {
    currency: {
      usd: any;
      khr: any;
    };
    tag: any;
  };
}
