import { type FormEvent, useMemo, useState } from 'react';
import { CalendarClock, CalendarPlus, Check, Pencil, Trash2, X } from 'lucide-react';
import {
  getListEventsQueryKey,
  useCreateEvent,
  useDeleteEvent,
  useListEvents,
  useUpdateEvent,
} from '@workspace/api-client-react';
import type { Event } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { FocusTimer } from '@/components/focus-timer';

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return dateKey(result);
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`).getTime();
  const end = new Date(`${to}T12:00:00`).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function eventStatus(event: Event, today: string) {
  const startDate = dateOnly(event.startDate);
  const endDate = dateOnly(event.endDate);
  if (today < startDate) {
    return { label: 'يبدأ بعد', days: daysBetween(today, startDate), tone: 'text-primary' };
  }
  if (today <= endDate) {
    return { label: 'متبقي', days: daysBetween(today, endDate), tone: 'text-accent' };
  }
  return { label: 'انتهى منذ', days: daysBetween(endDate, today), tone: 'text-muted-foreground' };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${dateOnly(date)}T12:00:00`));
}

function EventForm({ event, onClose }: { event?: Event; onClose: () => void }) {
  const queryClient = useQueryClient();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const today = dateKey(new Date());
  const [title, setTitle] = useState(event?.title ?? '');
  const [startDate, setStartDate] = useState(event ? dateOnly(event.startDate) : today);
  const [endDate, setEndDate] = useState(event ? dateOnly(event.endDate) : shiftDate(new Date(), 1));
  const [color, setColor] = useState(event?.color ?? '#d39a2f');
  const [imageUrl, setImageUrl] = useState(event?.imageUrl ?? '');
  const [error, setError] = useState('');
  const isEditing = Boolean(event);
  const isPending = createEvent.isPending || updateEvent.isPending;

  const submit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!title.trim()) {
      setError('اكتب اسم الحدث أولاً');
      return;
    }
    if (endDate < startDate) {
      setError('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');
      return;
    }
    const options = {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        onClose();
      },
      onError: () => setError('لم نتمكن من حفظ الحدث. حاول مرة أخرى.'),
    };
    const data = { title: title.trim(), startDate, endDate, color, imageUrl: imageUrl.trim() };
    if (event) {
      updateEvent.mutate({ id: event.id, data }, options);
      return;
    }
    createEvent.mutate({ data: { ...data, imageUrl: data.imageUrl || undefined } }, options);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(173_29%_18%/0.4)] p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-t-[1.7rem] border border-card-border bg-card p-5 shadow-2xl sm:rounded-[1.7rem] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="event-form-title">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.16em] text-muted-foreground">{isEditing ? 'EDIT EVENT' : 'COUNTDOWN'}</p>
            <h2 id="event-form-title" className="text-2xl font-extrabold">{isEditing ? 'تعديل الحدث' : 'أضف حدثًا قادمًا'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" data-testid="button-close-event-form" className="rounded-full p-2 text-muted-foreground hover:bg-muted"><X size={19} /></button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="event-title" className="mb-2 block text-sm font-bold">اسم الحدث</label>
            <input id="event-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="مثلاً: اليوم الوطني" data-testid="input-event-title" className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="event-start-date" className="mb-2 block text-sm font-bold">تاريخ البداية</label>
              <input id="event-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} data-testid="input-event-start-date" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
            </div>
            <div>
              <label htmlFor="event-end-date" className="mb-2 block text-sm font-bold">تاريخ الانتهاء</label>
              <input id="event-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} data-testid="input-event-end-date" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
            </div>
          </div>
          <div>
            <label htmlFor="event-color" className="mb-2 block text-sm font-bold">لون الحدث</label>
            <input id="event-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} data-testid="input-event-color" className="h-11 w-full cursor-pointer rounded-xl border border-input bg-background p-1" />
          </div>
          <div>
            <label htmlFor="event-image-url" className="mb-2 block text-sm font-bold">رابط صورة مميزة <span className="font-normal text-muted-foreground">(اختياري)</span></label>
            <input id="event-image-url" type="url" dir="ltr" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." data-testid="input-event-image-url" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-left text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </div>
          {error && <p data-testid="status-event-form-error" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <button type="button" onClick={onClose} data-testid="button-cancel-event" className="h-11 rounded-xl border border-border px-5 text-sm font-bold text-muted-foreground hover:bg-muted">إلغاء</button>
            <button type="submit" disabled={isPending} data-testid="button-submit-event" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60">{isEditing ? <Check size={16} /> : <CalendarPlus size={16} />} {isPending ? 'جارٍ الحفظ...' : isEditing ? 'حفظ التعديلات' : 'حفظ الحدث'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EventsSection() {
  const eventsQuery = useListEvents();
  const deleteEvent = useDeleteEvent();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const today = dateKey(new Date());
  const events = eventsQuery.data ?? [];

  const sortedEvents = useMemo(() => [...events].sort((a, b) => a.endDate.localeCompare(b.endDate)), [events]);

  const removeEvent = (id: number) => {
    deleteEvent.mutate({ id }, { onSuccess: () => void queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() }) });
  };

  return (
    <>
      <section className="animate-rise mb-6 rounded-3xl border border-card-border bg-card/70 p-4 shadow-sm" style={{ animationDelay: '50ms' }}>
        <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock size={20} className="text-accent" />
              <h2 className="text-xl font-extrabold">العد التنازلي</h2>
            </div>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">خلي الأحداث المهمة قدامك، وكل حدث له عداده الخاص</p>
          </div>
          <button type="button" onClick={() => setShowForm(true)} data-testid="button-add-event" className="flex h-9 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-xs font-extrabold text-secondary-foreground transition hover:-translate-y-0.5 hover:bg-secondary/85"><CalendarPlus size={16} /> حدث جديد</button>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
          <div>
          {eventsQuery.isLoading ? (
            <div className="h-20 animate-pulse rounded-2xl bg-muted" />
          ) : sortedEvents.length === 0 ? (
            <div className="flex min-h-44 items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-background/60 px-4 py-5 text-center text-sm font-semibold text-muted-foreground">أضف أول حدث مهم عشان يظهر عداده هنا.</div>
          ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
            {sortedEvents.map((event) => {
              const status = eventStatus(event, today);
              return (
                <div key={event.id} className="relative overflow-hidden rounded-2xl border border-border bg-background/75 p-3" style={{ borderInlineStartColor: event.color, borderInlineStartWidth: 4 }}>
                  {event.imageUrl && (
                    <div className="mb-2 h-20 overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
                      <img src={event.imageUrl} alt={`صورة ${event.title}`} className="h-full w-full object-contain object-center" />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold">{event.title}</p>
                      <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{formatDate(event.startDate)} — {formatDate(event.endDate)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setEditingEvent(event)} aria-label={`تعديل ${event.title}`} data-testid={`button-edit-event-${event.id}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"><Pencil size={14} /></button>
                      <button type="button" onClick={() => removeEvent(event.id)} disabled={deleteEvent.isPending} aria-label={`حذف ${event.title}`} data-testid={`button-delete-event-${event.id}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <span className={`font-mono-ui text-3xl font-black leading-none tracking-tight drop-shadow-[0_1px_0_hsl(var(--background))] ${status.tone}`}>{status.days}</span>
                      <span className="pb-1 text-xs font-bold text-muted-foreground">{status.label} {status.label === 'يبدأ بعد' ? 'لبداية الحدث' : status.label === 'متبقي' ? 'على انتهاء الحدث' : 'يوم'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          )}
          </div>
          <FocusTimer />
        </div>
      </section>
      {showForm && <EventForm onClose={() => setShowForm(false)} />}
      {editingEvent && <EventForm event={editingEvent} onClose={() => setEditingEvent(null)} />}
    </>
  );
}