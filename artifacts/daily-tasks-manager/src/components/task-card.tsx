import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Check, ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  getGetTaskSummaryQueryKey,
  getListTasksQueryKey,
  useDeleteTask,
  useUpdateTask,
} from '@workspace/api-client-react';
import type { Task } from '@workspace/api-client-react';
import { TaskForm } from '@/components/task-form';
import { FollowUpList } from '@/components/follow-up-list';

interface TaskCardProps {
  task: Task;
  date: string;
  spaces: string[];
}

function playCompletionSound() {
  type WindowWithWebkitAudio = Window & {
    webkitAudioContext?: typeof AudioContext;
  };

  const AudioContextConstructor =
    window.AudioContext ??
    (window as WindowWithWebkitAudio).webkitAudioContext;

  if (!AudioContextConstructor) return;

  const audioContext = new AudioContextConstructor();
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(523.25, now);
  oscillator.frequency.exponentialRampToValueAtTime(783.99, now + 0.14);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.065, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.23);
  oscillator.addEventListener('ended', () => {
    void audioContext.close();
  });
}

function nextDate(date: string) {
  const tomorrow = new Date(`${date}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

export function TaskCard({ task, date, spaces }: TaskCardProps) {
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date }) });
    void queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey({ date }) });
  };

  const saveFollowUps = (followUps: Task['followUps']) => {
    updateTask.mutate({ id: task.id, data: { followUps } }, { onSuccess: refresh });
  };

  const moveToTomorrow = () => {
    const tomorrow = nextDate(date);
    updateTask.mutate(
      { id: task.id, data: { taskDate: tomorrow } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date }) });
          void queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey({ date }) });
          void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date: tomorrow }) });
          void queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey({ date: tomorrow }) });
        },
      },
    );
    setMenuOpen(false);
  };

  const toggle = () => {
    if (!task.completed) playCompletionSound();
    updateTask.mutate({ id: task.id, data: { completed: !task.completed } }, { onSuccess: refresh });
  };

  const remove = () => {
    if (!window.confirm('هل تريد حذف هذه المهمة نهائياً؟')) return;
    deleteTask.mutate({ id: task.id }, { onSuccess: refresh });
  };

  return (
    <>
      <article data-testid={`card-task-${task.id}`} className={`group relative rounded-2xl border bg-card px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 sm:px-5 ${task.completed ? 'border-border/70 opacity-75' : 'border-card-border'}`}>
        <div className="flex items-start gap-3">
          <button type="button" onClick={toggle} disabled={updateTask.isPending} aria-label={task.completed ? 'إلغاء إكمال المهمة' : 'إكمال المهمة'} data-testid={`button-toggle-task-${task.id}`} className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition ${task.completed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-background text-transparent hover:border-secondary hover:bg-secondary/15'}`}>
            <Check size={16} strokeWidth={3} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 data-testid={`text-task-title-${task.id}`} className={`text-[0.98rem] font-bold leading-7 ${task.completed ? 'text-muted-foreground line-through decoration-secondary decoration-2' : 'text-foreground'}`}>{task.title}</h3>
              <div className="relative shrink-0">
                <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="خيارات المهمة" data-testid={`button-task-menu-${task.id}`} className="rounded-lg p-1.5 text-muted-foreground opacity-100 transition hover:bg-muted hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"><MoreHorizontal size={18} /></button>
                {menuOpen && (
                  <div className="absolute left-0 top-9 z-20 w-32 overflow-hidden rounded-xl border border-border bg-popover p-1 text-sm shadow-xl">
                    <button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }} data-testid={`button-edit-task-${task.id}`} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right font-semibold hover:bg-muted"><Pencil size={14} /> تعديل</button>
                    {!task.completed && <button type="button" onClick={moveToTomorrow} disabled={updateTask.isPending} data-testid={`button-move-task-${task.id}`} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right font-semibold hover:bg-muted"><CalendarPlus size={14} /> ترحيل للغد</button>}
                    <button type="button" onClick={remove} disabled={deleteTask.isPending} data-testid={`button-delete-task-${task.id}`} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right font-semibold text-destructive hover:bg-destructive/10"><Trash2 size={14} /> حذف</button>
                  </div>
                )}
              </div>
            </div>
            {task.notes && <p data-testid={`text-task-notes-${task.id}`} className="mt-1 text-sm leading-6 text-muted-foreground">{task.notes}</p>}
            {task.subtasks.length > 0 && <div className="mt-3 space-y-1.5 rounded-xl bg-muted/40 p-2.5">
              {task.subtasks.map((subtask) => <button type="button" key={subtask.id} onClick={() => updateTask.mutate({ id: task.id, data: { subtasks: task.subtasks.map((item) => item.id === subtask.id ? { ...item, completed: !item.completed } : item) } }, { onSuccess: refresh })} className="flex w-full items-center gap-2 text-right text-xs font-semibold text-muted-foreground">
                <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${subtask.completed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border'}`}><Check size={12} /></span>
                <span className={subtask.completed ? 'line-through' : ''}>{subtask.title}</span>
              </button>)}
            </div>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-lg px-2 py-1 text-[11px] font-extrabold ${task.priority === 'high' ? 'bg-destructive/10 text-destructive' : task.priority === 'low' ? 'bg-muted text-muted-foreground' : 'bg-secondary/15 text-primary'}`}>
                {task.priority === 'high' ? 'أولوية عالية' : task.priority === 'low' ? 'أولوية منخفضة' : 'أولوية متوسطة'}
              </span>
              {task.recurrence && <span className="rounded-lg bg-accent/15 px-2 py-1 text-[11px] font-extrabold text-accent-foreground">{task.recurrence === 'daily' ? 'تتكرر يوميًا' : task.recurrence === 'weekly' ? 'تتكرر أسبوعيًا' : 'تتكرر شهريًا'}</span>}
              {task.dueDate && <span className="rounded-lg bg-muted px-2 py-1 text-[11px] font-extrabold text-muted-foreground">التسليم {task.dueDate}</span>}
              {task.links.map((link, index) => (
                <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer" data-testid={`link-task-${task.id}-${index}`} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/15 px-2.5 py-1 text-xs font-bold text-primary transition hover:bg-secondary/30">
                  <ExternalLink size={12} /> {link.label}
                </a>
              ))}
              <time dateTime={task.updatedAt} className="mr-auto font-mono-ui text-[10px] tracking-wide text-muted-foreground/75">{new Date(task.updatedAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
            <FollowUpList followUps={task.followUps} isPending={updateTask.isPending} onChange={saveFollowUps} />
          </div>
        </div>
      </article>
      {editing && <TaskForm date={date} task={task} spaces={spaces} onClose={() => setEditing(false)} />}
    </>
  );
}