import { lazy, Suspense, useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import type { Space } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SpaceLinksSection = lazy(() => import('@/components/space-links-section').then((m) => ({ default: m.SpaceLinksSection })));

export function PersistentSpaceLinks({ spaces }: { spaces: Space[] }) {
  const [open, setOpen] = useState(false);

  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card/80 px-3 text-xs font-extrabold text-primary transition hover:border-primary/40 hover:bg-primary/5"
      aria-label="فتح روابط المساحات"
      data-testid="button-persistent-space-links"
    >
      <Link2 size={16}/><span>روابطي</span>
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir="rtl" className="max-h-[88vh] max-w-5xl overflow-y-auto rounded-3xl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-xl"><Link2 className="text-primary"/> روابط المساحات</DialogTitle>
          <DialogDescription>وصول ثابت لروابطك المحفوظة في أي وقت، بدون ما تزحم لوحة اليوم.</DialogDescription>
        </DialogHeader>
        <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Loader2 className="animate-spin text-primary"/></div>}>
          <SpaceLinksSection spaces={spaces}/>
        </Suspense>
      </DialogContent>
    </Dialog>
  </>;
}
