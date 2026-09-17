import { lazy, Suspense, type FormEvent, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useClerk, useUser } from '@clerk/react';
import {
  CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Loader2, Pencil, Plus,
  RefreshCw, ShieldCheck, Sparkles, Target, Trash2, UserRound,
} from 'lucide-react';
import {
  getGetAdminAccessQueryKey, getGetDashboardPreferencesQueryKey, getGetTaskSummaryQueryKey,
  getListSpacesQueryKey, getListTasksQueryKey,
  useCreateTask, useDeleteSpace, useGetAdminAccess, useGetDashboardPreferences,
  useGetTaskSummary, useListSpaces, useListTasks, useUpdateTask,
} from '@workspace/api-client-react';
import type { Space, Task } from '@workspace/api-client-react';
import { TaskCard } from '@/components/task-card';
import { TaskForm } from '@/components/task-form';
import { SpaceForm } from '@/components/space-form';
import { DashboardCustomizer, normalizeDashboardSections } from '@/components/dashboard-customizer';
import { PersistentSpaceLinks } from '@/components/persistent-space-links';
import { PalettePicker } from '@/components/palette-picker';
import { getDailyMessage } from '@/daily-messages';

const ProductivityHub = lazy(() => import('@/components/productivity-hub').then((m) => ({ default: m.ProductivityHub })));

type Category = Task['category'];

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
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return dateKey(next);
}
function getSpaceMeta(name: string, spaces: Array<{ name: string; color?: string; description?: string | null }>) {
  const index = spaces.findIndex((space) => space.name === name);
  const fallback = fallbackSpaces.find((space) => space.name === name);
  return {
    color: spaces[index]?.color ?? fallback?.color ?? fallbackColors[Math.max(index, 0) % fallbackColors.length],
    description: spaces[index]?.description ?? fallback?.description ?? 'مساحة مخصصة',
  };
}
function SectionFallback() { return <div className="mb-6 h-24 animate-pulse rounded-3xl bg-muted/60" />; }

function AccountControl() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const adminAccess = useGetAdminAccess({ query: { queryKey: [...getGetAdminAccessQueryKey(), user?.id ?? 'pending-account'], enabled: Boolean(user?.id), staleTime: 5 * 60_000, refetchOnWindowFocus: false } });
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'حسابي';
  return <div className="flex items-center gap-1 rounded-2xl border border-border/80 bg-background/80 p-1 shadow-sm">
    <span className="hidden items-center gap-2 px-2 text-xs font-extrabold md:flex"><UserRound size={14}/>{name}</span>
    {adminAccess.data?.isAdmin && <a href={`${basePath}/admin`} className="rounded-xl bg-accent/10 px-3 py-2 text-xs font-extrabold" data-testid="link-admin"><ShieldCheck size={14} className="ml-1 inline"/>الإدارة</a>}
    <button type="button" onClick={() => void signOut({ redirectUrl: basePath || '/' })} className="rounded-xl bg-muted px-3 py-2 text-xs font-extrabold text-primary">خروج</button>
  </div>;
}

function QuickTaskInput({ date, category }: { date: string; category: Category }) {
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const [title, setTitle] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    createTask.mutate({ data: { taskDate: date, category, title: cleanTitle, priority: 'medium' } }, {
      onSuccess: () => {
        setTitle('');
        void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
      },
    });
  };
  return <form onSubmit={submit} className="flex gap-2 rounded-2xl border border-primary/20 bg-primary/[0.04] p-2.5"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اكتب مهمة سريعة..." className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none"/><button type="submit" disabled={createTask.isPending || !title.trim()} className="rounded-xl bg-primary px-4 text-primary-foreground disabled:opacity-50">{createTask.isPending ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}</button></form>;
}

export default function HomeOptimized() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [showSpaceForm, setShowSpaceForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [formCategory, setFormCategory] = useState<Category | undefined>();
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  const preferences = useGetDashboardPreferences({ query: { queryKey: getGetDashboardPreferencesQueryKey(), staleTime: 5 * 60_000, refetchOnWindowFocus: false } });
  const layout = normalizeDashboardSections(preferences.data?.visibleSections, preferences.data?.sectionOrder);
  const visibleSet = useMemo(() => new Set(layout.visibleSections), [layout.visibleSections.join('|')]);
  const range = useMemo(() => ({ date: selectedDate }), [selectedDate]);
  const spacesQuery = useListSpaces({ query: { queryKey: getListSpacesQueryKey(), staleTime: 5 * 60_000, refetchOnWindowFocus: false } });
  const taskQuery = useListTasks(range, { query: { queryKey: getListTasksQueryKey(range), staleTime: 30_000, refetchOnWindowFocus: false } });
  const summaryQuery = useGetTaskSummary(range, { query: { queryKey: getGetTaskSummaryQueryKey(range), staleTime: 30_000, refetchOnWindowFocus: false } });
  const deleteSpace = useDeleteSpace();
  const updateTask = useUpdateTask();

  const tasks = Array.isArray(taskQuery.data) ? taskQuery.data : [];
  const realSpaces = Array.isArray(spacesQuery.data) ? spacesQuery.data : [];
  const spaces = realSpaces.length ? realSpaces : fallbackSpaces;
  const spaceNames = spaces.map((space) => space.name);
  const categories = useMemo(() => Array.from(new Set([...spaceNames, ...tasks.map((task) => task.category)])), [spaceNames.join('|'), tasks]);
  const visibleTasks = useMemo(() => activeCategory === 'all' ? tasks : tasks.filter((task) => task.category === activeCategory), [activeCategory, tasks]);
  const taskCounts = useMemo(() => tasks.reduce<Record<string, number>>((counts, task) => {
    counts[task.category] = (counts[task.category] ?? 0) + 1;
    return counts;
  }, {}), [tasks]);
  const summary = summaryQuery.data;
  const completion = summary && summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
  const isToday = selectedDate === dateKey(new Date());
  const sectionStyle = (key: string) => ({ order: layout.sectionOrder.indexOf(key) < 0 ? 99 : layout.sectionOrder.indexOf(key) });
  const openNew = (category?: Category) => { setFormCategory(category); setShowForm(true); };
  const removeSpace = (space: Space) => deleteSpace.mutate({ id: space.id }, { onSuccess: () => { if (activeCategory === space.name) setActiveCategory('all'); void queryClient.invalidateQueries({ queryKey: getListSpacesQueryKey() }); } });

  const reorderTasks = async (category: Category, draggedId: number, targetId: number) => {
    if (draggedId === targetId || updateTask.isPending) return;
    const categoryTasks = tasks.filter((item) => item.category === category);
    const fromIndex = categoryTasks.findIndex((item) => item.id === draggedId);
    const toIndex = categoryTasks.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...categoryTasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const orderById = new Map(reordered.map((item, index) => [item.id, index]));
    const queryKey = getListTasksQueryKey(range);
    const previous = queryClient.getQueryData<Task[]>(queryKey);
    queryClient.setQueryData<Task[]>(queryKey, (current) => current?.map((item) => item.category === category ? { ...item, sortOrder: orderById.get(item.id) ?? item.sortOrder } : item));
    setDraggedTaskId(null);

    try {
      await Promise.all(reordered.map((item, index) => updateTask.mutateAsync({ id: item.id, data: { sortOrder: index } })));
      await queryClient.invalidateQueries({ queryKey });
    } catch {
      queryClient.setQueryData(queryKey, previous);
    }
  };

  return <div className="noise-overlay task-shell min-h-[100dvh]" dir="rtl">
    <header className="sticky top-0 z-30 border-b border-border/70 bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-secondary"><Target size={21}/></div><div><p className="text-lg font-black">إنجازك اليومي</p><p className="text-[11px] font-semibold text-muted-foreground">اليوم أولاً</p></div></div>
        <div className="flex flex-wrap items-center justify-end gap-2"><PersistentSpaceLinks spaces={realSpaces}/><DashboardCustomizer/><PalettePicker/><AccountControl/></div>
      </div>
    </header>

    <main className="mx-auto max-w-[1480px] px-5 pb-12 pt-5 sm:px-8 lg:px-12">
      <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_340px] lg:items-end">
        <div><div className="mb-1 flex items-center gap-2 text-sm font-bold text-muted-foreground"><CalendarDays size={16} className="text-primary"/>{isToday ? 'اليوم' : 'يوم آخر'}</div><h1 className="text-3xl font-extrabold sm:text-4xl">{dateLabel(selectedDate)}</h1><p className="mt-2 text-sm text-muted-foreground">{getDailyMessage(selectedDate)}</p></div>
        <div className="flex items-center justify-between rounded-2xl border bg-card/75 p-2"><button onClick={() => setSelectedDate(shiftDate(selectedDate,-1))} className="rounded-xl p-3"><ChevronRight size={20}/></button><button onClick={() => setSelectedDate(dateKey(new Date()))} className="rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground">اليوم</button><input type="date" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="min-w-0 rounded-xl bg-background px-3 py-2 text-sm font-bold"/><button onClick={() => setSelectedDate(shiftDate(selectedDate,1))} className="rounded-xl p-3"><ChevronLeft size={20}/></button></div>
      </section>

      <div className="flex flex-col">
        {visibleSet.has('summary') && <section className="mb-5 rounded-3xl border bg-card/70 p-4" style={sectionStyle('summary')}>
          <div className="flex flex-wrap items-center gap-4"><div className="min-w-[120px]"><p className="text-xs font-bold text-muted-foreground">إنجاز اليوم</p><p className="mt-1 text-3xl font-extrabold text-primary">{completion}%</p></div><div className="min-w-[110px]"><p className="text-xs text-muted-foreground">مكتمل</p><p className="text-xl font-extrabold">{summary?.completed ?? 0}</p></div><div className="min-w-[110px]"><p className="text-xs text-muted-foreground">متبقي</p><p className="text-xl font-extrabold">{summary?.remaining ?? 0}</p></div><div className="min-w-[110px]"><p className="text-xs text-muted-foreground">الإجمالي</p><p className="text-xl font-extrabold">{summary?.total ?? 0}</p></div><div className="min-w-[180px] flex-1"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }}/></div></div></div>
        </section>}

        {visibleSet.has('productivity') && <div style={sectionStyle('productivity')}><Suspense fallback={<SectionFallback/>}><ProductivityHub/></Suspense></div>}

        {visibleSet.has('taskMap') && <section className="mb-5 rounded-3xl border border-card-border bg-card/70 p-4" style={sectionStyle('taskMap')}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-extrabold">المساحات</h2><p className="text-xs text-muted-foreground">فلتر سريع حسب الشركة أو نوع العمل</p></div><div className="flex gap-2"><button onClick={()=>setShowSpaceForm(true)} className="rounded-xl border px-4 py-2 text-sm font-extrabold"><Plus size={16} className="ml-1 inline"/>مساحة</button><button onClick={()=>openNew()} className="rounded-xl bg-secondary px-4 py-2 text-sm font-extrabold"><Plus size={16} className="ml-1 inline"/>مهمة</button></div></div>
          <div className="flex flex-wrap gap-2"><button onClick={()=>setActiveCategory('all')} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-extrabold ${activeCategory==='all'?'bg-primary text-primary-foreground':'bg-background'}`}>الكل <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeCategory==='all'?'bg-primary-foreground/15':'bg-muted text-muted-foreground'}`}>{tasks.length}</span></button>{categories.map((category)=>{const meta=getSpaceMeta(category,spaces);const editable=realSpaces.find((s)=>s.name===category);const count=taskCounts[category]??0;return <div key={category} className="relative"><button onClick={()=>setActiveCategory(category)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 ${editable?'pl-14':''} text-sm font-extrabold ${activeCategory===category?'bg-primary text-primary-foreground':'bg-background'}`}><span className="inline-block h-2.5 w-2.5 rounded-full" style={{backgroundColor:meta.color}}/><span>{category}</span><span className={`rounded-full px-2 py-0.5 text-[10px] ${activeCategory===category?'bg-primary-foreground/15':'bg-muted text-muted-foreground'}`}>{count}</span></button>{editable&&<><button onClick={()=>setEditingSpace(editable)} className="absolute left-7 top-1/2 -translate-y-1/2 p-1"><Pencil size={12}/></button><button onClick={()=>removeSpace(editable)} className="absolute left-1 top-1/2 -translate-y-1/2 p-1 text-destructive"><Trash2 size={12}/></button></>}</div>;})}</div>
        </section>}

        {visibleSet.has('tasks') && <section className="mt-1" style={sectionStyle('tasks')}>
          {taskQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2"><div className="h-32 animate-pulse rounded-2xl bg-muted"/><div className="h-32 animate-pulse rounded-2xl bg-muted"/></div> : taskQuery.isError ? <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-10 text-center"><CircleAlert className="mx-auto mb-3 text-destructive"/><p className="font-extrabold">تعذر تحميل المهام</p><button onClick={()=>void taskQuery.refetch()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><RefreshCw size={14} className="ml-1 inline"/>حاول مرة أخرى</button></div> : visibleTasks.length===0 ? <div className="rounded-3xl border border-dashed p-12 text-center"><Sparkles className="mx-auto mb-3 text-primary"/><p className="font-extrabold">لا توجد مهام هنا</p><button onClick={()=>openNew(activeCategory==='all'?undefined:activeCategory)} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground">أضف مهمة</button></div> : <div className="space-y-5">{activeCategory!=='all'&&<QuickTaskInput date={selectedDate} category={activeCategory}/>} {categories.filter((category)=>activeCategory==='all'?visibleTasks.some((t)=>t.category===category):category===activeCategory).map((category)=>{const categoryTasks=visibleTasks.filter((t)=>t.category===category);const meta=getSpaceMeta(category,spaces);return <div key={category} className="rounded-3xl border bg-card/55 p-4" style={{borderInlineStartColor:meta.color,borderInlineStartWidth:4}}><div className="mb-3 flex items-center justify-between"><div><h3 className="font-extrabold">{category} <span className="mr-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{categoryTasks.length}</span></h3><p className="text-xs text-muted-foreground">{meta.description}</p></div><button onClick={()=>openNew(category)} className="rounded-xl border p-2"><Plus size={16}/></button></div><div className="space-y-3">{categoryTasks.map((task)=><TaskCard key={task.id} task={task} date={task.taskDate} spaces={spaceNames} onDragStart={(id)=>setDraggedTaskId(id||null)} onDropTask={(draggedId)=>void reorderTasks(category,draggedId,task.id)} isDragging={draggedTaskId===task.id}/>)}</div></div>;})}</div>}
        </section>}
      </div>
    </main>

    {showForm&&<TaskForm date={selectedDate} initialCategory={formCategory} categoryLocked={Boolean(formCategory)} spaces={spaceNames} onClose={()=>setShowForm(false)}/>} 
    {showSpaceForm&&<SpaceForm onClose={()=>setShowSpaceForm(false)} onCreated={(name)=>{setActiveCategory(name);setShowSpaceForm(false);}}/>}
    {editingSpace&&<SpaceForm space={editingSpace} onClose={()=>setEditingSpace(null)} onCreated={(name)=>{setActiveCategory(name);setEditingSpace(null);void queryClient.invalidateQueries({queryKey:getListSpacesQueryKey()});}}/>}
  </div>;
}
