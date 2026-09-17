import { useMemo, useState } from 'react';
import { Check, Flame, GraduationCap, HeartPulse, ListChecks, Minus, Plus, Target, Trash2 } from 'lucide-react';
import {
  getListGoalsQueryKey, getListHabitsQueryKey, getListStudyItemsQueryKey,
  useCheckHabit,
  useCreateGoal, useCreateHabit, useCreateStudyItem, useDeleteGoal, useDeleteHabit,
  useListGoals, useListHabits, useListStudyItems, useUpdateGoal, useUpdateStudyItem,
} from '@workspace/api-client-react';
import type { Goal, Habit, StudyItem, Task } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { calculateCurrentHabitStreak, localDateKey, normalizeHabitDate } from '@/habit-utils';

type UsageType = 'student' | 'employee' | 'freelancer' | 'personal' | null | undefined;

function playHabitSound() {
  type WindowWithWebkitAudio = Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AudioContextConstructor) return;
  const context = new AudioContextConstructor();
  const play = () => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(659.25, now);
    oscillator.frequency.exponentialRampToValueAtTime(987.77, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.31);
    oscillator.addEventListener('ended', () => void context.close());
  };

  if (context.state === 'suspended') {
    void context.resume().then(play).catch(() => void context.close());
  } else {
    play();
  }
}

export function ProductivityHub({ usageType, tasks }: { usageType: UsageType; tasks: Task[]; date: string }) {
  const queryClient = useQueryClient();
  const goals = useListGoals({ query: { queryKey: getListGoalsQueryKey(), staleTime: 60_000, refetchOnWindowFocus: false } });
  const habits = useListHabits({ query: { queryKey: getListHabitsQueryKey(), staleTime: 60_000, refetchOnWindowFocus: false } });
  const studyItems = useListStudyItems({ query: { queryKey: getListStudyItemsQueryKey(), staleTime: 60_000, refetchOnWindowFocus: false } });
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('1');
  const [habitName, setHabitName] = useState('');
  const [studyTitle, setStudyTitle] = useState('');
  const [habitError, setHabitError] = useState('');
  const createGoal = useCreateGoal();
  const createHabit = useCreateHabit();
  const createStudy = useCreateStudyItem();
  const updateGoal = useUpdateGoal();
  const checkHabit = useCheckHabit();
  const updateStudy = useUpdateStudyItem();
  const deleteGoal = useDeleteGoal();
  const deleteHabit = useDeleteHabit();
  const focusTasks = tasks.filter((task) => !task.completed).slice(0, 3);
  const goalItems = Array.isArray(goals.data) ? goals.data : [];
  const habitItems = Array.isArray(habits.data) ? habits.data : [];
  const studyPlanItems = Array.isArray(studyItems.data) ? studyItems.data : [];
  const today = localDateKey();

  const goalStats = useMemo(() => {
    const target = goalItems.reduce((sum, goal) => sum + Math.max(goal.target, 1), 0);
    const current = goalItems.reduce((sum, goal) => sum + Math.min(goal.current, Math.max(goal.target, 1)), 0);
    const completed = goalItems.filter((goal) => goal.completed || goal.current >= goal.target).length;
    return {
      completed,
      total: goalItems.length,
      percent: target > 0 ? Math.round((current / target) * 100) : 0,
    };
  }, [goalItems]);

  const habitStats = useMemo(() => {
    const completedToday = habitItems.filter((habit) => {
      const dates = Array.isArray(habit.completedDates) ? habit.completedDates : [];
      return dates.some((value) => normalizeHabitDate(value) === today);
    }).length;
    return { completedToday, total: habitItems.length };
  }, [habitItems, today]);

  const refresh = (key: readonly unknown[]) => void queryClient.invalidateQueries({ queryKey: key });
  const addGoal = () => {
    if (!goalTitle.trim()) return;
    createGoal.mutate(
      { data: { title: goalTitle.trim(), target: Math.max(1, Number(goalTarget) || 1) } },
      { onSuccess: () => { setGoalTitle(''); setGoalTarget('1'); refresh(getListGoalsQueryKey()); } },
    );
  };
  const addHabit = () => {
    const name = habitName.trim();
    if (!name || createHabit.isPending) return;
    setHabitError('');
    createHabit.mutate(
      { data: { name, frequency: 'daily' } },
      {
        onSuccess: () => {
          setHabitName('');
          refresh(getListHabitsQueryKey());
        },
        onError: () => setHabitError('تعذر إضافة العادة. حاول مرة أخرى.'),
      },
    );
  };
  const addStudy = () => {
    if (!studyTitle.trim()) return;
    createStudy.mutate({ data: { kind: 'assignment', title: studyTitle.trim() } }, { onSuccess: () => { setStudyTitle(''); refresh(getListStudyItemsQueryKey()); } });
  };

  return (
    <section className="mt-8 mb-10 grid gap-4 lg:grid-cols-3" dir="rtl">
      <ProductivityCard title="أهدافك" icon={<Target size={18} />} accent="text-primary">
        <div className="mb-3 rounded-xl bg-primary/5 px-3 py-2">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span>{goalStats.completed}/{goalStats.total} أهداف مكتملة</span>
            <span className="text-primary">{goalStats.percent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${goalStats.percent}%` }} />
          </div>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); addGoal(); }} className="mb-3 grid grid-cols-[1fr_4.5rem_auto] gap-2">
          <input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="هدف جديد..." className="h-10 min-w-0 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
          <input type="number" min="1" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} aria-label="قيمة الهدف" className="h-10 w-full rounded-xl border border-input bg-background px-2 text-center text-sm outline-none focus:border-primary" />
          <button type="submit" disabled={createGoal.isPending} className="rounded-xl bg-primary px-3 text-primary-foreground disabled:cursor-wait disabled:opacity-60" aria-label="إضافة هدف"><Plus size={17} /></button>
        </form>
        <div className="space-y-2">
          {goalItems.map((goal: Goal) => (
            <div key={goal.id} className="rounded-xl bg-background/70 p-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => updateGoal.mutate({ id: goal.id, data: { completed: !goal.completed, current: goal.completed ? Math.max(0, Math.min(goal.current, goal.target - 1)) : goal.target } }, { onSuccess: () => refresh(getListGoalsQueryKey()) })} className={`flex h-6 w-6 items-center justify-center rounded-lg border ${goal.completed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border'}`}><Check size={14} /></button>
                <span className={`min-w-0 flex-1 text-sm font-bold ${goal.completed ? 'text-muted-foreground line-through' : ''}`}>{goal.title}</span>
                <button type="button" onClick={() => deleteGoal.mutate({ id: goal.id }, { onSuccess: () => refresh(getListGoalsQueryKey()) })} className="text-muted-foreground hover:text-destructive" aria-label="حذف الهدف"><Trash2 size={14} /></button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.round((goal.current / Math.max(goal.target, 1)) * 100))}%` }} /></div>
                <span className="min-w-14 text-left text-[11px] font-extrabold text-primary">{goal.current}/{goal.target}</span>
                <button type="button" onClick={() => updateGoal.mutate({ id: goal.id, data: { current: Math.max(0, goal.current - 1), completed: false } }, { onSuccess: () => refresh(getListGoalsQueryKey()) })} disabled={goal.current <= 0 || updateGoal.isPending} className="rounded-lg border border-border p-1 text-muted-foreground disabled:opacity-30" aria-label="إنقاص تقدم الهدف"><Minus size={12} /></button>
                <button type="button" onClick={() => { const current = Math.min(goal.target, goal.current + 1); updateGoal.mutate({ id: goal.id, data: { current, completed: current >= goal.target } }, { onSuccess: () => refresh(getListGoalsQueryKey()) }); }} disabled={goal.current >= goal.target || updateGoal.isPending} className="rounded-lg border border-border p-1 text-primary disabled:opacity-30" aria-label="زيادة تقدم الهدف"><Plus size={12} /></button>
              </div>
            </div>
          ))}
          {!goalItems.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground">أضف هدفًا صغيرًا يتحرك معك.</p>}
        </div>
      </ProductivityCard>

      <ProductivityCard title="عاداتك" icon={<HeartPulse size={18} />} accent="text-secondary">
        <div className="mb-3 flex items-center justify-between rounded-xl bg-secondary/10 px-3 py-2 text-xs font-extrabold">
          <span>إنجاز اليوم</span>
          <span className="text-primary">{habitStats.completedToday}/{habitStats.total}</span>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); addHabit(); }} className="mb-3 flex gap-2">
          <input
            value={habitName}
            onChange={(e) => { setHabitName(e.target.value); if (habitError) setHabitError(''); }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                addHabit();
              }
            }}
            placeholder="عادة جديدة..."
            className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            data-testid="input-new-habit"
          />
          <button type="submit" disabled={createHabit.isPending || !habitName.trim()} className="rounded-xl bg-secondary px-3 text-secondary-foreground disabled:cursor-wait disabled:opacity-60" aria-label="إضافة عادة" data-testid="button-add-habit"><Plus size={17} /></button>
        </form>
        {habitError && <p className="mb-3 text-xs font-bold text-destructive">{habitError}</p>}
        <div className="space-y-2">
          {habitItems.map((habit: Habit) => {
            const completedDates = Array.isArray(habit.completedDates) ? habit.completedDates : [];
            const normalizedDates = completedDates.map(normalizeHabitDate).filter(Boolean);
            const doneToday = normalizedDates.includes(today);
            const activeStreak = calculateCurrentHabitStreak(completedDates, today);
            return <div key={habit.id} className="flex items-center gap-2 rounded-xl bg-background/70 p-3">
              <button
                type="button"
                disabled={checkHabit.isPending}
                onClick={() => {
                  if (!doneToday) playHabitSound();
                  checkHabit.mutate({ id: habit.id, data: { date: today } }, { onSuccess: () => refresh(getListHabitsQueryKey()) });
                }}
                className={`flex h-6 w-6 items-center justify-center rounded-lg border disabled:opacity-60 ${doneToday ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border'}`}
                aria-label={doneToday ? 'إلغاء تسجيل العادة لهذا اليوم' : 'تسجيل العادة لهذا اليوم'}
                data-testid={`button-check-habit-${habit.id}`}
              ><Check size={14} /></button>
              <span className="min-w-0 flex-1 text-sm font-bold">{habit.name}</span>
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-primary" title={`${normalizedDates.length} مرات إجمالًا`}><Flame size={12} /> {activeStreak} يوم</span>
              <span className="text-[10px] font-bold text-muted-foreground">{normalizedDates.length}×</span>
              <button type="button" onClick={() => deleteHabit.mutate({ id: habit.id }, { onSuccess: () => refresh(getListHabitsQueryKey()) })} className="text-muted-foreground hover:text-destructive" aria-label="حذف العادة"><Trash2 size={14} /></button>
            </div>;
          })}
          {!habitItems.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground">ثبّت عادة تعطي يومك إيقاعًا.</p>}
        </div>
      </ProductivityCard>

      <ProductivityCard title="تركيز اليوم" icon={<ListChecks size={18} />} accent="text-accent">
        <div className="mb-3 flex items-center justify-between rounded-xl bg-accent/10 px-3 py-2">
          <span className="text-xs font-bold text-muted-foreground">أهم ما ينتظرك</span>
          <span className="text-lg font-extrabold text-accent">{focusTasks.length}</span>
        </div>
        <div className="space-y-2">
          {focusTasks.map((task, index) => (
            <div key={task.id} className="flex items-center gap-2 rounded-xl bg-background/70 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-accent/30 text-xs font-extrabold text-accent">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{task.title}</span>
            </div>
          ))}
          {!focusTasks.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground">أنجز مهامك الحالية وستظهر هنا الأولويات القادمة.</p>}
        </div>
      </ProductivityCard>

      {usageType === 'student' && <ProductivityCard title="خطة الدراسة" icon={<GraduationCap size={18} />} accent="text-accent">
        <form onSubmit={(event) => { event.preventDefault(); addStudy(); }} className="mb-3 flex gap-2">
          <input value={studyTitle} onChange={(e) => setStudyTitle(e.target.value)} placeholder="واجب أو مراجعة..." className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
          <button type="submit" disabled={createStudy.isPending} className="rounded-xl bg-accent px-3 text-accent-foreground disabled:opacity-60" aria-label="إضافة عنصر دراسة"><Plus size={17} /></button>
        </form>
        <div className="space-y-2">
          {studyPlanItems.map((item: StudyItem) => <button type="button" key={item.id} onClick={() => updateStudy.mutate({ id: item.id, data: { completed: !item.completed } }, { onSuccess: () => refresh(getListStudyItemsQueryKey()) })} className={`flex w-full items-center gap-2 rounded-xl bg-background/70 p-3 text-right ${item.completed ? 'text-muted-foreground line-through' : ''}`}><span className={`flex h-6 w-6 items-center justify-center rounded-lg border ${item.completed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border'}`}><Check size={14} /></span><span className="text-sm font-bold">{item.title}</span></button>)}
          {!studyPlanItems.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground">أضف أول واجب أو جلسة مراجعة.</p>}
        </div>
      </ProductivityCard>}
    </section>
  );
}

function ProductivityCard({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return <div className="rounded-3xl border border-card-border bg-card/70 p-4 shadow-sm"><div className="mb-4 flex items-center gap-2"><span className={accent}>{icon}</span><h2 className="font-extrabold">{title}</h2></div>{children}</div>;
}
