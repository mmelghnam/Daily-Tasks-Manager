import { type FormEvent, useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListSpacesQueryKey,
  useCreateSpace,
  useUpdateSpace,
} from '@workspace/api-client-react';
import type { Space } from '@workspace/api-client-react';

const colorOptions = [
  { value: '#2e8d77', label: 'فيروزي' },
  { value: '#d39a2f', label: 'ذهبي' },
  { value: '#c97768', label: 'مرجاني' },
  { value: '#6678bd', label: 'نيلي' },
  { value: '#77964d', label: 'زيتوني' },
  { value: '#9a6bb1', label: 'بنفسجي' },
  { value: '#5f8f9d', label: 'أزرق رمادي' },
  { value: '#d87538', label: 'برتقالي' },
  { value: '#8f5f78', label: 'توتي' },
];

interface SpaceFormProps {
  onClose: () => void;
  onCreated: (name: string) => void;
  space?: Space;
}

export function SpaceForm({ onClose, onCreated, space }: SpaceFormProps) {
  const queryClient = useQueryClient();
  const createSpace = useCreateSpace();
  const updateSpace = useUpdateSpace();
  const [name, setName] = useState(space?.name ?? '');
  const [description, setDescription] = useState(space?.description ?? '');
  const [color, setColor] = useState(space?.color ?? colorOptions[0].value);
  const [error, setError] = useState('');
  const isEditing = Boolean(space);
  const isPending = createSpace.isPending || updateSpace.isPending;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('اكتب اسم المساحة أولاً');
      return;
    }

    setError('');
    const data = {
      name: cleanName,
      color,
      description: description.trim() || undefined,
    };
    const options = {
      onSuccess: (savedSpace: Space) => {
        void queryClient.invalidateQueries({ queryKey: getListSpacesQueryKey() });
        onCreated(savedSpace.name);
        onClose();
      },
      onError: (requestError: { status?: number }) => {
        setError(requestError.status === 409 ? 'يوجد مساحة أخرى بنفس الاسم' : `لم نتمكن من ${isEditing ? 'تعديل' : 'إنشاء'} المساحة. حاول مرة أخرى.`);
      },
    };

    if (space) {
      updateSpace.mutate(
        {
          id: space.id,
          data: {
            ...data,
            description: description.trim() || null,
          },
        },
        options,
      );
      return;
    }

    createSpace.mutate(
      {
        data,
      },
      options,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(173_29%_18%/0.4)] p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="animate-rise w-full max-w-md overflow-hidden rounded-t-[1.7rem] border border-card-border bg-card shadow-2xl sm:rounded-[1.7rem]" role="dialog" aria-modal="true" aria-labelledby="space-form-title">
        <div className="flex items-start justify-between border-b border-border px-5 py-5 sm:px-7">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-secondary" />
              {isEditing ? 'تعديل المساحة' : 'مساحة جديدة'}
            </div>
            <h2 id="space-form-title" className="text-2xl font-extrabold tracking-tight">{isEditing ? 'حدّث هوية المساحة' : 'أين ستضع تركيزك؟'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" data-testid="button-close-space-form" className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-5 py-6 sm:px-7">
          <div>
            <label htmlFor="space-name" className="mb-2 block text-sm font-bold">اسم المساحة</label>
            <input id="space-name" data-testid="input-space-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus placeholder="مثلاً: مشروع جديد أو عميل جديد" className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </div>

          <div>
            <label htmlFor="space-description" className="mb-2 block text-sm font-bold">وصف قصير <span className="font-normal text-muted-foreground">(اختياري)</span></label>
            <input id="space-description" data-testid="input-space-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="ما الذي تضعه هنا عادة؟" className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">لون المساحة</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="لون المساحة">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={color === option.value}
                  aria-label={option.label}
                  onClick={() => setColor(option.value)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${color === option.value ? 'border-foreground p-1' : 'border-transparent'}`}
                >
                  <span className="h-full w-full rounded-full" style={{ backgroundColor: option.value }} />
                </button>
              ))}
            </div>
          </div>

          {error && <p data-testid="status-space-form-error" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-start">
            <button type="button" onClick={onClose} data-testid="button-cancel-space" className="h-12 rounded-xl border border-border px-5 text-sm font-bold text-muted-foreground transition hover:bg-muted">إلغاء</button>
            <button type="submit" disabled={isPending} data-testid="button-submit-space" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">
              {isEditing ? <Check size={17} /> : <Plus size={17} />}
              {isPending ? 'جارٍ الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إنشاء المساحة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}