export type PaletteId = 'orbit' | 'sea' | 'coral' | 'violet';

export interface ThemePalette {
  label: string;
  description: string;
  swatches: string[];
  variables: Record<string, string>;
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
};

const storageKey = 'daily-tasks-manager-palette';

export function getStoredPalette(): PaletteId {
  if (typeof window === 'undefined') return 'orbit';
  const stored = window.localStorage.getItem(storageKey);
  return stored && stored in themePalettes ? (stored as PaletteId) : 'orbit';
}

export function applyPalette(id: PaletteId) {
  const root = document.documentElement;
  const palette = themePalettes[id];
  root.dataset.palette = id;
  Object.entries(palette.variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  window.localStorage.setItem(storageKey, id);
}