import { Check, Flame, HeartPulse, Minus, Plus, Target, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListGoalsQueryKey,
  getListHabitsQueryKey,
  useCheckHabit,
  useCreateGoal,
  useCreateHabit,
  useDeleteGoal,
  useDeleteHabit,
  useListGoals,
  useListHabits,
  useUpdateGoal,
} from '@workspace/api-client-react';
import type { Goal, Habit } from '@workspace/api-client-react';
import { localDateKey, normalizeHabitDate } from '@/habit-utils';

function playHabitSound() {
  type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AudioContextConstructor) return;
  const context = new AudioContextConstructor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  oscillator.frequency.setValueAtTime(659.25, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.21);
  oscillator.addEventListener('ended', () => void context.close());
}

function monthInfo(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  const monthKey = date.slice(0, 7);
  const year = parsed.getFullYear();
  const monthIndex = parsed.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 1) % 7;
  const monthLabel = new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric' }).format(parsed);
  const deadline = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;
  return { monthKey, year, monthIndex, daysInMonth, firstDayOffset, monthLabel, deadline };
}

function goalMonthKey(goal: Goal) {
  if (!goal.deadline) return '';
  return normalizeHabitDate(goal.deadline).slice(0, 7);
}

export function ProductivityHub({ date }: { date: string }) {
  const queryClient = useQueryClient();
  const habitDate = date;
  const todayKey = localDateKey();
  const habits = useListHabits({ query: { queryKey: [...getListHabitsQueryKey(), habitDate], staleTime: 0, refetchOnWindowFocus: true } });
  const goals = useListGoals({ query: { queryKey: getListGoalsQueryKey(), staleTime: 0, refetchOnWindowFocus: true } });
  const createHabit = useCreateHabit();
  const checkHabit = useCheckHabit();
  const deleteHabit = useDeleteHabit();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [habitName, setHabitName] = useState('');
  const [habitError, setHabitError] = useState('');
  const [checkingHabitId, setCheckingHabitId] = useState<number | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('1');

  const { monthKey, daysInMonth, firstDayOffset, monthLabel, deadline } = useMemo(() => monthInfo(habitDate), [habitDate]);
  const items = Array.isArray(habits.data) ? habits.data : [];
  const allGoals = Array.isArray(goals.data) ? goals.data : [];
  const monthlyGoals = allGoals.filter((goal) => goalMonthKey(goal) === monthKey);

  const normalizedDatesByHabit = useMemo(() => new Map(
    items.map((habit) => [
      habit.id,
      new Set((Array.isArray(habit.completedDates) ? habit.completedDates : []).map(normalizeHabitDate).filter(Boolean)),
    ]),
  ), [items]);

  const refreshHabits = () => void queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
  const refreshGoals = () => void queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });

  const doneCount = items.filter((habit) => normalizedDatesByHabit.get(habit.id)?.has(habitDate)).length;

  const addHabit = () => {
    const name = habitName.trim();
    if (!name || createHabit.isPending) return;
    setHabitError('');
    createHabit.mutate({ data: { name, frequency: 'daily' } }, {
      onSuccess: () => { setHabitName(''); refreshHabits(); },
      onError: () => setHabitError('تعذر إضافة العادة. حاول مرة أخرى.'),
    });
  };

  const toggleHabit = (habit: Habit, doneToday: boolean) => {
    if (checkingHabitId === habit.id) return;
    if (!doneToday) playHabitSound();
    setCheckingHabitId(habit.id);
    checkHabit.mutate(
      { id: habit.id, data: { date: habitDate } },
      {
        onSuccess: refreshHabits,
        onSettled: () => setCheckingHabitId((current) => current === habit.id ? null : current),
      },
    );
  };

  const addGoal = () => {
    const title = goalTitle.trim();
    const target = Math.max(1, Number(goalTarget) || 1);
    if (!title || createGoal.isPending) return;
    createGoal.mutate(
      { data: { title, target, deadline: deadline as unknown as Date } },
      { onSuccess: () => { setGoalTitle(''); setGoalTarget('1'); refreshGoals(); } },
    );
  };

  const setGoalProgress = (goal: Goal, nextCurrent: number) => {
    const current = Math.max(0, Math.min(goal.target, nextCurrent));
    updateGoal.mutate(
      { id: goal.id, data: { current, completed: current >= goal.target } },
      { onSuccess: refreshGoals },
    );
  };

  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const monthCompare = monthKey.localeCompare(todayKey.slice(0, 7));
  const consideredThrough = monthCompare < 0 ? daysInMonth : monthCompare > 0 ? 0 : Number(todayKey.slice(8, 10));

  const dayStats = calendarDays.map((day) => {
    const dayKey = `${monthKey}-${String(day).padStart(2, '0')}`;
    const completed = items.reduce((sum, habit) => sum + (normalizedDatesByHabit.get(habit.id)?.has(dayKey) ? 1 : 0), 0);
    const ratio = items.length ? completed / items.length : 0;
    const isConsidered = day <= consideredThrough;
    return { day, dayKey, completed, ratio, isConsidered };
  });

  const considered = dayStats.filter((item) => item.isConsidered);
  const excellentDays = considered.filter((item) => item.ratio >= 0.8).length;
  const weakDays = considered.filter((item) => item.ratio > 0 && item.ratio < 0.4).length;
  const totalPossible = considered.length * items.length;
  const totalCompleted = considered.reduce((sum, item) => sum + item.completed, 0);
  const monthlyCommitment = totalPossible ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  const dayTone = (ratio: number, consideredDay: boolean) => {
    if (!consideredDay) return 'border-border/60 bg-background/50';
    if (ratio >= 0.8) return 'border-secondary/60 bg-secondary/25';
    if (ratio >= 0.4) return 'border-primary/15 bg-primary/[0.08]';
    if (ratio > 0) return 'border-destructive/20 bg-destructive/[0.09]';
    return 'border-border/50 bg-muted/45';
  };

  return <div className="mb-5 space-y-5" dir="rtl">
    <section className="rounded-3xl border border-card-border bg-card/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><HeartPulse size={19} className="text-secondary"/><div><h2 className="text-lg font-extrabold">العادات اليومية</h2><p className="text-xs text-muted-foreground">{doneCount}/{items.length} مكتملة في هذا اليوم</p></div></div>
        <form onSubmit={(event) => { event.preventDefault(); addHabit(); }} className="flex min-w-[260px] flex-1 gap-2 sm:max-w-md">
          <input value={habitName} onChange={(event) => { setHabitName(event.target.value); if (habitError) setHabitError(''); }} placeholder="عادة جديدة..." className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-new-habit"/>
          <button type="submit" disabled={createHabit.isPending || !habitName.trim()} className="rounded-xl bg-secondary px-3 text-secondary-foreground disabled:opacity-60" data-testid="button-add-habit"><Plus size={17}/></button>
        </form>
      </div>
      {habitError && <p className="mb-3 text-xs font-bold text-destructive">{habitError}</p>}

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {items.map((habit: Habit) => {
          const completedSet = normalizedDatesByHabit.get(habit.id) ?? new Set<string>();
          const doneToday = completedSet.has(habitDate);
          const monthDone = Array.from(completedSet).filter((day) => day.startsWith(`${monthKey}-`)).length;
          const monthProgress = daysInMonth > 0 ? Math.round((monthDone / daysInMonth) * 100) : 0;
          const isChecking = checkingHabitId === habit.id;
          return <div key={habit.id} className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 transition ${doneToday ? 'border-secondary/50 bg-secondary/[0.08]' : 'border-border bg-background/70'}`}>
            <button type="button" disabled={isChecking} onClick={() => toggleHabit(habit, doneToday)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition disabled:opacity-60 ${doneToday ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-card hover:border-secondary/60'}`} aria-label={doneToday ? 'إلغاء إنجاز اليوم' : 'إنجاز عادة اليوم'} data-testid={`button-check-habit-${habit.id}`}><Check size={15}/></button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-extrabold">{habit.name}</span><span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-black text-foreground"><Flame size={12} className="text-secondary"/>{monthDone}</span></div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${monthProgress}%` }}/></div>
                <span className="shrink-0 text-[10px] font-bold text-muted-foreground">{monthDone}/{daysInMonth}</span>
              </div>
            </div>
            <button type="button" onClick={() => deleteHabit.mutate({ id: habit.id }, { onSuccess: refreshHabits })} className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted" aria-label="حذف العادة"><Trash2 size={13}/></button>
          </div>;
        })}
        {!items.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground md:col-span-2 xl:col-span-3">أضف عادة واحدة أو اثنتين وركز على الاستمرار.</p>}
      </div>
    </section>

    <section className="rounded-3xl border border-card-border bg-card/75 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-4 border-b border-border/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-black">إيقاع الشهر - {monthLabel}</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">نظرة واحدة على التزامك بالعادات طوال الشهر.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[390px]">
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-2"><p className="text-xl font-black text-emerald-700">{monthlyCommitment}%</p><p className="text-[10px] font-bold text-muted-foreground">التزام</p></div>
          <div className="rounded-xl border border-secondary/30 bg-secondary/15 px-3 py-2"><p className="text-xl font-black">{excellentDays}</p><p className="text-[10px] font-bold text-muted-foreground">يوم ممتاز</p></div>
          <div className="rounded-xl border border-destructive/15 bg-destructive/[0.07] px-3 py-2"><p className="text-xl font-black text-destructive">{weakDays}</p><p className="text-[10px] font-bold text-muted-foreground">أيام ضعيفة</p></div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2">
        {['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'].map((day) => <div key={day} className="pb-1 text-[10px] font-black text-muted-foreground sm:text-xs">{day}</div>)}
        {Array.from({ length: firstDayOffset }, (_, index) => <div key={`empty-start-${index}`} className="min-h-[62px] rounded-xl bg-transparent sm:min-h-[76px]"/>)}
        {dayStats.map(({ day, dayKey, completed, ratio, isConsidered }) => {
          const isSelected = dayKey === habitDate;
          return <button key={dayKey} type="button" className={`min-h-[62px] rounded-xl border p-1.5 text-right transition sm:min-h-[76px] sm:p-2 ${dayTone(ratio, isConsidered)} ${isSelected ? 'ring-2 ring-primary/45' : ''}`}>
            <div className="flex items-center justify-between"><span className="text-xs font-black sm:text-sm">{day}</span>{items.length > 0 && <span className="text-[9px] font-bold text-muted-foreground">{completed}/{items.length}</span>}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {items.slice(0, 8).map((habit) => <span key={habit.id} title={habit.name} className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${normalizedDatesByHabit.get(habit.id)?.has(dayKey) ? 'bg-primary' : 'border border-primary/35 bg-background/70'}`}/>)}
              {items.length > 8 && <span className="text-[8px] font-black text-muted-foreground">+{items.length - 8}</span>}
            </div>
          </button>;
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-secondary"/><span>ممتاز 80%+</span></span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-primary/20"/><span>متوسط</span></span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-destructive/20"/><span>ضعيف</span></span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-muted"/><span>بدون تنفيذ</span></span>
      </div>
    </section>

    <section className="rounded-3xl border border-card-border bg-card/75 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Target size={19} className="text-primary"/><div><h2 className="text-lg font-extrabold">أهداف الشهر</h2><p className="text-xs text-muted-foreground">{monthLabel} · {monthlyGoals.filter((goal) => goal.completed).length}/{monthlyGoals.length} مكتملة</p></div></div>
        <form onSubmit={(event) => { event.preventDefault(); addGoal(); }} className="flex w-full flex-wrap gap-2 lg:w-auto">
          <input value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} placeholder="هدف جديد لهذا الشهر..." className="h-10 min-w-[220px] flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"/>
          <input type="number" min={1} max={999} value={goalTarget} onChange={(event) => setGoalTarget(event.target.value)} className="h-10 w-20 rounded-xl border border-input bg-background px-2 text-center text-sm font-bold outline-none focus:border-primary" aria-label="الهدف العددي"/>
          <button type="submit" disabled={createGoal.isPending || !goalTitle.trim()} className="inline-flex h-10 items-center gap-1 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-60"><Plus size={15}/>إضافة</button>
        </form>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {monthlyGoals.map((goal) => {
          const progress = goal.target ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
          return <article key={goal.id} className={`rounded-2xl border p-3.5 ${goal.completed ? 'border-secondary/45 bg-secondary/[0.07]' : 'border-border bg-background/65'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className={`truncate text-sm font-black ${goal.completed ? 'line-through opacity-70' : ''}`}>{goal.title}</h3><p className="mt-1 text-[10px] font-bold text-muted-foreground">{goal.current} من {goal.target} · {progress}%</p></div>
              <button onClick={() => deleteGoal.mutate({ id: goal.id }, { onSuccess: refreshGoals })} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="حذف الهدف"><Trash2 size={13}/></button>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }}/></div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1">
                <button type="button" disabled={goal.current <= 0 || updateGoal.isPending} onClick={() => setGoalProgress(goal, goal.current - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card disabled:opacity-40"><Minus size={13}/></button>
                <button type="button" disabled={goal.current >= goal.target || updateGoal.isPending} onClick={() => setGoalProgress(goal, goal.current + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground disabled:opacity-40"><Plus size={13}/></button>
              </div>
              <button type="button" onClick={() => setGoalProgress(goal, goal.completed ? Math.max(0, goal.target - 1) : goal.target)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${goal.completed ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'}`}>{goal.completed ? 'إعادة فتح' : 'تم الهدف'}</button>
            </div>
          </article>;
        })}
        {!monthlyGoals.length && <div className="rounded-2xl border border-dashed p-6 text-center text-xs font-bold text-muted-foreground md:col-span-2 xl:col-span-3">أضف هدفًا لهذا الشهر، وحدد رقمه المستهدف، وسيظهر تقدمك هنا.</div>}
      </div>
    </section>
  </div>;
}
