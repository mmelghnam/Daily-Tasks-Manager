import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Clock3, Pause, Play, RotateCcw, Target, TimerReset } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetTaskSummaryQueryKey,
  getListTasksQueryKey,
  useListTasks,
  useUpdateTask,
} from '@workspace/api-client-react';
import type { Task } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousDayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

function daysLate(taskDate: string) {
  const due = new Date(`${taskDate.slice(0, 10)}T12:00:00`);
  const today = new Date(`${localDateKey()}T12:00:00`);
  const diff = today.getTime() - due.getTime();
  return Math.max(1, Math.round(diff / 86_400_000));
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function OverdueFocusTools({ tasks }: { tasks: Task[] }) {
  const queryClient = useQueryClient();
  const overdueQuery = useListTasks(
    { dateTo: previousDayKey() },
    { query: { staleTime: 60_000, refetchOnWindowFocus: false } },
  );
  const updateTask = useUpdateTask();
  const [focusOpen, setFocusOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  const overdueTasks = useMemo(() => {
    const items = Array.isArray(overdueQuery.data) ? overdueQuery.data : [];
    return items
      .filter((task) => !task.completed && task.taskDate.slice(0, 10) < localDateKey())
      .sort((a, b) => a.taskDate.localeCompare(b.taskDate) || a.sortOrder - b.sortOrder)
      .slice(0, 6);
  }, [overdueQuery.data]);

  const focusTasks = useMemo(
    () => tasks.filter((task) => !task.completed).slice(0, 12),
    [tasks],
  );

  const activeTask = focusTasks.find((task) => task.id === focusTaskId) ?? focusTasks[0] ?? null;

  useEffect(() => {
    if (!focusOpen || !running || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusOpen, running, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0) setRunning(false);
  }, [secondsLeft]);

  const refreshTasks = () => {
    void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
  };

  const completeTask = (task: Task) => {
    updateTask.mutate(
      { id: task.id, data: { completed: true } },
      { onSuccess: refreshTasks },
    );
  };

  const startFocus = (task?: Task) => {
    setFocusTaskId(task?.id ?? focusTasks[0]?.id ?? null);
    setSecondsLeft(25 * 60);
    setRunning(false);
    setFocusOpen(true);
  };

  return (
    <>
      <section className="mb-6 grid gap-3 lg:grid-cols-[1.3fr_0.7fr]" dir="rtl">
        <div className="rounded-2xl border border-card-border bg-card/70 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><AlertTriangle size={17} /></span>
              <div>
                <h2 className="text-sm font-extrabold">مهام متأخرة</h2>
                <p className="text-[11px] font-semibold text-muted-foreground">المهام غير المكتملة من الأيام السابقة</p>
              </div>
            </div>
            <span className="rounded-xl bg-destructive/10 px-3 py-1.5 text-xs font-extrabold text-destructive">{overdueTasks.length}</span>
          </div>

          {overdueQuery.isLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
          ) : overdueTasks.length === 0 ? (
            <div className="rounded-xl bg-secondary/10 px-3 py-4 text-center text-xs font-bold text-muted-foreground">لا توجد مهام متأخرة — ممتاز.</div>
          ) : (
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 p-3">
                  <button type="button" disabled={updateTask.isPending} onClick={() => completeTask(task)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-transparent transition hover:border-secondary hover:bg-secondary/15 hover:text-secondary-foreground disabled:opacity-50" aria-label={`إكمال ${task.title}`}><Check size={15} strokeWidth={3} /></button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{task.title}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-destructive">متأخرة {daysLate(task.taskDate)} يوم</p>
                  </div>
                  <button type="button" onClick={() => startFocus(task)} className="rounded-lg border border-primary/20 px-2.5 py-1.5 text-[11px] font-extrabold text-primary transition hover:bg-primary/10">ركّز</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/10">
          <Target className="absolute -left-3 -top-4 h-24 w-24 opacity-10" />
          <div className="relative flex h-full flex-col justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-secondary"><Clock3 size={17} /><span className="text-xs font-extrabold">وضع التركيز</span></div>
              <h2 className="mt-3 text-xl font-extrabold">25 دقيقة لمهمة واحدة</h2>
              <p className="mt-2 text-xs font-semibold leading-6 text-primary-foreground/70">اقفل المشتتات واشتغل على أهم مهمة حالية فقط.</p>
            </div>
            <button type="button" disabled={!focusTasks.length} onClick={() => startFocus()} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-extrabold text-secondary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"><Play size={16} /> ابدأ جلسة تركيز</button>
          </div>
        </div>
      </section>

      <Dialog open={focusOpen} onOpenChange={(open) => { setFocusOpen(open); if (!open) setRunning(false); }}>
        <DialogContent dir="rtl" className="max-w-xl rounded-3xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-xl"><TimerReset className="text-primary" /> وضع التركيز</DialogTitle>
            <DialogDescription>مهمة واحدة. مؤقت واحد. بدون تشتيت.</DialogDescription>
          </DialogHeader>

          {activeTask ? (
            <div className="space-y-5">
              <label className="block text-xs font-extrabold text-muted-foreground">المهمة الحالية
                <select value={activeTask.id} onChange={(event) => { setFocusTaskId(Number(event.target.value)); setSecondsLeft(25 * 60); setRunning(false); }} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold text-foreground outline-none focus:border-primary">
                  {focusTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                </select>
              </label>

              <div className="rounded-3xl bg-primary px-6 py-8 text-center text-primary-foreground">
                <p className="text-xs font-bold text-primary-foreground/60">الوقت المتبقي</p>
                <p className="mt-2 font-mono text-6xl font-black tracking-tight" dir="ltr">{formatTimer(secondsLeft)}</p>
                {secondsLeft === 0 && <p className="mt-3 text-sm font-extrabold text-secondary">انتهت الجلسة — قيّم تقدمك الآن.</p>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setRunning((value) => !value)} disabled={secondsLeft === 0} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-extrabold text-secondary-foreground disabled:opacity-50">{running ? <Pause size={16} /> : <Play size={16} />}{running ? 'إيقاف' : 'ابدأ'}</button>
                <button type="button" onClick={() => { setSecondsLeft(25 * 60); setRunning(false); }} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-extrabold"><RotateCcw size={16} /> إعادة</button>
                <button type="button" onClick={() => { completeTask(activeTask); setRunning(false); setFocusOpen(false); }} disabled={updateTask.isPending} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-50"><Check size={16} /> أنجزت</button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-muted p-6 text-center text-sm font-bold text-muted-foreground">أضف مهمة أولاً ثم ابدأ جلسة التركيز.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
