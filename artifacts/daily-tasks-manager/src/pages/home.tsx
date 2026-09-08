import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, ClipboardList, Clock3, LayoutGrid, Plus, RefreshCw, Sparkles, Target, Trash2 } from 'lucide-react';
import { getListSpacesQueryKey, useDeleteSpace, useGetTaskSummary, useListSpaces, useListTasks } from '@workspace/api-client-react';
import type { Task } from '@workspace/api-client-react';
import { TaskCard } from '@/components/task-card';
import { TaskForm } from '@/components/task-form';
import { SpaceForm } from '@/components/space-form';
import { PalettePicker } from '@/components/palette-picker';
import { EventsSection } from '@/components/events-section';
import { SpaceLinksSection } from '@/components/space-links-section';
import { getDailyMessage } from '@/daily-messages';

type Category = Task['category'];

const fallbackSpaces = [
  { name: 'INV', color: '#2e8d77', description: 'قرارات وعمليات' },
  { name: 'BR', color: '#d39a2f', description: 'بناء ونمو' },
  { name: 'Qaff', color: '#c97768', description: 'مشاريع قاف' },
  { name: 'Wootz', color: '#6678bd', description: 'فريق ووتز' },
  { name: 'Self', color: '#77964d', description: 'مساحتك أنت' },
];
const fallbackColors = ['#2e8d77', '#d39a2f', '#c97768', '#6678bd', '#77964d', '#9a6bb1'];

function getSpaceMeta(name: string, spaces: Array<{ name: string; color?: string; description?: string | null }>) {
  const index = spaces.findIndex((space) => space.name === name);
  const fallback = fallbackSpaces.find((space) => space.name === name);
  return {
    color: spaces[index]?.color ?? fallback?.color ?? fallbackColors[Math.max(index, 0) % fallbackColors.length],
    description: spaces[index]?.description ?? fallback?.description ?? 'مساحة مخصصة',
  };
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));
}

function shiftDate(date: string, amount: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return dateKey(next);
}

export default function Home() {
  const queryClient = useQueryClient();
  const deleteSpace = useDeleteSpace();
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [showSpaceForm, setShowSpaceForm] = useState(false);
  const [formCategory, setFormCategory] = useState<Category | undefined>();

  const spacesQuery = useListSpaces();
  const taskQuery = useListTasks({ date: selectedDate });
  const summaryQuery = useGetTaskSummary({ date: selectedDate });
  const tasks = taskQuery.data ?? [];
  const spaces = spacesQuery.data ?? fallbackSpaces;
  const categories = useMemo(() => Array.from(new Set([...spaces.map((space) => space.name), ...tasks.map((task) => task.category)])), [spaces, tasks]);
  const spaceNames = spaces.map((space) => space.name);
  const visibleTasks = useMemo(() => activeCategory === 'all' ? tasks : tasks.filter((task) => task.category === activeCategory), [activeCategory, tasks]);
  const summary = summaryQuery.data;
  const completion = summary && summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
  const isToday = selectedDate === dateKey(new Date());

  const openNew = (category?: Category) => {
    setFormCategory(category);
    setShowForm(true);
  };

  const removeSpace = (name: string) => {
    const space = spacesQuery.data?.find((item) => item.name === name);
    if (!space) return;
    if (!window.confirm(`حذف مساحة ${name}؟ المهام الموجودة فيها لن تُحذف وستظل ظاهرة في يومها.`)) return;
    deleteSpace.mutate({ id: space.id }, {
      onSuccess: () => {
        if (activeCategory === name) setActiveCategory('all');
        void queryClient.invalidateQueries({ queryKey: getListSpacesQueryKey() });
      },
    });
  };

  const grouped = useMemo(() => categories.reduce<Record<string, Task[]>>((acc, category) => {
    acc[category] = visibleTasks.filter((task) => task.category === category);
    return acc;
  }, {}), [visibleTasks]);

  return (
    <div className="noise-overlay task-shell min-h-[100dvh]">
      <header className="border-b border-border/70 bg-card/60">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-secondary shadow-lg shadow-primary/15">
              <Target size={23} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-extrabold tracking-tight">مدار اليوم</p>
                <span className="hidden rounded-full bg-secondary/25 px-2 py-0.5 font-mono-ui text-[9px] font-bold tracking-widest text-primary sm:inline">COMMAND CENTER</span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">مساحتك لترتيب المهم قبل أن يبدأ الزحام</p>
            </div>
          </div>
           <div className="flex items-center gap-2">
             <div className="hidden items-center gap-2 text-xs font-bold text-muted-foreground sm:flex"><Clock3 size={16} className="text-accent" /> كل إنجاز يفتح مساحة</div>
             <PalettePicker />
           </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-5 pb-16 pt-8 sm:px-8 lg:px-12">
        <section className="animate-rise mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-bold text-muted-foreground">
              <CalendarDays size={17} className="text-primary" />
              <span>{isToday ? 'اليوم' : 'مخطط يوم آخر'}</span>
              <span className="text-border">/</span>
              <span className="font-mono-ui text-xs" dir="ltr">{selectedDate}</span>
            </div>
            <h1 data-testid="text-date-heading" className="max-w-2xl text-3xl font-extrabold leading-[1.25] tracking-tight sm:text-5xl">{dateLabel(selectedDate)}</h1>
             <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">{getDailyMessage(selectedDate)}</p>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card/75 p-2 shadow-sm">
            <button type="button" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} aria-label="اليوم السابق" data-testid="button-previous-day" className="rounded-xl p-3 text-muted-foreground transition hover:bg-muted hover:text-foreground"><ChevronRight size={20} /></button>
            <button type="button" onClick={() => setSelectedDate(dateKey(new Date()))} data-testid="button-today" className={`rounded-xl px-4 py-2 text-sm font-extrabold transition ${isToday ? 'bg-primary text-primary-foreground' : 'text-primary hover:bg-primary/10'}`}>اليوم</button>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="اختيار التاريخ" data-testid="input-selected-date" className="min-w-0 rounded-xl border-0 bg-background px-3 py-2 text-sm font-bold text-foreground outline-none" />
            <button type="button" onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} aria-label="اليوم التالي" data-testid="button-next-day" className="rounded-xl p-3 text-muted-foreground transition hover:bg-muted hover:text-foreground"><ChevronLeft size={20} /></button>
          </div>
        </section>

        <section className="animate-rise mb-8 grid gap-4 md:grid-cols-[1.35fr_1fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-xl shadow-primary/10">
            <Sparkles className="absolute -left-2 -top-3 h-24 w-24 opacity-10" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-bold text-primary-foreground/70">إيقاع اليوم</p><p data-testid="status-progress" className="mt-2 text-4xl font-extrabold">{completion}<span className="text-2xl text-secondary">%</span></p></div>
                <div className="rounded-xl bg-primary-foreground/10 p-3"><Target size={22} className="text-secondary" /></div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-primary-foreground/15"><div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: `${completion}%` }} /></div>
              <p className="mt-3 text-xs font-semibold text-primary-foreground/70">{summary?.completed ?? 0} من {summary?.total ?? 0} مهام اكتملت — حافظ على الإيقاع</p>
            </div>
          </div>
          <div className="rounded-3xl border border-card-border bg-card p-6">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-muted-foreground">المتبقي</p><ClipboardList size={20} className="text-accent" /></div>
            <p data-testid="text-remaining-count" className="mt-4 text-4xl font-extrabold">{summary?.remaining ?? '—'}</p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">مهمة تنتظر قرارك</p>
          </div>
          <div className="rounded-3xl border border-card-border bg-card p-6">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-muted-foreground">كل المهام</p><LayoutGrid size={20} className="text-primary" /></div>
            <p data-testid="text-total-count" className="mt-4 text-4xl font-extrabold">{summary?.total ?? '—'}</p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">عبر {spaceNames.length} مساحات</p>
          </div>
        </section>

        <EventsSection />
        <SpaceLinksSection spaces={spacesQuery.data ?? []} />

        <section className="animate-rise rounded-3xl border border-card-border bg-card/70 p-4 shadow-sm sm:p-5" style={{ animationDelay: '90ms' }}>
          <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold">خريطة اليوم</h2>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">اختر مساحة لتصفية تركيزك، أو ابدأ من الصورة الكاملة</p>
            </div>
             <div className="flex flex-col gap-2 sm:flex-row">
               <button type="button" onClick={() => setShowSpaceForm(true)} data-testid="button-add-space" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-background px-4 text-sm font-extrabold text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"><Plus size={18} /> مساحة جديدة</button>
               <button type="button" onClick={() => openNew()} data-testid="button-add-task" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-extrabold text-secondary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-secondary/85"><Plus size={18} /> مهمة جديدة</button>
             </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <button type="button" onClick={() => setActiveCategory('all')} data-testid="button-filter-all" className={`flex items-center justify-between rounded-2xl border p-3 text-right transition ${activeCategory === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/40'}`}>
              <span className="text-sm font-extrabold">كل المساحات</span><span className={`font-mono-ui text-xs ${activeCategory === 'all' ? 'text-secondary' : 'text-muted-foreground'}`}>{summary?.total ?? 0}</span>
            </button>
            {categories.map((category) => {
              const count = summary?.byCategory?.[category] ?? 0;
               const meta = getSpaceMeta(category, spaces);
               const canDelete = spacesQuery.data?.some((space) => space.name === category);
               return <div key={category} className="relative"><button type="button" onClick={() => setActiveCategory(category)} data-testid={`button-filter-${category}`} className={`flex w-full items-center justify-between rounded-2xl border p-3 pl-10 text-right transition ${activeCategory === category ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/40'}`}><span className="flex items-center gap-2 text-sm font-extrabold"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />{category}</span><span className={`font-mono-ui text-xs ${activeCategory === category ? 'text-secondary' : 'text-muted-foreground'}`}>{count}</span></button>{canDelete && <button type="button" onClick={() => removeSpace(category)} disabled={deleteSpace.isPending} aria-label={`حذف مساحة ${category}`} data-testid={`button-delete-space-${category}`} className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition ${activeCategory === category ? 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground' : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'}`}><Trash2 size={14} /></button>}</div>;
            })}
          </div>
        </section>

        <section className="mt-8">
          {taskQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2"><div className="h-32 animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /></div>
          ) : taskQuery.isError ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center"><CircleAlert className="mb-4 text-destructive" size={30} /><h2 className="font-extrabold">تعذر تحميل يومك</h2><p className="mt-2 text-sm text-muted-foreground">يبدو أن هناك مشكلة مؤقتة في الاتصال.</p><button type="button" onClick={() => void taskQuery.refetch()} data-testid="button-retry-tasks" className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><RefreshCw size={15} /> حاول مرة أخرى</button></div>
          ) : visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-primary/25 bg-card/55 px-6 py-20 text-center"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary/25 text-primary"><Sparkles size={29} /></div><h2 className="text-xl font-extrabold">{activeCategory === 'all' ? 'اليوم ما زال مفتوحاً' : `لا توجد مهام في ${activeCategory}`}</h2><p className="mt-2 max-w-sm text-sm leading-7 text-muted-foreground">{activeCategory === 'all' ? 'أضف أول خطوة صغيرة، ودع بقية اليوم يتضح معها.' : 'مساحة هادئة. أضف مهمة عندما يحين وقتها.'}</p><button type="button" onClick={() => openNew(activeCategory === 'all' ? undefined : activeCategory)} data-testid="button-add-first-task" className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5"><Plus size={17} /> أضف مهمة</button></div>
          ) : activeCategory !== 'all' ? (
             <div className="grid gap-3 md:grid-cols-2">{visibleTasks.map((task) => <TaskCard key={task.id} task={task} date={selectedDate} spaces={spaceNames} />)}</div>
          ) : (
            <div className="space-y-8">
               {categories.filter((category) => grouped[category].length > 0).map((category) => { const meta = getSpaceMeta(category, spaces); return <div key={category} className="rounded-[1.75rem] border border-card-border bg-card/55 p-4 shadow-sm sm:p-5" style={{ borderInlineStartColor: meta.color, borderInlineStartWidth: 4 }}><div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3"><div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: meta.color }} /><div><h3 className="font-extrabold">{category}</h3><p className="text-xs font-semibold text-muted-foreground">{meta.description}</p></div></div><button type="button" onClick={() => openNew(category)} data-testid={`button-add-task-${category}`} className="rounded-xl border border-border bg-background p-2 text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-primary"><Plus size={17} /></button></div><div className="grid gap-3 md:grid-cols-2">{grouped[category].map((task) => <TaskCard key={task.id} task={task} date={selectedDate} spaces={spaceNames} />)}</div></div>; })}
            </div>
          )}
        </section>
      </main>
       {showForm && <TaskForm date={selectedDate} initialCategory={formCategory} categoryLocked={Boolean(formCategory)} spaces={spaceNames} onClose={() => setShowForm(false)} />}
       {showSpaceForm && <SpaceForm onClose={() => setShowSpaceForm(false)} onCreated={(name) => { setActiveCategory(name); }} />}
    </div>
  );
}