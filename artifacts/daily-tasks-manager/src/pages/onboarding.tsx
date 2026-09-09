import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCompleteOnboarding,
  getGetOnboardingStatusQueryKey,
  getListSpacesQueryKey,
  getListTasksQueryKey,
  getGetTaskSummaryQueryKey,
  UsageType
} from '@workspace/api-client-react';
import { format } from 'date-fns';
import { GraduationCap, Briefcase, Laptop, User, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const USAGE_OPTIONS = [
  { id: UsageType.student, label: 'طالب', description: 'أدوات مخصصة لتتبع المحاضرات والمشاريع الدراسية', icon: GraduationCap },
  { id: UsageType.employee, label: 'موظف', description: 'تنظيم مهام العمل والاجتماعات اليومية', icon: Briefcase },
  { id: UsageType.freelancer, label: 'مستقل', description: 'إدارة المشاريع والعملاء والمواعيد النهائية', icon: Laptop },
  { id: UsageType.personal, label: 'شخصي', description: 'متابعة العادات والأهداف والمهام اليومية', icon: User },
];

export function Onboarding() {
  const [selected, setSelected] = useState<UsageType | null>(null);
  const queryClient = useQueryClient();
  
  const { mutate: completeOnboarding, isPending, isError } = useCompleteOnboarding({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetOnboardingStatusQueryKey(), data);
        queryClient.invalidateQueries({ queryKey: getListSpacesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
      }
    }
  });

  const handleSubmit = () => {
    if (!selected) return;
    completeOnboarding({
      data: {
        usageType: selected,
        taskDate: format(new Date(), 'yyyy-MM-dd')
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 task-shell noise-overlay relative overflow-hidden" dir="rtl">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-56 bg-gradient-to-b from-secondary/15 to-transparent z-0" />
      <div className="max-w-2xl w-full space-y-10 animate-rise relative z-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight" data-testid="text-onboarding-title">
             خطوتك
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium" data-testid="text-onboarding-subtitle">
            كيف تخطط لاستخدام مساحتك الشخصية؟
          </p>
        </div>

        {isError && (
          <Alert variant="destructive" className="animate-fade border-destructive/50 bg-destructive/10 text-destructive-foreground rounded-2xl" data-testid="alert-onboarding-error">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-bold">حدث خطأ</AlertTitle>
            <AlertDescription className="font-medium">
              لم نتمكن من حفظ إعداداتك. يرجى المحاولة مرة أخرى.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {USAGE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.id;
            return (
              <button
                key={option.id}
                data-testid={`button-select-${option.id}`}
                onClick={() => setSelected(option.id as UsageType)}
                className={`
                  group relative flex flex-col text-right p-6 rounded-[1.5rem] border-2 transition-all duration-300 ease-out
                  hover-elevate no-default-hover-elevate
                  ${isSelected
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 scale-[1.02]'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-card/80 hover:scale-[1.01]'}
                `}
                disabled={isPending}
              >
                <div className="flex items-start justify-between w-full mb-5">
                  <div className={`
                    p-3.5 rounded-[1.25rem]
                    ${isSelected ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}
                    transition-all duration-300
                  `}>
                    <Icon className="w-7 h-7" />
                  </div>
                  {isSelected && (
                    <div className="bg-primary text-primary-foreground p-1.5 rounded-full animate-fade shadow-sm">
                      <Check className="w-5 h-5" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{option.label}</h3>
                <p className="text-muted-foreground text-[0.95rem] leading-relaxed font-medium">{option.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            className="w-full md:w-auto min-w-[220px] h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all duration-300 active:scale-95"
            disabled={!selected || isPending}
            onClick={handleSubmit}
            data-testid="button-submit-onboarding"
          >
            {isPending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              'بدء الاستخدام'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
