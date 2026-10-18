import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CalendarRange, Check } from 'lucide-react';
import { useGetStudyPlan } from '@workspace/api-client-react';
import { Card, Empty, ErrorState, PageHead, PilotNote, ProgressBar, Skeleton } from '@/components/bits';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/app';
import { cn } from '@/lib/utils';

export default function Plan() {
  const { t } = useApp();
  const q = useGetStudyPlan();
  const [month, setMonth] = useState<number | null>(null);
  const days = q.data ?? [];
  const current = useMemo(() => days.find((d) => !d.completed), [days]);
  useEffect(() => { if (month === null && current) setMonth(current.month); }, [current, month]);
  const m = month ?? 1;
  const inMonth = days.filter((d) => d.month === m);
  const done = days.filter((d) => d.completed).length;
  const typeLabel = (x: string) => (x === 'lesson' ? t('درس', 'Lesson') : x === 'review' ? t('مراجعة', 'Review') : x);

  return (
    <Shell>
      <PageHead eyebrow={t('ستة أشهر', 'Six months')} title={t('خطة 180 يومًا', '180-day plan')}
        sub={t('180 يومًا من الدروس والمراجعة المتكررة. الأيام التي تحمل درسًا تفتح الدرس مباشرة.', '180 days of lessons and repeated review. Days with a lesson open it directly.')} />
      {q.isLoading && <Skeleton className="h-80" />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} what={t('الخطة', 'the plan')} />}
      {q.data && days.length === 0 && <Empty icon={<CalendarRange />} title={t('الخطة غير متاحة', 'No plan available')} />}
      {days.length > 0 && (
        <>
          <Card className="mb-5">
            <div className="mb-2 flex justify-between text-sm"><span>{t('الأيام المنجزة', 'Days completed')}</span><span data-testid="text-plan-done">{done} / {days.length}</span></div>
            <ProgressBar value={(done / days.length) * 100} />
          </Card>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} type="button" onClick={() => setMonth(n)} data-testid={`button-month-${n}`}
                className={cn('press shrink-0 rounded-full border px-5 py-2 font-semibold', n === m ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>
                {t('الشهر', 'Month')} {n}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2" key={m}>
            {inMonth.map((d, i) => {
              const body = (
                <>
                  <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold', d.completed ? 'bg-gold text-gold-foreground' : current?.day === d.day ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                    {d.completed ? <Check className="size-4" /> : d.day}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{d.title}</span>
                    <span className="text-xs text-muted-foreground">{t('اليوم', 'Day')} {d.day} · {typeLabel(d.type)}</span>
                  </span>
                </>
              );
              const cls = cn('rise flex items-center gap-3 rounded-2xl border bg-card p-3', current?.day === d.day ? 'border-primary' : 'border-border');
              const style = { animationDelay: `${Math.min(i, 12) * 25}ms` };
              return d.lessonId ? (
                <Link key={d.day} href={`/lesson/${d.lessonId}`} data-testid={`day-${d.day}`} className={cn(cls, 'lift')} style={style}>{body}</Link>
              ) : (
                <div key={d.day} data-testid={`day-${d.day}`} className={cls} style={style}>{body}</div>
              );
            })}
          </div>
        </>
      )}
      <PilotNote className="mt-6" />
    </Shell>
  );
}
