import { type FormEvent, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Link2, Plus, Trash2, X } from 'lucide-react';
import {
  getListSpaceLinksQueryKey,
  useCreateSpaceLink,
  useDeleteSpaceLink,
  useListSpaceLinks,
} from '@workspace/api-client-react';
import type { Space } from '@workspace/api-client-react';

interface SpaceLinksSectionProps {
  spaces: Space[];
}

function LinkForm({ spaces, initialSpaceId, onClose }: { spaces: Space[]; initialSpaceId?: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const createLink = useCreateSpaceLink();
  const [spaceId, setSpaceId] = useState(initialSpaceId ?? spaces[0]?.id ?? 0);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!spaceId || !title.trim() || !url.trim()) {
      setError('اختار المساحة واكتب اسم الرابط وعنوانه');
      return;
    }
    const normalizedUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    createLink.mutate({ data: { spaceId, title: title.trim(), url: normalizedUrl } }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListSpaceLinksQueryKey() });
        onClose();
      },
      onError: () => setError('لم نتمكن من حفظ الرابط. تأكد من صحة العنوان.'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(173_29%_18%/0.4)] p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-t-[1.7rem] border border-card-border bg-card p-5 shadow-2xl sm:rounded-[1.7rem] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="space-link-form-title">
        <div className="flex items-center justify-between">
          <div><p className="mb-1 text-xs font-bold tracking-[0.14em] text-muted-foreground">QUICK LINK</p><h2 id="space-link-form-title" className="text-2xl font-extrabold">رابط ثابت جديد</h2></div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-2 text-muted-foreground hover:bg-muted"><X size={19} /></button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="space-link-space" className="mb-2 block text-sm font-bold">المساحة</label>
            <select id="space-link-space" value={spaceId} onChange={(event) => setSpaceId(Number(event.target.value))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus:border-primary">
              {spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="space-link-title" className="mb-2 block text-sm font-bold">اسم الرابط</label>
            <input id="space-link-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="مثلاً: لوحة التحكم" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </div>
          <div>
            <label htmlFor="space-link-url" className="mb-2 block text-sm font-bold">عنوان الرابط</label>
            <input id="space-link-url" value={url} onChange={(event) => setUrl(event.target.value)} dir="ltr" placeholder="https://..." className="h-11 w-full rounded-xl border border-input bg-background px-3 text-left text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </div>
          {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}
          <button type="submit" disabled={createLink.isPending} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-60"><Plus size={16} /> {createLink.isPending ? 'جارٍ الحفظ...' : 'حفظ الرابط'}</button>
        </form>
      </div>
    </div>
  );
}

export function SpaceLinksSection({ spaces }: SpaceLinksSectionProps) {
  const linksQuery = useListSpaceLinks();
  const deleteLink = useDeleteSpaceLink();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [activeSpaceId, setActiveSpaceId] = useState<number | null>(spaces[0]?.id ?? null);
  const links = linksQuery.data ?? [];
  const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? spaces[0];
  const activeSpaceLinks = activeSpace ? links.filter((link) => link.spaceId === activeSpace.id) : [];

  useEffect(() => {
    if (!spaces.length) {
      setActiveSpaceId(null);
      return;
    }
    if (!spaces.some((space) => space.id === activeSpaceId)) setActiveSpaceId(spaces[0].id);
  }, [activeSpaceId, spaces]);

  const remove = (id: number) => {
    if (!window.confirm('هل تريد حذف هذا الرابط؟')) return;
    deleteLink.mutate({ id }, { onSuccess: () => void queryClient.invalidateQueries({ queryKey: getListSpaceLinksQueryKey() }) });
  };

  return (
    <>
      <section className="animate-rise mb-10 rounded-3xl border border-card-border bg-card/70 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex items-center gap-2"><Link2 size={20} className="text-primary" /><h2 className="text-xl font-extrabold">روابط المساحات</h2></div><p className="mt-1 text-xs font-semibold text-muted-foreground">روابط ثابتة تفضل معك في كل يوم، مرتبة حسب الشركة أو المساحة</p></div>
          <button type="button" onClick={() => setShowForm(true)} disabled={!spaces.length} data-testid="button-add-space-link" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground disabled:opacity-50"><Plus size={16} /> رابط جديد</button>
        </div>
        {spaces.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-muted-foreground">أضف مساحة أولاً حتى تحفظ روابطها.</p>
        ) : (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {spaces.map((space) => {
                const count = links.filter((link) => link.spaceId === space.id).length;
                const isActive = activeSpace?.id === space.id;
                return <button key={space.id} type="button" onClick={() => setActiveSpaceId(space.id)} data-testid={`button-space-links-filter-${space.name}`} className={`flex items-center justify-between rounded-2xl border p-3 text-right transition ${isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/40'}`}>
                  <span className="flex items-center gap-2 text-sm font-extrabold"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: space.color }} />{space.name}</span>
                  <span className={`font-mono-ui text-xs ${isActive ? 'text-secondary' : 'text-muted-foreground'}`}>{count}</span>
                </button>;
              })}
            </div>
            {activeSpace && <div className="mt-3 rounded-2xl border border-border bg-background/70 p-4" style={{ borderInlineStartColor: activeSpace.color, borderInlineStartWidth: 4 }}>
                <div className="mb-3 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeSpace.color }} /><h3 className="text-sm font-extrabold">روابط {activeSpace.name}</h3><span className="mr-auto rounded-full bg-muted px-2 py-0.5 font-mono-ui text-[10px] text-muted-foreground">{activeSpaceLinks.length}</span></div>
                {activeSpaceLinks.length ? <div className="flex flex-wrap gap-2">{activeSpaceLinks.map((link) => <div key={link.id} className="group/link flex items-center rounded-xl border border-border bg-card">
                  <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary transition hover:text-primary/75"><ExternalLink size={13} /> {link.title}</a>
                  <button type="button" onClick={() => remove(link.id)} aria-label={`حذف رابط ${link.title}`} className="border-r border-border p-2 text-muted-foreground opacity-100 transition hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover/link:opacity-100"><Trash2 size={12} /></button>
                </div>)}</div> : <p className="py-2 text-xs font-semibold text-muted-foreground">لا توجد روابط محفوظة بعد.</p>}
              </div>}
          </>
        )}
      </section>
      {showForm && <LinkForm spaces={spaces} initialSpaceId={activeSpace?.id} onClose={() => setShowForm(false)} />}
    </>
  );
}