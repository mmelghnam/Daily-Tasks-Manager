import { useState, type FormEvent } from 'react';
import { useUser } from '@clerk/react';
import { ArrowRight, BarChart3, CheckCircle2, Megaphone, Send, ShieldCheck, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListNotificationsQueryKey,
  getGetAdminAccessQueryKey,
  getGetAdminStatsQueryKey,
  useCreateAdminNotification,
  useGetAdminAccess,
  useGetAdminStats,
} from '@workspace/api-client-react';

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-card-border bg-card/75 p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-muted-foreground">{label}</span><span className="text-primary">{icon}</span></div><p className="mt-3 text-3xl font-extrabold">{value}</p></div>;
}

export default function Admin() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const { user } = useUser();
  const queryClient = useQueryClient();
  const accountQuerySuffix = user?.id ?? 'pending-account';
  const access = useGetAdminAccess({
    query: {
      queryKey: [...getGetAdminAccessQueryKey(), accountQuerySuffix],
      enabled: Boolean(user?.id),
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });
  const stats = useGetAdminStats({
    query: {
      queryKey: [...getGetAdminStatsQueryKey(), accountQuerySuffix],
      enabled: access.data?.isAdmin === true,
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });
  const createNotification = useCreateAdminNotification();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');

  const sendAnnouncement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setMessage('اكتب عنوان الرسالة ومحتواها أولاً.');
      return;
    }
    setMessage('');
    createNotification.mutate({ data: { title: title.trim(), body: body.trim() } }, {
      onSuccess: () => {
        setTitle('');
        setBody('');
        setMessage('تم نشر التحديث وسيظهر لكل المستخدمين داخل التطبيق.');
        void queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      },
      onError: () => setMessage('تعذر نشر الرسالة. حاول مرة أخرى.'),
    });
  };

  if (access.isLoading) {
    return <div className="flex min-h-[100dvh] items-center justify-center text-sm font-bold text-muted-foreground">جارٍ التحقق من الصلاحية...</div>;
  }

  if (!access.data?.isAdmin) {
    return <div dir="rtl" className="noise-overlay task-shell flex min-h-[100dvh] items-center justify-center px-5"><div className="max-w-md rounded-3xl border border-destructive/20 bg-card p-7 text-center shadow-lg"><ShieldCheck className="mx-auto mb-4 text-destructive" size={34} /><h1 className="text-xl font-extrabold">هذه الصفحة للإدارة الرئيسية فقط</h1><p className="mt-2 text-sm leading-7 text-muted-foreground">لا يملك هذا الحساب صلاحية عرض إحصائيات التطبيق.</p><a href={`${basePath}/app`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground"><ArrowRight size={16} /> العودة للتطبيق</a></div></div>;
  }

  const data = stats.data;
  return (
    <div dir="rtl" className="noise-overlay task-shell min-h-[100dvh]">
      <header className="border-b border-border/70 bg-card/60">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-secondary"><ShieldCheck size={22} /></div><div><h1 className="text-xl font-extrabold">لوحة الإدارة الرئيسية</h1><p className="text-xs font-semibold text-muted-foreground">صورة عامة عن استخدام التطبيق والتحديثات</p></div></div>
          <a href={`${basePath}/app`} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold text-primary hover:bg-muted"><ArrowRight size={15} /> التطبيق</a>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] space-y-6 px-5 py-6 sm:px-8">
        {stats.isError ? <div className="rounded-2xl bg-destructive/10 p-4 text-sm font-bold text-destructive">تعذر تحميل الإحصائيات.</div> : (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="مستخدمو التطبيق" value={data?.users ?? '—'} icon={<Users size={19} />} />
            <StatCard label="إجمالي المهام" value={data?.tasks ?? '—'} icon={<BarChart3 size={19} />} />
            <StatCard label="مهام مكتملة" value={data?.completedTasks ?? '—'} icon={<CheckCircle2 size={19} />} />
            <StatCard label="نسبة الإنجاز" value={data ? `${data.completionRate}%` : '—'} icon={<CheckCircle2 size={19} />} />
            <StatCard label="المستخدمون النشطون خلال 30 يومًا" value={data?.activeUsers30d ?? '—'} icon={<Users size={19} />} />
            <StatCard label="المساحات" value={data?.spaces ?? '—'} icon={<BarChart3 size={19} />} />
            <StatCard label="الأهداف" value={data?.goals ?? '—'} icon={<BarChart3 size={19} />} />
            <StatCard label="العادات" value={data?.habits ?? '—'} icon={<BarChart3 size={19} />} />
          </section>
        )}

        <section className="rounded-3xl border border-card-border bg-card/75 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><Megaphone size={19} className="text-accent" /><div><h2 className="font-extrabold">إرسال تحديث لكل المستخدمين</h2><p className="mt-1 text-xs font-semibold text-muted-foreground">سيظهر الإعلان داخل قسم «تنبيهات اليوم» عند فتح التطبيق.</p></div></div>
          <form onSubmit={sendAnnouncement} className="space-y-3">
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="عنوان التحديث" aria-label="عنوان التحديث" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus:border-primary" />
            <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} placeholder="اكتب تفاصيل التحديث أو التنبيه..." aria-label="نص التحديث" className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm font-semibold leading-7 outline-none focus:border-primary" />
            {message && <p className={`text-sm font-bold ${message.startsWith('تم') ? 'text-primary' : 'text-destructive'}`}>{message}</p>}
            <button type="submit" disabled={createNotification.isPending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground disabled:opacity-60"><Send size={16} /> {createNotification.isPending ? 'جارٍ النشر...' : 'نشر التحديث للجميع'}</button>
          </form>
        </section>
      </main>
    </div>
  );
}