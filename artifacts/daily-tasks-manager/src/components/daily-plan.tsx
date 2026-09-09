import { CalendarClock, Check, CircleAlert, Clock3, Flag, Timer } from 'lucide-react';
import type { Task } from '@workspace/api-client-react';

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} س و${rest} د` : `${hours} ساعة`;
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return value;
  return new Intl.DateTimeFormat('ar', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes));
}

export function DailyPlan({ tasks }: { tasks: Task[] }) {
  const scheduled = tasks
    .filter((task) => Boolean(task.startTime))
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.sortOrder - b.sortOrder);
  const plannedMinutes = scheduled.reduce((total, task) => total + (task.durationMinutes ?? 30), 0);
  const completedMinutes = scheduled.filter((task) => task.completed).reduce((total, task) => total + (task.durationMinutes ?? 30), 0);
  const unscheduledCount = tasks.filter((task) => !task.startTime && !task.completed).length;
  const highPriorityCount = tasks.filter((task) => task.priority === 'high' && !task.completed).length;
  const completion = plannedMinutes ? Math.round((completedMinutes / plannedMinutes) * 100) : 0;

  return (
    <section className="animate-rise mb-6 rounded-3xl border border-card-border bg-card/75 p-4 shadow-sm sm:p-5" aria-labelledby="daily-plan-title">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarClock size={18} /></span>
            <div>
              <h2 id="daily-plan-title" className="text-xl font-extrabold">خطة اليوم</h2>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">حوّل قائمة المهام إلى وقت واقعي قابل للإنجاز</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-extrabold">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-primary"><Timer size={14} /> {formatDuration(plannedMinutes)} مخطط</span>
          {highPriorityCount > 0 && <span className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-destructive"><Flag size={14} /> {highPriorityCount} أولوية عالية</span>}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-background/75 p-3">
          <p className="text-xs font-bold text-muted-foreground">الوقت المنجز</p>
          <p className="mt-1 text-lg font-extrabold text-foreground">{formatDuration(completedMinutes)}</p>
        </div>
        <div className="rounded-2xl bg-background/75 p-3">
          <p className="text-xs font-bold text-muted-foreground">المهام المجدولة</p>
          <p className="mt-1 text-lg font-extrabold text-foreground">{scheduled.length}</p>
        </div>
        <div className="rounded-2xl bg-background/75 p-3">
          <p className="text-xs font-bold text-muted-foreground">بدون وقت</p>
          <p className="mt-1 text-lg font-extrabold text-foreground">{unscheduledCount}</p>
        </div>
      </div>

      {scheduled.length > 0 ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>مسار التنفيذ</span>
            <span>{completion}% من الوقت المخطط</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: `${completion}%` }} />
          </div>
          <div className="grid gap-2 pt-1 md:grid-cols-2">
            {scheduled.map((task) => (
              <div key={task.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${task.completed ? 'border-secondary/30 bg-secondary/10' : 'border-border bg-background/60'}`}>
                <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary" dir="ltr"><Clock3 size={13} className="ml-1" />{formatTime(task.startTime ?? '')}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-extrabold ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{task.category} · {formatDuration(task.durationMinutes ?? 30)}</p>
                </div>
                {task.completed ? <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Check size={15} /></span> : <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.04] p-4 text-sm font-semibold text-muted-foreground">
          <CircleAlert size={18} className="shrink-0 text-primary" />
          <span>لا توجد مهام مجدولة بوقت بعد. افتح تعديل أي مهمة وحدد وقت التنفيذ لتظهر هنا.</span>
        </div>
      )}
    </section>
  );
}