import { Bell, CalendarClock, CircleAlert, Megaphone, Repeat2 } from 'lucide-react';
import { useListNotifications } from '@workspace/api-client-react';
import type { Task } from '@workspace/api-client-react';

export function NotificationCenter({ tasks }: { tasks: Task[] }) {
  const announcementsQuery = useListNotifications();
  const today = new Date().toISOString().slice(0, 10);
  const announcements = Array.isArray(announcementsQuery.data) ? announcementsQuery.data : [];
  const notifications = tasks
    .filter((task) => !task.completed && ((task.dueDate && task.dueDate <= today) || task.recurrence))
    .slice(0, 5);

  return (
    <section className="mt-8 rounded-3xl border border-card-border bg-card/70 p-4 shadow-sm sm:p-5" dir="rtl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Bell size={18} className="text-primary" /><h2 className="font-extrabold">تنبيهات اليوم</h2></div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${notifications.length ? 'bg-destructive/10 text-destructive' : 'bg-secondary/15 text-primary'}`}>{notifications.length ? `${notifications.length} تحتاج انتباهك` : 'لا توجد تنبيهات'}</span>
      </div>
      {notifications.length ? <div className="grid gap-2 md:grid-cols-2">
        {notifications.map((task) => <div key={task.id} className="flex items-center gap-3 rounded-2xl bg-background/70 p-3">
          {task.dueDate && task.dueDate <= today ? <CircleAlert size={17} className="shrink-0 text-destructive" /> : task.recurrence ? <Repeat2 size={17} className="shrink-0 text-primary" /> : <CalendarClock size={17} className="shrink-0 text-accent" />}
          <div className="min-w-0"><p className="truncate text-sm font-extrabold">{task.title}</p><p className="text-xs font-semibold text-muted-foreground">{task.dueDate && task.dueDate <= today ? 'موعدها اليوم أو متأخر' : 'مهمة متكررة تحتاج متابعة'}</p></div>
        </div>)}
      </div> : <p className="text-sm font-semibold text-muted-foreground">ستظهر هنا المهام المستحقة والمتكررة قبل أن تفوتك.</p>}
      {announcements.length > 0 && (
        <div className="mt-5 border-t border-border/70 pt-4">
          <div className="mb-3 flex items-center gap-2"><Megaphone size={16} className="text-accent" /><h3 className="text-sm font-extrabold">تحديثات التطبيق</h3></div>
          <div className="grid gap-2 md:grid-cols-2">
            {announcements.slice(0, 3).map((announcement) => (
              <div key={announcement.id} className="rounded-2xl border border-accent/20 bg-accent/5 p-3">
                <p className="text-sm font-extrabold">{announcement.title}</p>
                <p className="mt-1 text-xs font-semibold leading-6 text-muted-foreground">{announcement.body}</p>
                <time dateTime={announcement.createdAt} className="mt-2 block text-[10px] font-bold text-muted-foreground">{new Date(announcement.createdAt).toLocaleDateString('ar')}</time>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}