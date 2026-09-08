import { type FormEvent, useState } from 'react';
import { CalendarDays, Check, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import type { TaskFollowUp } from '@workspace/api-client-react';

interface FollowUpListProps {
  followUps: TaskFollowUp[];
  isPending: boolean;
  onChange: (followUps: TaskFollowUp[]) => void;
}

function formatDueDate(dueDate: string) {
  return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short' }).format(
    new Date(`${dueDate}T12:00:00`),
  );
}

export function FollowUpList({ followUps, isPending, onChange }: FollowUpListProps) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  const addFollowUp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('اكتب عنوان المتابعة أولاً');
      return;
    }

    const nextId = followUps.reduce((maxId, followUp) => Math.max(maxId, followUp.id), 0) + 1;
    onChange([
      ...followUps,
      {
        id: nextId,
        title: cleanTitle,
        completed: false,
        dueDate: dueDate || null,
      },
    ]);
    setTitle('');
    setDueDate('');
    setError('');
    setShowForm(false);
  };

  return (
    <div className="mt-3 border-t border-border/70 pt-2">
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} data-testid="button-toggle-follow-ups" className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-right transition hover:bg-muted/60">
        <span className="flex items-center gap-2 text-xs font-extrabold text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          المتابعات
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono-ui text-[10px]">{followUps.length}</span>
        </span>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="animate-rise pt-2">
          {!showForm && (
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setShowForm(true)} disabled={isPending} data-testid="button-add-follow-up" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-primary transition hover:bg-primary/10">
                <Plus size={14} /> إضافة متابعة
              </button>
            </div>
          )}

          {followUps.length > 0 && <div className="space-y-1.5">
          {followUps.map((followUp) => (
            <div key={followUp.id} className="flex items-center gap-2 rounded-xl bg-muted/55 px-2.5 py-2">
              <button
                type="button"
                onClick={() => onChange(followUps.map((item) => item.id === followUp.id ? { ...item, completed: !item.completed } : item))}
                disabled={isPending}
                aria-label={followUp.completed ? 'إلغاء إنجاز المتابعة' : 'إنجاز المتابعة'}
                data-testid={`button-toggle-follow-up-${followUp.id}`}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${followUp.completed ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-background text-transparent hover:border-secondary'}`}
              >
                <Check size={12} strokeWidth={3} />
              </button>
              <span className={`min-w-0 flex-1 text-xs font-semibold leading-5 ${followUp.completed ? 'text-muted-foreground line-through decoration-secondary' : 'text-foreground'}`}>{followUp.title}</span>
              {followUp.dueDate && (
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-muted-foreground">
                  <CalendarDays size={12} /> {formatDueDate(followUp.dueDate)}
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(followUps.filter((item) => item.id !== followUp.id))}
                disabled={isPending}
                aria-label="حذف المتابعة"
                data-testid={`button-delete-follow-up-${followUp.id}`}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          </div>}

          {showForm && (
            <form onSubmit={addFollowUp} className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="مثلاً: أرسل تذكيراً للفريق" aria-label="عنوان المتابعة" data-testid="input-follow-up-title" className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} aria-label="تاريخ المتابعة" data-testid="input-follow-up-date" className="h-9 rounded-lg border border-input bg-background px-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>
          {error && <p className="mt-1.5 text-[11px] font-bold text-destructive">{error}</p>}
          <div className="mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setError(''); }} data-testid="button-cancel-follow-up" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"><X size={13} /> إلغاء</button>
            <button type="submit" disabled={isPending} data-testid="button-save-follow-up" className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"><Plus size={13} /> حفظ المتابعة</button>
          </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}