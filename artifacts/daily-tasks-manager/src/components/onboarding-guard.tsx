import { ReactNode } from 'react';
import { useGetOnboardingStatus } from '@workspace/api-client-react';
import { Onboarding } from '@/pages/onboarding';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OnboardingGuard({ children }: { children: ReactNode }) {
  const { data: status, isLoading, isError, refetch } = useGetOnboardingStatus();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center task-shell noise-overlay" dir="rtl" data-testid="status-onboarding-loading">
        <Loader2 className="w-10 h-10 animate-spin text-primary drop-shadow-sm" />
      </div>
    );
  }

  if (isError || !status) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 task-shell noise-overlay space-y-6 animate-fade" dir="rtl" data-testid="status-onboarding-error">
        <div className="bg-destructive/10 p-5 rounded-[1.5rem]">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>
        <p className="text-xl text-foreground font-bold">حدث خطأ أثناء تحميل إعدادات الحساب</p>
        <Button onClick={() => refetch()} variant="outline" size="lg" className="rounded-2xl border-2 font-bold" data-testid="button-retry-onboarding">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (!status.completed) {
    return <Onboarding />;
  }

  return <>{children}</>;
}
