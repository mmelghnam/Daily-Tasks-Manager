import { lazy, Suspense, useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';

const ProductivityCommandCenter = lazy(() =>
  import('@/components/productivity-command-center').then((module) => ({
    default: module.ProductivityCommandCenter,
  })),
);

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

export function CommandCenterLoader() {
  const [loaded, setLoaded] = useState(false);
  const [openAfterLoad, setOpenAfterLoad] = useState(false);

  const activate = () => {
    if (loaded) {
      document.querySelector<HTMLElement>('[data-testid="button-command-center"]')?.click();
      return;
    }
    setOpenAfterLoad(true);
    setLoaded(true);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const commandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const slashShortcut = event.key === '/' && !isEditableTarget(event.target);
      if (!commandShortcut && !slashShortcut) return;
      event.preventDefault();
      activate();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    if (!loaded || !openAfterLoad) return;
    const timer = window.setTimeout(() => {
      const button = document.querySelector<HTMLElement>('[data-testid="button-command-center"]');
      if (button) {
        button.click();
        setOpenAfterLoad(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loaded, openAfterLoad]);

  if (loaded) {
    return <Suspense fallback={null}><ProductivityCommandCenter /></Suspense>;
  }

  return (
    <button
      type="button"
      onClick={activate}
      className="fixed bottom-5 left-5 z-40 flex h-12 items-center gap-2 rounded-2xl border border-primary/20 bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-2xl shadow-primary/20"
      aria-label="فتح مركز الأوامر"
    >
      <Keyboard size={17} />
      <span className="hidden sm:inline">أوامر سريعة</span>
      <kbd className="rounded-md bg-primary-foreground/15 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
    </button>
  );
}
