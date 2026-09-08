import { useState } from 'react';
import { Check, GraduationCap, HeartPulse, Plus, Target, Trash2 } from 'lucide-react';
import {
  getListGoalsQueryKey, getListHabitsQueryKey, getListStudyItemsQueryKey,
  useCreateGoal, useCreateHabit, useCreateStudyItem, useDeleteGoal, useDeleteHabit,
  useListGoals, useListHabits, useListStudyItems, useUpdateGoal, useUpdateHabit, useUpdateStudyItem,
} from '@workspace/api-client-react';
import type { Goal, Habit, StudyItem } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

type UsageType = 'student' | 'employee' | 'freelancer' | 'personal' | null | undefined;

export function ProductivityHub({ usageType }: { usageType: UsageType }) {
  const queryClient = useQueryClient();
  const goals = useListGoals();
  const habits = useListHabits();
  const studyItems = useListStudyItems();
  const [goalTitle, setGoalTitle] = useState('');
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

  const refresh = (key: readonly unknown[]) => void queryClient.invalidateQueries({ queryKey: key });
  const addGoal = () => {
    if (!goalTitle.trim()) return;
    createGoal.mutate({ data: { title: goalTitle.trim(), target: 1 } }, { onSuccess: () => { setGoalTitle(''); refresh(getListGoalsQueryKey()); } });
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
    <section className="mt-8 grid gap-4 lg:grid-cols-3" dir="rtl">
      <ProductivityCard title="أهدافك" icon={<Target size={18} />} accent="text-primary">
        <div className="mb-3 flex gap-2">
          <input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="هدف جديد..." className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
          <button type="button" onClick={addGoal} className="rounded-xl bg-primary px-3 text-primary-foreground" aria-label="إضافة هدف"><Plus size={17} /></button>
        </div>
        <div className="space-y-2">
          {(goals.data ?? []).map((goal: Goal) => (
            <div key={goal.id} className="flex items-center gap-2 rounded-xl bg-background/70 p-3">
              <button type="button" onClick={() => updateGoal.mutate({ id: goal.id, data: { completed: !goal.completed } }, { onSuccess: () => refresh(getListGoalsQueryKey()) })} className={`flex h-6 w-6 items-center justify-center rounded-lg border ${goal.completed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border'}`}><Check size={14} /></button>
              <span className={`min-w-0 flex-1 text-sm font-bold ${goal.completed ? 'text-muted-foreground line-through' : ''}`}>{goal.title}</span>
              <button type="button" onClick={() => deleteGoal.mutate({ id: goal.id }, { onSuccess: () => refresh(getListGoalsQueryKey()) })} className="text-muted-foreground hover:text-destructive" aria-label="حذف الهدف"><Trash2 size={14} /></button>
            </div>
          ))}
          {!goals.data?.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground">أضف هدفًا صغيرًا يتحرك معك.</p>}
        </div>
      </ProductivityCard>

      <ProductivityCard title="عاداتك" icon={<HeartPulse size={18} />} accent="text-secondary">
        <div className="mb-3 flex gap-2">
          <input value={habitName} onChange={(e) => setHabitName(e.target.value)} placeholder="عادة جديدة..." className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
          <button type="button" onClick={addHabit} className="rounded-xl bg-secondary px-3 text-secondary-foreground" aria-label="إضافة عادة"><Plus size={17} /></button>
        </div>
        <div className="space-y-2">
          {(habits.data ?? []).map((habit: Habit) => {
            const doneToday = habit.lastCompleted === new Date().toISOString().slice(0, 10);
            return <div key={habit.id} className="flex items-center gap-2 rounded-xl bg-background/70 p-3">
              <button type="button" onClick={() => updateHabit.mutate({ id: habit.id, data: { streak: doneToday ? Math.max(0, habit.streak - 1) : habit.streak + 1, lastCompleted: doneToday ? undefined : new Date().toISOString().slice(0, 10) } }, { onSuccess: () => refresh(getListHabitsQueryKey()) })} className={`flex h-6 w-6 items-center justify-center rounded-lg border ${doneToday ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border'}`}><Check size={14} /></button>
              <span className="min-w-0 flex-1 text-sm font-bold">{habit.name}</span><span className="text-xs font-extrabold text-primary">{habit.streak} يوم</span>
              <button type="button" onClick={() => deleteHabit.mutate({ id: habit.id }, { onSuccess: () => refresh(getListHabitsQueryKey()) })} className="text-muted-foreground hover:text-destructive" aria-label="حذف العادة"><Trash2 size={14} /></button>
            </div>;
          })}
          {!habits.data?.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground">ثبّت عادة تعطي يومك إيقاعًا.</p>}
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