import { lazy, Suspense, type FormEvent, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useClerk, useUser } from '@clerk/react';
import {
  CalendarDays, ChevronLeft, ChevronRight, CircleAlert, ClipboardList, LayoutGrid,
  Loader2, Pencil, Plus, RefreshCw, ShieldCheck, Sparkles, Target, Trash2, UserRound,
} from 'lucide-react';
import {
  getGetAdminAccessQueryKey, getGetDashboardPreferencesQueryKey, getGetOnboardingStatusQueryKey,
  getGetTaskSummaryQueryKey, getListSpacesQueryKey, getListTasksQueryKey,
  useCreateTask, useDeleteSpace, useGetAdminAccess, useGetDashboardPreferences,
  useGetOnboardingStatus, useGetTaskSummary, useListSpaces, useListTasks,
} from '@workspace/api-client-react';
import type { Space, Task } from '@workspace/api-client-react';
import { TaskCard } from '@/components/task-card';
import { TaskForm } from '@/components/task-form';
import { SpaceForm } from '@/components/space-form';
import { PalettePicker } from '@/components/palette-picker';
import { DashboardCustomizer, normalizeDashboardSections } from '@/components/dashboard-customizer';
import { getDailyMessage } from '@/daily-messages';

const DailyPlan = lazy(() => import('@/components/daily-plan').then((m) => ({ default: m.DailyPlan })));
const ProductivityHub = lazy(() => import('@/components/productivity-hub').then((m) => ({ default: m.ProductivityHub })));
const SpaceLinksSection = lazy(() => import('@/components/space-links-section').then((m) => ({ default: m.SpaceLinksSection })));
const OverdueFocusTools = lazy(() => import('@/components/focus-overdue-tools').then((m) => ({ default: m.OverdueFocusTools })));

type Category = Task['category'];
type ViewMode = 'day' | 'week' | 'month';

const fallbackSpaces = [
  { name: 'INV', color: '#2e8d77', description: 'قرارات وعمليات' },
  { name: 'BR', color: '#d39a2f', description: 'بناء ونمو' },
  { name: 'Qaff', color: '#c97768', description: 'مشاريع قاف' },
  { name: 'Wootz', color: '#6678bd', description: 'فريق ووتز' },
  { name: 'Self', color: '#77964d', description: 'مساحتك أنت' },
];
const fallbackColors = ['#2e8d77', '#d39a2f', '#c97768', '#6678bd', '#77964d', '#9a6bb1'];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function dateLabel(date: string) {
  return new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));
}
function shiftDate(date: string, amount: number) {
  const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + amount); return dateKey(next);
}
function rangeFor(date: string, mode: ViewMode) {
  const start = new Date(`${date}T12:00:00`);
  if (mode === 'day') return { date };
  if (mode === 'week') {
    const day = start.getDay(); start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return { dateFrom: dateKey(start), dateTo: dateKey(end) };
  }
  start.setDate(1); const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
  return { dateFrom: dateKey(start), dateTo: dateKey(end) };
}
function getSpaceMeta(name: string, spaces: Array<{ name: string; color?: string; description?: string | null }>) {
  const index = spaces.findIndex((space) => space.name === name);
  const fallback = fallbackSpaces.find((space) => space.name === name);
  return { color: spaces[index]?.color ?? fallback?.color ?? fallbackColors[Math.max(index, 0) % fallbackColors.length], description: spaces[index]?.description ?? fallback?.description ?? 'مساحة مخصصة' };
}
function SectionFallback() { return <div className="mb-6 h-28 animate-pulse rounded-3xl bg-muted/60" />; }

function AccountControl() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const adminAccess = useGetAdminAccess({ query: { queryKey: [...getGetAdminAccessQueryKey(), user?.id ?? 'pending-account'], enabled: Boolean(user?.id), staleTime: 5 * 60_000, refetchOnWindowFocus: false } });
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'حسابي';
  return <div className="flex items-center gap-1 rounded-2xl border border-border/80 bg-background/80 p-1 shadow-sm">
    <span className="hidden items-center gap-2 px-2 text-xs font-extrabold md:flex"><UserRound size={14}/>{name}</span>
    {adminAccess.data?.isAdmin && <a href={`${basePath}/admin`} className="rounded-xl bg-accent/10 px-3 py-2 text-xs font-extrabold" data-testid="link-admin"><ShieldCheck size={14} className="ml-1 inline"/>الإدارة</a>}
    <button type="button" onClick={() => void signOut({ redirectUrl: basePath || '/' })} className="rounded-xl bg-muted px-3 py-2 text-xs font-extrabold text-primary">تسجيل الخروج</button>
  </div>;
}

function QuickTaskInput({ date, category }: { date: string; category: Category }) {
  const queryClient = useQueryClient(); const createTask = useCreateTask(); const [title, setTitle] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const cleanTitle = title.trim(); if (!cleanTitle) return;
    createTask.mutate({ data: { taskDate: date, category, title: cleanTitle, priority: 'medium' } }, { onSuccess: () => { setTitle(''); void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() }); } });
  };
  return <form onSubmit={submit} className="flex gap-2 rounded-2xl border border-primary/20 bg-primary/[0.04] p-2.5"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اكتب مهمة سريعة..." className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none"/><button type="submit" disabled={createTask.isPending || !title.trim()} className="rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground disabled:opacity-50">{createTask.isPending ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}</button></form>;
}

export default function HomeOptimized() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [showForm, setShowForm] = useState(false); const [showSpaceForm, setShowSpaceForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null); const [formCategory, setFormCategory] = useState<Category | undefined>();

  const preferences = useGetDashboardPreferences({ query: { queryKey: getGetDashboardPreferencesQueryKey(), staleTime: 5 * 60_000, refetchOnWindowFocus: false } });
  const layout = normalizeDashboardSections(preferences.data?.visibleSections, preferences.data?.sectionOrder);
  const visibleSet = useMemo(() => new Set(layout.visibleSections), [layout.visibleSections.join('|')]);
  const range = useMemo(() => rangeFor(selectedDate, viewMode), [selectedDate, viewMode]);
  const spacesQuery = useListSpaces({ query: { queryKey: getListSpacesQueryKey(), staleTime: 5 * 60_000, refetchOnWindowFocus: false } });
  const taskQuery = useListTasks(range, { query: { queryKey: getListTasksQueryKey(range), staleTime: 30_000, refetchOnWindowFocus: false } });
  const summaryQuery = useGetTaskSummary(range, { query: { queryKey: getGetTaskSummaryQueryKey(range), staleTime: 30_000, refetchOnWindowFocus: false } });
  const onboarding = useGetOnboardingStatus({ query: { queryKey: getGetOnboardingStatusQueryKey(), staleTime: 5 * 60_000, refetchOnWindowFocus: false } });
  const deleteSpace = useDeleteSpace();

  const tasks = Array.isArray(taskQuery.data) ? taskQuery.data : [];
  const spaces = Array.isArray(spacesQuery.data) ? spacesQuery.data : fallbackSpaces;
  const spaceNames = spaces.map((space) => space.name);
  const categories = useMemo(() => Array.from(new Set([...spaceNames, ...tasks.map((task) => task.category)])), [spaceNames.join('|'), tasks]);
  const visibleTasks = useMemo(() => activeCategory === 'all' ? tasks : tasks.filter((task) => task.category === activeCategory), [activeCategory, tasks]);
  const summary = summaryQuery.data; const completion = summary && summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0; const isToday = selectedDate === dateKey(new Date());
  const removeSpace = (space: Space) => deleteSpace.mutate({ id: space.id }, { onSuccess: () => { if (activeCategory === space.name) setActiveCategory('all'); void queryClient.invalidateQueries({ queryKey: getListSpacesQueryKey() }); } });
  const openNew = (category?: Category) => { setFormCategory(category); setShowForm(true); };
  const sectionStyle = (key: string) => ({ order: layout.sectionOrder.indexOf(key) < 0 ? 99 : layout.sectionOrder.indexOf(key) });

  return <div className="noise-overlay task-shell min-h-[100dvh]" dir="rtl">
    <header className="border-b border-border/70 bg-card/60"><div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-secondary"><Target size={22}/></div><div><p className="text-xl font-black">إنجازك اليومي</p><p className="text-xs font-semibold text-muted-foreground">الأهم فقط، والباقي عند الطلب</p></div></div><div className="flex flex-wrap items-center justify-end gap-2"><DashboardCustomizer/><PalettePicker/><AccountControl/></div></div></header>
    <main className="mx-auto max-w-[1480px] px-5 pb-12 pt-6 sm:px-8 lg:px-12"><div className="flex flex-col">
      {visibleSet.has('dateHeader') && <section className="mb-6 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end" style={sectionStyle('dateHeader')}><div><div className="mb-2 flex items-center gap-2 text-sm font-bold text-muted-foreground"><CalendarDays size={17} className="text-primary"/>{isToday ? 'اليوم' : 'يوم آخر'}</div><h1 className="text-3xl font-extrabold sm:text-5xl">{dateLabel(selectedDate)}</h1><p className="mt-3 text-sm text-muted-foreground">{getDailyMessage(selectedDate)}</p></div><div className="flex items-center justify-between rounded-2xl border border-border bg-card/75 p-2"><button onClick={() => setSelectedDate(shiftDate(selectedDate,-1))} className="rounded-xl p-3"><ChevronRight size={20}/></button><button onClick={() => setSelectedDate(dateKey(new Date()))} className="rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground">اليوم</button><input type="date" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="min-w-0 rounded-xl bg-background px-3 py-2 text-sm font-bold"/><button onClick={() => setSelectedDate(shiftDate(selectedDate,1))} className="rounded-xl p-3"><ChevronLeft size={20}/></button></div></section>}
      {visibleSet.has('viewMode') && <section className="mb-6 rounded-2xl border border-border bg-card/70 p-2" style={sectionStyle('viewMode')}><div className="grid grid-cols-3 gap-1.5">{([['day','يومي'],['week','أسبوعي'],['month','شهري']] as const).map(([mode,label])=><button key={mode} onClick={()=>setViewMode(mode)} className={`rounded-xl px-3 py-2.5 text-sm font-extrabold ${viewMode===mode?'bg-primary text-primary-foreground':'text-muted-foreground hover:bg-muted'}`}>{label}</button>)}</div></section>}
      {visibleSet.has('summary') && <section className="mb-6 grid gap-3 md:grid-cols-3" style={sectionStyle('summary')}><div className="rounded-2xl bg-primary p-4 text-primary-foreground"><p className="text-sm font-bold opacity-70">الإنجاز</p><p className="mt-2 text-4xl font-extrabold">{completion}%</p></div><div className="rounded-2xl border bg-card p-4"><ClipboardList className="text-accent" size={20}/><p className="mt-2 text-3xl font-extrabold">{summary?.remaining ?? '—'}</p><p className="text-xs text-muted-foreground">متبقي</p></div><div className="rounded-2xl border bg-card p-4"><LayoutGrid className="text-primary" size={20}/><p className="mt-2 text-3xl font-extrabold">{summary?.total ?? '—'}</p><p className="text-xs text-muted-foreground">كل المهام</p></div></section>}
      {visibleSet.has('dailyPlan') && viewMode==='day' && <div style={sectionStyle('dailyPlan')}><Suspense fallback={<SectionFallback/>}><DailyPlan tasks={tasks}/></Suspense></div>}
      {visibleSet.has('productivity') && <div style={sectionStyle('productivity')}><Suspense fallback={<SectionFallback/>}><ProductivityHub usageType={onboarding.data?.usageType} tasks={tasks} date={selectedDate}/></Suspense></div>}
      {visibleSet.has('focusTools') && <div style={sectionStyle('focusTools')}><Suspense fallback={<SectionFallback/>}><OverdueFocusTools tasks={tasks}/></Suspense></div>}
      {visibleSet.has('links') && <div style={sectionStyle('links')}><Suspense fallback={<SectionFallback/>}><SpaceLinksSection spaces={Array.isArray(spacesQuery.data)?spacesQuery.data:[]}/></Suspense></div>}
      {visibleSet.has('taskMap') && <section className="mb-6 rounded-3xl border border-card-border bg-card/70 p-4" style={sectionStyle('taskMap')}><div className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-extrabold">المساحات</h2><p className="text-xs text-muted-foreground">اختار المساحة اللي هتركز عليها</p></div><div className="flex gap-2"><button onClick={()=>setShowSpaceForm(true)} className="rounded-xl border px-4 py-2 text-sm font-extrabold"><Plus size={16} className="ml-1 inline"/>مساحة</button><button onClick={()=>openNew()} className="rounded-xl bg-secondary px-4 py-2 text-sm font-extrabold"><Plus size={16} className="ml-1 inline"/>مهمة</button></div></div><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6"><button onClick={()=>setActiveCategory('all')} className={`rounded-xl border p-3 text-sm font-extrabold ${activeCategory==='all'?'bg-primary text-primary-foreground':'bg-background'}`}>كل المساحات</button>{categories.map((category)=>{const meta=getSpaceMeta(category,spaces);const editable=Array.isArray(spacesQuery.data)?spacesQuery.data.find((s)=>s.name===category):undefined;return <div key={category} className="relative"><button onClick={()=>setActiveCategory(category)} className={`w-full rounded-xl border p-3 text-right text-sm font-extrabold ${activeCategory===category?'bg-primary text-primary-foreground':'bg-background'}`}><span className="ml-2 inline-block h-2.5 w-2.5 rounded-full" style={{backgroundColor:meta.color}}/>{category}</button>{editable&&<><button onClick={()=>setEditingSpace(editable)} className="absolute left-8 top-1/2 -translate-y-1/2 p-1.5"><Pencil size={13}/></button><button onClick={()=>removeSpace(editable)} className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 text-destructive"><Trash2 size={13}/></button></>}</div>;})}</div></section>}
      {visibleSet.has('tasks') && <section className="mt-2" style={sectionStyle('tasks')}>{taskQuery.isLoading?<div className="grid gap-4 md:grid-cols-2"><div className="h-32 animate-pulse rounded-2xl bg-muted"/><div className="h-32 animate-pulse rounded-2xl bg-muted"/></div>:taskQuery.isError?<div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-10 text-center"><CircleAlert className="mx-auto mb-3 text-destructive"/><p className="font-extrabold">تعذر تحميل المهام</p><button onClick={()=>void taskQuery.refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><RefreshCw size={14} className="ml-1 inline"/>حاول مرة أخرى</button></div>:visibleTasks.length===0?<div className="rounded-3xl border border-dashed p-14 text-center"><Sparkles className="mx-auto mb-3 text-primary"/><p className="font-extrabold">لا توجد مهام هنا</p><button onClick={()=>openNew(activeCategory==='all'?undefined:activeCategory)} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground">أضف مهمة</button></div>:<div className="space-y-6">{activeCategory!=='all'&&<QuickTaskInput date={selectedDate} category={activeCategory}/>} {categories.filter((category)=>activeCategory==='all'?visibleTasks.some((t)=>t.category===category):category===activeCategory).map((category)=>{const categoryTasks=visibleTasks.filter((t)=>t.category===category);const meta=getSpaceMeta(category,spaces);return <div key={category} className="rounded-3xl border bg-card/55 p-4" style={{borderInlineStartColor:meta.color,borderInlineStartWidth:4}}><div className="mb-3 flex items-center justify-between"><div><h3 className="font-extrabold">{category}</h3><p className="text-xs text-muted-foreground">{meta.description}</p></div><button onClick={()=>openNew(category)} className="rounded-xl border p-2"><Plus size={16}/></button></div><div className="space-y-3">{categoryTasks.map((task)=><TaskCard key={task.id} task={task} date={task.taskDate} spaces={spaceNames}/>)}</div></div>;})}</div>}</section>}
    </div></main>
    {showForm&&<TaskForm date={selectedDate} initialCategory={formCategory} categoryLocked={Boolean(formCategory)} spaces={spaceNames} onClose={()=>setShowForm(false)}/>} {showSpaceForm&&<SpaceForm onClose={()=>setShowSpaceForm(false)} onCreated={(name)=>{setActiveCategory(name);setShowSpaceForm(false);}}/>} {editingSpace&&<SpaceForm space={editingSpace} onClose={()=>setEditingSpace(null)} onCreated={(name)=>{setActiveCategory(name);setEditingSpace(null);void queryClient.invalidateQueries({queryKey:getListSpacesQueryKey()});}}/>}
  </div>;
}
