import { useEffect, useState } from 'react';
import { Eye, EyeOff, LayoutDashboard, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardPreferencesQueryKey,
  useGetDashboardPreferences,
  useUpdateDashboardPreferences,
} from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const DASHBOARD_SECTIONS = [
  { key: 'summary', label: 'ملخص الإنجاز' },
  { key: 'dailyPlan', label: 'خطة اليوم والوقت' },
  { key: 'events', label: 'الأحداث والمواعيد' },
  { key: 'productivity', label: 'الأهداف والعادات والتركيز' },
  { key: 'links', label: 'روابط المساحات' },
  { key: 'notifications', label: 'تنبيهات اليوم' },
  { key: 'taskMap', label: 'خريطة اليوم والمساحات' },
] as const;

export const defaultDashboardSections = DASHBOARD_SECTIONS.map((section) => section.key);

export function DashboardCustomizer() {
  const queryClient = useQueryClient();
  const preferences = useGetDashboardPreferences();
  const updatePreferences = useUpdateDashboardPreferences();
  const [open, setOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<string[]>(defaultDashboardSections);
  const [sectionOrder, setSectionOrder] = useState<string[]>(defaultDashboardSections);

  useEffect(() => {
    if (!preferences.data) return;
    setVisibleSections(
      Array.isArray(preferences.data.visibleSections)
        ? preferences.data.visibleSections
        : defaultDashboardSections,
    );
    setSectionOrder(
      Array.isArray(preferences.data.sectionOrder)
        ? preferences.data.sectionOrder
        : defaultDashboardSections,
    );
  }, [preferences.data]);

  const toggleSection = (key: string) => {
    setVisibleSections((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const moveSection = (key: string, direction: -1 | 1) => {
    setSectionOrder((current) => {
      const index = current.indexOf(key);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const save = () => {
    updatePreferences.mutate(
      { data: { visibleSections, sectionOrder } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetDashboardPreferencesQueryKey(), data);
          setOpen(false);
        },
      },
    );
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="تخصيص الواجهة" data-testid="button-customize-dashboard" className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card/70 px-3 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary">
        <LayoutDashboard size={16} />
        <span className="hidden sm:inline">تخصيص الواجهة</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg rounded-3xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-xl"><LayoutDashboard className="text-primary" /> خصص واجهتك</DialogTitle>
            <DialogDescription>اختر الأقسام التي تريد رؤيتها ورتبها بما يناسب طريقة عملك.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {sectionOrder.map((key, index) => {
              const section = DASHBOARD_SECTIONS.find((item) => item.key === key);
              if (!section) return null;
              const visible = visibleSections.includes(key);
              return <div key={key} className={`flex items-center gap-2 rounded-2xl border p-3 ${visible ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30 opacity-70'}`}>
                <button type="button" onClick={() => toggleSection(key)} aria-label={visible ? `إخفاء ${section.label}` : `إظهار ${section.label}`} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${visible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                <span className="min-w-0 flex-1 text-sm font-extrabold">{section.label}</span>
                <button type="button" onClick={() => moveSection(key, -1)} disabled={index === 0} aria-label="تقديم القسم" className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronUp size={16} /></button>
                <button type="button" onClick={() => moveSection(key, 1)} disabled={index === sectionOrder.length - 1} aria-label="تأخير القسم" className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronDown size={16} /></button>
              </div>;
            })}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={save} disabled={updatePreferences.isPending} data-testid="button-save-dashboard-preferences" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-60"><Save size={16} /> {updatePreferences.isPending ? 'جارٍ الحفظ...' : 'حفظ التخصيص'}</button>
            <button type="button" onClick={() => { setVisibleSections(defaultDashboardSections); setSectionOrder(defaultDashboardSections); }} className="h-11 rounded-xl border border-border px-4 text-sm font-bold text-muted-foreground hover:bg-muted">إعادة الضبط</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}