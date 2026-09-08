import { ArrowLeft, CheckCircle2, Clock3, Target } from 'lucide-react';
import { Link } from 'wouter';

export default function Landing() {
  return (
    <main className="noise-overlay task-shell min-h-[100dvh] overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/logo.svg`} alt="" className="h-11 w-11 rounded-2xl shadow-lg shadow-primary/15" />
          <div>
            <p className="text-lg font-extrabold tracking-tight">مدار اليوم</p>
            <p className="text-xs font-semibold text-muted-foreground">مساحة هادئة لإنجاز المهم</p>
          </div>
        </div>
        <Link href="/sign-in" className="rounded-xl px-4 py-2 text-sm font-extrabold text-primary transition hover:bg-primary/10">تسجيل الدخول</Link>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-12 sm:px-8 md:grid-cols-[1.1fr_.9fr] md:pt-20">
        <div className="animate-rise">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/75 px-3 py-1.5 text-xs font-bold text-primary">
            <Clock3 size={15} className="text-accent" /> رتّب يومك على إيقاعك
          </div>
          <h1 className="max-w-2xl text-balance text-4xl font-black leading-[1.25] tracking-tight sm:text-6xl">وقت أقل في التشتت، <span className="text-primary">ومساحة أكبر للإنجاز.</span></h1>
          <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-muted-foreground sm:text-lg">مدار اليوم يجمع مهامك ومساحاتك في لوحة واحدة بسيطة، لتعرف ما الذي يستحق تركيزك الآن.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sign-up" className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/15 transition hover:-translate-y-0.5">ابدأ مجاناً <ArrowLeft size={18} /></Link>
            <Link href="/sign-in" className="rounded-xl border border-border bg-card/80 px-5 py-3 text-sm font-extrabold text-primary transition hover:border-primary/40">لديك حساب بالفعل</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-primary" /> تنظيم يومي مرن</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-primary" /> مساحات لكل مشروع</span>
          </div>
        </div>

        <div className="animate-rise rounded-[2rem] border border-card-border bg-card/85 p-5 shadow-xl shadow-primary/10 backdrop-blur" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Target size={21} /></div><div><p className="font-extrabold">إيقاع اليوم</p><p className="text-xs font-semibold text-muted-foreground">ثلاث خطوات بانتظارك</p></div></div>
            <span className="rounded-full bg-secondary/25 px-2.5 py-1 font-mono-ui text-xs font-bold text-primary">42%</span>
          </div>
          <div className="mt-5 space-y-3">
            {['مراجعة أولويات الأسبوع', 'إنهاء خطة المشروع', 'رسالة متابعة للفريق'].map((task, index) => <div key={task} className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/75 p-3"><span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${index === 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/35'} text-[10px] font-bold`}>{index === 0 ? '✓' : index + 1}</span><span className={`text-sm font-bold ${index === 0 ? 'text-muted-foreground line-through' : ''}`}>{task}</span></div>)}
          </div>
        </div>
      </section>
    </main>
  );
}