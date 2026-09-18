import { Check, Flame, HeartPulse, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListHabitsQueryKey,
  useCheckHabit,
  useCreateHabit,
  useDeleteHabit,
  useListHabits,
} from '@workspace/api-client-react';
import type { Habit } from '@workspace/api-client-react';
import { calculateCurrentHabitStreak, localDateKey, normalizeHabitDate } from '@/habit-utils';

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

function recentDays(today: string, count = 7) {
  const end = new Date(`${today}T12:00:00`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (count - 1 - index));
    return localDateKey(date);
  });
}

export function ProductivityHub({ date }: { date: string }) {
  const queryClient = useQueryClient();
  const habitDate = date;
  const habits = useListHabits({ query: { queryKey: [...getListHabitsQueryKey(), habitDate], staleTime: 0, refetchOnWindowFocus: true } });
  const createHabit = useCreateHabit();
  const checkHabit = useCheckHabit();
  const deleteHabit = useDeleteHabit();
  const [habitName, setHabitName] = useState('');
  const [habitError, setHabitError] = useState('');
  const [checkingHabitId, setCheckingHabitId] = useState<number | null>(null);
  const week = useMemo(() => recentDays(habitDate), [habitDate]);
  const items = Array.isArray(habits.data) ? habits.data : [];
  const refresh = () => void queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });


  const doneCount = items.filter((habit) => {
    const dates = Array.isArray(habit.completedDates) ? habit.completedDates : [];
    return dates.some((value) => normalizeHabitDate(value) === habitDate);
  }).length;

  const addHabit = () => {
    const name = habitName.trim();
    if (!name || createHabit.isPending) return;
    setHabitError('');
    createHabit.mutate({ data: { name, frequency: 'daily' } }, {
      onSuccess: () => { setHabitName(''); refresh(); },
      onError: () => setHabitError('تعذر إضافة العادة. حاول مرة أخرى.'),
    });
  };

  const toggleToday = (habit: Habit, doneToday: boolean) => {
    if (checkingHabitId === habit.id) return;
    if (!doneToday) playHabitSound();
    setCheckingHabitId(habit.id);
    checkHabit.mutate(
      { id: habit.id, data: { date: habitDate } },
      {
        onSuccess: refresh,
        onSettled: () => setCheckingHabitId((current) => current === habit.id ? null : current),
      },
    );
  };

  return <section className="mb-5 rounded-3xl border border-card-border bg-card/70 p-4" dir="rtl">
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
        const normalized = (Array.isArray(habit.completedDates) ? habit.completedDates : []).map(normalizeHabitDate).filter(Boolean);
        const completedSet = new Set(normalized);
        const doneToday = completedSet.has(habitDate);
        const streak = calculateCurrentHabitStreak(normalized, habitDate);
        const weekDone = week.filter((day) => completedSet.has(day)).length;
        const isChecking = checkingHabitId === habit.id;
        return <div key={habit.id} className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 transition ${doneToday ? 'border-secondary/50 bg-secondary/[0.08]' : 'border-border bg-background/70'}`}>
          <button type="button" disabled={isChecking} onClick={() => toggleToday(habit, doneToday)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition disabled:opacity-60 ${doneToday ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-card hover:border-secondary/60'}`} aria-label={doneToday ? 'إلغاء إنجاز اليوم' : 'إنجاز عادة اليوم'} data-testid={`button-check-habit-${habit.id}`}><Check size={15}/></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-extrabold">{habit.name}</span><span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-black text-foreground"><Flame size={12} className="text-secondary"/>{streak}</span></div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex gap-1" aria-label="آخر سبعة أيام">{week.map((day) => <span key={day} title={day} className={`h-2 w-2 rounded-full ${completedSet.has(day) ? 'bg-secondary' : day === habitDate ? 'bg-primary/35 ring-1 ring-primary/30' : 'bg-muted'}`}/>)}</div>
              <span className="text-[10px] font-bold text-muted-foreground">{weekDone}/7</span>
            </div>
          </div>
          <button type="button" onClick={() => deleteHabit.mutate({ id: habit.id }, { onSuccess: refresh })} className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive" aria-label="حذف العادة"><Trash2 size={13}/></button>
        </div>;
      })}
      {!items.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground md:col-span-2 xl:col-span-3">أضف عادة واحدة أو اثنتين وركز على الاستمرار.</p>}
    </div>
  </section>;
}