import { useEffect, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { applyPalette, getStoredPalette, themePalettes, type PaletteId } from '@/theme-palette';

const QUICK_PALETTES: PaletteId[] = ['orbit', 'sea', 'violet', 'blush', 'noirGold'];

export function PalettePicker() {
  const [selected, setSelected] = useState<PaletteId>(() => getStoredPalette());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyPalette(selected);
  }, [selected]);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label="تغيير مظهر التطبيق" aria-expanded={open} data-testid="button-open-palette" className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card/70 px-3 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary">
        <Palette size={16} /><span className="hidden sm:inline">المظهر</span>
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-40 w-[min(20rem,calc(100vw-1rem))] rounded-2xl border border-border bg-popover p-3 shadow-2xl" role="dialog" aria-label="اختيار المظهر">
          <div className="mb-2 px-1"><p className="text-sm font-extrabold">اختار مظهر يومك</p><p className="mt-1 text-[11px] text-muted-foreground">خمس اختيارات فقط عشان يفضل الموضوع بسيط.</p></div>
          <div className="space-y-1">
            {QUICK_PALETTES.map((id) => {
              const palette = themePalettes[id];
              return <button key={id} type="button" onClick={() => { setSelected(id); setOpen(false); }} data-testid={`button-palette-${id}`} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-right transition ${selected === id ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                <span className="flex shrink-0 -space-x-1" dir="ltr">{palette.swatches.slice(0, 3).map((swatch, index) => <span key={`${swatch}-${index}`} className="h-5 w-5 rounded-full border-2 border-popover" style={{ backgroundColor: swatch }} />)}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{palette.label}</span><span className="block text-[11px] text-muted-foreground">{palette.description}</span></span>
                {selected === id && <Check size={15} className="shrink-0 text-primary"/>}
              </button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
