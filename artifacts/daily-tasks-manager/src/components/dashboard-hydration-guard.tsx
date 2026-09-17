import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  useGetDashboardPreferences,
  useListSpaces,
  useListTasks,
} from '@workspace/api-client-react';
import { shouldHoldDashboardHydration } from '@/dashboard-hydration';

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DashboardHydrationGuard({ children }: { children: ReactNode }) {
  const today = todayKey();

  // Block only on the minimum data needed to safely render the first frame.
  // Summary and secondary widgets render progressively after the dashboard appears.
  const spaces = useListSpaces();
  const tasks = useListTasks({ date: today });
  const preferences = useGetDashboardPreferences();

  const initialQueries = [spaces, tasks, preferences] as const;

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
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
