import { type FormEvent, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpLeft, Link2, Plus, Save, X } from 'lucide-react';
import {
  getGetTaskSummaryQueryKey,
  getListTasksQueryKey,
  useCreateTask,
  useUpdateTask,
} from '@workspace/api-client-react';
import type { Task } from '@workspace/api-client-react';

type Category = Task['category'];

const categories: Category[] = ['INV', 'BR', 'Qaff', 'Wootz', 'Self'];

interface TaskFormProps {
  date: string;
  task?: Task | null;
  initialCategory?: Category;
  onClose: () => void;
}

export function TaskForm({ date, task, initialCategory, onClose }: TaskFormProps) {
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [title, setTitle] = useState(task?.title ?? '');
  const [category, setCategory] = useState<Category>(task?.category ?? initialCategory ?? 'INV');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [linkLabel, setLinkLabel] = useState(task?.links[0]?.label ?? '');
  const [linkUrl, setLinkUrl] = useState(task?.links[0]?.url ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isPending = createTask.isPending || updateTask.isPending;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ date }) });
    void queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey({ date }) });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('اكتب عنواناً للمهمة أولاً');
      return;
    }
    setError('');
    const links = linkUrl.trim()
      ? [{ label: linkLabel.trim() || 'فتح الرابط', url: linkUrl.trim() }]
      : [];
    const data = {
      taskDate: date,
      category,
      title: cleanTitle,
      notes: notes.trim() || undefined,
      links,
    };

    if (task) {
      updateTask.mutate({ id: task.id, data }, {
        onSuccess: () => {
          refresh();
          onClose();
        },
        onError: () => setError('لم نتمكن من حفظ التعديل. حاول مرة أخرى.'),
      });
    } else {
      createTask.mutate({ data }, {
        onSuccess: () => {
          refresh();
          onClose();
        },
        onError: () => setError('لم نتمكن من إضافة المهمة. حاول مرة أخرى.'),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[hsl(173_29%_18%/0.4)] p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="animate-rise w-full max-w-xl overflow-hidden rounded-t-[1.7rem] border border-card-border bg-card shadow-2xl sm:rounded-[1.7rem]" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
        <div className="flex items-start justify-between border-b border-border px-5 py-5 sm:px-7">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-secondary" />
              {task ? 'تعديل المهمة' : 'مهمة جديدة'}
            </div>
            <h2 id="task-form-title" className="text-2xl font-extrabold tracking-tight">
              {task ? 'نرتّبها كما تريد' : 'ما الذي يستحق انتباهك؟'}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" data-testid="button-close-task-form" className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-5 py-6 sm:px-7">
          <div>
            <label htmlFor="task-title" className="mb-2 block text-sm font-bold">عنوان المهمة</label>
            <input id="task-title" data-testid="input-task-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="مثلاً: مراجعة العرض مع الفريق" className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">المساحة</label>
            <div className="grid grid-cols-5 gap-2">
              {categories.map((item) => (
                <button key={item} type="button" onClick={() => setCategory(item)} data-testid={`button-category-${item}`} className={`rounded-xl border px-2 py-3 text-sm font-bold transition ${category === item ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="task-notes" className="mb-2 block text-sm font-bold">ملاحظة <span className="font-normal text-muted-foreground">(اختياري)</span></label>
            <textarea id="task-notes" data-testid="input-task-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="أي سياق يساعدك عندما تعود للمهمة..." rows={3} className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm leading-7 outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">رابط <span className="font-normal text-muted-foreground">(اختياري)</span></label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Link2 size={16} className="absolute right-3 top-3.5 text-muted-foreground" />
                <input aria-label="اسم الرابط" data-testid="input-link-label" value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="اسم الرابط" className="h-11 w-full rounded-xl border border-input bg-background pl-3 pr-10 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
              </div>
              <input aria-label="عنوان الرابط" data-testid="input-link-url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://..." type="url" dir="ltr" className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-left text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
            </div>
          </div>

          {error && <p data-testid="status-task-form-error" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-start">
            <button type="button" onClick={onClose} data-testid="button-cancel-task" className="h-12 rounded-xl border border-border px-5 text-sm font-bold text-muted-foreground transition hover:bg-muted">إلغاء</button>
            <button type="submit" disabled={isPending} data-testid="button-submit-task" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">
              {task ? <Save size={17} /> : <Plus size={17} />}
              {isPending ? 'جارٍ الحفظ...' : task ? 'حفظ التعديل' : 'إضافة المهمة'}
              {!isPending && <ArrowUpLeft size={16} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}