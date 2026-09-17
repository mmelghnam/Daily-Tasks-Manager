import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  useGetDashboardPreferences,
  useGetTaskSummary,
  useListEvents,
  useListGoals,
  useListHabits,
  useListNotifications,
  useListSpaceLinks,
  useListSpaces,
  useListStudyItems,
  useListTasks,
} from '@workspace/api-client-react';
import { shouldHoldDashboardHydration } from '@/dashboard-hydration';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardHydrationGuard({ children }: { children: ReactNode }) {
  const today = todayKey();

  // Preload the data used by the first dashboard render. React Query reuses
  // these requests when Home and its sections mount, so this does not create
  // duplicate network traffic. It prevents a hard refresh from rendering the
  // dashboard against a half-populated cache.
  const spaces = useListSpaces();
  const tasks = useListTasks({ date: today });
  const summary = useGetTaskSummary({ date: today });
  const preferences = useGetDashboardPreferences();
  const events = useListEvents();
  const goals = useListGoals();
  const habits = useListHabits();
  const studyItems = useListStudyItems();
  const links = useListSpaceLinks();
  const notifications = useListNotifications();

  const initialQueries = [
    spaces,
    tasks,
    summary,
    preferences,
    events,
    goals,
    habits,
    studyItems,
    links,
    notifications,
  ] as const;

  if (shouldHoldDashboardHydration(initialQueries)) {
    return (
      <div
        className="min-h-[100dvh] task-shell noise-overlay flex items-center justify-center px-6"
        dir="rtl"
        data-testid="status-dashboard-hydrating"
      >
        <div className="rounded-3xl border border-border bg-card/85 px-8 py-7 text-center shadow-xl shadow-primary/10 backdrop-blur">
          <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-primary" />
          <p className="text-base font-extrabold text-foreground">جارٍ تحميل يومك</p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            يتم تجهيز بيانات لوحة التحكم.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
