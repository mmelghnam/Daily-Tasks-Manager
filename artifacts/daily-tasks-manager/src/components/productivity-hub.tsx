import { Check, Flame, HeartPulse, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
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

export function ProductivityHub() {
  const queryClient = useQueryClient();
  const habits = useListHabits({ query: { queryKey: getListHabitsQueryKey(), staleTime: 60_000, refetchOnWindowFocus: false } });
  const createHabit = useCreateHabit();
  const checkHabit = useCheckHabit();
  const deleteHabit = useDeleteHabit();
  const [habitName, setHabitName] = useState('');
  const [habitError, setHabitError] = useState('');
  const items = Array.isArray(habits.data) ? habits.data : [];
  const today = localDateKey();
  const doneCount = items.filter((habit) => (Array.isArray(habit.completedDates) ? habit.completedDates : []).some((value) => normalizeHabitDate(value) === today)).length;
  const refresh = () => void queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });

  const addHabit = () => {
    const name = habitName.trim();
    if (!name || createHabit.isPending) return;
    setHabitError('');
    createHabit.mutate({ data: { name, frequency: 'daily' } }, {
      onSuccess: () => { setHabitName(''); refresh(); },
      onError: () => setHabitError('تعذر إضافة العادة. حاول مرة أخرى.'),
    });
  };

  return <section className="mb-6 rounded-3xl border border-card-border bg-card/70 p-4 sm:p-5" dir="rtl">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2"><HeartPulse size={19} className="text-secondary"/><div><h2 className="text-lg font-extrabold">العادات اليومية</h2><p className="text-xs text-muted-foreground">{doneCount}/{items.length} مكتملة اليوم</p></div></div>
    </div>
    <form onSubmit={(event) => { event.preventDefault(); addHabit(); }} className="mb-3 flex gap-2">
      <input value={habitName} onChange={(e) => { setHabitName(e.target.value); if (habitError) setHabitError(''); }} placeholder="عادة جديدة..." className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-new-habit"/>
      <button type="submit" disabled={createHabit.isPending || !habitName.trim()} className="rounded-xl bg-secondary px-3 text-secondary-foreground disabled:opacity-60" data-testid="button-add-habit"><Plus size={17}/></button>
    </form>
    {habitError && <p className="mb-3 text-xs font-bold text-destructive">{habitError}</p>}
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {items.map((habit: Habit) => {
        const dates = Array.isArray(habit.completedDates) ? habit.completedDates : [];
        const normalized = dates.map(normalizeHabitDate).filter(Boolean);
        const doneToday = normalized.includes(today);
        const streak = calculateCurrentHabitStreak(dates, today);
        return <div key={habit.id} className="flex items-center gap-2 rounded-xl bg-background/70 p-3">
          <button type="button" disabled={checkHabit.isPending} onClick={() => { if (!doneToday) playHabitSound(); checkHabit.mutate({ id: habit.id, data: { date: today } }, { onSuccess: refresh }); }} className={`flex h-7 w-7 items-center justify-center rounded-lg border ${doneToday ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border'}`} data-testid={`button-check-habit-${habit.id}`}><Check size={14}/></button>
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{habit.name}</span>
          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-primary"><Flame size={12}/>{streak}</span>
          <button type="button" onClick={() => deleteHabit.mutate({ id: habit.id }, { onSuccess: refresh })} className="text-muted-foreground hover:text-destructive" aria-label="حذف العادة"><Trash2 size={14}/></button>
        </div>;
      })}
      {!items.length && <p className="py-3 text-center text-xs font-semibold text-muted-foreground md:col-span-2 xl:col-span-3">أضف عادة واحدة أو اثنتين فقط وركز على الاستمرار.</p>}
    </div>
  </section>;
}
