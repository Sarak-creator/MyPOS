export type ThemeMode = "light" | "dark" | "system";

export type ColorPaletteId =
  | "emerald-teal"
  | "angkor-crimson"
  | "royal-blue"
  | "khmer-gold"
  | "amethyst-purple"
  | "cyber-slate"
  | "forest-jade";

export interface ColorPaletteDef {
  id: ColorPaletteId;
  nameKh: string;
  nameEn: string;
  nameZh: string;
  descriptionKh: string;
  descriptionEn: string;
  primaryColor: string; // Hex representation of shade 600/700
  accentColor: string;
  gradientClass: string;
  badgeClass: string;
}

export const COLOR_PALETTES: ColorPaletteDef[] = [
  {
    id: "emerald-teal",
    nameKh: "ត្បូងមរកត (Emerald Teal)",
    nameEn: "Emerald Teal (Default)",
    nameZh: "翡翠青绿 (默认)",
    descriptionKh: "រចនាបថលំនាំដើមរបស់អាណាចក្រPOS - ស្រស់ស្រាយ ទំនើប និងមានលំនឹង",
    descriptionEn: "Default Anachak POS signature palette - Fresh, modern and balanced.",
    primaryColor: "#0f766e",
    accentColor: "#14b8a6",
    gradientClass: "from-teal-600 to-emerald-700",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    id: "angkor-crimson",
    nameKh: "ក្រហមអង្គរ (Angkor Crimson)",
    nameEn: "Angkor Crimson & Ruby",
    nameZh: "吴哥绯红 (红宝石)",
    descriptionKh: "ពណ៌ក្រហមតំណាងឱ្យភាពរុងរឿង អំណាច និងភាពស្វាហាប់ខ្ពស់",
    descriptionEn: "Regal Cambodian imperial crimson - Vibrant, energetic and prestigious.",
    primaryColor: "#be123c",
    accentColor: "#f43f5e",
    gradientClass: "from-rose-600 to-red-800",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    id: "royal-blue",
    nameKh: "ខៀវរាជវង្ស (Royal Sapphire)",
    nameEn: "Royal Sapphire & Blue",
    nameZh: "皇家蓝 (蓝宝石)",
    descriptionKh: "ពណ៌ខៀវសាជីវកម្ម ទំនុកចិត្តខ្ពស់ និងវិជ្ជាជីវៈកម្រិតសហគ្រាស",
    descriptionEn: "Trustworthy corporate & financial deep sapphire - Professional and clear.",
    primaryColor: "#1d4ed8",
    accentColor: "#3b82f6",
    gradientClass: "from-blue-600 to-indigo-800",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "khmer-gold",
    nameKh: "មាសអង្គរ (Khmer Gold)",
    nameEn: "Khmer Amber & Gold",
    nameZh: "高棉古金 (琥珀金)",
    descriptionKh: "ពណ៌មាសបុរាណប្រណីត ស័ក្តិសមសម្រាប់ហាងគ្រឿងអលង្ការ និងផលិតផលប្រណីត",
    descriptionEn: "Luxury antique gold & warm amber - Ideal for jewelry and premium retail.",
    primaryColor: "#b45309",
    accentColor: "#f59e0b",
    gradientClass: "from-amber-600 to-yellow-700",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "amethyst-purple",
    nameKh: "ស្វាយរាជសម្បត្តិ (Royal Amethyst)",
    nameEn: "Amethyst Purple & Violet",
    nameZh: "紫水晶 (皇家紫)",
    descriptionKh: "ពណ៌ស្វាយអភិជន ឆើតឆាយ និងទាក់ទាញសម្រាប់ហាងទាន់សម័យ និងម៉ូត",
    descriptionEn: "Dignified amethyst violet - Elegant, creative and sophisticated.",
    primaryColor: "#6d28d9",
    accentColor: "#8b5cf6",
    gradientClass: "from-purple-600 to-indigo-800",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "cyber-slate",
    nameKh: "ស័ង្កសីសាយប័រ (Cyber Slate)",
    nameEn: "Cyber Slate & Obsidian",
    nameZh: "赛博岩灰 (黑曜石)",
    descriptionKh: "ពណ៌ស័ង្កសីបច្ចេកវិទ្យាខ្ពស់ ស្រទន់ ស្រួលមើល និងមានកម្រិត Contrast ខ្ពស់",
    descriptionEn: "High-tech minimalist slate & obsidian - High contrast and modern clarity.",
    primaryColor: "#334155",
    accentColor: "#64748b",
    gradientClass: "from-slate-700 to-zinc-900",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
  },
  {
    id: "forest-jade",
    nameKh: "ត្បូងកណ្តៀង (Forest Jade)",
    nameEn: "Forest Jade & Mint",
    nameZh: "森林翠玉 (薄荷绿)",
    descriptionKh: "ពណ៌បៃតងធម្មជាតិ ជីវិត និងភាពរីកចម្រើន - ត្រជាក់ភ្នែកក្នុងការប្រើប្រាស់យូរ",
    descriptionEn: "Organic natural jade & vitality green - Gentle on the eyes for all-day POS.",
    primaryColor: "#047857",
    accentColor: "#10b981",
    gradientClass: "from-emerald-600 to-green-800",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

export const THEME_MODE_STORAGE_KEY = "anachak-theme-mode";
export const COLOR_PALETTE_STORAGE_KEY = "anachak-color-palette";

export function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY) as ThemeMode | null;
  return stored && ["light", "dark", "system"].includes(stored) ? stored : "light";
}

export function getStoredColorPalette(): ColorPaletteId {
  if (typeof window === "undefined") return "emerald-teal";
  const stored = localStorage.getItem(COLOR_PALETTE_STORAGE_KEY) as ColorPaletteId | null;
  return stored && COLOR_PALETTES.some((p) => p.id === stored) ? stored : "emerald-teal";
}

export function applyTheme(mode: ThemeMode, palette: ColorPaletteId): void {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  // 1. Resolve dark/light class
  const isDark = mode === "dark" || (mode === "system" && getSystemPrefersDark());
  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // 2. Set data-theme attribute
  root.setAttribute("data-theme", palette);

  // 3. Persist to localStorage
  try {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
    localStorage.setItem(COLOR_PALETTE_STORAGE_KEY, palette);
  } catch (e) {
    console.error("Failed to save theme settings to localStorage:", e);
  }
}

let mediaQueryListenerAttached = false;

export function initThemeListener(onSystemChange?: () => void): void {
  if (typeof window === "undefined" || mediaQueryListenerAttached) return;

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    const currentMode = getStoredThemeMode();
    if (currentMode === "system") {
      const palette = getStoredColorPalette();
      applyTheme("system", palette);
      if (onSystemChange) onSystemChange();
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handler);
  } else if ((mediaQuery as any).addListener) {
    (mediaQuery as any).addListener(handler);
  }

  mediaQueryListenerAttached = true;
}
