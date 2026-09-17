import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CalendarPlus, Check, Clock3, Copy, ExternalLink, GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  getGetTaskSummaryQueryKey,
  getListTasksQueryKey,
  copyTask,
  useDeleteTask,
  useUpdateTask,
} from '@workspace/api-client-react';
import type { Task } from '@workspace/api-client-react';
import { TaskForm } from '@/components/task-form';
import { FollowUpList } from '@/components/follow-up-list';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TaskCardProps {
  task: Task;
  date: string;
  spaces: string[];
  onReorder?: (direction: 'up' | 'down') => void;
  onDragStart?: (taskId: number) => void;
  onDropTask?: (taskId: number) => void;
  isDragging?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
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

function dateOnly(value: string | null | undefined) {
  const match = value?.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? '';
}

function safeDate(value: string) {
  const normalized = dateOnly(value);
  const parsed = new Date(`${normalized}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatUpdatedTime(value: string | null | undefined) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
}

function nextDate(date: string) {
  const tomorrow = safeDate(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function nextDates(date: string, count: number) {
  return Array.from({ length: count }, (_, index) => shiftDate(date, index + 1));
}

function shiftDate(date: string, amount: number) {
  const next = safeDate(date);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
}

function datesBetween(startDate: string, endDate: string) {
  const start = safeDate(startDate);
  const end = safeDate(endDate);
  if (end < start) return [];
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < 31) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function TaskCard({ task, date, spaces, onReorder, onDragStart, onDropTask, isDragging, canMoveUp, canMoveDown }: TaskCardProps) {
  const normalizedTaskDate = dateOnly(date) || new Date().toISOString().slice(0, 10);
  const updatedTime = formatUpdatedTime(task.updatedAt);
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuCloseTimerRef = useRef<number | null>(null);
  const [copyStartDate, setCopyStartDate] = useState(nextDate(normalizedTaskDate));
  const [copyEndDate, setCopyEndDate] = useState(shiftDate(nextDate(normalizedTaskDate), 2));
  const [copyPending, setCopyPending] = useState(false);
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const links = Array.isArray(task.links) ? task.links : [];
  const followUps = Array.isArray(task.followUps) ? task.followUps : [];

  const cancelScheduledMenuClose = () => {
    if (menuCloseTimerRef.current !== null) {
      window.clearTimeout(menuCloseTimerRef.current);
      menuCloseTimerRef.current = null;
    }
  };

  const scheduleMenuClose = () => {
    cancelScheduledMenuClose();
    menuCloseTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
      menuCloseTimerRef.current = null;
    }, 160);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuButtonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeFromOutside, true);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside, true);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [menuOpen]);

  const toggleTaskMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }

    const button = menuButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 224;
    const gutter = 8;
    const preferredTop = rect.bottom + gutter;
    const estimatedHeight = task.completed ? 190 : 230;
    const top = Math.max(
      gutter,
      Math.min(preferredTop, window.innerHeight - estimatedHeight - gutter),
    );
    const preferredLeft = rect.right - menuWidth;
    const rightSideLeft = rect.left;
    const left = preferredLeft >= gutter
      ? Math.min(preferredLeft, window.innerWidth - menuWidth - gutter)
      : Math.min(rightSideLeft, window.innerWidth - menuWidth - gutter);

    setMenuPosition({
      top,
      left,
      maxHeight: Math.max(150, window.innerHeight - top - gutter),
    });
    setMenuOpen(true);
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
  };

  const saveFollowUps = (nextFollowUps: Task['followUps']) => {
    updateTask.mutate({ id: task.id, data: { followUps: nextFollowUps } }, { onSuccess: refresh });
  };

  const moveToTomorrow = () => {
    const tomorrow = nextDate(normalizedTaskDate);
    updateTask.mutate(
      { id: task.id, data: { taskDate: tomorrow } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          void queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
        },
      },
    );
    setMenuOpen(false);
  };

  const copyToDates = (dates: string[]) => {
    setCopyPending(true);
    void copyTask(task.id, { dates })
      .then(() => {
        setMenuOpen(false);
        setCopyOpen(false);
        refresh();
      })
      .finally(() => setCopyPending(false));
  };

  const toggle = () => {
    if (!task.completed) playCompletionSound();
    const nextCompleted = !task.completed;
    const taskListQueryKey = getListTasksQueryKey();
    const snapshots = queryClient.getQueriesData<Task[]>({ queryKey: taskListQueryKey });

    queryClient.setQueriesData<Task[]>({ queryKey: taskListQueryKey }, (currentTasks) =>
      currentTasks?.map((currentTask) =>
        currentTask.id === task.id ? { ...currentTask, completed: nextCompleted } : currentTask,
      ),
    );

    updateTask.mutate(
      { id: task.id, data: { completed: nextCompleted } },
      {
        onSuccess: refresh,
        onError: () => {
          snapshots.forEach(([queryKey, previousTasks]) => {
            queryClient.setQueryData(queryKey, previousTasks);
          });
        },
      },
    );
  };

  const remove = () => {
    setMenuOpen(false);
    setDeleteOpen(true);
  };

  const confirmRemove = () => {
    deleteTask.mutate({ id: task.id }, {
      onSuccess: () => {
        refresh();
        setDeleteOpen(false);
      },
    });
  };

  return (
    <>
      <article
        data-testid={`card-task-${task.id}`}
        draggable={Boolean(onDragStart)}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/task-id', String(task.id));
          onDragStart?.(task.id);
        }}
        onDragOver={(event) => {
          if (!onDropTask) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(event) => {
          event.preventDefault();
          const draggedId = Number(event.dataTransfer.getData('text/task-id'));
          if (draggedId && draggedId !== task.id) onDropTask?.(draggedId);
        }}
        onDragEnd={() => onDragStart?.(0)}
        className={`group relative rounded-2xl border bg-card px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 sm:px-5 ${isDragging ? 'border-primary bg-primary/5 opacity-50 shadow-xl ring-2 ring-primary/20' : task.completed ? 'border-border/70 opacity-75' : 'border-card-border'}`}
      >
        <div className="flex items-start gap-3">
          {onDragStart && <span title="اسحب لترتيب المهمة" aria-label="اسحب لترتيب المهمة" className="mt-1 flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted-foreground/60 transition hover:bg-muted hover:text-primary active:cursor-grabbing"><GripVertical size={18} /></span>}
          <button type="button" onClick={toggle} disabled={updateTask.isPending} aria-label={task.completed ? 'إلغاء إكمال المهمة' : 'إكمال المهمة'} data-testid={`button-toggle-task-${task.id}`} className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition ${task.completed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-background text-transparent hover:border-secondary hover:bg-secondary/15'}`}>
            <Check size={16} strokeWidth={3} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 data-testid={`text-task-title-${task.id}`} className={`text-[0.98rem] font-bold leading-7 ${task.completed ? 'text-muted-foreground line-through decoration-secondary decoration-2' : 'text-foreground'}`}>{task.title}</h3>
               <div className="relative shrink-0">
                  <button ref={menuButtonRef} type="button" onClick={toggleTaskMenu} onPointerEnter={cancelScheduledMenuClose} onPointerLeave={scheduleMenuClose} aria-expanded={menuOpen} aria-label="خيارات المهمة" data-testid={`button-task-menu-${task.id}`} className="rounded-lg p-1.5 text-muted-foreground opacity-100 transition hover:bg-muted hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"><MoreHorizontal size={18} /></button>
                  {menuOpen && menuPosition && createPortal(
                    <div ref={menuRef} dir="rtl" onPointerEnter={cancelScheduledMenuClose} onPointerLeave={scheduleMenuClose} className="fixed z-[100] w-56 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-popover-border bg-popover p-1.5 text-sm text-popover-foreground shadow-2xl" style={{ top: menuPosition.top, left: menuPosition.left, maxHeight: menuPosition.maxHeight }}>
                     <button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }} data-testid={`button-edit-task-${task.id}`} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right font-semibold hover:bg-muted"><Pencil size={14} /> تعديل المهمة</button>
                     {!task.completed && <button type="button" onClick={moveToTomorrow} disabled={updateTask.isPending} data-testid={`button-move-task-${task.id}`} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right font-semibold hover:bg-muted disabled:opacity-50"><CalendarPlus size={14} /> ترحيل للغد</button>}
                     <button type="button" onClick={() => copyToDates([nextDate(normalizedTaskDate)])} disabled={copyPending} data-testid={`button-copy-tomorrow-${task.id}`} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right font-semibold hover:bg-muted disabled:opacity-50"><Copy size={14} /> نسخ للغد</button>
                     <button type="button" onClick={() => { setCopyOpen(true); setMenuOpen(false); }} data-testid={`button-copy-range-${task.id}`} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right font-semibold hover:bg-muted"><CalendarDays size={14} /> نسخ لمدة</button>
                     <button type="button" onClick={remove} disabled={deleteTask.isPending} data-testid={`button-delete-task-${task.id}`} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"><Trash2 size={14} /> حذف المهمة</button>
                   </div>
                  , document.body)}
               </div>
            </div>
            {task.notes && <p data-testid={`text-task-notes-${task.id}`} className="mt-1 text-sm leading-6 text-muted-foreground">{task.notes}</p>}
            {subtasks.length > 0 && <div className="mt-3 space-y-1.5 rounded-xl bg-muted/40 p-2.5">
              {subtasks.map((subtask) => <button type="button" key={subtask.id} onClick={() => updateTask.mutate({ id: task.id, data: { subtasks: subtasks.map((item) => item.id === subtask.id ? { ...item, completed: !item.completed } : item) } }, { onSuccess: refresh })} className="flex w-full items-center gap-2 text-right text-xs font-semibold text-muted-foreground">
                <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${subtask.completed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border'}`}><Check size={12} /></span>
                <span className={subtask.completed ? 'line-through' : ''}>{subtask.title}</span>
              </button>)}
            </div>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-lg px-2 py-1 text-[11px] font-extrabold ${task.priority === 'high' ? 'bg-destructive/10 text-destructive' : task.priority === 'low' ? 'bg-muted text-muted-foreground' : 'bg-secondary/15 text-primary'}`}>
                {task.priority === 'high' ? 'أولوية عالية' : task.priority === 'low' ? 'أولوية منخفضة' : 'أولوية متوسطة'}
              </span>
              {task.startTime && <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-extrabold text-primary"><Clock3 size={12} /> {task.startTime}{task.durationMinutes ? ` · ${task.durationMinutes} د` : ''}</span>}
              {task.recurrence && <span className="rounded-lg bg-accent/15 px-2 py-1 text-[11px] font-extrabold text-accent-foreground">{task.recurrence === 'daily' ? 'تتكرر يوميًا' : task.recurrence === 'weekly' ? 'تتكرر أسبوعيًا' : 'تتكرر شهريًا'}</span>}
              {task.dueDate && <span className="rounded-lg bg-muted px-2 py-1 text-[11px] font-extrabold text-muted-foreground">التسليم {task.dueDate}</span>}
              {links.map((link, index) => (
                <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer" data-testid={`link-task-${task.id}-${index}`} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/15 px-2.5 py-1 text-xs font-bold text-primary transition hover:bg-secondary/30">
                  <ExternalLink size={12} /> {link.label}
                </a>
              ))}
              {updatedTime && <time dateTime={task.updatedAt} className="mr-auto font-mono-ui text-[10px] tracking-wide text-muted-foreground/75">{updatedTime}</time>}
            </div>
            <FollowUpList followUps={followUps} isPending={updateTask.isPending} onChange={saveFollowUps} />
          </div>
        </div>
      </article>
      {editing && <TaskForm date={normalizedTaskDate} task={task} spaces={spaces} onClose={() => setEditing(false)} />}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-xl text-destructive"><Trash2 size={19} /> حذف المهمة</DialogTitle>
            <DialogDescription className="leading-6">
              هل تريد حذف «{task.title}» نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-start">
            <button type="button" onClick={() => setDeleteOpen(false)} disabled={deleteTask.isPending} className="h-11 rounded-xl border border-border px-5 text-sm font-bold text-muted-foreground transition hover:bg-muted">إلغاء</button>
            <button type="button" onClick={confirmRemove} disabled={deleteTask.isPending} data-testid={`button-confirm-delete-task-${task.id}`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive px-5 text-sm font-extrabold text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-wait disabled:opacity-60">
              <Trash2 size={16} /> {deleteTask.isPending ? 'جارٍ الحذف...' : 'حذف المهمة'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2"><Copy size={18} className="text-primary" /> نسخ المهمة</DialogTitle>
            <DialogDescription>ستظل المهمة الأصلية في مكانها، وتُضاف نسخة جديدة في التاريخ المحدد.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5 text-sm font-bold"><span>من تاريخ</span><input id={`copy-start-${task.id}`} type="date" value={copyStartDate} min={normalizedTaskDate} onChange={(event) => setCopyStartDate(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus:border-primary" /></label>
              <label className="space-y-1.5 text-sm font-bold"><span>إلى تاريخ</span><input id={`copy-end-${task.id}`} type="date" value={copyEndDate} min={copyStartDate} onChange={(event) => setCopyEndDate(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus:border-primary" /></label>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">سيتم إنشاء نسخة لكل يوم في المدة، بحد أقصى 31 يومًا.</p>
            <button type="button" onClick={() => copyToDates(datesBetween(copyStartDate, copyEndDate))} disabled={!datesBetween(copyStartDate, copyEndDate).length || copyPending} data-testid={`button-confirm-copy-range-${task.id}`} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-60"><Copy size={16} /> {copyPending ? 'جارٍ النسخ...' : `نسخ ${datesBetween(copyStartDate, copyEndDate).length} يوم`}</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}