import { useEffect, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import {
  applyPalette,
  getStoredPalette,
  themePalettes,
  type PaletteId,
} from '@/theme-palette';

export function PalettePicker() {
  const [selected, setSelected] = useState<PaletteId>(() => getStoredPalette());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyPalette(selected);
  }, [selected]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="تغيير مظهر التطبيق"
        aria-expanded={open}
        data-testid="button-open-palette"
        className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card/70 px-3 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
      >
        <Palette size={16} />
        <span className="hidden sm:inline">المظهر</span>
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-30 w-64 rounded-2xl border border-border bg-popover p-2 shadow-2xl" role="dialog" aria-label="باليتات المظهر">
          <div className="px-3 pb-2 pt-2">
            <p className="text-sm font-extrabold text-popover-foreground">اختار شكل يومك</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">الباليت تتطبق وتحفظ على هذا الجهاز.</p>
          </div>
          <div className="space-y-1">
            {(Object.entries(themePalettes) as Array<[PaletteId, (typeof themePalettes)[PaletteId]]>).map(([id, palette]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSelected(id);
                  setOpen(false);
                }}
                data-testid={`button-palette-${id}`}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-right transition ${selected === id ? 'bg-primary/10' : 'hover:bg-muted'}`}
              >
                <span className="flex shrink-0 -space-x-1" dir="ltr">
                  {palette.swatches.map((swatch) => <span key={swatch} className="h-5 w-5 rounded-full border-2 border-popover" style={{ backgroundColor: swatch }} />)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-popover-foreground">{palette.label}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{palette.description}</span>
                </span>
                {selected === id && <Check size={15} className="shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}