import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck2,
  CheckCircle2,
  Inbox,
  Keyboard,
  ListTodo,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  getGetTaskSummaryQueryKey,
  getListTasksQueryKey,
  useCreateTask,
  useListSpaces,
  useListTasks,
} from '@workspace/api-client-react';
import type { Task } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskForm } from '@/components/task-form';

interface InboxItem {
  id: number;
  title: string;
  notes: string | null;
  createdAt: string;
}

type CommandMode = 'search' | 'inbox' | 'review';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateOnly(value: string | null | undefined) {
  return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
}

function formatDate(value: string) {
  const date = new Date(`${dateOnly(value)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short' }).format(date);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

export function ProductivityCommandCenter() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CommandMode>('search');
  const [query, setQuery] = useState('');
  const [inboxTitle, setInboxTitle] = useState('');
  const [inboxNotes, setInboxNotes] = useState('');
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxSaving, setInboxSaving] = useState(false);
  const [inboxError, setInboxError] = useState('');
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [captureCategory, setCaptureCategory] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);

  const tasksQuery = useListTasks(undefined, {
    query: {
      enabled: open,
      staleTime: 30_000,
    },
  });
  const spacesQuery = useListSpaces(undefined, {
    query: {
      enabled: open || Boolean(editingTask) || creatingTask,
      staleTime: 60_000,
    },
  });
  const createTask = useCreateTask();

  const tasks = Array.isArray(tasksQuery.data) ? tasksQuery.data : [];
  const spaceNames = Array.isArray(spacesQuery.data) ? spacesQuery.data.map((space) => space.name) : [];
  const today = todayKey();

  useEffect(() => {
    if (!captureCategory && spaceNames.length > 0) setCaptureCategory(spaceNames[0]);
  }, [captureCategory, spaceNames]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setMode('search');
        setOpen((value) => !value);
        return;
      }
      if (event.key === '/' && !isEditableTarget(event.target)) {
        event.preventDefault();
        setMode('search');
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const loadInbox = async () => {
    setInboxLoading(true);
    setInboxError('');
    try {
      const response = await fetch('/api/inbox', { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Inbox request failed with ${response.status}`);
      const data = await response.json() as unknown;
      setInboxItems(Array.isArray(data) ? data as InboxItem[] : []);
    } catch {
      setInboxError('تعذر تحميل صندوق الوارد. حاول مرة أخرى.');
    } finally {
      setInboxLoading(false);
    }
  };

  useEffect(() => {
    if (open && mode === 'inbox') void loadInbox();
  }, [open, mode]);

  const normalizedQuery = query.trim().toLocaleLowerCase('ar');
  const searchResults = useMemo(() => {
    const source = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!normalizedQuery) return source.slice(0, 10);
    return source.filter((task) => {
      const haystack = [task.title, task.notes ?? '', task.category, task.taskDate]
        .join(' ')
        .toLocaleLowerCase('ar');
      return haystack.includes(normalizedQuery);
    }).slice(0, 20);
  }, [normalizedQuery, tasks]);

  const todayTasks = useMemo(() => tasks.filter((task) => dateOnly(task.taskDate) === today), [tasks, today]);
  const completedToday = todayTasks.filter((task) => task.completed);
  const pendingToday = todayTasks.filter((task) => !task.completed);
  const completion = todayTasks.length > 0 ? Math.round((completedToday.length / todayTasks.length) * 100) : 0;

  const captureInbox = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = inboxTitle.trim();
    if (!title) return;
    setInboxSaving(true);
    setInboxError('');
    try {
      const response = await fetch('/api/inbox', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, notes: inboxNotes.trim() || undefined }),
      });
      if (!response.ok) throw new Error(`Inbox create failed with ${response.status}`);
      const created = await response.json() as InboxItem;
      setInboxItems((items) => [created, ...items]);
      setInboxTitle('');
      setInboxNotes('');
    } catch {
      setInboxError('تعذر حفظ الفكرة. حاول مرة أخرى.');
    } finally {
      setInboxSaving(false);
    }
  };

  const deleteInboxItem = async (id: number) => {
    try {
      const response = await fetch(`/api/inbox/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok && response.status !== 404) throw new Error(`Inbox delete failed with ${response.status}`);
      setInboxItems((items) => items.filter((item) => item.id !== id));
    } catch {
      setInboxError('تعذر حذف الفكرة. حاول مرة أخرى.');
    }
  };

  const convertInboxItem = async (item: InboxItem) => {
    const category = captureCategory || spaceNames[0] || 'Self';
    setConvertingId(item.id);
    setInboxError('');
    try {
      await createTask.mutateAsync({
        data: {
          taskDate: today,
          category,
          title: item.title,
          notes: item.notes || undefined,
          priority: 'medium',
        },
      });
      await deleteInboxItem(item.id);
      void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
    } catch {
      setInboxError('تعذر تحويل الفكرة إلى مهمة. حاول مرة أخرى.');
    } finally {
      setConvertingId(null);
    }
  };

  const openTaskEditor = (task: Task) => {
    setEditingTask(task);
    setOpen(false);
  };

  const openNewTask = () => {
    setCreatingTask(true);
    setOpen(false);
  };

  const taskFormSpaces = useMemo(() => {
    const taskCategory = editingTask?.category;
    return Array.from(new Set([...spaceNames, ...(taskCategory ? [taskCategory] : []), 'Self']));
  }, [editingTask?.category, spaceNames]);

  return (
    <>
      <button
        type="button"
        onClick={() => { setMode('search'); setOpen(true); }}
        className="fixed bottom-5 left-5 z-40 flex h-12 items-center gap-2 rounded-2xl border border-primary/20 bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-2xl shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
        aria-label="فتح مركز الأوامر"
        data-testid="button-command-center"
      >
        <Keyboard size={17} />
        <span className="hidden sm:inline">أوامر سريعة</span>
        <kbd className="rounded-md bg-primary-foreground/15 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[85vh] max-w-2xl overflow-hidden rounded-3xl p-0">
          <div className="border-b border-border px-5 pb-4 pt-5">
            <DialogHeader className="text-right">
              <DialogTitle className="flex items-center gap-2 text-xl"><Sparkles size={19} className="text-secondary" /> مركز الأوامر</DialogTitle>
              <DialogDescription>ابحث، التقط فكرة، أو راجع يومك من مكان واحد. اختصار الفتح: Ctrl/⌘ + K.</DialogDescription>
            </DialogHeader>
            <div className="relative mt-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
              <input
                autoFocus={mode === 'search'}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setMode('search'); }}
                placeholder="ابحث في المهام والعناوين والمساحات..."
                className="h-12 w-full rounded-2xl border border-input bg-background pr-10 pl-4 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                data-testid="input-command-search"
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setMode('search')} className={`rounded-xl px-3 py-2 text-xs font-extrabold ${mode === 'search' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}><Search size={14} className="ml-1 inline" />بحث</button>
              <button type="button" onClick={() => setMode('inbox')} className={`rounded-xl px-3 py-2 text-xs font-extrabold ${mode === 'inbox' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}><Inbox size={14} className="ml-1 inline" />Inbox</button>
              <button type="button" onClick={() => setMode('review')} className={`rounded-xl px-3 py-2 text-xs font-extrabold ${mode === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}><CalendarCheck2 size={14} className="ml-1 inline" />مراجعة اليوم</button>
            </div>
          </div>

          <div className="max-h-[58vh] overflow-y-auto p-5">
            {mode === 'search' && (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  <button type="button" onClick={openNewTask} className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm font-extrabold text-primary hover:bg-primary/10"><Plus size={17} /> مهمة جديدة</button>
                  <button type="button" onClick={() => setMode('inbox')} className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 text-sm font-extrabold hover:border-primary/30"><Inbox size={17} /> التقط فكرة</button>
                  <button type="button" onClick={() => setMode('review')} className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 text-sm font-extrabold hover:border-primary/30"><CalendarCheck2 size={17} /> راجع اليوم</button>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-extrabold text-muted-foreground">{normalizedQuery ? 'نتائج البحث' : 'أحدث المهام'}</p>
                    {tasksQuery.isFetching && <Loader2 size={14} className="animate-spin text-primary" />}
                  </div>
                  {tasksQuery.isError ? (
                    <p className="rounded-2xl bg-destructive/10 p-4 text-sm font-bold text-destructive">تعذر تحميل المهام للبحث.</p>
                  ) : searchResults.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm font-semibold text-muted-foreground">لا توجد نتائج مطابقة.</p>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((task) => (
                        <button key={task.id} type="button" onClick={() => openTaskEditor(task)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-right transition hover:border-primary/35 hover:bg-primary/[0.03]">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${task.completed ? 'bg-secondary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>{task.completed ? <CheckCircle2 size={17} /> : <ListTodo size={17} />}</span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-extrabold ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</span>
                            <span className="mt-1 block truncate text-[11px] font-semibold text-muted-foreground">{task.category} · {formatDate(task.taskDate)}{task.notes ? ` · ${task.notes}` : ''}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {mode === 'inbox' && (
              <div className="space-y-5">
                <form onSubmit={captureInbox} className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
                  <div className="flex items-center gap-2"><Inbox size={18} className="text-primary" /><h3 className="font-extrabold">صندوق الوارد</h3></div>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">اكتب الفكرة الآن بدون ما تضيع وقت في ترتيبها. حوّلها لمهمة لما تكون جاهز.</p>
                  <input value={inboxTitle} onChange={(event) => setInboxTitle(event.target.value)} maxLength={240} placeholder="مثلاً: فكرة لحملة ووتز..." className="mt-3 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-primary" />
                  <textarea value={inboxNotes} onChange={(event) => setInboxNotes(event.target.value)} maxLength={2000} placeholder="ملاحظة اختيارية" rows={2} className="mt-2 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <button type="submit" disabled={inboxSaving || !inboxTitle.trim()} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-50">{inboxSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} حفظ في Inbox</button>
                </form>

                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-extrabold">أفكار غير مرتبة</p><p className="text-xs font-semibold text-muted-foreground">{inboxItems.length} عنصر</p></div>
                  <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">حوّل إلى
                    <select value={captureCategory} onChange={(event) => setCaptureCategory(event.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-foreground outline-none">
                      {(spaceNames.length > 0 ? spaceNames : ['Self']).map((space) => <option key={space} value={space}>{space}</option>)}
                    </select>
                  </label>
                </div>

                {inboxError && <p className="rounded-xl bg-destructive/10 p-3 text-sm font-bold text-destructive">{inboxError}</p>}
                {inboxLoading ? (
                  <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                ) : inboxItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border py-10 text-center"><Inbox className="mx-auto text-muted-foreground" /><p className="mt-2 text-sm font-bold text-muted-foreground">Inbox فاضي — ممتاز.</p></div>
                ) : (
                  <div className="space-y-2">
                    {inboxItems.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border bg-card p-3">
                        <p className="text-sm font-extrabold">{item.title}</p>
                        {item.notes && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.notes}</p>}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-muted-foreground">{new Date(item.createdAt).toLocaleString('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void deleteInboxItem(item.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="حذف من Inbox"><Trash2 size={15} /></button>
                            <button type="button" onClick={() => void convertInboxItem(item)} disabled={convertingId === item.id} className="flex items-center gap-1.5 rounded-lg bg-secondary/25 px-3 py-2 text-xs font-extrabold text-primary hover:bg-secondary/35 disabled:opacity-50">{convertingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} تحويل لمهمة</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mode === 'review' && (
              <div className="space-y-5">
                <div className="rounded-3xl bg-primary p-5 text-primary-foreground">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-sm font-bold text-primary-foreground/70">مراجعة اليوم</p><p className="mt-2 text-4xl font-black">{completion}%</p><p className="mt-1 text-xs font-semibold text-primary-foreground/70">أنجزت {completedToday.length} من {todayTasks.length} مهام</p></div>
                    <CalendarCheck2 className="text-secondary" size={30} />
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-foreground/15"><div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${completion}%` }} /></div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-border bg-card p-3 text-center"><p className="text-2xl font-black">{todayTasks.length}</p><p className="text-[11px] font-bold text-muted-foreground">كل المهام</p></div>
                  <div className="rounded-2xl border border-border bg-card p-3 text-center"><p className="text-2xl font-black text-primary">{completedToday.length}</p><p className="text-[11px] font-bold text-muted-foreground">مكتملة</p></div>
                  <div className="rounded-2xl border border-border bg-card p-3 text-center"><p className="text-2xl font-black text-accent">{pendingToday.length}</p><p className="text-[11px] font-bold text-muted-foreground">متبقية</p></div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-extrabold">المتبقي اليوم</h3>{tasksQuery.isFetching && <Loader2 size={14} className="animate-spin text-primary" />}</div>
                  {pendingToday.length === 0 ? (
                    <div className="rounded-2xl border border-secondary/30 bg-secondary/10 py-8 text-center"><Sparkles className="mx-auto text-primary" /><p className="mt-2 text-sm font-extrabold text-primary">خلصت مهام اليوم.</p></div>
                  ) : (
                    <div className="space-y-2">
                      {pendingToday.map((task) => (
                        <button key={task.id} type="button" onClick={() => openTaskEditor(task)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-3 text-right hover:border-primary/35"><span className="min-w-0"><span className="block truncate text-sm font-extrabold">{task.title}</span><span className="mt-1 block text-[11px] font-semibold text-muted-foreground">{task.category}{task.startTime ? ` · ${task.startTime}` : ''}</span></span><ListTodo size={16} className="shrink-0 text-muted-foreground" /></button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {creatingTask && (
        <TaskForm
          date={today}
          spaces={taskFormSpaces}
          onClose={() => setCreatingTask(false)}
        />
      )}
      {editingTask && (
        <TaskForm
          date={dateOnly(editingTask.taskDate) || today}
          task={editingTask}
          spaces={taskFormSpaces}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  );
}
