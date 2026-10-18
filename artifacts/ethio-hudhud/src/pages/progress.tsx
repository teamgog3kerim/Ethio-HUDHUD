import { BarChart3 } from 'lucide-react';
import { useGetProgress } from '@workspace/api-client-react';
import { Card, Empty, ErrorState, LinkBtn, PageHead, Skeleton } from '@/components/bits';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/app';

export default function ProgressPage() {
  const { t } = useApp();
  const q = useGetProgress();
  const p = q.data;
  const empty = p && p.lessonsCompleted === 0 && p.totalMinutes === 0 && p.vocabularyLearned === 0;
  const max = Math.max(1, ...(p?.activity.map((a) => a.minutes) ?? [1]));
  const stats = p ? [
    [t('دروس مكتملة', 'Lessons'), `${p.lessonsCompleted}/${p.totalLessons}`],
    [t('كلمات متعلّمة', 'Words learned'), p.vocabularyLearned],
    [t('إجمالي الدقائق', 'Total minutes'), p.totalMinutes],
    [t('دقائق اليوم', 'Today'), p.todayMinutes],
    [t('أيام متتالية', 'Streak'), p.streak],
    ['XP', p.xp],
    [t('متوسط الدرجات', 'Average score'), `${Math.round(p.averageScore <= 1 ? p.averageScore * 100 : p.averageScore)}%`],
  ] : [];
  return (
    <Shell>
      <PageHead eyebrow={t('تقدّمك', 'Your progress')} title={t('أرقام حقيقية فقط', 'Real numbers only')} sub={t('تُحسب من دروسك ومراجعاتك ووقت تركيزك الفعلي.', 'Computed from your lessons, reviews and focused time.')} />
      {q.isLoading && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>}
      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {empty && <Empty icon={<BarChart3 />} title={t('لا نشاط بعد', 'No activity yet')} body={t('أكمل أول درس لتبدأ الأرقام بالظهور.', 'Complete your first lesson and numbers begin to appear.')} action={<LinkBtn href="/learn" size="sm">{t('ابدأ درسًا', 'Start a lesson')}</LinkBtn>} />}
      {p && !empty && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([l, v], i) => (
              <Card key={i} className="rise p-4 sm:p-4" style={{ animationDelay: `${i * 40}ms` }} data-testid={`stat-${i}`}>
                <p className="font-display text-3xl font-extrabold text-primary">{v}</p>
                <p className="text-sm text-muted-foreground">{l}</p>
              </Card>
            ))}
          </div>
          <Card className="mt-5">
            <h2 className="font-display mb-4 font-bold">{t('الدقائق حسب اليوم', 'Minutes by day')}</h2>
            <div className="flex h-40 items-end gap-1.5" dir="ltr">
              {p.activity.map((a) => (
                <div key={a.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${a.date}: ${a.minutes}`}>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-primary to-gold transition-all duration-700" style={{ height: `${(a.minutes / max) * 100}%`, minHeight: a.minutes ? 4 : 2, opacity: a.minutes ? 1 : 0.25 }} />
                  <span className="text-[9px] text-muted-foreground">{a.date.slice(-2)}</span>
                </div>
              ))}
            </div>
          </Card>
          {p.recentLessons.length > 0 && (
            <Card className="mt-5">
              <h2 className="font-display mb-2 font-bold">{t('آخر الدروس', 'Recent lessons')}</h2>
              <ul className="list-disc space-y-1 ps-5 text-sm">{p.recentLessons.map((r, i) => <li key={i} dir="auto">{r}</li>)}</ul>
            </Card>
          )}
        </>
      )}
    </Shell>
  );
}
