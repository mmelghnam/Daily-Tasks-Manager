import { Check, Flame, HeartPulse, Plus, Trash2, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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

function useLiveToday() {
  const [today, setToday] = useState(() => localDateKey());
  useEffect(() => {
    const refresh = () => setToday(localDateKey());
    const interval = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return today;
}

function recentDays(today: string, count = 7) {
  const end = new Date(`${today}T12:00:00`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (count - 1 - index));
    return {
      key: localDateKey(date),
      day: new Intl.DateTimeFormat('ar', { weekday: 'short' }).format(date).replace('،', ''),
      number: date.getDate(),
    };
  });
}

export function ProductivityHub() {
  const queryClient = useQueryClient();
  const habits = useListHabits({ query: { queryKey: getListHabitsQueryKey(), staleTime: 30_000, refetchOnWindowFocus: true } });
  const createHabit = useCreateHabit();
  const checkHabit = useCheckHabit();
  const deleteHabit = useDeleteHabit();
  const [habitName, setHabitName] = useState('');
  const [habitError, setHabitError] = useState('');
  const today = useLiveToday();
  const week = useMemo(() => recentDays(today), [today]);
  const items = Array.isArray(habits.data) ? habits.data : [];
  const refresh = () => void queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });

  const doneCount = items.filter((habit) => {
    const dates = Array.isArray(habit.completedDates) ? habit.completedDates : [];
    return dates.some((value) => normalizeHabitDate(value) === today);
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

  const toggleDate = (habit: Habit, date: string, alreadyDone: boolean) => {
    if (!alreadyDone && date === today) playHabitSound();
    checkHabit.mutate({ id: habit.id, data: { date } }, { onSuccess: refresh });
  };

  return <section className="mb-6 rounded-3xl border border-card-border bg-card/70 p-4 sm:p-5" dir="rtl">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><HeartPulse size={20} className="text-secondary"/><div><h2 className="text-lg font-extrabold">الاستمرار اليومي</h2><p className="text-xs text-muted-foreground">كل يوم خانة جديدة. علّم إنجازك وشوف السلسلة تكبر.</p></div></div>
      <div className="rounded-2xl bg-primary/8 px-3 py-2 text-center"><p className="text-[10px] font-bold text-muted-foreground">إنجاز اليوم</p><p className="text-lg font-black text-primary">{doneCount}/{items.length}</p></div>
    </div>

    <form onSubmit={(event) => { event.preventDefault(); addHabit(); }} className="mb-4 flex gap-2">
      <input value={habitName} onChange={(e) => { setHabitName(e.target.value); if (habitError) setHabitError(''); }} placeholder="مثلاً: صلاة الفجر، قراءة 10 دقائق..." className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-new-habit"/>
      <button type="submit" disabled={createHabit.isPending || !habitName.trim()} className="rounded-xl bg-secondary px-4 font-extrabold text-secondary-foreground disabled:opacity-60" data-testid="button-add-habit"><Plus size={17}/></button>
    </form>
    {habitError && <p className="mb-3 text-xs font-bold text-destructive">{habitError}</p>}

    <div className="space-y-3">
      {items.map((habit: Habit) => {
        const normalized = (Array.isArray(habit.completedDates) ? habit.completedDates : []).map(normalizeHabitDate).filter(Boolean);
        const completedSet = new Set(normalized);
        const streak = calculateCurrentHabitStreak(normalized, today);
        const total = completedSet.size;
        const weekDone = week.filter((day) => completedSet.has(day.key)).length;
        const doneToday = completedSet.has(today);

        return <article key={habit.id} className={`rounded-2xl border p-4 transition ${doneToday ? 'border-secondary/50 bg-secondary/[0.07]' : 'border-border bg-background/70'}`}>
          <div className="mb-3 flex items-center gap-3">
            <button type="button" disabled={checkHabit.isPending} onClick={() => toggleDate(habit, today, doneToday)} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition ${doneToday ? 'border-secondary bg-secondary text-secondary-foreground shadow-sm' : 'border-border bg-card hover:border-secondary/60'}`} aria-label={doneToday ? 'إلغاء إنجاز اليوم' : 'إنجاز عادة اليوم'} data-testid={`button-check-habit-${habit.id}`}><Check size={18}/></button>
            <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-extrabold">{habit.name}</h3><div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-bold text-muted-foreground"><span className="inline-flex items-center gap-1 text-primary"><Flame size={13}/>{streak} يوم متتالي</span><span className="inline-flex items-center gap-1"><Trophy size={12}/>{total} يوم إجمالي</span><span>{weekDone}/7 هذا الأسبوع</span></div></div>
            <button type="button" onClick={() => deleteHabit.mutate({ id: habit.id }, { onSuccess: refresh })} className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive" aria-label="حذف العادة"><Trash2 size={14}/></button>
          </div>

          <div className="grid grid-cols-7 gap-1.5" aria-label="آخر سبعة أيام">
            {week.map((day) => {
              const done = completedSet.has(day.key);
              const isToday = day.key === today;
              return <button key={day.key} type="button" disabled={checkHabit.isPending} onClick={() => toggleDate(habit, day.key, done)} title={`${day.day} ${day.number}`} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 transition ${done ? 'border-secondary bg-secondary text-secondary-foreground' : isToday ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/30'}`}>
                <span className="max-w-full truncate text-[9px] font-bold">{day.day}</span>
                <span className="text-xs font-black">{day.number}</span>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${done ? 'border-current bg-current/15' : 'border-current/30'}`}>{done && <Check size={10}/>}</span>
              </button>;
            })}
          </div>
        </article>;
      })}
      {!items.length && <div className="rounded-2xl border border-dashed py-7 text-center"><HeartPulse className="mx-auto mb-2 text-primary" size={22}/><p className="text-sm font-extrabold">ابدأ بعادة واحدة فقط</p><p className="mt-1 text-xs text-muted-foreground">الهدف هنا هو الاستمرار، مش كثرة العادات.</p></div>}
    </div>
  </section>;
}
