export type PaletteId = 'orbit' | 'sea' | 'coral' | 'violet' | 'dusk' | 'blush' | 'noirGold' | 'earthNavy' | 'urbanBlue' | 'custom';

export interface ThemePalette {
  label: string;
  description: string;
  swatches: string[];
  variables: Record<string, string>;
}

export interface HexPalette {
  background: string;
  foreground: string;
  border: string;
  card: string;
  cardForeground: string;
  cardBorder: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  input: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
}

export const customPaletteFields: Array<{ key: keyof HexPalette; label: string }> = [
  { key: 'background', label: 'الخلفية' },
  { key: 'foreground', label: 'النص الأساسي' },
  { key: 'border', label: 'الحدود' },
  { key: 'card', label: 'الكروت' },
  { key: 'cardForeground', label: 'نص الكروت' },
  { key: 'cardBorder', label: 'حدود الكروت' },
  { key: 'primary', label: 'اللون الأساسي' },
  { key: 'primaryForeground', label: 'نص الأساسي' },
  { key: 'secondary', label: 'اللون الثانوي' },
  { key: 'secondaryForeground', label: 'نص الثانوي' },
  { key: 'muted', label: 'الخلفية الهادئة' },
  { key: 'mutedForeground', label: 'النص الهادئ' },
  { key: 'accent', label: 'لون التمييز' },
  { key: 'accentForeground', label: 'نص التمييز' },
  { key: 'input', label: 'حقول الإدخال' },
  { key: 'ring', label: 'حلقة التركيز' },
  { key: 'destructive', label: 'الحذف والتنبيه' },
  { key: 'destructiveForeground', label: 'نص الحذف' },
];

// عدّل قيم Hex هنا لإضافة هويتك الخاصة، ثم ستظهر تلقائيًا في قائمة المظهر.
export const customPaletteHex: HexPalette = {
  background: '#f4f1e8',
  foreground: '#203e3a',
  border: '#d8d2c3',
  card: '#fffdf8',
  cardForeground: '#203e3a',
  cardBorder: '#ddd7ca',
  primary: '#2d6b5f',
  primaryForeground: '#f8f4e9',
  secondary: '#efb955',
  secondaryForeground: '#203e3a',
  muted: '#ebe6da',
  mutedForeground: '#66756e',
  accent: '#d47b6d',
  accentForeground: '#203e3a',
  input: '#d4cdbc',
  ring: '#2d6b5f',
  destructive: '#c45248',
  destructiveForeground: '#fff8f0',
};

function hexToHsl(hex: string) {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16) / 255;
  const green = Number.parseInt(value.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) return `0 0% ${Math.round(lightness * 100)}%`;

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  return `${Math.round(hue * 60)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function makeHexPalette(colors: HexPalette): ThemePalette {
  return {
    label: 'مخصص',
    description: 'ألوانك الخاصة من Hex',
    swatches: [colors.primary, colors.secondary, colors.accent],
    variables: {
      '--background': hexToHsl(colors.background),
      '--foreground': hexToHsl(colors.foreground),
      '--border': hexToHsl(colors.border),
      '--card': hexToHsl(colors.card),
      '--card-foreground': hexToHsl(colors.cardForeground),
      '--card-border': hexToHsl(colors.cardBorder),
      '--primary': hexToHsl(colors.primary),
      '--primary-foreground': hexToHsl(colors.primaryForeground),
      '--secondary': hexToHsl(colors.secondary),
      '--secondary-foreground': hexToHsl(colors.secondaryForeground),
      '--muted': hexToHsl(colors.muted),
      '--muted-foreground': hexToHsl(colors.mutedForeground),
      '--accent': hexToHsl(colors.accent),
      '--accent-foreground': hexToHsl(colors.accentForeground),
      '--input': hexToHsl(colors.input),
      '--ring': hexToHsl(colors.ring),
      '--destructive': hexToHsl(colors.destructive),
      '--destructive-foreground': hexToHsl(colors.destructiveForeground),
    },
  };
}

const customPaletteStorageKey = 'daily-tasks-manager-custom-palette';

export function getStoredCustomPalette(): HexPalette {
  if (typeof window === 'undefined') return { ...customPaletteHex };
  try {
    const stored = window.localStorage.getItem(customPaletteStorageKey);
    if (!stored) return { ...customPaletteHex };
    return { ...customPaletteHex, ...JSON.parse(stored) } as HexPalette;
  } catch {
    return { ...customPaletteHex };
  }
}

export function applyCustomPalette(colors: HexPalette) {
  const palette = makeHexPalette(colors);
  Object.entries(palette.variables).forEach(([property, value]) => {
    document.documentElement.style.setProperty(property, value);
  });
  window.localStorage.setItem(customPaletteStorageKey, JSON.stringify(colors));
}

export const themePalettes: Record<PaletteId, ThemePalette> = {
  orbit: {
    label: 'مدار',
    description: 'الهوية الحالية الدافئة',
    swatches: ['#285f56', '#f2bb55', '#d77b6b'],
    variables: {
      '--background': '42 33% 95%',
      '--foreground': '173 29% 18%',
      '--border': '39 22% 85%',
      '--card': '40 43% 98%',
      '--card-foreground': '173 29% 18%',
      '--card-border': '39 25% 87%',
      '--primary': '170 36% 28%',
      '--primary-foreground': '42 33% 95%',
      '--secondary': '38 84% 64%',
      '--secondary-foreground': '173 29% 18%',
      '--muted': '40 24% 90%',
      '--muted-foreground': '169 14% 45%',
      '--accent': '12 64% 67%',
      '--accent-foreground': '173 29% 18%',
      '--input': '39 22% 82%',
      '--ring': '170 36% 28%',
      '--destructive': '8 63% 50%',
      '--destructive-foreground': '42 33% 95%',
    },
  },
  sea: {
    label: 'بحر هادئ',
    description: 'أزرق صافٍ مع لمسة مرجانية',
    swatches: ['#285576', '#62b6aa', '#e28a64'],
    variables: {
      '--background': '206 35% 95%',
      '--foreground': '211 36% 18%',
      '--border': '205 24% 84%',
      '--card': '204 42% 98%',
      '--card-foreground': '211 36% 18%',
      '--card-border': '205 28% 88%',
      '--primary': '207 61% 32%',
      '--primary-foreground': '206 35% 96%',
      '--secondary': '169 55% 62%',
      '--secondary-foreground': '211 36% 18%',
      '--muted': '205 24% 90%',
      '--muted-foreground': '211 17% 44%',
      '--accent': '26 74% 65%',
      '--accent-foreground': '211 36% 18%',
      '--input': '205 22% 81%',
      '--ring': '207 61% 32%',
      '--destructive': '4 65% 52%',
      '--destructive-foreground': '206 35% 96%',
    },
  },
  coral: {
    label: 'مرجان دافئ',
    description: 'دفء واضح وطاقة خفيفة',
    swatches: ['#8a423b', '#e5ad4c', '#4b8f7a'],
    variables: {
      '--background': '22 45% 95%',
      '--foreground': '8 28% 20%',
      '--border': '22 27% 84%',
      '--card': '30 60% 98%',
      '--card-foreground': '8 28% 20%',
      '--card-border': '22 31% 87%',
      '--primary': '8 52% 32%',
      '--primary-foreground': '22 45% 96%',
      '--secondary': '38 82% 61%',
      '--secondary-foreground': '8 28% 20%',
      '--muted': '26 30% 90%',
      '--muted-foreground': '11 20% 44%',
      '--accent': '165 43% 40%',
      '--accent-foreground': '22 45% 96%',
      '--input': '22 25% 82%',
      '--ring': '8 52% 32%',
      '--destructive': '3 67% 48%',
      '--destructive-foreground': '22 45% 96%',
    },
  },
  violet: {
    label: 'ليل بنفسجي',
    description: 'تركيز هادئ ومميز',
    swatches: ['#4b3d78', '#e5b55e', '#b46b9b'],
    variables: {
      '--background': '260 32% 96%',
      '--foreground': '252 28% 19%',
      '--border': '255 23% 86%',
      '--card': '260 45% 99%',
      '--card-foreground': '252 28% 19%',
      '--card-border': '255 28% 89%',
      '--primary': '254 43% 35%',
      '--primary-foreground': '260 32% 97%',
      '--secondary': '43 85% 65%',
      '--secondary-foreground': '252 28% 19%',
      '--muted': '258 25% 91%',
      '--muted-foreground': '253 15% 46%',
      '--accent': '316 49% 68%',
      '--accent-foreground': '252 28% 19%',
      '--input': '255 22% 83%',
      '--ring': '254 43% 35%',
      '--destructive': '350 58% 50%',
      '--destructive-foreground': '260 32% 97%',
    },
  },
  dusk: {
    label: 'غسق هادئ',
    description: 'داكن مريح بلمسات تركواز ودافئة',
    swatches: ['#202730', '#61b8a8', '#d5a85d'],
    variables: {
      '--background': '215 19% 14%',
      '--foreground': '200 17% 92%',
      '--border': '213 17% 25%',
      '--card': '215 19% 18%',
      '--card-foreground': '200 17% 92%',
      '--card-border': '213 17% 26%',
      '--popover': '215 19% 18%',
      '--popover-foreground': '200 17% 92%',
      '--popover-border': '213 17% 26%',
      '--primary': '169 38% 55%',
      '--primary-foreground': '169 30% 11%',
      '--secondary': '38 57% 60%',
      '--secondary-foreground': '215 25% 13%',
      '--muted': '214 16% 22%',
      '--muted-foreground': '210 12% 67%',
      '--accent': '352 40% 63%',
      '--accent-foreground': '215 25% 13%',
      '--input': '213 17% 29%',
      '--ring': '169 38% 55%',
      '--destructive': '3 60% 57%',
      '--destructive-foreground': '0 0% 98%',
    },
  },
  blush: {
    label: 'بلَش ناعم',
    description: 'وردي أنيق ولمسات ليلكي رقيقة',
    swatches: ['#a65378', '#e9a9bc', '#8b76bd'],
    variables: {
      '--background': '340 38% 96%',
      '--foreground': '330 24% 20%',
      '--border': '337 27% 85%',
      '--card': '345 50% 99%',
      '--card-foreground': '330 24% 20%',
      '--card-border': '337 30% 88%',
      '--popover': '345 50% 99%',
      '--popover-foreground': '330 24% 20%',
      '--popover-border': '337 30% 88%',
      '--primary': '334 32% 49%',
      '--primary-foreground': '345 50% 98%',
      '--secondary': '342 61% 79%',
      '--secondary-foreground': '330 29% 24%',
      '--muted': '338 30% 91%',
      '--muted-foreground': '330 14% 47%',
      '--accent': '257 34% 60%',
      '--accent-foreground': '345 50% 98%',
      '--input': '337 27% 82%',
      '--ring': '334 32% 49%',
      '--destructive': '354 55% 51%',
      '--destructive-foreground': '345 50% 98%',
    },
  },
  noirGold: {
    label: 'نوار ذهبي',
    description: 'أسود وذهبي بطابع بريميوم فاخر',
    swatches: ['#15140f', '#cda64b', '#f0d78d'],
    variables: {
      '--background': '48 17% 7%',
      '--foreground': '43 36% 88%',
      '--border': '43 20% 23%',
      '--card': '45 14% 10%',
      '--card-foreground': '43 36% 88%',
      '--card-border': '43 20% 23%',
      '--popover': '45 14% 10%',
      '--popover-foreground': '43 36% 88%',
      '--popover-border': '43 20% 23%',
      '--primary': '42 56% 55%',
      '--primary-foreground': '48 22% 8%',
      '--secondary': '43 68% 75%',
      '--secondary-foreground': '48 22% 8%',
      '--muted': '44 13% 16%',
      '--muted-foreground': '42 16% 62%',
      '--accent': '30 43% 47%',
      '--accent-foreground': '45 33% 95%',
      '--input': '43 18% 27%',
      '--ring': '42 56% 55%',
      '--destructive': '4 55% 50%',
      '--destructive-foreground': '45 33% 95%',
    },
  },
  earthNavy: {
    label: 'كحلي ترابي',
    description: 'كحلي عميق مع كريمي وسيج وبني',
    swatches: ['#132845', '#f1e5cc', '#d3d4c2', '#856042'],
    variables: {
      '--background': '40 49% 91%',
      '--foreground': '216 57% 17%',
      '--border': '62 14% 75%',
      '--card': '41 55% 96%',
      '--card-foreground': '216 57% 17%',
      '--card-border': '60 13% 78%',
      '--popover': '41 55% 96%',
      '--popover-foreground': '216 57% 17%',
      '--popover-border': '60 13% 78%',
      '--primary': '216 57% 17%',
      '--primary-foreground': '40 49% 91%',
      '--secondary': '62 14% 80%',
      '--secondary-foreground': '216 57% 17%',
      '--muted': '62 14% 84%',
      '--muted-foreground': '217 18% 42%',
      '--accent': '26 33% 39%',
      '--accent-foreground': '40 49% 94%',
      '--input': '61 13% 73%',
      '--ring': '216 57% 17%',
      '--destructive': '5 56% 47%',
      '--destructive-foreground': '40 49% 94%',
    },
  },
  urbanBlue: {
    label: 'أزرق حضري',
    description: 'رمادي فاتح مع فحمي وأزرق وذهبي',
    swatches: ['#e9edf2', '#2f3946', '#5c7993', '#bea675'],
    variables: {
      '--background': '213 26% 93%',
      '--foreground': '213 20% 23%',
      '--border': '211 18% 79%',
      '--card': '210 29% 98%',
      '--card-foreground': '213 20% 23%',
      '--card-border': '211 18% 82%',
      '--popover': '210 29% 98%',
      '--popover-foreground': '213 20% 23%',
      '--popover-border': '211 18% 82%',
      '--primary': '213 20% 23%',
      '--primary-foreground': '213 26% 95%',
      '--secondary': '39 32% 60%',
      '--secondary-foreground': '213 24% 18%',
      '--muted': '212 20% 88%',
      '--muted-foreground': '212 13% 44%',
      '--accent': '207 23% 47%',
      '--accent-foreground': '210 29% 98%',
      '--input': '211 18% 75%',
      '--ring': '207 23% 47%',
      '--destructive': '4 58% 49%',
      '--destructive-foreground': '210 29% 98%',
    },
  },
  custom: makeHexPalette(customPaletteHex),
};

const storageKey = 'daily-tasks-manager-palette';

export function getStoredPalette(): PaletteId {
  if (typeof window === 'undefined') return 'orbit';
  const stored = window.localStorage.getItem(storageKey);
  return stored && stored in themePalettes ? (stored as PaletteId) : 'orbit';
}

export function applyPalette(id: PaletteId) {
  const root = document.documentElement;
  const palette = id === 'custom' ? makeHexPalette(getStoredCustomPalette()) : themePalettes[id];
  root.dataset.palette = id;
  Object.entries(palette.variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  window.localStorage.setItem(storageKey, id);
}