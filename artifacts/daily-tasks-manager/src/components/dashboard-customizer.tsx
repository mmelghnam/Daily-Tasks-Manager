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
  { key: 'productivity', label: 'العادات اليومية' },
  { key: 'monthlyRhythm', label: 'إيقاع الشهر' },
  { key: 'monthlyGoals', label: 'أهداف الشهر' },
  { key: 'taskMap', label: 'المساحات والفلاتر' },
  { key: 'tasks', label: 'قائمة المهام' },
] as const;

export const defaultDashboardSections = DASHBOARD_SECTIONS.map((section) => section.key);
const validKeys = new Set<string>(defaultDashboardSections);

export function normalizeDashboardSections(visibleSections: unknown, sectionOrder: unknown) {
  const savedOrder = Array.isArray(sectionOrder)
    ? sectionOrder.filter((key): key is string => typeof key === 'string' && validKeys.has(key))
    : [];
  const order = [...savedOrder, ...defaultDashboardSections.filter((key) => !savedOrder.includes(key))];
  const savedVisible = Array.isArray(visibleSections)
    ? visibleSections.filter((key): key is string => typeof key === 'string' && validKeys.has(key))
    : [...defaultDashboardSections];
  const isLegacyPreference = Array.isArray(sectionOrder)
    && !sectionOrder.includes('monthlyRhythm')
    && !sectionOrder.includes('monthlyGoals');
  const migratedVisible = isLegacyPreference
    ? [...savedVisible, 'monthlyRhythm', 'monthlyGoals']
    : savedVisible;
  return {
    visibleSections: migratedVisible.length || Array.isArray(visibleSections) ? Array.from(new Set(migratedVisible)) : [...defaultDashboardSections],
    sectionOrder: order,
  };
}

export function DashboardCustomizer() {
  const queryClient = useQueryClient();
  const preferences = useGetDashboardPreferences();
  const updatePreferences = useUpdateDashboardPreferences();
  const [open, setOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<string[]>(defaultDashboardSections);
  const [sectionOrder, setSectionOrder] = useState<string[]>(defaultDashboardSections);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const normalized = normalizeDashboardSections(preferences.data?.visibleSections, preferences.data?.sectionOrder);
    setVisibleSections(normalized.visibleSections);
    setSectionOrder(normalized.sectionOrder);
  }, [preferences.data]);

  const toggleSection = (key: string) => setVisibleSections((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
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
    const queryKey = getGetDashboardPreferencesQueryKey();
    const previous = queryClient.getQueryData(queryKey);
    const optimistic = { visibleSections: [...visibleSections], sectionOrder: [...sectionOrder] };
    setSaveError('');
    queryClient.setQueryData(queryKey, optimistic);
    updatePreferences.mutate({ data: optimistic }, {
      onSuccess: (data) => { queryClient.setQueryData(queryKey, data); setOpen(false); },
      onError: () => { queryClient.setQueryData(queryKey, previous); setSaveError('تعذر حفظ التخصيص. حاول مرة أخرى.'); },
    });
  };

  return <>
    <button type="button" onClick={() => { setSaveError(''); setOpen(true); }} aria-label="تخصيص الواجهة" data-testid="button-customize-dashboard" className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card/70 px-3 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"><LayoutDashboard size={16}/><span className="hidden sm:inline">تخصيص</span></button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir="rtl" className="max-w-md rounded-3xl">
        <DialogHeader className="text-right"><DialogTitle className="flex items-center gap-2 text-xl"><LayoutDashboard className="text-primary"/> خصص يومك</DialogTitle><DialogDescription>اختر ما يظهر في واجهتك ورتّب الأقسام بالطريقة المناسبة لك.</DialogDescription></DialogHeader>
        <div className="space-y-2">
          {sectionOrder.map((key, index) => {
            const section = DASHBOARD_SECTIONS.find((item) => item.key === key);
            if (!section) return null;
            const visible = visibleSections.includes(key);
            return <div key={key} className={`flex items-center gap-2 rounded-2xl border p-3 ${visible ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30 opacity-70'}`}>
              <button type="button" onClick={() => toggleSection(key)} className={`flex h-9 w-9 items-center justify-center rounded-xl ${visible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{visible ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
              <span className="min-w-0 flex-1 text-sm font-extrabold">{section.label}</span>
              <button type="button" onClick={() => moveSection(key, -1)} disabled={index === 0} className="rounded-lg p-2 text-muted-foreground disabled:opacity-30"><ChevronUp size={16}/></button>
              <button type="button" onClick={() => moveSection(key, 1)} disabled={index === sectionOrder.length - 1} className="rounded-lg p-2 text-muted-foreground disabled:opacity-30"><ChevronDown size={16}/></button>
            </div>;
          })}
        </div>
        {saveError && <p className="text-xs font-bold text-destructive">{saveError}</p>}
        <div className="flex gap-2 pt-2"><button type="button" onClick={save} disabled={updatePreferences.isPending} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-60"><Save size={16}/>{updatePreferences.isPending ? 'جارٍ الحفظ...' : 'حفظ'}</button><button type="button" onClick={() => { setVisibleSections([...defaultDashboardSections]); setSectionOrder([...defaultDashboardSections]); }} className="h-11 rounded-xl border px-4 text-sm font-bold text-muted-foreground">إعادة الضبط</button></div>
      </DialogContent>
    </Dialog>
  </>;
}
