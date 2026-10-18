// Types for Anachak POS Dynamic Product Card & Catalog System

export type CardLayoutType = "classic" | "compact" | "list" | "visual";

export interface POSDisplayConfig {
  /** Active card presentation mode */
  layout: CardLayoutType;
  /** Whether to render image thumbnails in card variations */
  showImages: boolean;
  /** Whether to display barcode / SKU label */
  showBarcode: boolean;
  /** Default primary currency for price highlights */
  defaultCurrency: "USD" | "KHR";
  /** Whether to render both USD and KHR prices concurrently */
  showDualPrice: boolean;
  /** Grid density or items per row override ('auto' or fixed number) */
  itemsPerRow: "auto" | 2 | 3 | 4 | 5 | 6 | 8;
  /** Provide tactile haptic vibration feedback on tap (supported touchscreens) */
  enableHapticFeedback: boolean;
  /** Web Audio acoustic feedback on card click */
  enableClickSound: boolean;
}

export const DEFAULT_POS_DISPLAY_CONFIG: POSDisplayConfig = {
  layout: "classic",
  showImages: true,
  showBarcode: true,
  defaultCurrency: "USD",
  showDualPrice: true,
  itemsPerRow: "auto",
  enableHapticFeedback: true,
  enableClickSound: true,
};

export type ProductType =
  | "STANDARD_ITEM"
  | "SERIAL_IMEI_ITEM"
  | "VARIANT_ITEM"
  | "SERVICE_LABOR"
  | "SPARE_PART";

export interface ProductItem {
  id: string;
  productId: string;
  sku: string;
  barcode?: string;
  nameKh: string;
  nameEn: string;
  name?: string;
  priceUsd: number;
  salePrice?: number;
  costPriceUsd: number;
  costPrice?: number;
  stockQty: number;
  stockQuantity?: number;
  alertStock?: number;
  categorySlug: string;
  categoryName?: string;
  type: ProductType;
  imageUrl?: string;
  unit?: string;
  imeiList?: string[];
  discountPercent?: number;
  isPopular?: boolean;
}

export interface ProductCardProps {
  product: ProductItem;
  layout?: CardLayoutType;
  onSelect: (product: ProductItem) => void;
  onQuantityChange?: (product: ProductItem, newQty: number) => void;
  cartQuantity?: number;
  exchangeRateKhr?: number;
  language?: "km" | "en" | "zh";
  config?: Partial<POSDisplayConfig>;
  className?: string;
}

export interface LayoutOptionMeta {
  type: CardLayoutType;
  nameKh: string;
  nameEn: string;
  descriptionKh: string;
  descriptionEn: string;
  recommendedFor: string;
  iconName: "LayoutGrid" | "SquareMenu" | "Rows3" | "Image";
}

export const LAYOUT_OPTIONS: LayoutOptionMeta[] = [
  {
    type: "classic",
    nameKh: "កាតបុរាណ (Classic Grid)",
    nameEn: "Classic Grid",
    descriptionKh: "រចនាបទស្តង់ដារ មានរូបភាពទំហំល្មម បាកូដ ស្តុក និងប៊ូតុងបន្ថែមរហ័ស",
    descriptionEn: "Balanced grid card with medium image, barcode, category, name, stock badge, and quick-add button.",
    recommendedFor: "ទូទៅ, ហាងលក់រាយទូទៅ (Retail)",
    iconName: "LayoutGrid",
  },
  {
    type: "compact",
    nameKh: "ក្រឡាតូចរហ័ស (Compact Tile)",
    nameEn: "Compact Touch Tile",
    descriptionKh: "ផ្ទាំងប៉ះធំគ្មានរូបភាព បង្ហាញតម្លៃធំៗ ឆ្លើយតបរហ័ស ងាយប៉ះសម្រាប់គិតលុយលឿន",
    descriptionEn: "High-density POS touch tile (no image, big touch target, large price, instant-click response for fast cashier scanning).",
    recommendedFor: "ម៉ាត, ហាងលក់ភេសជ្ជៈ, គិតលុយល្បឿនលឿន (High-Speed Checkout)",
    iconName: "SquareMenu",
  },
  {
    type: "list",
    nameKh: "តារាងជួរដេក (Dense List)",
    nameEn: "Dense Row List",
    descriptionKh: "តម្រៀបជាជួរផ្ដេកបន្តបន្ទាប់ បង្ហាញបាកូដ ប៊ូតុងបូក/ដក (+/-) បរិមាណក្នុងកន្ត្រក",
    descriptionEn: "Dense horizontal row with barcode, inline quantity, quick counters (+/-), and small thumbnail.",
    recommendedFor: "ហាងគ្រឿងបន្លាស់, ឱសថស្ថាន, ទំនិញច្រើនមុខ (Parts & Pharmacy)",
    iconName: "Rows3",
  },
  {
    type: "visual",
    nameKh: "រូបភាពច្បាស់ (Visual Showcase)",
    nameEn: "Visual 1:1 Showcase",
    descriptionKh: "ផ្តោតលើរូបភាពធំច្បាស់ សមាមាត្រ 1:1 មានស្លាកបញ្ចុះតម្លៃ និង Zoom ពេលដាក់ Mouse",
    descriptionEn: "Image-centric card with 1:1 aspect ratio, floating badges, discount pills, and smooth hover zoom.",
    recommendedFor: "ហាងសម្លៀកបំពាក់, ហាងកាហ្វេ/ម្ហូប, បន្ទប់តាំងបង្ហាញ (Fashion & F&B)",
    iconName: "Image",
  },
];
