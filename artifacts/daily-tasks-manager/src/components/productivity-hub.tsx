import { useState } from 'react';
import { Check, GraduationCap, HeartPulse, ListChecks, Minus, Plus, Target, Trash2, Volume2 } from 'lucide-react';
import {
  getListGoalsQueryKey, getListHabitsQueryKey, getListStudyItemsQueryKey,
  useCreateGoal, useCreateHabit, useCreateStudyItem, useDeleteGoal, useDeleteHabit,
  useListGoals, useListHabits, useListStudyItems, useUpdateGoal, useUpdateHabit, useUpdateStudyItem,
} from '@workspace/api-client-react';
import type { Goal, Habit, StudyItem, Task } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

type UsageType = 'student' | 'employee' | 'freelancer' | 'personal' | null | undefined;

function dateOnly(value: string | Date | null | undefined) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

function playHabitSound() {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return;
  const context = new AudioContextConstructor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(659.25, now);
  oscillator.frequency.exponentialRampToValueAtTime(987.77, now + 0.16);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.055, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.27);
  oscillator.addEventListener('ended', () => void context.close());
}

export function ProductivityHub({ usageType, tasks }: { usageType: UsageType; tasks: Task[] }) {
  const queryClient = useQueryClient();
  const goals = useListGoals();
  const habits = useListHabits();
  const studyItems = useListStudyItems();
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('1');
  const [habitName, setHabitName] = useState('');
  const [studyTitle, setStudyTitle] = useState('');
  const createGoal = useCreateGoal();
  const createHabit = useCreateHabit();
  const createStudy = useCreateStudyItem();
  const updateGoal = useUpdateGoal();
  const updateHabit = useUpdateHabit();
  const updateStudy = useUpdateStudyItem();
  const deleteGoal = useDeleteGoal();
  const deleteHabit = useDeleteHabit();
  const focusTasks = tasks.filter((task) => !task.completed).slice(0, 3);

  const refresh = (key: readonly unknown[]) => void queryClient.invalidateQueries({ queryKey: key });
  const addGoal = () => {
    if (!goalTitle.trim()) return;
    createGoal.mutate({ data: { title: goalTitle.trim(), target: Math.max(1, Number(goalTarget) || 1) } }, { onSuccess: () => { setGoalTitle(''); setGoalTarget('1'); refresh(getListGoalsQueryKey()); } });
  };
  const addHabit = () => {
    if (!habitName.trim()) return;
    createHabit.mutate({ data: { name: habitName.trim(), frequency: 'daily' } }, { onSuccess: () => { setHabitName(''); refresh(getListHabitsQueryKey()); } });
  };
  const addStudy = () => {
    if (!studyTitle.trim()) return;
    createStudy.mutate({ data: { kind: 'assignment', title: studyTitle.trim() } }, { onSuccess: () => { setStudyTitle(''); refresh(getListStudyItemsQueryKey()); } });
  };

  return (
    <section className="mt-8 mb-10 grid gap-4 lg:grid-cols-3" dir="rtl">
      <ProductivityCard title="أهدافك" icon={<Target size={18} />} accent="text-primary">
        <form onSubmit={(event) => { event.preventDefault(); addGoal(); }} className="mb-3 grid grid-cols-[1fr_4.5rem_auto] gap-2">
          <input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="هدف جديد..." className="h-10 min-w-0 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
          <input type="number" min="1" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} aria-label="قيمة الهدف" className="h-10 w-full rounded-xl border border-input bg-background px-2 text-center text-sm outline-none focus:border-primary" />
          <button type="submit" disabled={createGoal.isPending} className="rounded-xl bg-primary px-3 text-primary-foreground disabled:cursor-wait disabled:opacity-60" aria-label="إضافة هدف"><Plus size={17} /></button>
        </form>
        <div className="space-y-2">
          {(goals.data ?? []).map((goal: Goal) => (
            <div key={goal.id} className="rounded-xl bg-background/70 p-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => updateGoal.mutate({ id: goal.id, data: { completed: !goal.completed, current: goal.completed ? Math.min(goal.current, goal.target - 1) : goal.target } }, { onSuccess: () => refresh(getListGoalsQueryKey()) })} className={`flex h-6 w-6 items-center justify-center rounded-lg border ${goal.completed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border'}`}><Check size={14} /></button>
                <span className={`min-w-0 flex-1 text-sm font-bold ${goal.completed ? 'text-muted-foreground line-through' : ''}`}>{goal.title}</span>
                <button type="button" onClick={() => deleteGoal.mutate({ id: goal.id }, { onSuccess: () => refresh(getListGoalsQueryKey()) })} className="text-muted-foreground hover:text-destructive" aria-label="حذف الهدف"><Trash2 size={14} /></button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.round((goal.current / Math.max(goal.target, 1)) * 100))}%` }} /></div>
                <span className="min-w-14 text-left text-[11px] font-extrabold text-primary">{goal.current}/{goal.target}</span>
                <button type="button" onClick={() => updateGoal.mutate({ id: goal.id, data: { current: Math.max(0, goal.current - 1), completed: false } }, { onSuccess: () => refresh(getListGoalsQueryKey()) })} disabled={goal.current <= 0} className="rounded-lg border border-border p-1 text-muted-foreground disabled:opacity-30" aria-label="إنقاص تقدم الهدف"><Minus size={12} /></button>
                <button type="button" onClick={() => { const current = Math.min(goal.target, goal.current + 1); updateGoal.mutate({ id: goal.id, data: { current, completed: current >= goal.target } }, { onSuccess: () => refresh(getListGoalsQueryKey()) }); }} disabled={goal.current >= goal.target} className="rounded-lg border border-border p-1 text-primary disabled:opacity-30" aria-label="زيادة تقدم الهدف"><Plus size={12} /></button>
              </div>
            </div>
          ))}
          {!goals.data?.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground">أضف هدفًا صغيرًا يتحرك معك.</p>}
        </div>
      </ProductivityCard>

      <ProductivityCard title="عاداتك" icon={<HeartPulse size={18} />} accent="text-secondary">
        <form onSubmit={(event) => { event.preventDefault(); addHabit(); }} className="mb-3 flex gap-2">
          <input value={habitName} onChange={(e) => setHabitName(e.target.value)} placeholder="عادة جديدة..." className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
          <button type="submit" disabled={createHabit.isPending} className="rounded-xl bg-secondary px-3 text-secondary-foreground disabled:cursor-wait disabled:opacity-60" aria-label="إضافة عادة"><Plus size={17} /></button>
        </form>
        <div className="space-y-2">
          {(habits.data ?? []).map((habit: Habit) => {
            const doneToday = dateOnly(habit.lastCompleted) === new Date().toISOString().slice(0, 10);
            return <div key={habit.id} className="flex items-center gap-2 rounded-xl bg-background/70 p-3">
              <button type="button" onClick={() => { playHabitSound(); const today = new Date().toISOString().slice(0, 10); const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10); const nextStreak = doneToday ? Math.max(0, habit.streak - 1) : (dateOnly(habit.lastCompleted) === yesterday ? habit.streak + 1 : 1); updateHabit.mutate({ id: habit.id, data: { streak: nextStreak, lastCompleted: doneToday ? null : today } }, { onSuccess: () => refresh(getListHabitsQueryKey()) }); }} className={`flex h-6 w-6 items-center justify-center rounded-lg border ${doneToday ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border'}`}><Check size={14} /></button>
              <span className="min-w-0 flex-1 text-sm font-bold">{habit.name}</span><span className="inline-flex items-center gap-1 text-xs font-extrabold text-primary"><Volume2 size={12} /> {habit.streak} يوم متتالي</span>
              <button type="button" onClick={() => deleteHabit.mutate({ id: habit.id }, { onSuccess: () => refresh(getListHabitsQueryKey()) })} className="text-muted-foreground hover:text-destructive" aria-label="حذف العادة"><Trash2 size={14} /></button>
            </div>;
          })}
          {!habits.data?.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground">ثبّت عادة تعطي يومك إيقاعًا.</p>}
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
        <div className="mb-3 flex gap-2">
          <input value={studyTitle} onChange={(e) => setStudyTitle(e.target.value)} placeholder="واجب أو مراجعة..." className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
          <button type="button" onClick={addStudy} className="rounded-xl bg-accent px-3 text-accent-foreground" aria-label="إضافة عنصر دراسة"><Plus size={17} /></button>
        </div>
        <div className="space-y-2">
          {(studyItems.data ?? []).map((item: StudyItem) => <button type="button" key={item.id} onClick={() => updateStudy.mutate({ id: item.id, data: { completed: !item.completed } }, { onSuccess: () => refresh(getListStudyItemsQueryKey()) })} className={`flex w-full items-center gap-2 rounded-xl bg-background/70 p-3 text-right ${item.completed ? 'text-muted-foreground line-through' : ''}`}><span className={`flex h-6 w-6 items-center justify-center rounded-lg border ${item.completed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border'}`}><Check size={14} /></span><span className="text-sm font-bold">{item.title}</span></button>)}
          {!studyItems.data?.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground">أضف أول واجب أو جلسة مراجعة.</p>}
        </div>
      </ProductivityCard>}
    </section>
  );
}

function ProductivityCard({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return <div className="rounded-3xl border border-card-border bg-card/70 p-4 shadow-sm"><div className="mb-4 flex items-center gap-2"><span className={accent}>{icon}</span><h2 className="font-extrabold">{title}</h2></div>{children}</div>;
}