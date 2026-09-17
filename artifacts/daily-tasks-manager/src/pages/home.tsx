import { type FormEvent, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useClerk, useUser } from '@clerk/react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleAlert, ClipboardList, GraduationCap, LayoutGrid, Loader2, Pencil, Plus, RefreshCw, Settings2, Sparkles, Target, Trash2, ShieldCheck, UserRound } from 'lucide-react';
import { getGetAdminAccessQueryKey, getGetOnboardingStatusQueryKey, getGetTaskSummaryQueryKey, getListSpacesQueryKey, getListTasksQueryKey, UsageType, useCreateTask, useDeleteSpace, useGetAdminAccess, useGetDashboardPreferences, useGetOnboardingStatus, useGetTaskSummary, useListSpaces, useListTasks, useUpdateTask, useUpdateUsageType } from '@workspace/api-client-react';
import type { Space, Task } from '@workspace/api-client-react';
import { TaskCard } from '@/components/task-card';
import { TaskForm } from '@/components/task-form';
import { SpaceForm } from '@/components/space-form';
import { PalettePicker } from '@/components/palette-picker';
import { EventsSection } from '@/components/events-section';
import { SpaceLinksSection } from '@/components/space-links-section';
import { getDailyMessage } from '@/daily-messages';
import { ProductivityHub } from '@/components/productivity-hub';
import { NotificationCenter } from '@/components/notification-center';
import { DailyPlan } from '@/components/daily-plan';
import { DashboardCustomizer, defaultDashboardSections } from '@/components/dashboard-customizer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

function rangeFor(date: string, mode: 'day' | 'week' | 'month') {
  const start = new Date(`${date}T12:00:00`);
  if (mode === 'day') return { date };
  if (mode === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { dateFrom: dateKey(start), dateTo: dateKey(end) };
  }
  start.setDate(1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
  return { dateFrom: dateKey(start), dateTo: dateKey(end) };
}

function AccountControl() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const onboarding = useGetOnboardingStatus();
  const adminAccess = useGetAdminAccess({
    query: {
      queryKey: [...getGetAdminAccessQueryKey(), user?.id ?? 'pending-account'],
      enabled: Boolean(user?.id),
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<UsageType | null>(null);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'حسابي';
  const typeLabels: Record<UsageType, string> = {
    [UsageType.student]: 'طالب',
    [UsageType.employee]: 'موظف',
    [UsageType.freelancer]: 'مستقل',
    [UsageType.personal]: 'شخصي',
  };
  const currentType = onboarding.data?.usageType ?? null;
  const updateType = useUpdateUsageType({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetOnboardingStatusQueryKey(), data);
        setTypeDialogOpen(false);
      },
    },
  });

  const openTypeDialog = (open: boolean) => {
    setTypeDialogOpen(open);
    if (open) setSelectedType(currentType);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-border/80 bg-background/80 px-2.5 py-1.5 shadow-sm">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound size={16} /></span>
        <div className="hidden min-w-0 max-w-36 md:block">
          <p className="truncate text-xs font-extrabold text-foreground">{name}</p>
          <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">{currentType ? typeLabels[currentType] : 'حساب شخصي'}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 rounded-2xl border border-border/80 bg-background/80 p-1 shadow-sm">
      {adminAccess.data?.isAdmin && <a href={`${basePath}/admin`} className="flex items-center gap-1.5 rounded-xl bg-accent/10 px-3 py-2 text-xs font-extrabold text-accent-foreground transition hover:bg-accent/20" data-testid="link-admin"><ShieldCheck size={14} /> الإدارة</a>}
      <Dialog open={typeDialogOpen} onOpenChange={openTypeDialog}>
        <DialogTrigger asChild>
          <button type="button" className="flex items-center gap-1.5 rounded-xl bg-secondary/15 px-3 py-2 text-xs font-extrabold text-primary transition hover:bg-secondary/30" data-testid="button-change-usage-type">
            <Settings2 size={14} />
            <span className="hidden sm:inline">{currentType ? typeLabels[currentType] : 'نوع الحساب'}</span>
          </button>
        </DialogTrigger>
        <DialogContent dir="rtl" className="max-w-lg rounded-3xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-xl"><GraduationCap className="text-primary" /> غيّر طريقة استخدامك</DialogTitle>
            <DialogDescription className="leading-6">
              سيُحدّث نوع حسابك فقط، وستظل جميع مساحاتك ومهامك الحالية كما هي.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-3">
            {Object.values(UsageType).map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => setSelectedType(type)}
                disabled={updateType.isPending}
                className={`flex items-center justify-between rounded-2xl border-2 px-4 py-4 text-sm font-extrabold transition ${selectedType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:border-primary/40'}`}
                data-testid={`button-account-type-${type}`}
              >
                {typeLabels[type]}
                {selectedType === type && <Check size={17} />}
              </button>
            ))}
          </div>
          {updateType.isError && <p className="text-sm font-bold text-destructive">تعذر حفظ التغيير. حاول مرة أخرى.</p>}
          <Button
            disabled={!selectedType || selectedType === currentType || updateType.isPending}
            onClick={() => selectedType && updateType.mutate({ data: { usageType: selectedType } })}
            className="h-12 rounded-xl font-extrabold"
            data-testid="button-save-usage-type"
          >
            {updateType.isPending ? <Loader2 className="animate-spin" /> : 'حفظ نوع الحساب'}
          </Button>
        </DialogContent>
      </Dialog>
      <button type="button" onClick={() => void signOut({ redirectUrl: basePath || '/' })} className="rounded-xl bg-muted px-3 py-2 text-xs font-extrabold text-primary transition hover:bg-secondary/30">تسجيل الخروج</button>
      </div>
    </div>
  );
}

function QuickTaskInput({ date, category, onCreated }: { date: string; category: Category; onCreated?: () => void }) {
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('اكتب اسم المهمة أولاً');
      return;
    }

    setError('');
    createTask.mutate({
      data: {
        taskDate: date,
        category,
        title: cleanTitle,
        priority: 'medium',
      },
    }, {
      onSuccess: () => {
        setTitle('');
        void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
        onCreated?.();
      },
      onError: () => setError('تعذر إضافة المهمة. حاول مرة أخرى.'),
    });
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-2.5">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError('');
          }}
          placeholder="اكتب مهمة سريعة..."
          aria-label={`إضافة مهمة سريعة في ${category}`}
          data-testid={`input-quick-task-${category}`}
          className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
        <button
          type="submit"
          disabled={createTask.isPending}
          data-testid={`button-quick-task-${category}`}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-extrabold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60 sm:px-4"
        >
          {createTask.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          <span className="hidden sm:inline">إضافة سريعة</span>
          <span className="sm:hidden">إضافة</span>
        </button>
      </div>
      {error && <p className="px-1 pt-1.5 text-xs font-bold text-destructive">{error}</p>}
    </form>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const deleteSpace = useDeleteSpace();
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [showSpaceForm, setShowSpaceForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [formCategory, setFormCategory] = useState<Category | undefined>();
  const [quickAddCategory, setQuickAddCategory] = useState<Category | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  const spacesQuery = useListSpaces();
  const taskQuery = useListTasks(rangeFor(selectedDate, viewMode));
  const summaryQuery = useGetTaskSummary(rangeFor(selectedDate, viewMode));
  const dashboardPreferences = useGetDashboardPreferences();
  const reorderMutation = useUpdateTask();
  const onboarding = useGetOnboardingStatus();
  const tasks = Array.isArray(taskQuery.data) ? taskQuery.data : [];
  const spaces = Array.isArray(spacesQuery.data) ? spacesQuery.data : fallbackSpaces;
  const categories = useMemo(() => Array.from(new Set([...spaces.map((space) => space.name), ...tasks.map((task) => task.category)])), [spaces, tasks]);
  const spaceNames = spaces.map((space) => space.name);
  const visibleTasks = useMemo(() => activeCategory === 'all' ? tasks : tasks.filter((task) => task.category === activeCategory), [activeCategory, tasks]);
  const summary = summaryQuery.data;
  const completion = summary && summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
  const isToday = selectedDate === dateKey(new Date());
  const visibleSections = Array.isArray(dashboardPreferences.data?.visibleSections)
    ? dashboardPreferences.data.visibleSections
    : defaultDashboardSections;
  const sectionOrder = Array.isArray(dashboardPreferences.data?.sectionOrder)
    ? dashboardPreferences.data.sectionOrder
    : defaultDashboardSections;
  const showSection = (key: string) => visibleSections.includes(key);
  const sectionRank = (key: string) => ({ order: sectionOrder.indexOf(key) < 0 ? 99 : sectionOrder.indexOf(key) });

  const reorderTask = async (taskId: number, category: string, direction: 'up' | 'down') => {
    const categoryTasks = tasks
      .filter((task) => task.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
    const index = categoryTasks.findIndex((task) => task.id === taskId);
    const targetIndex = index + (direction === 'up' ? -1 : 1);
    if (index < 0 || targetIndex < 0 || targetIndex >= categoryTasks.length) return;
    const reordered = [...categoryTasks];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    await Promise.all(reordered.map((task, nextIndex) => reorderMutation.mutateAsync({ id: task.id, data: { sortOrder: nextIndex } })));
    await queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
  };

  const reorderDraggedTask = async (draggedId: number, targetId: number, category: string) => {
    if (draggedId === targetId) return;
    const categoryTasks = tasks
      .filter((task) => task.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
    const fromIndex = categoryTasks.findIndex((task) => task.id === draggedId);
    const targetIndex = categoryTasks.findIndex((task) => task.id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    const reordered = [...categoryTasks];
    const [movedTask] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, movedTask);
    setDraggedTaskId(null);
    await Promise.all(reordered.map((task, nextIndex) => reorderMutation.mutateAsync({ id: task.id, data: { sortOrder: nextIndex } })));
    await queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
  };

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
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-secondary shadow-lg shadow-primary/15">
              <Target size={23} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black tracking-tight">إنجازك اليومي</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">مساحتك لترتيب المهم قبل أن يبدأ الزحام</p>
            </div>
          </div>
           <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <DashboardCustomizer />
              <PalettePicker />
              <AccountControl />
           </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-5 pb-12 pt-6 sm:px-8 lg:px-12">
        <section className="animate-rise mb-6 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-bold text-muted-foreground">
              <CalendarDays size={17} className="text-primary" />
              <span>{isToday ? 'اليوم' : 'مخطط يوم آخر'}</span>
              <span className="text-border">/</span>
              <span className="font-mono-ui text-xs" dir="ltr">{selectedDate}</span>
            </div>
            <h1 data-testid="text-date-heading" className="max-w-2xl text-3xl font-extrabold leading-[1.25] tracking-tight sm:text-5xl">{dateLabel(selectedDate)}</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                {onboarding.data?.usageType === 'student' ? 'خطتك الدراسية أمامك — اجعل كل جلسة مراجعة خطوة واضحة.' :
                  onboarding.data?.usageType === 'employee' ? 'رتّب أولويات العمل واترك مساحة للاجتماعات والإنجاز العميق.' :
                    onboarding.data?.usageType === 'freelancer' ? 'تابع العملاء والمشاريع دون أن تضيع التفاصيل المهمة.' :
                      onboarding.data?.usageType === 'personal' ? 'وازن بين أهدافك وعاداتك وما يحتاجه يومك الآن.' : getDailyMessage(selectedDate)}
              </p>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card/75 p-2 shadow-sm">
            <button type="button" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} aria-label="اليوم السابق" data-testid="button-previous-day" className="rounded-xl p-3 text-muted-foreground transition hover:bg-muted hover:text-foreground"><ChevronRight size={20} /></button>
            <button type="button" onClick={() => setSelectedDate(dateKey(new Date()))} data-testid="button-today" className={`rounded-xl px-4 py-2 text-sm font-extrabold transition ${isToday ? 'bg-primary text-primary-foreground' : 'text-primary hover:bg-primary/10'}`}>اليوم</button>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="اختيار التاريخ" data-testid="input-selected-date" className="min-w-0 rounded-xl border-0 bg-background px-3 py-2 text-sm font-bold text-foreground outline-none" />
            <button type="button" onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} aria-label="اليوم التالي" data-testid="button-next-day" className="rounded-xl p-3 text-muted-foreground transition hover:bg-muted hover:text-foreground"><ChevronLeft size={20} /></button>
          </div>
        </section>
        <div className="mb-6 rounded-2xl border border-border bg-card/70 p-2" role="tablist" aria-label="طريقة عرض المهام">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="px-2 text-sm font-extrabold text-muted-foreground sm:shrink-0">عرض المهام</span>
            <div className="grid grid-cols-3 gap-1.5 sm:flex-1">
              {([['day', 'يومي'], ['week', 'أسبوعي'], ['month', 'شهري']] as const).map(([mode, label]) => (
                <button key={mode} type="button" onClick={() => setViewMode(mode)} role="tab" aria-selected={viewMode === mode} className={`rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${viewMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col">
         {showSection('summary') && <section className="animate-rise mb-6 grid gap-3 md:grid-cols-[1.35fr_1fr_1fr]" style={sectionRank('summary')}>
          <div className="relative overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/10">
            <Sparkles className="absolute -left-2 -top-3 h-24 w-24 opacity-10" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-bold text-primary-foreground/70">إيقاع اليوم</p><p data-testid="status-progress" className="mt-2 text-4xl font-extrabold">{completion}<span className="text-2xl text-secondary">%</span></p></div>
                <div className="rounded-xl bg-primary-foreground/10 p-3"><Target size={22} className="text-secondary" /></div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15"><div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: `${completion}%` }} /></div>
              <p className="mt-2 text-[11px] font-semibold text-primary-foreground/70">{summary?.completed ?? 0} من {summary?.total ?? 0} مهام اكتملت — حافظ على الإيقاع</p>
            </div>
          </div>
          <div className="rounded-2xl border border-card-border bg-card p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-muted-foreground">المتبقي</p><ClipboardList size={20} className="text-accent" /></div>
            <p data-testid="text-remaining-count" className="mt-2 text-3xl font-extrabold">{summary?.remaining ?? '—'}</p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">مهمة تنتظر قرارك</p>
          </div>
          <div className="rounded-2xl border border-card-border bg-card p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-muted-foreground">كل المهام</p><LayoutGrid size={20} className="text-primary" /></div>
            <p data-testid="text-total-count" className="mt-2 text-3xl font-extrabold">{summary?.total ?? '—'}</p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">عبر {spaceNames.length} مساحات</p>
          </div>
        </section>}

          {viewMode === 'day' && showSection('dailyPlan') && <div style={sectionRank('dailyPlan')}><DailyPlan tasks={tasks} /></div>}

          {showSection('events') && <div style={sectionRank('events')}><EventsSection /></div>}
          {showSection('productivity') && <div style={sectionRank('productivity')}><ProductivityHub usageType={onboarding.data?.usageType} tasks={tasks} date={selectedDate} /></div>}
          {showSection('links') && <div style={sectionRank('links')}><SpaceLinksSection spaces={Array.isArray(spacesQuery.data) ? spacesQuery.data : []} /></div>}
          {showSection('notifications') && <div style={sectionRank('notifications')}><NotificationCenter tasks={tasks} /></div>}

        {showSection('taskMap') && <section className="animate-rise mt-10 rounded-3xl border border-card-border bg-card/70 p-4 shadow-sm sm:p-5" style={{ ...sectionRank('taskMap'), animationDelay: '90ms' }}>
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
                const editableSpace = spacesQuery.data?.find((space) => space.name === category);
                return <div key={category} className="relative"><button type="button" onClick={() => setActiveCategory(category)} data-testid={`button-filter-${category}`} className={`flex w-full items-center justify-between rounded-2xl border p-3 pl-16 text-right transition ${activeCategory === category ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/40'}`}><span className="flex items-center gap-2 text-sm font-extrabold"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />{category}</span><span className={`font-mono-ui text-xs ${activeCategory === category ? 'text-secondary' : 'text-muted-foreground'}`}>{count}</span></button>{editableSpace && <button type="button" onClick={() => setEditingSpace(editableSpace)} aria-label={`تعديل مساحة ${category}`} data-testid={`button-edit-space-${category}`} className={`absolute left-8 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition ${activeCategory === category ? 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}><Pencil size={14} /></button>}{canDelete && <button type="button" onClick={() => removeSpace(category)} disabled={deleteSpace.isPending} aria-label={`حذف مساحة ${category}`} data-testid={`button-delete-space-${category}`} className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition ${activeCategory === category ? 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground' : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'}`}><Trash2 size={14} /></button>}</div>;
            })}
          </div>
        </section>}
        </div>

        <section className="mt-8">
          {taskQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2"><div className="h-32 animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /></div>
          ) : taskQuery.isError ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center"><CircleAlert className="mb-4 text-destructive" size={30} /><h2 className="font-extrabold">تعذر تحميل يومك</h2><p className="mt-2 text-sm text-muted-foreground">يبدو أن هناك مشكلة مؤقتة في الاتصال.</p><button type="button" onClick={() => void taskQuery.refetch()} data-testid="button-retry-tasks" className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><RefreshCw size={15} /> حاول مرة أخرى</button></div>
           ) : visibleTasks.length === 0 ? (
             <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-primary/25 bg-card/55 px-6 py-20 text-center"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary/25 text-primary"><Sparkles size={29} /></div><h2 className="text-xl font-extrabold">{activeCategory === 'all' ? 'اليوم ما زال مفتوحاً' : `لا توجد مهام في ${activeCategory}`}</h2><p className="mt-2 max-w-sm text-sm leading-7 text-muted-foreground">{activeCategory === 'all' ? 'أضف أول خطوة صغيرة، ودع بقية اليوم يتضح معها.' : 'أضف مهمة سريعة الآن، أو استخدم «مهمة جديدة» لو محتاج تفاصيل أكثر.'}</p>{activeCategory === 'all' ? <button type="button" onClick={() => openNew()} data-testid="button-add-first-task" className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5"><Plus size={17} /> أضف مهمة</button> : <div className="mt-6 w-full max-w-md"><QuickTaskInput date={selectedDate} category={activeCategory} /><button type="button" onClick={() => openNew(activeCategory)} data-testid="button-add-detailed-task" className="mt-3 text-sm font-bold text-primary underline-offset-4 hover:underline">أضف مهمة بالتفصيل</button></div>}</div>
          ) : activeCategory !== 'all' ? (
               <div className="space-y-3"><QuickTaskInput date={selectedDate} category={activeCategory} /><div className="space-y-3">{visibleTasks.map((task, index) => <TaskCard key={task.id} task={task} date={task.taskDate} spaces={spaceNames} onReorder={(direction) => void reorderTask(task.id, task.category, direction)} onDragStart={setDraggedTaskId} onDropTask={(draggedId) => void reorderDraggedTask(draggedId, task.id, task.category)} isDragging={draggedTaskId === task.id} canMoveUp={index > 0} canMoveDown={index < visibleTasks.length - 1} />)}</div></div>
          ) : (
             <div className="space-y-8">
                   {categories.filter((category) => grouped[category].length > 0).map((category) => { const meta = getSpaceMeta(category, spaces); const quickAddOpen = quickAddCategory === category; const categoryTasks = grouped[category]; return <div key={category} className="rounded-[1.75rem] border border-card-border bg-card/55 p-4 shadow-sm sm:p-5" style={{ borderInlineStartColor: meta.color, borderInlineStartWidth: 4 }}><div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3"><div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: meta.color }} /><div><h3 className="font-extrabold">{category}</h3><p className="text-xs font-semibold text-muted-foreground">{meta.description}</p></div></div><button type="button" onClick={() => setQuickAddCategory(quickAddOpen ? null : category)} aria-label={`إضافة مهمة سريعة في ${category}`} data-testid={`button-add-task-${category}`} className={`rounded-xl border bg-background p-2 shadow-sm transition hover:border-primary/30 hover:text-primary ${quickAddOpen ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}><Plus size={17} /></button></div>{quickAddOpen && <div className="mb-4"><QuickTaskInput date={selectedDate} category={category} onCreated={() => setQuickAddCategory(null)} /></div>}<div className="space-y-3">{categoryTasks.map((task, index) => <TaskCard key={task.id} task={task} date={task.taskDate} spaces={spaceNames} onReorder={(direction) => void reorderTask(task.id, task.category, direction)} onDragStart={setDraggedTaskId} onDropTask={(draggedId) => void reorderDraggedTask(draggedId, task.id, category)} isDragging={draggedTaskId === task.id} canMoveUp={index > 0} canMoveDown={index < categoryTasks.length - 1} />)}</div></div>; })}
            </div>
          )}
        </section>
      </main>
       {showForm && <TaskForm date={selectedDate} initialCategory={formCategory} categoryLocked={Boolean(formCategory)} spaces={spaceNames} onClose={() => setShowForm(false)} />}
       {showSpaceForm && <SpaceForm onClose={() => setShowSpaceForm(false)} onCreated={(name) => { setActiveCategory(name); }} />}
        {editingSpace && <SpaceForm space={editingSpace} onClose={() => setEditingSpace(null)} onCreated={(name) => { setActiveCategory(name); setEditingSpace(null); void queryClient.invalidateQueries(); }} />}
    </div>
  );
}