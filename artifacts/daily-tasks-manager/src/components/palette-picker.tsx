import { useEffect, useState } from 'react';
import { Check, Palette, Save } from 'lucide-react';
import {
  applyCustomPalette,
  applyPalette,
  customPaletteFields,
  getStoredCustomPalette,
  getStoredPalette,
  themePalettes,
  type HexPalette,
  type PaletteId,
} from '@/theme-palette';

const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

export function PalettePicker() {
  const [selected, setSelected] = useState<PaletteId>(() => getStoredPalette());
  const [customColors, setCustomColors] = useState<HexPalette>(() => getStoredCustomPalette());
  const [open, setOpen] = useState(false);
  const [editingCustom, setEditingCustom] = useState(false);

  useEffect(() => {
    applyPalette(selected);
  }, [selected]);

  const updateCustomColor = (key: keyof HexPalette, value: string) => {
    const next = { ...customColors, [key]: value };
    setCustomColors(next);
    if (customPaletteFields.every(({ key: fieldKey }) => isHex(next[fieldKey]))) {
      applyCustomPalette(next);
      setSelected('custom');
    }
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label="تغيير مظهر التطبيق" aria-expanded={open} data-testid="button-open-palette" className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card/70 px-3 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary">
        <Palette size={16} /><span className="hidden sm:inline">المظهر</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-30 max-h-[min(75vh,38rem)] w-[min(22rem,calc(100vw-1rem))] touch-pan-y overscroll-contain overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-2xl sm:left-0 sm:right-auto" role="dialog" aria-label="باليتات المظهر">
          <div className="px-3 pb-2 pt-2">
            <p className="text-base font-extrabold leading-6 text-popover-foreground">اختار شكل يومك</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">الباليت تتطبق وتحفظ على هذا الجهاز.</p>
          </div>
          <div className="space-y-1">
            {(Object.entries(themePalettes) as Array<[PaletteId, (typeof themePalettes)[PaletteId]]>).map(([id, palette]) => {
              const swatches = id === 'custom' ? [customColors.primary, customColors.secondary, customColors.accent] : palette.swatches;
              return (
                <button key={id} type="button" onClick={() => {
                  if (id === 'custom') {
                    setSelected('custom');
                    setEditingCustom(true);
                  } else {
                    setSelected(id);
                    setEditingCustom(false);
                    setOpen(false);
                  }
                }} data-testid={`button-palette-${id}`} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-right transition ${selected === id ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                  <span className="flex shrink-0 -space-x-1" dir="ltr">{swatches.map((swatch, index) => <span key={`${swatch}-${index}`} className="h-5 w-5 rounded-full border-2 border-popover" style={{ backgroundColor: isHex(swatch) ? swatch : '#ffffff' }} />)}</span>
                   <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold leading-5 text-popover-foreground">{palette.label}</span><span className="block break-words text-[11px] leading-4 text-muted-foreground">{palette.description}</span></span>
                  {selected === id && <Check size={15} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>

          {editingCustom && (
            <div className="mt-2 border-t border-border px-2 pt-3">
               <p className="px-1 text-base font-extrabold leading-6 text-popover-foreground">ألوانك المخصصة</p>
              <p className="mb-3 mt-1 px-1 text-[11px] leading-5 text-muted-foreground">اضغط مربع اللون أو اكتب كود Hex. المعاينة تتغير مباشرة.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {customPaletteFields.map(({ key, label }) => (
                  <label key={key} className="rounded-xl border border-border bg-background p-2">
                    <span className="mb-1.5 block text-xs font-bold leading-5 text-popover-foreground">{label}</span>
                    <span className="flex items-center gap-2" dir="ltr">
                      <input type="color" value={isHex(customColors[key]) ? customColors[key] : '#ffffff'} onChange={(event) => updateCustomColor(key, event.target.value)} className="h-8 w-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0" aria-label={`اختيار لون ${label}`} />
                      <input value={customColors[key]} onChange={(event) => updateCustomColor(key, event.target.value)} maxLength={7} className={`h-9 min-w-0 flex-1 rounded-lg border bg-card px-2 font-mono text-xs text-foreground outline-none ${isHex(customColors[key]) ? 'border-input' : 'border-destructive'}`} aria-label={`كود لون ${label}`} />
                    </span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => { if (customPaletteFields.every(({ key }) => isHex(customColors[key]))) { applyCustomPalette(customColors); setSelected('custom'); setOpen(false); setEditingCustom(false); } }} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-extrabold text-primary-foreground"><Save size={15} /> حفظ الألوان</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}